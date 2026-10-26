import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

const sensor = { id: '9', controladorId: '7', tipo: 'HumedadSuelo', unidad: '%', conexion: 'Desconectado' }
const request = '11111111-1111-4111-8111-111111111111'
const siguiente = '22222222-2222-4222-8222-222222222222'

/** Reloj determinista; ninguna prueba espera concesiones ni contacta equipos reales. */
function reloj() {
  let ahora = Date.parse('2026-10-26T12:00:00Z')
  let secuencia = 0
  const tareas = new Map()
  return {
    ahora: () => ahora, pendientes: () => tareas.size,
    programar(accion, ms) { const id = ++secuencia; tareas.set(id, { accion, fecha: ahora + ms }); return () => tareas.delete(id) },
    avanzar(ms) {
      const hasta = ahora + ms
      for (;;) {
        const siguiente = [...tareas].filter(([, tarea]) => tarea.fecha <= hasta).sort((a, b) => a[1].fecha - b[1].fecha)[0]
        if (!siguiente) break
        ahora = siguiente[1].fecha; tareas.delete(siguiente[0]); siguiente[1].accion()
      }
      ahora = hasta
    },
  }
}

test('Monitoreo: ciclo de vida, renovación, desconexiones y lecturas tardías', async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  t.after(() => vite.close())
  const { crearGestorMonitoreo } = await vite.ssrLoadModule('/src/services/gestorMonitoreo.ts')
  const { direccionMonitoreo } = await vite.ssrLoadModule('/src/services/monitoreo.ts')

  function cliente(opciones = {}) {
    const tiempo = reloj()
    const canales = []
    const suscriptores = new Set()
    let vigente = true
    let intervalo = 1000
    const estado = (state = 'active', extras = {}) => ({ sensorId: '9', state, intervalMs: intervalo, expiresAt: new Date(tiempo.ahora() + 60000).toISOString(), ...extras })
    const gestor = crearGestorMonitoreo({ sensor, invernaderoId: '2', ahora: tiempo.ahora, programar: tiempo.programar,
      autenticar: opciones.autenticar ?? (async () => ({ token: 'token-privado', venceEn: tiempo.ahora() + 900000, vigente: () => vigente })),
      suscribirSesion(fn) { suscriptores.add(fn); return () => suscriptores.delete(fn) },
      crearCanal(token) {
        assert.equal(token, 'token-privado')
        const eventos = new Map()
        const enviadas = []
        let conectado = false
        const canal = {
          conectado: () => conectado, escuchar: (nombre, fn) => eventos.set(nombre, fn),
          enviar(nombre, cuerpo, ack) { enviadas.push({ nombre, cuerpo, ack }); if (nombre === 'monitoring.renew' && opciones.autoRenovar) ack({ ok: true, data: estado() }) },
          conectar() { if (opciones.conectar !== false) { conectado = true; eventos.get('connect')?.() } },
          cerrar() { conectado = false; eventos.clear() },
          recibir(nombre, dato) { eventos.get(nombre)?.(dato) },
          handler: (nombre) => eventos.get(nombre), enviadas,
        }
        canales.push(canal)
        return canal
      },
    })
    function confirmar(ms = 1000) {
      intervalo = ms
      const canal = canales.at(-1)
      canal.enviadas.find(({ nombre }) => nombre === 'monitoring.start').ack({ ok: true, data: estado('starting') })
      canal.recibir('monitoring.state', estado())
    }
    function lectura(sequence, requestId = request, extras = {}) {
      return { sensorId: '9', controllerId: '7', greenhouseId: '2', type: sensor.tipo, unit: '%', requestId, sequence,
        readingId: `muestra:${requestId}:${sequence}`, value: 30 + sequence % 30, measuredAt: null, receivedAt: new Date(tiempo.ahora()).toISOString(), ...extras }
    }
    return { gestor, canales, tiempo, estado, confirmar, lectura, suscriptores, invalidar() { vigente = false; suscriptores.forEach((fn) => fn()) } }
  }

  await t.test('no conecta ni solicita sensores antes de una acción explícita y evita inicios dobles', async () => {
    const c = cliente()
    assert.equal(c.canales.length, 0)
    await Promise.all([c.gestor.iniciar(1000), c.gestor.iniciar(1000)])
    assert.equal(c.canales.length, 1)
    assert.deepEqual(c.canales[0].enviadas.map(({ nombre, cuerpo }) => ({ nombre, cuerpo })), [{ nombre: 'monitoring.start', cuerpo: { sensorId: '9', intervalMs: 1000 } }])
    assert.equal(c.gestor.obtenerEstado().fase, 'solicitando')
    c.gestor.cerrar()
  })

  await t.test('espera confirmación del ESP32 y muestra la frecuencia real sin exponer el token', async () => {
    const c = cliente()
    await c.gestor.iniciar()
    assert.equal(c.gestor.obtenerEstado().fase, 'solicitando')
    c.confirmar(2000)
    assert.equal(c.gestor.obtenerEstado().fase, 'activo')
    assert.equal(c.gestor.obtenerEstado().intervaloMs, 2000)
    assert.ok(!JSON.stringify(c.gestor.obtenerEstado()).includes('token-privado'))
    c.gestor.cerrar()
  })

  await t.test('renueva a los 20 segundos la misma concesión sin volver a emitir start', async () => {
    const c = cliente({ autoRenovar: true })
    await c.gestor.iniciar(10000); c.confirmar(10000)
    c.tiempo.avanzar(20000)
    assert.equal(c.canales[0].enviadas.filter(({ nombre }) => nombre === 'monitoring.renew').length, 1)
    assert.equal(c.canales[0].enviadas.filter(({ nombre }) => nombre === 'monitoring.start').length, 1)
    assert.equal(c.gestor.obtenerEstado().fase, 'activo')
    c.gestor.cerrar()
  })

  await t.test('acota las lecturas y conserva muestras distintas con fecha coincidente', async () => {
    const c = cliente({ autoRenovar: true })
    await c.gestor.iniciar(); c.confirmar()
    c.canales[0].recibir('monitoring.reading', c.lectura(0))
    c.canales[0].recibir('monitoring.reading', c.lectura(1))
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 2)
    for (let i = 2; i < 75; i++) { c.tiempo.avanzar(1000); c.canales[0].recibir('monitoring.reading', c.lectura(i)) }
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 60)
    c.gestor.cerrar()
  })

  await t.test('ignora secuencias repetidas, órdenes retiradas y sensores ajenos', async () => {
    const c = cliente()
    await c.gestor.iniciar(); c.confirmar()
    c.canales[0].recibir('monitoring.reading', c.lectura(0))
    c.canales[0].recibir('monitoring.reading', c.lectura(0))
    c.canales[0].recibir('monitoring.reading', c.lectura(1, request, { sensorId: '10' }))
    c.canales[0].recibir('monitoring.reading', c.lectura(0, siguiente))
    c.canales[0].recibir('monitoring.reading', c.lectura(2, request))
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 2)
    c.gestor.cerrar()
  })

  await t.test('al detener cierra el canal y elimina temporizadores y oyentes de sesión', async () => {
    const c = cliente(); await c.gestor.iniciar(); c.confirmar()
    c.gestor.detener()
    assert.equal(c.gestor.obtenerEstado().fase, 'detenido')
    assert.ok(c.canales[0].enviadas.some(({ nombre }) => nombre === 'monitoring.stop'))
    assert.equal(c.tiempo.pendientes(), 0)
    assert.equal(c.suscriptores.size, 0)
    c.tiempo.avanzar(120000)
    assert.equal(c.canales.length, 1)
  })

  await t.test('una desconexión no reabre el socket y un reinicio crea una instancia nueva', async () => {
    const c = cliente(); await c.gestor.iniciar(); c.confirmar()
    const viejo = c.canales[0].handler('monitoring.reading')
    c.canales[0].recibir('disconnect', 'transport close')
    assert.equal(c.gestor.obtenerEstado().fase, 'desconectado')
    c.tiempo.avanzar(60000)
    assert.equal(c.canales.length, 1)
    await c.gestor.iniciar(); c.confirmar()
    viejo(c.lectura(10))
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 0)
    assert.equal(c.canales.length, 2)
    c.gestor.cerrar()
  })

  await t.test('cambiar o renovar la sesión cierra inmediatamente la conexión anterior', async () => {
    const c = cliente(); await c.gestor.iniciar(); c.confirmar()
    c.invalidar()
    assert.equal(c.gestor.obtenerEstado().fase, 'detenido')
    assert.equal(c.canales[0].conectado(), false)
    assert.equal(c.tiempo.pendientes(), 0)
  })

  await t.test('vencimiento, ausencia de lecturas y ACK perdido finalizan sin bucles', async () => {
    const a = cliente(); await a.gestor.iniciar(); a.confirmar()
    a.tiempo.avanzar(6000)
    assert.match(a.gestor.obtenerEstado().mensaje, /lecturas recientes/)
    const b = cliente(); await b.gestor.iniciar()
    b.tiempo.avanzar(8000)
    assert.equal(b.gestor.obtenerEstado().fase, 'error')
    const c = cliente(); await c.gestor.iniciar(); c.confirmar()
    c.canales[0].recibir('monitoring.state', c.estado('active', { expiresAt: new Date(c.tiempo.ahora() + 1000).toISOString() }))
    c.tiempo.avanzar(1000)
    assert.match(c.gestor.obtenerEstado().mensaje, /concesión/)
  })

  await t.test('la confirmación fallida de la renovación libera el canal', async () => {
    const c = cliente(); await c.gestor.iniciar(10000); c.confirmar(10000)
    c.tiempo.avanzar(28000)
    assert.equal(c.gestor.obtenerEstado().fase, 'error')
    assert.equal(c.canales[0].conectado(), false)
  })

  await t.test('errores de permisos y estado se presentan sin mensajes internos', async () => {
    for (const status of [401, 403, 503]) {
      const c = cliente(); await c.gestor.iniciar()
      c.canales[0].enviadas[0].ack({ ok: false, error: { status, message: 'mensaje interno secreto' } })
      assert.equal(c.gestor.obtenerEstado().fase, 'error')
      assert.ok(!c.gestor.obtenerEstado().mensaje.includes('interno'))
      assert.equal(c.tiempo.pendientes(), 0)
    }
  })

  await t.test('el rechazo del driver o la caída del equipo termina la sesión', async () => {
    for (const reason of ['sensor_unsupported', 'device_offline', 'server_shutdown']) {
      const c = cliente(); await c.gestor.iniciar()
      c.canales[0].recibir('monitoring.state', c.estado('stopped', { reason }))
      assert.equal(c.gestor.obtenerEstado().fase, 'detenido')
      assert.equal(c.tiempo.pendientes(), 0)
    }
  })

  await t.test('una lectura con unidad o propiedad incorrecta no se muestra', async () => {
    const c = cliente(); await c.gestor.iniciar(); c.confirmar()
    c.canales[0].recibir('monitoring.reading', c.lectura(0, request, { unit: 'cm' }))
    assert.equal(c.gestor.obtenerEstado().fase, 'error')
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 0)
  })

  await t.test('detener durante la autorización impide abrir posteriormente un canal', async () => {
    let resolver
    const c = cliente({ autenticar: () => new Promise((resolve) => { resolver = resolve }) })
    const pendiente = c.gestor.iniciar()
    c.gestor.detener()
    resolver({ token: 'token-privado', venceEn: c.tiempo.ahora() + 900000, vigente: () => true })
    await pendiente
    assert.equal(c.canales.length, 0)
  })

  await t.test('respuestas de autorizaciones anteriores no sustituyen la capacidad de la nueva sesión', async () => {
    const pendientes = []
    const c = cliente({ autenticar: () => new Promise((resolve) => pendientes.push(resolve)) })
    const vieja = c.gestor.iniciar(); c.gestor.detener()
    const nueva = c.gestor.iniciar()
    pendientes[1]({ token: 'token-privado', venceEn: c.tiempo.ahora() + 900000, vigente: () => true })
    await nueva; c.confirmar()
    pendientes[0]({ token: 'no-usar', venceEn: 0, vigente: () => false })
    await vieja
    c.canales[0].recibir('monitoring.reading', c.lectura(0))
    assert.equal(c.gestor.obtenerEstado().lecturas.length, 1)
    c.gestor.cerrar()
  })

  await t.test('los fallos de conexión y sus plazos no dejan recursos vivos', async () => {
    const c = cliente({ conectar: false }); await c.gestor.iniciar()
    assert.equal(c.canales[0].enviadas.length, 0)
    c.tiempo.avanzar(10000)
    assert.equal(c.gestor.obtenerEstado().fase, 'error')
    assert.equal(c.tiempo.pendientes(), 0)
  })

  await t.test('separa ruta y namespace, y rechaza credenciales en la URL', () => {
    assert.deepEqual(direccionMonitoreo('https://api.example.test/'), { namespace: 'https://api.example.test/monitoring', path: '/socket.io' })
    assert.throws(() => direccionMonitoreo('https://usuario:clave@api.example.test'))
    assert.throws(() => direccionMonitoreo('https://api.example.test?token=secreto'))
  })
})
