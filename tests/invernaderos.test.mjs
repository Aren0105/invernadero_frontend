import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

/** Simula respuestas públicas sin crear invernaderos ni utilizar cuentas reales. */
const registro = (id, extras = {}) => ({ id, name: `Invernadero ${id}`, location: 'Lima', description: null, status: 'Activo', role: 'ADMIN', ...extras })
const pagina = (items, nextBeforeId = null) => Response.json({ items, nextBeforeId })

test('Consulta y búsqueda de invernaderos', async (t) => {
  const servidor = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  t.after(() => servidor.close())
  const { crearServicioInvernaderos } = await servidor.ssrLoadModule('/src/services/invernaderos.ts')
  const { filtrarInvernaderos, esIdInvernadero } = await servidor.ssrLoadModule('/src/types/invernaderos.ts')

  await t.test('lista vacía real', async () => {
    assert.deepEqual(await crearServicioInvernaderos(async () => pagina([])).listar(), [])
  })

  await t.test('recupera páginas completas antes de contar y buscar, conservando bigint', async () => {
    const primero = 9223372036854775807n
    const items = Array.from({ length: 50 }, (_, indice) => registro(String(primero - BigInt(indice))))
    const cursor = items.at(-1).id
    const llamadas = []
    const servicio = crearServicioInvernaderos(async (ruta) => {
      llamadas.push(ruta)
      return ruta === '/greenhouses' ? pagina(items, cursor) : pagina([registro('1', { name: 'Último jardín', status: 'Desactivado', role: 'OPERATOR' })])
    })
    const datos = await servicio.listar()
    assert.equal(datos.length, 51)
    assert.equal(datos[0].id, String(primero))
    assert.deepEqual(llamadas, ['/greenhouses', `/greenhouses?beforeId=${cursor}`])
    assert.equal(filtrarInvernaderos(datos, ' ultimo JARDIN ')[0].id, '1')
    assert.equal(datos.at(-1).estado, 'Desactivado')
    assert.equal(datos.at(-1).rol, 'OPERATOR')
  })

  await t.test('muestra la descripción del servidor y admite registros sin descripción', async () => {
    const datos = await crearServicioInvernaderos(async () => pagina([
      registro('3', { description: 'Zona de riego\nSector norte' }),
      registro('2'), registro('1', { description: '   ' }),
    ])).listar()
    assert.equal(datos[0].descripcion, 'Zona de riego\nSector norte')
    assert.equal(datos[1].descripcion, null)
    assert.equal(datos[2].descripcion, null)
  })

  await t.test('una búsqueda vacía restaura todos y las coincidencias usan solo el nombre', async () => {
    const datos = await crearServicioInvernaderos(async () => pagina([registro('2', { name: 'Norte' }), registro('1', { name: 'Sur' })])).listar()
    assert.deepEqual(filtrarInvernaderos(datos, ' '), datos)
    assert.deepEqual(filtrarInvernaderos(datos, 'Lima'), [])
    assert.deepEqual(filtrarInvernaderos(datos, 'or').map(({ id }) => id), ['2'])
  })

  await t.test('falla la consulta completa si una página intermedia falla', async () => {
    const servicio = crearServicioInvernaderos(async (ruta) => ruta.includes('?') ? new Response(null, { status: 500 }) : pagina([registro('2')], '2'))
    await assert.rejects(servicio.listar(), /No se pudieron cargar/)
  })

  await t.test('rechaza contrato inválido sin confundirlo con una lista vacía', async () => {
    for (const respuesta of [{ items: null, nextBeforeId: null }, { items: [registro('1', { status: 'Inventado' })], nextBeforeId: null }, { items: [registro('1', { description: 42 })], nextBeforeId: null }, { items: [], nextBeforeId: '7' }]) {
      await assert.rejects(crearServicioInvernaderos(async () => Response.json(respuesta)).listar())
    }
  })

  await t.test('rechaza cursores repetidos y registros duplicados', async () => {
    const servicio = crearServicioInvernaderos(async () => pagina([registro('2')], '2'))
    await assert.rejects(servicio.listar(), /orden|cursor/)
  })

  await t.test('respeta cancelación antes de empezar y entre páginas', async () => {
    const controlador = new AbortController()
    let llamadas = 0
    const servicio = crearServicioInvernaderos(async (_, opciones) => {
      llamadas++
      assert.equal(opciones.signal, controlador.signal)
      controlador.abort()
      return pagina([registro('2')], '2')
    })
    await assert.rejects(servicio.listar(controlador.signal), { name: 'AbortError' })
    assert.equal(llamadas, 1)
    await assert.rejects(servicio.listar(controlador.signal), { name: 'AbortError' })
    assert.equal(llamadas, 1)
  })

  await t.test('valida identificadores positivos en el rango PostgreSQL', () => {
    assert.equal(esIdInvernadero('9223372036854775807'), true)
    for (const valor of ['0', '01', '-1', '9223372036854775808', '../perfil', 1]) assert.equal(esIdInvernadero(valor), false)
  })

  await t.test('consulta el identificador solicitado y distingue una pertenencia no autorizada', async () => {
    const servicio = crearServicioInvernaderos(async (ruta) => {
      assert.equal(ruta, '/greenhouses/7')
      return Response.json(registro('7'))
    })
    assert.equal((await servicio.consultar('7')).nombre, 'Invernadero 7')
    await assert.rejects(crearServicioInvernaderos(async () => new Response(null, { status: 403 })).consultar('7'), /no está disponible/)
  })

  await t.test('rechaza parámetros inválidos sin consultar y no muestra otro registro', async () => {
    let llamadas = 0
    const servicio = crearServicioInvernaderos(async () => { llamadas++; return Response.json(registro('8')) })
    await assert.rejects(servicio.consultar('../perfil'), /identificador/)
    assert.equal(llamadas, 0)
    await assert.rejects(servicio.consultar('7'), /otro invernadero/)
  })
})
