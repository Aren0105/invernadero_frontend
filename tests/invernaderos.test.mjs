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
  const { formularioDesdeInvernadero, datosActualizarInvernadero } = await servidor.ssrLoadModule('/src/utils/invernaderos.ts')

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

  await t.test('precarga dimensiones y convierte opcionales vacíos en un borrado explícito', async () => {
    const servicio = crearServicioInvernaderos(async () => Response.json(registro('7', { length: '12.25', width: '4.00', height: null, description: 'Original' })))
    const datos = formularioDesdeInvernadero(await servicio.consultar('7'))
    assert.deepEqual(datos, { nombre: 'Invernadero 7', ubicacion: 'Lima', largo: '12.25', ancho: '4.00', alto: '', descripcion: 'Original' })
    assert.deepEqual(datosActualizarInvernadero({ ...datos, descripcion: '' }), { name: 'Invernadero 7', location: 'Lima', length: 12.25, width: 4, height: null, description: null })
  })

  await t.test('edita campos generales sin transmitir estado, roles, equipo o propietario', async () => {
    const cuerpo = { name: 'Nuevo', location: 'Lima', length: 10, width: 5, height: null, description: null, status: 'Activo', role: 'OPERATOR', ownerId: 'ajeno' }
    const servicio = crearServicioInvernaderos(async (ruta, opciones) => {
      assert.equal(ruta, '/greenhouses/7')
      assert.equal(opciones.method, 'PATCH')
      assert.deepEqual(JSON.parse(opciones.body), { name: 'Nuevo', location: 'Lima', length: 10, width: 5, height: null, description: null })
      return Response.json(registro('7', { name: 'Nuevo', status: 'Desactivado', height: null, description: null }))
    })
    const resultado = await servicio.actualizar('7', cuerpo)
    assert.equal(resultado.nombre, 'Nuevo')
    assert.equal(resultado.estado, 'Desactivado')
    assert.equal(resultado.alto, null)
    assert.equal(resultado.descripcion, null)
  })

  await t.test('desactiva y reactiva por una ruta independiente, y la lista consulta el estado guardado', async () => {
    let datos = registro('7')
    const escrituras = []
    const servicio = crearServicioInvernaderos(async (ruta, opciones = {}) => {
      if (opciones.method === 'PATCH') {
        assert.equal(ruta, '/greenhouses/7/status')
        const cuerpo = JSON.parse(opciones.body)
        assert.deepEqual(Object.keys(cuerpo), ['status'])
        escrituras.push(cuerpo.status)
        datos = { ...datos, ...cuerpo }
        return Response.json(datos)
      }
      assert.equal(ruta, '/greenhouses')
      return pagina([datos])
    })
    assert.equal((await servicio.cambiarEstado('7', 'Desactivado')).estado, 'Desactivado')
    const desactivados = await servicio.listar()
    assert.equal(desactivados.length, 1)
    assert.equal(desactivados[0].estado, 'Desactivado')
    assert.equal((await servicio.cambiarEstado('7', 'Activo')).estado, 'Activo')
    assert.deepEqual(escrituras, ['Desactivado', 'Activo'])
  })

  await t.test('rechaza identificadores y estados inválidos antes de enviar escrituras', async () => {
    let llamadas = 0
    const servicio = crearServicioInvernaderos(async () => { llamadas++; return Response.json({}) })
    await assert.rejects(async () => servicio.actualizar('../otro', {}))
    await assert.rejects(async () => servicio.cambiarEstado('0', 'Desactivado'))
    await assert.rejects(async () => servicio.cambiarEstado('7', 'Eliminado'))
    assert.equal(llamadas, 0)
  })

  await t.test('no acepta otro recurso ni un estado diferente como confirmación de una escritura', async () => {
    const servicio = crearServicioInvernaderos(async () => Response.json(registro('8')))
    await assert.rejects(servicio.actualizar('7', {}), (error) => error.resultado === 'confirmada')
    const otroEstado = crearServicioInvernaderos(async () => Response.json(registro('7')))
    await assert.rejects(otroEstado.cambiarEstado('7', 'Desactivado'), (error) => error.resultado === 'confirmada')
  })

  await t.test('los rechazos de permisos y validación no provocan nuevas escrituras', async () => {
    for (const status of [400, 403, 404, 409]) {
      let llamadas = 0
      const servicio = crearServicioInvernaderos(async () => { llamadas++; return Response.json({ message: 'dato interno' }, { status }) })
      await assert.rejects(servicio.cambiarEstado('7', 'Desactivado'), (error) => error.status === status && error.resultado === 'rechazada' && !error.message.includes('interno'))
      assert.equal(llamadas, 1)
    }
  })

  await t.test('edición y desactivación no se reenvían ante respuestas perdidas o 5xx', async () => {
    for (const responder of [() => { throw new TypeError('Red caída') }, () => new Response(null, { status: 500 })]) {
      let llamadas = 0
      const servicio = crearServicioInvernaderos(async () => { llamadas++; return responder() })
      await assert.rejects(servicio.actualizar('7', {}), (error) => error.resultado === 'incierta')
      assert.equal(llamadas, 1)
      await assert.rejects(servicio.cambiarEstado('7', 'Desactivado'), (error) => error.resultado === 'incierta')
      assert.equal(llamadas, 2)
    }
  })
})
