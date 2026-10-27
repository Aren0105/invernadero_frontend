import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const rango = { desde: '2026-10-26T05:00:00.000Z', hasta: '2026-10-26T15:00:00.000Z' }
const sensor = { id: '9007199254740993', controladorId: '7', tipo: 'NivelAgua', unidad: 'cm', conexion: 'Desconectado' }
const consulta = { rango, pagina: 1, limite: 100, agrupacion: 'none' }
const muestra = (id, value, timestamp = '2026-10-26T06:00:00.000Z') => ({ id, value, timestamp, measuredAt: null, receivedAt: timestamp, readingId: `lectura:${id}` })

/** Respuesta del historial en memoria; no realiza escrituras ni usa credenciales reales. */
function pagina(items, opciones = {}) {
  const cantidad = opciones.cantidad ?? String(items.length)
  const total = opciones.total ?? cantidad
  const page = opciones.pagina ?? 1
  const limit = opciones.limite ?? 100
  return {
    sensor: { id: sensor.id, controllerId: '7', type: 'NivelAgua', unit: 'cm' }, range: { from: rango.desde, to: rango.hasta },
    groupBy: opciones.agrupacion ?? 'none',
    summary: cantidad === '0' ? { count: '0', minimum: null, maximum: null, average: null } : { count: cantidad, minimum: 0, maximum: 20, average: 10 },
    pagination: { page, limit, total, hasNext: BigInt(page) * BigInt(limit) < BigInt(total) }, items,
  }
}

