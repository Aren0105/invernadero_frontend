import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const json = (valor, status = 200) => Response.json(valor, { status })
const fecha = '2026-01-01T00:00:00.000Z'
const controlador = (id = '7', extras = {}) => ({ id, greenhouseId: '3', name: 'ESP32 principal', active: false, connectionStatus: 'Desconectado', createdAt: fecha, lastSeenAt: null, ...extras })
const sensor = (id = '9', extras = {}) => ({ id, controllerId: '7', type: 'HumedadSuelo', unit: '%', connectionStatus: 'Desconectado', ...extras })
const clave = (id = '11', extras = {}) => ({ id, controllerId: '7', createdAt: fecha, expiresAt: null, revokedAt: null, ...extras })

test('Registro y aprovisionamiento con el contrato real de la API', async (t) => {
  const servidor = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  t.after(() => servidor.close())
  const { crearServicioEquipos } = await servidor.ssrLoadModule('/src/services/equipos.ts')
  const { crearServicioInvernaderos } = await servidor.ssrLoadModule('/src/services/invernaderos.ts')
  const { validarInvernadero, datosCrearInvernadero } = await servidor.ssrLoadModule('/src/utils/invernaderos.ts')
  const { credencialVigente } = await servidor.ssrLoadModule('/src/types/equipos.ts')
  const formulario = { nombre: ' Norte ', ubicacion: ' Lima ', largo: '10', ancho: '5.25', alto: '', descripcion: 'Sector de riego' }

  await t.test('valida campos obligatorios y dimensiones separadas sin incluir área ni equipo', () => {
    assert.deepEqual(validarInvernadero(formulario), {})
    assert.deepEqual(datosCrearInvernadero(formulario), { name: 'Norte', location: 'Lima', length: 10, width: 5.25, description: 'Sector de riego' })
    const errores = validarInvernadero({ ...formulario, nombre: ' ', ubicacion: '', largo: '0', ancho: '1.001', alto: '1000000' })
    assert.deepEqual(Object.keys(errores), ['nombre', 'ubicacion', 'largo', 'ancho', 'alto'])
  })

  await t.test('respeta límites, opcionales y Unicode sin truncar el texto', () => {
    assert.deepEqual(validarInvernadero({ ...formulario, nombre: '🌱'.repeat(100), ubicacion: 'a'.repeat(200), largo: '0.01', ancho: '999999.99', alto: '2.25', descripcion: '🌱'.repeat(500) }), {})
    assert.ok(validarInvernadero({ ...formulario, nombre: 'a'.repeat(101), descripcion: 'a'.repeat(501) }).descripcion)
    for (const valor of ['', '-1', 'NaN', 'Infinity', '1.234', '1000000']) assert.ok(validarInvernadero({ ...formulario, largo: valor }).largo)
    assert.deepEqual(datosCrearInvernadero({ ...formulario, alto: '3', descripcion: '' }), { name: 'Norte', location: 'Lima', length: 10, width: 5.25, height: 3 })
  })

  await t.test('crea el invernadero solo y conserva sus dimensiones públicas', async () => {
    const servicio = crearServicioInvernaderos(async (ruta, opciones) => {
      assert.equal(ruta, '/greenhouses')
      assert.equal(opciones.method, 'POST')
      assert.deepEqual(JSON.parse(opciones.body), datosCrearInvernadero(formulario))
      return json({ id: '3', name: 'Norte', location: 'Lima', length: '10.00', width: '5.25', height: null, status: 'Activo', operationMode: 'Manual', role: 'ADMIN', description: 'Sector de riego' }, 201)
    })
    const dato = await servicio.crear(datosCrearInvernadero(formulario))
    assert.equal(dato.largo, '10.00')
    assert.equal(dato.modoOperacion, 'Manual')
  })

  await t.test('no repite un alta de invernadero cuando se pierde la respuesta', async () => {
    let llamadas = 0
    const servicio = crearServicioInvernaderos(async () => { llamadas++; throw new TypeError('Sin conexión') })
    await assert.rejects(servicio.crear(datosCrearInvernadero(formulario)), (error) => error.resultado === 'incierta')
    assert.equal(llamadas, 1)
  })

  await t.test('alta confirmada pero respuesta malformada queda distinguida de un rechazo', async () => {
    await assert.rejects(crearServicioInvernaderos(async () => json({}, 201)).crear(datosCrearInvernadero(formulario)), (error) => error.resultado === 'confirmada')
    await assert.rejects(crearServicioInvernaderos(async () => json({ message: 'interno' }, 400)).crear(datosCrearInvernadero(formulario)), (error) => error.resultado === 'rechazada' && error.status === 400 && !error.message.includes('interno'))
  })

  await t.test('el flujo completo crea equipo, sensor, clave y habilita sin cambiar otros recursos', async () => {
    let equipo = null
    const sensores = []
    const claves = []
    const llamadas = []
    const servicio = crearServicioEquipos(async (ruta, opciones = {}) => {
      const metodo = opciones.method || 'GET'
      const datos = opciones.body ? JSON.parse(opciones.body) : null
      llamadas.push([metodo, ruta])
      if (ruta === '/controllers' && metodo === 'GET') return json({ items: equipo ? [equipo] : [], nextBeforeId: null })
      if (ruta === '/controllers' && metodo === 'POST') {
        assert.deepEqual(datos, { greenhouseId: '3', name: 'ESP32 principal' })
        equipo = controlador()
        return json(equipo, 201)
      }
      if (ruta === '/controllers/7/sensors' && metodo === 'POST') {
        assert.deepEqual(datos, { type: 'HumedadSuelo', unit: '%' })
        sensores.push(sensor())
        return json(sensores[0], 201)
      }
      if (ruta === '/controllers/7/sensors') return json(sensores)
      if (ruta === '/controllers/7/credentials' && metodo === 'POST') {
        assert.deepEqual(datos, { expiresAt: null })
        claves.push(clave())
        return json({ ...claves[0], credential: `esp32_${'a'.repeat(43)}`, tokenType: 'Bearer' }, 201)
      }
      if (ruta === '/controllers/7/credentials') return json({ items: claves, nextBeforeId: null })
      if (ruta === '/controllers/7' && metodo === 'PATCH') {
        assert.deepEqual(datos, { active: true })
        equipo = { ...equipo, active: true }
        return json(equipo)
      }
      assert.fail(`Ruta inesperada ${metodo} ${ruta}`)
    })
    assert.equal(await servicio.consultar('3'), null)
    assert.equal((await servicio.registrar('3', ' ESP32 principal ')).activo, false)
    await servicio.agregarSensor('7', 'HumedadSuelo', ' % ')
    const emitida = await servicio.emitir('7', null)
    assert.equal(emitida.secreto.length, 49)
    assert.equal((await servicio.activar('7', true)).activo, true)
    assert.equal((await servicio.consultar('3')).id, '7')
    assert.equal((await servicio.sensores('7'))[0].id, '9')
    assert.equal((await servicio.credenciales('7'))[0].id, '11')
    assert.equal(llamadas.filter(([metodo]) => metodo === 'POST').length, 3)
    assert.ok(!llamadas.some(([, ruta]) => ruta.includes('/controllers/me') || ruta.includes('/telemetry')))
  })

  await t.test('localiza el ESP32 aunque esté en una página posterior y conserva bigint', async () => {
    const primero = 9223372036854775807n
    const items = Array.from({ length: 50 }, (_, indice) => controlador(String(primero - BigInt(indice)), { greenhouseId: '4' }))
    const cursor = items.at(-1).id
    const llamadas = []
    const equipo = await crearServicioEquipos(async (ruta) => {
      llamadas.push(ruta)
      return ruta === '/controllers' ? json({ items, nextBeforeId: cursor }) : json({ items: [controlador()], nextBeforeId: null })
    }).consultar('3')
    assert.equal(equipo.id, '7')
    assert.deepEqual(llamadas, ['/controllers', `/controllers?beforeId=${cursor}`])
  })

  await t.test('rechaza cursores repetidos y dos equipos para el mismo invernadero', async () => {
    await assert.rejects(crearServicioEquipos(async () => json({ items: [controlador()], nextBeforeId: '7' })).consultar('3'))
    await assert.rejects(crearServicioEquipos(async () => json({ items: [controlador('8'), controlador('7')], nextBeforeId: null })).consultar('3'), /varios controladores/)
  })

  await t.test('propaga la cancelación de las consultas y rechaza IDs antes del HTTP', async () => {
    const aborto = new AbortController()
    aborto.abort()
    let llamadas = 0
    const servicio = crearServicioEquipos(async () => { llamadas++; return json({}) })
    await assert.rejects(servicio.consultar('3', aborto.signal), { name: 'AbortError' })
    await assert.rejects(async () => servicio.registrar('../perfil', 'ESP32'))
    assert.equal(llamadas, 0)
  })

  await t.test('acepta todos los tipos reales y no permite nombres de sensores inventados', async () => {
    const servicio = crearServicioEquipos(async (_, opciones) => {
      const datos = JSON.parse(opciones.body)
      return json(sensor('9', datos), 201)
    })
    for (const tipo of ['HumedadAmbiental', 'HumedadSuelo', 'NivelAgua']) assert.equal((await servicio.agregarSensor('7', tipo, '%')).tipo, tipo)
    await assert.rejects(async () => servicio.agregarSensor('7', 'Temperatura', 'C'))
    await assert.rejects(async () => servicio.agregarSensor('7', 'HumedadSuelo', ' '.repeat(5)))
  })

  await t.test('asigna °C a temperatura y % a suelo/nivel sin pedir la unidad', async () => {
    const servicio = crearServicioEquipos(async (_, opciones) => json(sensor('9', JSON.parse(opciones.body)), 201))
    for (const [tipo, unidad] of [['Temperatura', '°C'], ['NivelAgua', '%'], ['HumedadSuelo', '%'], ['HumedadAmbiental', '%']]) {
      assert.equal((await servicio.agregarSensor('7', tipo)).unidad, unidad)
    }
  })

  await t.test('edita el registro correcto y elimina sin enviar cuerpos o borrar historial', async () => {
    const llamadas = []
    const servicio = crearServicioEquipos(async (ruta, opciones) => {
      llamadas.push([ruta, opciones])
      if (opciones.method === 'DELETE') return new Response(null, { status: 204 })
      return json(sensor('9', { type: 'Temperatura', unit: '°C' }))
    })
    assert.equal((await servicio.editarSensor('7', '9', 'Temperatura')).tipo, 'Temperatura')
    assert.deepEqual(JSON.parse(llamadas[0][1].body), { type: 'Temperatura', unit: '°C' })
    await servicio.eliminarSensor('7', '9')
    assert.equal(llamadas[1][0], '/controllers/7/sensors/9')
    assert.equal(llamadas[1][1].method, 'DELETE')
    assert.equal(llamadas[1][1].body, undefined)
    await assert.rejects(crearServicioEquipos(async () => json(sensor('10', { type: 'Temperatura', unit: '°C' }))).editarSensor('7', '9', 'Temperatura'))
  })

  await t.test('muestra restricciones conocidas y oculta mensajes internos del servidor', async () => {
    const mensaje = 'El sensor tiene mediciones. No se puede eliminar ni cambiar su tipo o unidad para conservar el historial.'
    const servicio = crearServicioEquipos(async () => json({ message: mensaje }, 409))
    await assert.rejects(servicio.eliminarSensor('7', '9'), (error) => error.message === mensaje && error.resultado === 'rechazada')
    await assert.rejects(crearServicioEquipos(async () => json({ message: 'SQL secreto' }, 409)).editarSensor('7', '9', 'Temperatura'), (error) => !error.message.includes('SQL'))
  })

  await t.test('no muestra sensores de otro equipo ni tipos duplicados', async () => {
    await assert.rejects(crearServicioEquipos(async () => json([sensor('9', { controllerId: '8' })])).sensores('7'))
    await assert.rejects(crearServicioEquipos(async () => json([sensor('9'), sensor('10')])).sensores('7'))
  })

  await t.test('proyecta metadatos sin secretos ni hashes aunque el JSON traiga campos adicionales', async () => {
    const [dato] = await crearServicioEquipos(async () => json({ items: [clave('11', { credential: 'no-exponer', credentialHash: 'no-exponer' })], nextBeforeId: null })).credenciales('7')
    assert.deepEqual(Object.keys(dato).sort(), ['controladorId', 'creadaEn', 'id', 'revocadaEn', 'venceEn'])
  })

  await t.test('valida expiración, tipo de token y pertenencia al emitir claves', async () => {
    let llamadas = 0
    const servicio = crearServicioEquipos(async () => { llamadas++; return json({ ...clave(), tokenType: 'Bearer', credential: `esp32_${'x'.repeat(43)}` }, 201) })
    await assert.rejects(async () => servicio.emitir('7', '2020-01-01T00:00:00Z'))
    await assert.rejects(async () => servicio.emitir('7', '2099-01-01T00:00:00'))
    assert.equal(llamadas, 0)
    assert.ok((await servicio.emitir('7', '2099-01-01T00:00:00Z')).secreto.startsWith('esp32_'))
    for (const extras of [{ controllerId: '8' }, { tokenType: 'otro' }, { credential: 'invalida' }]) {
      await assert.rejects(crearServicioEquipos(async () => json({ ...clave(), tokenType: 'Bearer', credential: `esp32_${'x'.repeat(43)}`, ...extras }, 201)).emitir('7', null), (error) => error.resultado === 'confirmada')
    }
  })

  await t.test('no reemite una clave ante red caída o un 5xx', async () => {
    for (const responder of [() => { throw new TypeError('Red caída') }, () => new Response(null, { status: 500 })]) {
      let llamadas = 0
      const servicio = crearServicioEquipos(async () => { llamadas++; return responder() })
      await assert.rejects(servicio.emitir('7', null), (error) => error.resultado === 'incierta')
      assert.equal(llamadas, 1)
    }
  })

  await t.test('rotación y revocación usan sus rutas exactas sin llamar al alta normal', async () => {
    const rutas = []
    const servicio = crearServicioEquipos(async (ruta, opciones) => {
      rutas.push([ruta, opciones.method])
      return opciones.method === 'DELETE' ? new Response(null, { status: 204 }) : json({ ...clave(), tokenType: 'Bearer', credential: `esp32_${'z'.repeat(43)}` }, 201)
    })
    await servicio.emitir('7', null, true)
    await servicio.revocar('7', '11')
    assert.deepEqual(rutas, [['/controllers/7/credentials/rotate', 'POST'], ['/controllers/7/credentials/11', 'DELETE']])
  })

  await t.test('403 y conflictos se muestran sin filtrar el mensaje interno del servidor', async () => {
    for (const status of [403, 409, 429]) {
      await assert.rejects(crearServicioEquipos(async () => json({ message: 'información interna' }, status)).registrar('3', 'ESP32'), (error) => error.status === status && error.resultado === 'rechazada' && !error.message.includes('interna'))
    }
  })

  await t.test('no confunde equipo habilitado con una comunicación real y permite bloquearlo', async () => {
    const servicio = crearServicioEquipos(async (_, opciones) => json(controlador('7', { active: JSON.parse(opciones.body).active })))
    const habilitado = await servicio.activar('7', true)
    assert.equal(habilitado.activo, true)
    assert.equal(habilitado.conexion, 'Desconectado')
    assert.equal(habilitado.ultimaComunicacion, null)
    assert.equal((await servicio.activar('7', false)).activo, false)
  })

  await t.test('clasifica credenciales vigentes, vencidas y revocadas con tiempo determinista', () => {
    const ahora = Date.parse(fecha)
    const base = { id: '11', controladorId: '7', creadaEn: fecha, venceEn: null, revocadaEn: null }
    assert.equal(credencialVigente(base, ahora), true)
    assert.equal(credencialVigente({ ...base, venceEn: fecha }, ahora), false)
    assert.equal(credencialVigente({ ...base, revocadaEn: fecha }, ahora), false)
    assert.equal(credencialVigente({ ...base, venceEn: '2027-01-01T00:00:00Z' }, ahora), true)
  })
  await t.test('el formulario muestra unidad fija y acciones en cada sensor sin entrada de unidad', async () => {
    const { default: Formulario } = await servidor.ssrLoadModule('/src/pages/ConfigurarEquipo/components/FormularioSensor.tsx')
    const { default: Panel } = await servidor.ssrLoadModule('/src/pages/ConfigurarEquipo/components/PanelSensores.tsx')
    const html = renderToStaticMarkup(createElement(Formulario, { tipos: ['Temperatura'], id: 'sensor', etiqueta: 'Agregar', deshabilitado: false, onGuardar: async () => true }))
    assert.ok(html.includes('°C'))
    assert.ok(!html.includes('<input'))
    assert.ok(!html.includes('Humedad ambiental'))
    const panel = renderToStaticMarkup(createElement(Panel, { sensores: [{ id: '9', controladorId: '7', tipo: 'Temperatura', unidad: '°C', conexion: 'Desconectado' }], deshabilitado: false, controladorActivo: false, onAgregar: async () => true, onEditar: async () => true, onEliminar: async () => true }))
    assert.ok(panel.includes('Editar Temperatura'))
    assert.ok(panel.includes('Eliminar Temperatura'))
    assert.ok(!panel.includes('value="Temperatura"'))
  })

  await t.test('ofrece los cuatro tipos y conserva humedad ambiental al agregar temperatura', async () => {
    const { tiposSensorRegistrables, nombresSensor } = await servidor.ssrLoadModule('/src/types/equipos.ts')
    const { default: Panel } = await servidor.ssrLoadModule('/src/pages/ConfigurarEquipo/components/PanelSensores.tsx')
    assert.deepEqual([...tiposSensorRegistrables].sort(), ['HumedadAmbiental', 'HumedadSuelo', 'NivelAgua', 'Temperatura'])
    assert.equal(nombresSensor.HumedadAmbiental, 'Humedad ambiental')
    const existentes = [{ id: '7', controladorId: '7', tipo: 'HumedadAmbiental', unidad: '%', conexion: 'Desconectado' }]
    const props = { sensores: existentes, deshabilitado: false, controladorActivo: false, onAgregar: async () => true, onEditar: async () => true, onEliminar: async () => true }
    const html = renderToStaticMarkup(createElement(Panel, props))
    assert.ok(html.includes('value="Temperatura"'))
    assert.ok(html.includes('Editar Humedad ambiental'))
    assert.ok(!html.includes('Registro anterior'))
    const completos = tiposSensorRegistrables.map((tipo, index) => ({ ...existentes[0], id: String(index + 1), tipo, unidad: tipo === 'Temperatura' ? '°C' : '%' }))
    assert.ok(renderToStaticMarkup(createElement(Panel, { ...props, sensores: completos })).includes('los cuatro tipos disponibles'))
  })

})
