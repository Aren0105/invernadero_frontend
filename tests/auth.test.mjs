import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

/** Promesa controlada para reproducir carreras sin esperas temporizadas. */
function diferida() {
  let resolver
  let rechazar
  const promesa = new Promise((resolve, reject) => { resolver = resolve; rechazar = reject })
  return { promesa, resolver, rechazar }
}

/** Simula Web Locks y avisos entre pestañas; almacena únicamente metadatos públicos de coordinación. */
function coordinador() {
  let marca = null
  let cola = Promise.resolve()
  const puertos = new Set()
  return {
    marca: () => marca,
    puerto() {
      const puerto = { oyente: null }
      puertos.add(puerto)
      return {
        exclusiva(operacion) {
          const resultado = cola.then(operacion)
          cola = resultado.catch(() => {})
          return resultado
        },
        leer: () => marca,
        escribir(nueva) {
          marca = { ...nueva }
          for (const otro of puertos) if (otro !== puerto) queueMicrotask(() => otro.oyente?.())
        },
        escuchar(oyente) { puerto.oyente = oyente; return () => { puerto.oyente = null } },
      }
    },
  }
}

/** Espera únicamente el vaciado de tareas de la prueba, con límite para detectar bloqueos. */
async function esperar(condicion) {
  for (let intento = 0; intento < 100; intento++) {
    if (condicion()) return
    await new Promise((resolve) => setImmediate(resolve))
  }
  assert.fail('La operación no alcanzó el estado esperado')
}

const usuario = { id: 'cuenta-1', name: 'Ana Torres', email: 'ana@example.test' }
const credenciales = (token = 'acceso-1', user = usuario, expiresIn = 900) => ({ accessToken: token, tokenType: 'Bearer', expiresIn, user })
const json = (body, status = 200) => Response.json(body, { status })
const sinContenido = () => new Response(null, { status: 204 })

