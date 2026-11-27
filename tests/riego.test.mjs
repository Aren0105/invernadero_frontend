import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

/** Simula respuestas públicas del servidor sin usar controladores ni cuentas reales. */
const estado = (extras = {}) => ({ pumpStatus: 'Apagada', operationMode: 'Manual', endsAt: null, autoConfig: null, ...extras })

test('Control de riego', async (t) => {
    const servidor = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
    t.after(() => servidor.close())
    const { crearServicioRiego } = await servidor.ssrLoadModule('/src/services/riego.ts')
    const { validarDuracion, validarHumedad, validarAutomatico, duracionMaxima, formatearRestante } = await servidor.ssrLoadModule('/src/utils/riego.ts')

    await t.test('consulta el estado y convierte fechas y decimales del servidor', async () => {
        const servicio = crearServicioRiego(async (ruta) => {
            assert.equal(ruta, '/greenhouses/7/irrigation')
            return Response.json(estado({ pumpStatus: 'Encendida', endsAt: '2030-01-01T00:00:00.000Z', operationMode: 'Automatico', autoConfig: { minSoilHumidity: '30.00', durationMinutes: 10 } }))
        })
        const datos = await servicio.consultar('7')
        assert.equal(datos.bomba, 'Encendida')
        assert.equal(datos.finEn, Date.parse('2030-01-01T00:00:00.000Z'))
        assert.deepEqual(datos.automatico, { humedadMinima: 30, duracionMinutos: 10 })
    })

    await t.test('rechaza identificadores y duraciones inválidos antes de enviar', async () => {
        let llamadas = 0
        const servicio = crearServicioRiego(async () => { llamadas++; return Response.json(estado()) })
        await assert.rejects(async () => servicio.consultar('../perfil'), /identificador/)
        for (const minutos of [0, -1, 1.5, NaN]) await assert.rejects(async () => servicio.iniciar('7', minutos), /duración/)
        assert.equal(llamadas, 0)
    })

    await t.test('rechaza estados con un contrato inválido', async () => {
        for (const cuerpo of [{ ...estado(), pumpStatus: 'Rota' }, { ...estado(), endsAt: 'ayer' }, { ...estado(), autoConfig: { minSoilHumidity: 'x', durationMinutes: 1 } }]) {
            await assert.rejects(crearServicioRiego(async () => Response.json(cuerpo)).consultar('7'))
        }
    })

    await t.test('inicia el riego y solo acepta la bomba encendida como confirmación', async () => {
        const servicio = crearServicioRiego(async (ruta, opciones) => {
            assert.equal(ruta, '/greenhouses/7/irrigation/start')
            assert.equal(opciones.method, 'POST')
            assert.deepEqual(JSON.parse(opciones.body), { durationMinutes: 15 })
            return Response.json(estado({ pumpStatus: 'Encendida', endsAt: '2030-01-01T00:00:00.000Z' }))
        })
        assert.equal((await servicio.iniciar('7', 15)).bomba, 'Encendida')
        const sinConfirmar = crearServicioRiego(async () => Response.json(estado()))
        await assert.rejects(sinConfirmar.iniciar('7', 15), (error) => error.resultado === 'confirmada')
    })

    await t.test('detiene el riego y exige la bomba apagada', async () => {
        const servicio = crearServicioRiego(async (ruta, opciones) => {
            assert.equal(ruta, '/greenhouses/7/irrigation/stop')
            assert.equal(opciones.method, 'POST')
            return Response.json(estado())
        })
        assert.equal((await servicio.detener('7')).bomba, 'Apagada')
        await assert.rejects(crearServicioRiego(async () => Response.json(estado({ pumpStatus: 'Encendida' }))).detener('7'), (error) => error.resultado === 'confirmada')
    })

    await t.test('guarda y cancela el riego automático con confirmación exacta', async () => {
        const guardar = crearServicioRiego(async (ruta, opciones) => {
            assert.equal(ruta, '/greenhouses/7/irrigation/auto')
            assert.equal(opciones.method, 'PUT')
            assert.deepEqual(JSON.parse(opciones.body), { minSoilHumidity: 30, durationMinutes: 10 })
            return Response.json(estado({ operationMode: 'Automatico', autoConfig: { minSoilHumidity: 30, durationMinutes: 10 } }))
        })
        assert.deepEqual((await guardar.guardarAutomatico('7', { humedadMinima: 30, duracionMinutos: 10 })).automatico, { humedadMinima: 30, duracionMinutos: 10 })
        const distinta = crearServicioRiego(async () => Response.json(estado({ autoConfig: { minSoilHumidity: 50, durationMinutes: 10 } })))
        await assert.rejects(distinta.guardarAutomatico('7', { humedadMinima: 30, duracionMinutos: 10 }), (error) => error.resultado === 'confirmada')
        const cancelar = crearServicioRiego(async (ruta, opciones) => {
            assert.equal(ruta, '/greenhouses/7/irrigation/auto')
            assert.equal(opciones.method, 'DELETE')
            return Response.json(estado())
        })
        assert.equal((await cancelar.cancelarAutomatico('7')).automatico, null)
    })

    await t.test('las órdenes no se reenvían ante respuestas perdidas o 5xx', async () => {
        for (const responder of [() => { throw new TypeError('Red caída') }, () => new Response(null, { status: 500 })]) {
            let llamadas = 0
            const servicio = crearServicioRiego(async () => { llamadas++; return responder() })
            await assert.rejects(servicio.iniciar('7', 5), (error) => error.resultado === 'incierta')
            await assert.rejects(servicio.detener('7'), (error) => error.resultado === 'incierta')
            assert.equal(llamadas, 2)
        }
    })

    await t.test('muestra solo los mensajes de rechazo públicos conocidos', async () => {
        const conocido = crearServicioRiego(async () => Response.json({ message: 'Controlador desconectado, no se puede enviar la orden' }, { status: 409 }))
        await assert.rejects(conocido.iniciar('7', 5), (error) => error.message === 'Controlador desconectado, no se puede enviar la orden' && error.resultado === 'rechazada')
        const interno = crearServicioRiego(async () => Response.json({ message: 'stack interno' }, { status: 409 }))
        await assert.rejects(interno.iniciar('7', 5), (error) => !error.message.includes('interno'))
    })

    await t.test('valida duración: obligatoria, entera, positiva y dentro del máximo', () => {
        assert.equal(validarDuracion('15'), null)
        assert.equal(validarDuracion(String(duracionMaxima)), null)
        for (const texto of ['', '  ', '0', '-3', '1.5', 'abc', String(duracionMaxima + 1)]) assert.notEqual(validarDuracion(texto), null, texto)
    })

    await t.test('valida humedad de 0 a 100 y agrupa los errores del automático', () => {
        for (const texto of ['0', '30', '100', '45.5']) assert.equal(validarHumedad(texto), null, texto)
        for (const texto of ['', '-1', '100.01', '101', 'x', '1.234']) assert.notEqual(validarHumedad(texto), null, texto)
        assert.deepEqual(validarAutomatico('30', '10'), {})
        assert.deepEqual(Object.keys(validarAutomatico('', '0')).sort(), ['duracion', 'humedad'])
    })

    await t.test('formatea la cuenta regresiva', () => {
        assert.equal(formatearRestante(125), '02:05')
        assert.equal(formatearRestante(-5), '00:00')
    })
})