test('Historial: fechas, permisos de lectura, unidades y páginas', async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  t.after(() => vite.close())
  const { crearServicioHistorial } = await vite.ssrLoadModule('/src/services/historial.ts')
  const { rangoHistorial, ordenarLecturas, segmentarLecturas, fechaLectura } = await vite.ssrLoadModule('/src/types/mediciones.ts')
  const { totalPaginas, valorMedicion } = await vite.ssrLoadModule('/src/types/historial.ts')

  await t.test('Hoy comienza a medianoche de Perú aunque UTC ya corresponda a otro día', () => {
    const ahora = Date.parse('2026-10-26T03:00:00.000Z')
    assert.deepEqual(rangoHistorial('hoy', ahora), { desde: '2026-10-25T05:00:00.000Z', hasta: '2026-10-26T03:00:00.000Z' })
    assert.deepEqual(rangoHistorial('semana', ahora), { desde: '2026-10-19T05:00:00.000Z', hasta: '2026-10-26T03:00:00.000Z' })
    assert.ok(fechaLectura('2026-10-26T03:00:00.000Z').includes('25/10'))
  })

  await t.test('el instante exacto de medianoche produce un intervalo consultable y fechas inválidas se rechazan', () => {
    const intervalo = rangoHistorial('hoy', Date.parse('2026-10-26T05:00:00Z'))
    assert.ok(Date.parse(intervalo.hasta) > Date.parse(intervalo.desde))
    assert.throws(() => rangoHistorial('hoy', NaN))
    assert.equal(fechaLectura('invalida'), '—')
  })

  await t.test('consulta el inventario propio sin endpoints administrativos y distingue equipo ausente', async () => {
    const rutas = []
    const servicio = crearServicioHistorial(async (ruta) => { rutas.push(ruta); return Response.json({ greenhouseId: '2', controllerId: null, items: [] }) })
    assert.deepEqual(await servicio.sensores('2'), { invernaderoId: '2', controladorId: null, sensores: [] })
    assert.deepEqual(rutas, ['/greenhouses/2/sensors'])
    const conEquipo = crearServicioHistorial(async () => Response.json({ greenhouseId: '2', controllerId: '7', items: [] }))
    assert.deepEqual(await conEquipo.sensores('2'), { invernaderoId: '2', controladorId: '7', sensores: [] })
  })

  await t.test('proyecta los tres tipos de sensor y sus unidades sin claves adicionales', async () => {
    const items = ['HumedadAmbiental', 'HumedadSuelo', 'NivelAgua'].map((type, indice) => ({ id: String(indice + 1), controllerId: '7', type, unit: indice === 2 ? 'cm' : '%', connectionStatus: 'Desconectado', credential: 'no-exponer' }))
    const respuesta = await crearServicioHistorial(async () => Response.json({ greenhouseId: '2', controllerId: '7', items })).sensores('2')
    assert.equal(respuesta.sensores.length, 3)
    assert.equal(respuesta.sensores[2].unidad, 'cm')
    assert.ok(respuesta.sensores.every((dato) => !('credential' in dato)))
  })

  await t.test('rechaza inventario ajeno, sensores cruzados, duplicados y unidades inválidas', async () => {
    const item = { id: '9', controllerId: '7', type: 'NivelAgua', unit: 'cm', connectionStatus: 'Desconectado' }
    for (const dato of [
      { greenhouseId: '3', controllerId: null, items: [] },
      { greenhouseId: '2', controllerId: null, items: [item] },
      { greenhouseId: '2', controllerId: '8', items: [item] },
      { greenhouseId: '2', controllerId: '7', items: [item, item] },
      { greenhouseId: '2', controllerId: '7', items: [{ ...item, unit: '' }] },
    ]) await assert.rejects(crearServicioHistorial(async () => Response.json(dato)).sensores('2'))
  })

  await t.test('envía from/to fijos y conserva el bigint y todas las lecturas que comparten fecha', async () => {
    const respuesta = pagina([muestra('9007199254740993', 5), muestra('9007199254740994', 10)])
    const datos = await crearServicioHistorial(async (ruta) => {
      const url = new URL(ruta, 'https://prueba.invalid')
      assert.equal(url.pathname, `/telemetry/sensors/${sensor.id}/history`)
      assert.equal(url.searchParams.get('from'), rango.desde)
      assert.equal(url.searchParams.get('to'), rango.hasta)
      assert.equal(url.searchParams.get('period'), null)
      return Response.json(respuesta)
    }).consultar(sensor, consulta)
    assert.equal(datos.lecturas.length, 2)
    assert.equal(ordenarLecturas(datos.lecturas).length, 2)
    assert.equal(datos.lecturas[1].id, '9007199254740994')
    assert.equal(datos.sensor.unidad, 'cm')
  })

  await t.test('la página 2 usa el mismo intervalo y no confunde su gráfico con el resumen completo', async () => {
    const rutas = []
    const servicio = crearServicioHistorial(async (ruta) => {
      const url = new URL(ruta, 'https://prueba.invalid')
      rutas.push(url)
      const page = Number(url.searchParams.get('page'))
      return Response.json(pagina(page === 1 ? [muestra('1', 5), muestra('2', 10)] : [muestra('3', 15)], { cantidad: '3', pagina: page, limite: 2 }))
    })
    const primera = await servicio.consultar(sensor, { ...consulta, limite: 2 })
    const segunda = await servicio.consultar(sensor, { ...consulta, limite: 2, pagina: 2 })
    assert.equal(primera.paginacion.haySiguiente, true)
    assert.equal(segunda.paginacion.haySiguiente, false)
    assert.equal(segunda.lecturas.length, 1)
    assert.equal(segunda.resumen.cantidad, '3')
    assert.ok(rutas.every((url) => url.searchParams.get('from') === rango.desde && url.searchParams.get('to') === rango.hasta))
  })

  await t.test('mantiene un período sin lecturas con estadísticas null y no inventa ceros', async () => {
    const dato = await crearServicioHistorial(async () => Response.json(pagina([]))).consultar(sensor, consulta)
    assert.deepEqual(dato.resumen, { cantidad: '0', minimo: null, maximo: null, promedio: null })
    assert.equal(dato.lecturas.length, 0)
    assert.equal(valorMedicion(null, 'cm'), '—')
    assert.equal(valorMedicion(0, 'cm'), '0 cm')
  })

  await t.test('adapta promedios horarios con conteo de muestras y no conecta horas sin datos', async () => {
    const items = ['2026-10-26T06:00:00.000Z', '2026-10-26T08:00:00.000Z'].map((bucketStart) => ({ bucketStart, count: '2', minimum: 5, maximum: 15, average: 10 }))
    const dato = await crearServicioHistorial(async () => Response.json(pagina(items, { cantidad: '4', total: '2', agrupacion: 'hour' }))).consultar(sensor, { ...consulta, agrupacion: 'hour' })
    assert.equal(dato.resumen.cantidad, '4')
    assert.equal(dato.paginacion.total, '2')
    assert.equal(dato.lecturas[0].conteo, '2')
    assert.deepEqual(segmentarLecturas(dato.lecturas, 3600000).map((grupo) => grupo.length), [1, 1])
  })

  await t.test('rechaza intervalos inválidos y límites fuera del contrato antes del HTTP', async () => {
    let llamadas = 0
    const servicio = crearServicioHistorial(async () => { llamadas++; return Response.json({}) })
    for (const filtros of [{ pagina: 0 }, { pagina: 10001 }, { limite: 501 }, { agrupacion: 'day' }, { rango: { ...rango, hasta: rango.desde } }, { rango: { desde: '2026-01-01T00:00:00Z', hasta: '2026-03-01T00:00:00Z' } }, { rango: { ...rango, hasta: '2026-10-26T15:00:00' } }]) {
      await assert.rejects(servicio.consultar(sensor, { ...consulta, ...filtros }))
    }
    await assert.rejects(servicio.sensores('../otro'))
    assert.equal(llamadas, 0)
  })

  await t.test('rechaza respuestas de otro sensor, unidad, rango o agrupación', async () => {
    for (const alterar of [
      (p) => { p.sensor.id = '8' }, (p) => { p.sensor.unit = '%' }, (p) => { p.range.to = '2026-10-26T16:00:00Z' },
      (p) => { p.groupBy = 'hour' }, (p) => { p.pagination.page = 2 },
    ]) {
      const respuesta = pagina([muestra('1', 10)])
      alterar(respuesta)
      await assert.rejects(crearServicioHistorial(async () => Response.json(respuesta)).consultar(sensor, consulta))
    }
  })

  await t.test('detecta páginas incompletas, registros repetidos, fechas fuera de rango y cifras inválidas', async () => {
    for (const alterar of [
      (p) => { p.items = [] }, (p) => { p.items[0].value = null }, (p) => { p.items[0].value = -1 },
      (p) => { p.items[0].timestamp = rango.hasta }, (p) => { p.summary.count = 1 },
      (p) => { p.pagination.hasNext = true }, (p) => { p.summary.average = 30 },
    ]) {
      const respuesta = pagina([muestra('1', 10)])
      alterar(respuesta)
      await assert.rejects(crearServicioHistorial(async () => Response.json(respuesta)).consultar(sensor, consulta))
    }
    await assert.rejects(crearServicioHistorial(async () => Response.json(pagina([muestra('1', 5), muestra('1', 10)]))).consultar(sensor, consulta))
  })

  await t.test('conserva conteos grandes como texto y calcula páginas sin perder precisión', async () => {
    const grande = '9007199254740993'
    const dato = await crearServicioHistorial(async () => Response.json(pagina([muestra('1', 10)], { cantidad: grande, limite: 1 }))).consultar(sensor, { ...consulta, limite: 1 })
    assert.equal(dato.resumen.cantidad, grande)
    assert.equal(totalPaginas(grande, 1), 9007199254740993n)
  })

  await t.test('un 403, 429 o una respuesta no JSON son errores, no estados vacíos ni reintentos automáticos', async () => {
    for (const status of [403, 429, 500]) {
      let llamadas = 0
      const servicio = crearServicioHistorial(async () => { llamadas++; return Response.json({ message: 'Interno' }, { status }) })
      await assert.rejects(servicio.consultar(sensor, consulta), (error) => error.status === status)
      assert.equal(llamadas, 1)
    }
    await assert.rejects(crearServicioHistorial(async () => new Response('No es JSON')).consultar(sensor, consulta))
  })

  await t.test('propaga la cancelación sin recuperar otras páginas ni sensores', async () => {
    const controlador = new AbortController()
    controlador.abort()
    const servicio = crearServicioHistorial(async (_, opciones) => { opciones.signal.throwIfAborted(); return Response.json({}) })
    await assert.rejects(servicio.consultar(sensor, consulta, controlador.signal), { name: 'AbortError' })
  })

  await t.test('la gráfica renderiza cm, dos muestras simultáneas y promedios sin unir huecos', async (t) => {
    const errores = []
    t.mock.method(console, 'error', (...argumentos) => errores.push(argumentos))
    const { default: Grafica } = await vite.ssrLoadModule('/src/components/GraficaMediciones.tsx')
    const html = renderToStaticMarkup(createElement(Grafica, { nombre: 'Nivel de agua', unidad: 'cm', alcance: 'Gráfica de la página 2', lecturas: [{ id: '1', fechaHora: rango.desde, valor: 2 }, { id: '2', fechaHora: rango.desde, valor: 3 }] }))
    assert.equal((html.match(/<circle /g) ?? []).length, 2)
    assert.ok(html.includes('Nivel de agua (cm)'))
    assert.ok(html.includes('Gráfica de la página 2'))
    assert.ok(!html.includes('en porcentaje'))
    const hueco = renderToStaticMarkup(createElement(Grafica, { nombre: 'Nivel de agua', unidad: 'cm', promedios: true, lecturas: [{ id: 'hora1', fechaHora: rango.desde, valor: 2, conteo: '2' }, { id: 'hora2', fechaHora: '2026-10-26T07:00:00Z', valor: 3, conteo: '1' }] }))
    assert.ok(!hueco.includes('<polyline'))
    assert.ok(hueco.includes('Promedios por hora'))
    assert.equal(errores.length, 0)
  })
  await t.test('consulta temperaturas negativas sin aceptarlas en humedad o nivel', async () => {
    const temperatura = { ...sensor, tipo: 'Temperatura', unidad: '°C' }
    const respuesta = pagina([muestra('1', -5)])
    respuesta.sensor = { ...respuesta.sensor, type: 'Temperatura', unit: '°C' }
    respuesta.summary = { count: '1', minimum: -5, maximum: -5, average: -5 }
    const servicio = crearServicioHistorial(async () => Response.json(respuesta))
    assert.equal((await servicio.consultar(temperatura, consulta)).lecturas[0].valor, -5)
    respuesta.sensor = { ...respuesta.sensor, type: 'NivelAgua', unit: 'cm' }
    await assert.rejects(servicio.consultar(sensor, consulta))
  })

})