test('Autenticación web con acceso en memoria y refresh HttpOnly', async (t) => {
  const servidor = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  t.after(() => servidor.close())
  const { crearGestorSesion, ErrorSesionCambiada } = await servidor.ssrLoadModule('/src/services/gestorSesion.ts')
  const { validarRegistroUsuario, validarCredenciales } = await servidor.ssrLoadModule('/src/utils/autenticacion.ts')
  const { ErrorResultadoRegistro, ErrorValidacionAutenticacion } = await servidor.ssrLoadModule('/src/services/erroresAutenticacion.ts')

  /** Crea una pestaña con transporte simulado y registra todas las peticiones. */
  function cliente(handler, bus = coordinador(), reloj = () => 1000) {
    const llamadas = []
    const gestor = crearGestorSesion({
      ahora: reloj, coordinacion: bus.puerto(),
      enviar: async (ruta, opciones = {}) => {
        llamadas.push({ ruta, opciones })
        return handler(ruta, opciones, llamadas)
      },
    })
    return { gestor, llamadas, bus }
  }

  await t.test('login usa cookies, preserva la contraseña y verifica /me sin roles globales', async () => {
    const { gestor, llamadas, bus } = cliente((ruta) => ruta === '/auth/login' ? json(credenciales()) : json(usuario))
    await gestor.iniciarSesion(' ANA@EXAMPLE.TEST ', ' clave intacta ')
    assert.equal(gestor.obtenerEstado().estado, 'autenticada')
    assert.deepEqual(gestor.obtenerEstado().usuario, usuario)
    assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { email: usuario.email, password: ' clave intacta ' })
    assert.equal(llamadas[0].opciones.credentials, 'include')
    assert.equal(llamadas[1].opciones.credentials, 'omit')
    assert.equal(new Headers(llamadas[1].opciones.headers).get('Authorization'), 'Bearer acceso-1')
    assert.equal('accessToken' in gestor.obtenerEstado(), false)
    assert.deepEqual(Object.keys(bus.marca()).sort(), ['cierrePendiente', 'estado', 'revision'])
  })

  await t.test('el registro aprovecha la sesión emitida por el servidor', async () => {
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/register' ? json(credenciales()) : json(usuario))
    await gestor.registrarUsuario(' Ana Torres ', ' ANA@EXAMPLE.TEST ', 'clave-prueba')
    assert.equal(gestor.obtenerEstado().estado, 'autenticada')
    assert.equal(llamadas[0].ruta, '/auth/register')
    assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { name: usuario.name, email: usuario.email, password: 'clave-prueba' })
  })

  await t.test('recarga y montaje doble comparten un único refresh sin Bearer', async () => {
    const { gestor, llamadas } = cliente(() => json(credenciales()))
    await Promise.all([gestor.restaurar(), gestor.restaurar(), gestor.restaurar()])
    assert.equal(llamadas.length, 1)
    assert.equal(llamadas[0].ruta, '/auth/refresh')
    assert.equal(llamadas[0].opciones.credentials, 'include')
    assert.equal(new Headers(llamadas[0].opciones.headers).has('Authorization'), false)
    assert.equal(gestor.obtenerEstado().usuario.id, usuario.id)
  })

  await t.test('varios 401 simultáneos comparten la renovación y reintentan solo una vez', async () => {
    let refresh = 0
    const { gestor, llamadas } = cliente((ruta, opciones) => {
      if (ruta === '/auth/refresh') return json(credenciales(`acceso-${++refresh}`))
      return new Headers(opciones.headers).get('Authorization') === 'Bearer acceso-1' ? json({}, 401) : json({ ok: true })
    })
    await gestor.restaurar()
    const respuestas = await Promise.all(['/a', '/b', '/c'].map((ruta) => gestor.peticionApi(ruta)))
    assert.ok(respuestas.every((respuesta) => respuesta.ok))
    assert.equal(refresh, 2)
    for (const ruta of ['/a', '/b', '/c']) assert.equal(llamadas.filter((llamada) => llamada.ruta === ruta).length, 2)
  })

  await t.test('un 401 tardío aprovecha el acceso ya renovado', async () => {
    let refresh = 0
    const tardia = diferida()
    const { gestor } = cliente((ruta, opciones) => {
      if (ruta === '/auth/refresh') return json(credenciales(`acceso-${++refresh}`))
      if (new Headers(opciones.headers).get('Authorization') !== 'Bearer acceso-1') return json({ ok: true })
      return ruta === '/lenta' ? tardia.promesa : json({}, 401)
    })
    await gestor.restaurar()
    const lenta = gestor.peticionApi('/lenta')
    await gestor.peticionApi('/rapida')
    tardia.resolver(json({}, 401))
    assert.equal((await lenta).status, 200)
    assert.equal(refresh, 2)
  })

  await t.test('renueva un acceso vencido antes de enviar el recurso', async () => {
    let ahora = 1000
    let refresh = 0
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/refresh' ? json(credenciales(`t-${++refresh}`, usuario, 1)) : json({}), undefined, () => ahora)
    await gestor.restaurar()
    ahora = 2001
    await gestor.peticionApi('/greenhouses')
    assert.equal(refresh, 2)
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/greenhouses').length, 1)
    assert.equal(llamadas.at(-1).opciones.headers.get('Authorization'), 'Bearer t-2')
  })

  await t.test('403, 500 y fallos de red no provocan reenvíos de la operación', async () => {
    for (const fallo of [403, 500, 'red']) {
      const { gestor, llamadas } = cliente((ruta) => {
        if (ruta === '/auth/refresh') return json(credenciales())
        if (fallo === 'red') throw new Error('sin red')
        return json({}, fallo)
      })
      await gestor.restaurar()
      if (fallo === 'red') await assert.rejects(gestor.peticionApi('/crear', { method: 'POST', body: '{}' }), /sin red/)
      else assert.equal((await gestor.peticionApi('/crear', { method: 'POST', body: '{}' })).status, fallo)
      assert.equal(llamadas.length, 2)
    }
  })

  await t.test('un segundo 401 revoca la cookie y termina la sesión sin bucle', async () => {
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/refresh' ? json(credenciales()) : ruta === '/auth/logout' ? sinContenido() : json({}, 401))
    await gestor.restaurar()
    assert.equal((await gestor.peticionApi('/protegido')).status, 401)
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/auth/refresh').length, 2)
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/protegido').length, 2)
    assert.equal(llamadas.at(-1).ruta, '/auth/logout')
    assert.equal(new Headers(llamadas.at(-1).opciones.headers).has('Authorization'), false)
  })

  await t.test('refresh inválido limpia el acceso y no insiste al recargar', async () => {
    const bus = coordinador()
    const primero = cliente(() => json({}, 401), bus)
    await primero.gestor.restaurar()
    assert.equal(primero.gestor.obtenerEstado().estado, 'anonima')
    const segundo = cliente(() => assert.fail('No debe volver a canjear la cookie invalidada'), bus)
    await segundo.gestor.restaurar()
    assert.equal(segundo.gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('un fallo de red o 429 pausa la recuperación y permite reintento explícito', async () => {
    for (const motivo of ['red', 429]) {
      let fallar = true
      const { gestor, llamadas } = cliente(() => {
        if (fallar) {
          if (motivo === 'red') throw new Error('sin conexión')
          return json({}, 429)
        }
        return json(credenciales())
      })
      await assert.rejects(gestor.restaurar())
      assert.equal(gestor.obtenerEstado().estado, 'error')
      assert.equal(llamadas.length, 1)
      fallar = false
      await gestor.renovar()
      assert.equal(gestor.obtenerEstado().estado, 'autenticada')
      await gestor.peticionApi('/recurso')
    }
  })

  await t.test('respuestas de sesión malformadas nunca muestran un usuario autenticado', async () => {
    for (const dato of [null, {}, { ...credenciales(), accessToken: '' }, { ...credenciales(), expiresIn: 0 }, { ...credenciales(), user: null }]) {
      const { gestor } = cliente(() => json(dato))
      await assert.rejects(gestor.restaurar(), /respuesta de sesión inesperada/)
      assert.equal(gestor.obtenerEstado().estado, 'error')
      assert.equal(gestor.obtenerEstado().usuario, null)
    }
  })

  await t.test('perfil inválido tras login descarta y revoca la sesión recién creada', async () => {
    for (const perfil of [null, {}, { ...usuario, id: 'otra-cuenta' }]) {
      const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/login' ? json(credenciales()) : ruta === '/auth/logout' ? sinContenido() : json(perfil))
      await assert.rejects(gestor.iniciarSesion(usuario.email, 'clave'), /perfil de usuario inesperado/)
      assert.equal(gestor.obtenerEstado().estado, 'anonima')
      assert.equal(llamadas.at(-1).ruta, '/auth/logout')
    }
  })

  await t.test('conserva los mensajes de 400, 401, 409 y 429', async () => {
    for (const [estado, texto] of [[400, /Revisa los datos/], [401, /Correo y contraseña/], [409, /Ya existe/], [429, /Demasiados intentos/]]) {
      const { gestor } = cliente((ruta) => ruta === '/auth/logout' ? sinContenido() : json({}, estado))
      await assert.rejects(gestor.iniciarSesion(usuario.email, 'clave'), texto)
    }
  })

  await t.test('cierre fallido oculta el perfil y persiste para completar el cierre al recargar', async () => {
    const bus = coordinador()
    const { gestor } = cliente((ruta) => {
      if (ruta === '/auth/logout') throw new Error('sin red')
      return json(credenciales())
    }, bus)
    await gestor.restaurar()
    await assert.rejects(gestor.cerrarSesion(), /sin red/)
    assert.equal(gestor.obtenerEstado().estado, 'cierre-pendiente')
    assert.equal(gestor.obtenerEstado().usuario, null)
    assert.equal(bus.marca().cierrePendiente, true)
    const segunda = cliente((ruta) => { assert.equal(ruta, '/auth/logout'); return sinContenido() }, bus)
    await segunda.gestor.restaurar()
    assert.equal(segunda.gestor.obtenerEstado().estado, 'anonima')
    assert.equal(bus.marca().cierrePendiente, false)
  })

  await t.test('logout simultáneo comparte la petición y acepta cookie ya vencida', async () => {
    let ahora = 1000
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/logout' ? json({}, 401) : json(credenciales()), undefined, () => ahora)
    await gestor.restaurar()
    ahora = 9999999
    await Promise.all([gestor.cerrarSesion(), gestor.cerrarSesion()])
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/auth/logout').length, 1)
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('revoca con acceso vigente si el navegador no envió la cookie', async () => {
    const { gestor, llamadas } = cliente((ruta, opciones) => {
      if (ruta === '/auth/refresh') return json(credenciales())
      return new Headers(opciones.headers).has('Authorization') ? sinContenido() : json({}, 401)
    })
    await gestor.restaurar()
    await gestor.cerrarSesion()
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/auth/logout').length, 2)
    assert.equal(new Headers(llamadas.at(-1).opciones.headers).get('Authorization'), 'Bearer acceso-1')
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('logout durante refresh impide resucitar la sesión con una respuesta tardía', async () => {
    const respuesta = diferida()
    const inicio = diferida()
    const { gestor } = cliente((ruta) => {
      if (ruta === '/auth/refresh') { inicio.resolver(); return respuesta.promesa }
      assert.equal(ruta, '/auth/logout')
      return sinContenido()
    })
    const recuperacion = gestor.restaurar()
    const rechazo = assert.rejects(recuperacion, ErrorSesionCambiada)
    await inicio.promesa
    const cierre = gestor.cerrarSesion()
    assert.equal(gestor.obtenerEstado().estado, 'cerrando')
    respuesta.resolver(json(credenciales()))
    await Promise.all([rechazo, cierre])
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('descarta respuestas protegidas que llegan después de cerrar sesión', async () => {
    const respuesta = diferida()
    const { gestor } = cliente((ruta) => ruta === '/auth/refresh' ? json(credenciales()) : ruta === '/auth/logout' ? sinContenido() : respuesta.promesa)
    await gestor.restaurar()
    const consulta = gestor.peticionApi('/datos')
    const rechazo = assert.rejects(consulta, ErrorSesionCambiada)
    await gestor.cerrarSesion()
    respuesta.resolver(json({ secreto: 'dato-ficticio' }))
    await rechazo
  })

  await t.test('no reenvía una mutación si la renovación cambia de cuenta', async () => {
    let refresh = 0
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/refresh'
      ? json(credenciales('token', ++refresh === 1 ? usuario : { ...usuario, id: 'cuenta-2' })) : json({}, 401))
    await gestor.restaurar()
    await assert.rejects(gestor.peticionApi('/mutacion', { method: 'POST', body: '{}' }))
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/mutacion').length, 1)
  })

  await t.test('dos pestañas canjean la cookie en serie, nunca en paralelo', async () => {
    const bus = coordinador()
    let activos = 0
    let maximo = 0
    let rotaciones = 0
    const enviar = async () => {
      activos++
      maximo = Math.max(maximo, activos)
      await new Promise((resolve) => setImmediate(resolve))
      activos--
      return json(credenciales(`token-${++rotaciones}`))
    }
    const a = cliente(enviar, bus)
    const b = cliente(enviar, bus)
    await Promise.all([a.gestor.restaurar(), b.gestor.restaurar()])
    assert.equal(maximo, 1)
    assert.equal(rotaciones, 2)
    assert.equal(a.gestor.obtenerEstado().estado, 'autenticada')
    assert.equal(b.gestor.obtenerEstado().estado, 'autenticada')
  })

  await t.test('el cierre se propaga a otra pestaña y su recarga no restaura la cuenta', async () => {
    const bus = coordinador()
    const enviar = (ruta) => ruta === '/auth/logout' ? sinContenido() : json(credenciales())
    const a = cliente(enviar, bus)
    const b = cliente(enviar, bus)
    await a.gestor.restaurar()
    await b.gestor.restaurar()
    const desconectar = b.gestor.conectar()
    await a.gestor.cerrarSesion()
    await esperar(() => b.gestor.obtenerEstado().estado === 'anonima')
    assert.equal(b.gestor.obtenerEstado().usuario, null)
    desconectar()
  })

  await t.test('una petición cancelada no provoca renovación ni acceso al recurso', async () => {
    const { gestor, llamadas } = cliente(() => json(credenciales()))
    const control = new AbortController()
    control.abort()
    await assert.rejects(gestor.peticionApi('/datos', { signal: control.signal }))
    assert.equal(llamadas.length, 0)
  })

  await t.test('errores de almacenamiento salen del estado de carga y permiten mostrar el fallo', async () => {
    const gestor = crearGestorSesion({
      enviar: () => assert.fail('No debe consultar la API'),
      coordinacion: { exclusiva: async (operacion) => operacion(), leer() { throw new Error('almacenamiento bloqueado') }, escribir() {}, escuchar: () => () => {} },
    })
    await assert.rejects(gestor.restaurar(), /almacenamiento bloqueado/)
    assert.equal(gestor.obtenerEstado().estado, 'error')
  })
  await t.test('un cierre sin bloqueo conserva su intención para la siguiente carga', async () => {
    let marca = { revision: 'anterior', estado: 'activa', cierrePendiente: false }
    const gestor = crearGestorSesion({
      enviar: () => assert.fail('No se obtuvo el bloqueo'),
      coordinacion: {
        exclusiva: async () => { throw new Error('otra pestaña ocupada') },
        leer: () => marca, escribir(nueva) { marca = nueva }, escuchar: () => () => {},
      },
    })
    await assert.rejects(gestor.cerrarSesion(), /otra pestaña ocupada/)
    assert.equal(marca.estado, 'cerrada')
    assert.equal(marca.cierrePendiente, true)
    assert.equal(gestor.obtenerEstado().estado, 'cierre-pendiente')
  })

  await t.test('un cambio persistido descarta el resultado aunque el aviso a la pestaña se retrase', async () => {
    const bus = coordinador()
    const a = cliente((ruta) => ruta === '/auth/logout' ? sinContenido() : json(credenciales()), bus)
    const respuesta = diferida()
    const b = cliente((ruta) => ruta === '/auth/refresh' ? json(credenciales()) : respuesta.promesa, bus)
    await a.gestor.restaurar()
    await b.gestor.restaurar()
    const consulta = b.gestor.peticionApi('/datos')
    const rechazo = assert.rejects(consulta, ErrorSesionCambiada)
    await a.gestor.cerrarSesion()
    respuesta.resolver(json({ datos: [] }))
    await rechazo
  })

  await t.test('dos pestañas conectadas recuperan sesión al arrancar sin reutilizar la cookie', async () => {
    const bus = coordinador()
    let activos = 0
    let maximo = 0
    const enviar = async () => {
      activos++
      maximo = Math.max(maximo, activos)
      await new Promise((resolve) => setImmediate(resolve))
      activos--
      return json(credenciales())
    }
    const a = cliente(enviar, bus)
    const b = cliente(enviar, bus)
    const desconectarA = a.gestor.conectar()
    const desconectarB = b.gestor.conectar()
    await Promise.allSettled([a.gestor.restaurar(), b.gestor.restaurar()])
    await esperar(() => a.gestor.obtenerEstado().estado === 'autenticada' && b.gestor.obtenerEstado().estado === 'autenticada')
    assert.equal(maximo, 1)
    desconectarA()
    desconectarB()
  })

  await t.test('nombre de registro respeta 2–80 caracteres después de recortar', () => {
    for (const [nombre, valido] of [[' A ', false], [' AB ', true], ['A'.repeat(80), true], ['A'.repeat(81), false], ['   ', false]]) {
      const errores = validarRegistroUsuario({ nombre, correo: usuario.email, password: 'clave-123', confirmacion: 'clave-123' })
      assert.equal(!errores.nombre, valido)
    }
  })

  await t.test('las longitudes Unicode coinciden entre registro y acceso', () => {
    for (const [cantidad, valido] of [[7, false], [8, true], [128, true], [129, false]]) {
      const password = '🔒'.repeat(cantidad)
      const datos = { nombre: 'Ana', correo: usuario.email, password, confirmacion: password }
      assert.equal(!validarRegistroUsuario(datos).password, valido)
      assert.equal(!validarCredenciales(datos).password, valido)
    }
    assert.equal(validarRegistroUsuario({ nombre: '🌱'.repeat(80), correo: usuario.email, password: 'clave-123', confirmacion: 'clave-123' }).nombre, undefined)
    assert.ok(validarRegistroUsuario({ nombre: '🌱'.repeat(81), correo: usuario.email, password: 'clave-123', confirmacion: 'clave-123' }).nombre)
  })

  await t.test('correo reproduce IsEmail y no depende solo de la validación nativa del navegador', () => {
    for (const [correo, valido] of [[' ANA@EXAMPLE.TEST ', true], ['ana@localhost', false], ['iñaki@ejemplo.pe', true], ['Ana <ana@example.test>', false], ['a'.repeat(65) + '@example.test', false]]) {
      assert.equal(!validarCredenciales({ correo, password: 'clave-123' }).correo, valido)
    }
  })

  await t.test('contraseña y confirmación conservan espacios y los datos originales', () => {
    const datos = { nombre: ' Ana ', correo: ' ANA@EXAMPLE.TEST ', password: '        ', confirmacion: '        ' }
    const copia = { ...datos }
    assert.deepEqual(validarRegistroUsuario(datos), {})
    assert.deepEqual(datos, copia)
    assert.ok(validarRegistroUsuario({ ...datos, confirmacion: '       ' }).confirmacion)
    assert.ok(validarRegistroUsuario({ ...datos, confirmacion: '' }).confirmacion)
  })

  await t.test('el alta envía solo el contrato público y acepta la respuesta 201', async () => {
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/register' ? json(credenciales(), 201) : json(usuario))
    await gestor.registrarUsuario(' Ana Torres ', ' ANA@EXAMPLE.TEST ', ' clave intacta ')
    assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { name: usuario.name, email: usuario.email, password: ' clave intacta ' })
    assert.equal(llamadas[0].opciones.credentials, 'include')
    assert.equal(gestor.obtenerEstado().estado, 'autenticada')
    assert.equal(llamadas.filter((llamada) => llamada.ruta === '/auth/register').length, 1)
  })

  await t.test('correo duplicado se asocia a email sin ejecutar logout ni repetir el alta', async () => {
    const { gestor, llamadas } = cliente(() => json({ message: 'El correo ya está registrado.' }, 409))
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => {
      assert.ok(error instanceof ErrorValidacionAutenticacion)
      assert.equal(error.status, 409)
      assert.deepEqual(error.campos, ['email'])
      return true
    })
    assert.equal(llamadas.length, 1)
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('errores del DTO se traducen a campos conocidos sin exponer mensajes internos', async () => {
    const { gestor, llamadas } = cliente(() => json({ message: ['name must be shorter than or equal to 80 characters', 'password must be longer than or equal to 8 characters', 'internal-debug-value secret'] }, 400))
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => {
      assert.ok(error instanceof ErrorValidacionAutenticacion)
      assert.deepEqual(error.campos, ['name', 'password'])
      assert.equal(error.message.includes('secret'), false)
      return true
    })
    assert.equal(llamadas.length, 1)
  })

  await t.test('un rechazo sin JSON conserva un error recuperable en español', async () => {
    const { gestor } = cliente(() => new Response('<html>error</html>', { status: 400 }))
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => {
      assert.ok(error instanceof ErrorValidacionAutenticacion)
      assert.deepEqual(error.campos, [])
      assert.match(error.message, /Revisa los datos/)
      return true
    })
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
  })

  await t.test('alta rechazada por origen o límite de intentos no provoca peticiones adicionales', async () => {
    for (const status of [403, 429]) {
      const { gestor, llamadas } = cliente(() => json({}, status))
      await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => error instanceof ErrorValidacionAutenticacion && error.status === status)
      assert.equal(llamadas.length, 1)
    }
  })

  await t.test('201 con fallo posterior de perfil informa que la cuenta ya existe', async () => {
    const { gestor, llamadas } = cliente((ruta) => {
      if (ruta === '/auth/register') return json(credenciales(), 201)
      if (ruta === '/auth/me') return json({}, 500)
      return sinContenido()
    })
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => error instanceof ErrorResultadoRegistro && error.resultado === 'creada')
    assert.equal(gestor.obtenerEstado().estado, 'anonima')
    assert.deepEqual(llamadas.map((llamada) => llamada.ruta), ['/auth/register', '/auth/me', '/auth/logout'])
  })

  await t.test('201 con credenciales malformadas tampoco ofrece crear otra cuenta', async () => {
    const { gestor } = cliente((ruta) => ruta === '/auth/register' ? json({}, 201) : sinContenido())
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => error instanceof ErrorResultadoRegistro && error.resultado === 'creada')
  })

  await t.test('respuesta perdida o 5xx informa un resultado incierto y no repite el POST', async () => {
    for (const fallo of ['red', 500]) {
      const { gestor, llamadas } = cliente((ruta) => {
        if (ruta === '/auth/logout') return sinContenido()
        if (fallo === 'red') throw new Error('respuesta perdida')
        return json({}, fallo)
      })
      await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => error instanceof ErrorResultadoRegistro && error.resultado === 'incierto')
      assert.equal(llamadas.filter((llamada) => llamada.ruta === '/auth/register').length, 1)
      assert.equal(gestor.obtenerEstado().estado, 'anonima')
    }
  })

  await t.test('el canal recibe acceso efímero que se invalida al renovar o cerrar sesión', async () => {
    const { gestor } = cliente((ruta) => {
      if (ruta === '/auth/login') return json(credenciales('original'))
      if (ruta === '/auth/me') return json(usuario)
      if (ruta === '/auth/refresh') return json(credenciales('renovado'))
      if (ruta === '/auth/logout') return sinContenido()
      assert.fail(`Ruta inesperada: ${ruta}`)
    })
    await gestor.iniciarSesion(usuario.email, 'clave-123')
    const acceso = await gestor.accesoParaCanal(new AbortController().signal)
    assert.equal(acceso.token, 'original')
    assert.equal(acceso.vigente(), true)
    assert.ok(!('accessToken' in gestor.obtenerEstado()))
    await gestor.renovar()
    assert.equal(acceso.vigente(), false)
    const nuevo = await gestor.accesoParaCanal(new AbortController().signal)
    assert.equal(nuevo.token, 'renovado')
    assert.equal(nuevo.vigente(), true)
    await gestor.cerrarSesion()
    assert.equal(nuevo.vigente(), false)
  })

  await t.test('no entrega acceso al canal para una petición cancelada o una cuenta anónima', async () => {
    const { gestor, llamadas } = cliente(() => json({}, 401))
    const aborto = new AbortController()
    aborto.abort()
    await assert.rejects(gestor.accesoParaCanal(aborto.signal), { name: 'AbortError' })
    assert.equal(llamadas.length, 0)
    await gestor.restaurar()
    await assert.rejects(gestor.accesoParaCanal(new AbortController().signal), /Inicia sesión/)
  })

  await t.test('renueva el acceso próximo a vencer antes de autorizar el canal', async () => {
    const { gestor, llamadas } = cliente((ruta) => ruta === '/auth/login' ? json(credenciales('corto', usuario, 10)) : ruta === '/auth/me' ? json(usuario) : json(credenciales('nuevo')))
    await gestor.iniciarSesion(usuario.email, 'clave-123')
    const acceso = await gestor.accesoParaCanal(new AbortController().signal)
    assert.equal(acceso.token, 'nuevo')
    assert.equal(llamadas.filter(({ ruta }) => ruta === '/auth/refresh').length, 1)
  })

  await t.test('si el cierre posterior al alta falla, conserva el aviso de cuenta creada', async () => {
    const { gestor } = cliente((ruta) => {
      if (ruta === '/auth/register') return json(credenciales(), 201)
      if (ruta === '/auth/me') return json({}, 500)
      throw new Error('sin conexión')
    })
    await assert.rejects(gestor.registrarUsuario('Ana', usuario.email, 'clave-123'), (error) => error instanceof ErrorResultadoRegistro && error.resultado === 'creada')
    assert.equal(gestor.obtenerEstado().estado, 'cierre-pendiente')
    assert.match(gestor.obtenerEstado().error, /cuenta ya se creó/)
  })

})
