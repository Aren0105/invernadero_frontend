import { peticionApi } from './api'
import { esIdInvernadero } from '../types/invernaderos'
import { cuerpoJson, objeto, solicitarApi, type TransporteApi } from './contratoApi'
import type { ConfigAutomatica, EstadoRiego } from '../types/riego'

/** Mensajes de rechazo del servidor que pueden mostrarse tal cual a la persona. */
const mensajesPublicos = [
    'Controlador desconectado, no se puede enviar la orden',
    'Invernadero en mantenimiento/desactivado',
    'El riego ya está en curso',
] as const

/** Acepta números JSON o cadenas decimales (PostgreSQL numeric) y rechaza todo lo demás. */
function numero(valor: unknown): number {
    const convertido = typeof valor === 'string' && valor.trim() ? Number(valor) : valor
    if (typeof convertido !== 'number' || !Number.isFinite(convertido)) throw new Error('El servidor devolvió un estado de riego inválido.')
    return convertido
}

/** Interpreta únicamente el contrato público del estado de riego. */
function leerRiego(valor: unknown): EstadoRiego {
    const datos = objeto(valor)
    if ((datos.pumpStatus !== 'Encendida' && datos.pumpStatus !== 'Apagada') || (datos.operationMode !== 'Manual' && datos.operationMode !== 'Automatico')) {
        throw new Error('El servidor devolvió un estado de riego inválido.')
    }
    let finEn: number | null = null
    if (datos.endsAt != null) {
        finEn = typeof datos.endsAt === 'string' ? Date.parse(datos.endsAt) : NaN
        if (Number.isNaN(finEn)) throw new Error('El servidor devolvió un estado de riego inválido.')
    }
    let automatico: ConfigAutomatica | null = null
    if (datos.autoConfig != null) {
        const config = objeto(datos.autoConfig)
        automatico = { humedadMinima: numero(config.minSoilHumidity), duracionMinutos: numero(config.durationMinutes) }
    }
    return { bomba: datos.pumpStatus, modo: datos.operationMode, finEn, automatico }
}

/** Separa el contrato HTTP del riego de las páginas y permite sustituir el transporte en las pruebas. */
export function crearServicioRiego(enviar: TransporteApi) {
    function ruta(id: string): string {
        if (!esIdInvernadero(id)) throw new Error('El identificador del invernadero no es válido.')
        return `/greenhouses/${id}/irrigation`
    }

    /** Consulta el estado actual de la bomba, el modo y la configuración automática guardada. */
    function consultar(id: string, signal?: AbortSignal): Promise<EstadoRiego> {
        return solicitarApi(enviar, ruta(id), { signal }, leerRiego)
    }

    /** Inicia el riego manual; el servidor o el controlador lo detienen al cumplirse la duración. */
    function iniciar(id: string, minutos: number): Promise<EstadoRiego> {
        if (!Number.isInteger(minutos) || minutos < 1) throw new Error('La duración del riego no es válida.')
        return solicitarApi(enviar, `${ruta(id)}/start`, cuerpoJson('POST', { durationMinutes: minutos }), (valor) => {
            const estado = leerRiego(valor)
            if (estado.bomba !== 'Encendida') throw new Error('El servidor no confirmó el inicio del riego.')
            return estado
        }, mensajesPublicos)
    }

    /** Detiene el riego antes de que se cumpla la duración. */
    function detener(id: string): Promise<EstadoRiego> {
        return solicitarApi(enviar, `${ruta(id)}/stop`, cuerpoJson('POST', {}), (valor) => {
            const estado = leerRiego(valor)
            if (estado.bomba !== 'Apagada') throw new Error('El servidor no confirmó la detención del riego.')
            return estado
        }, mensajesPublicos)
    }

    /** Guarda o reemplaza la configuración del riego automático. */
    function guardarAutomatico(id: string, config: ConfigAutomatica): Promise<EstadoRiego> {
        return solicitarApi(enviar, `${ruta(id)}/auto`, cuerpoJson('PUT', { minSoilHumidity: config.humedadMinima, durationMinutes: config.duracionMinutos }), (valor) => {
            const estado = leerRiego(valor)
            if (estado.automatico?.humedadMinima !== config.humedadMinima || estado.automatico.duracionMinutos !== config.duracionMinutos) {
                throw new Error('El servidor no confirmó la configuración solicitada.')
            }
            return estado
        }, mensajesPublicos)
    }

    /** Cancela el riego automático y elimina su configuración. */
    function cancelarAutomatico(id: string): Promise<EstadoRiego> {
        return solicitarApi(enviar, `${ruta(id)}/auto`, { method: 'DELETE' }, (valor) => {
            const estado = leerRiego(valor)
            if (estado.automatico !== null) throw new Error('El servidor no confirmó la cancelación del riego automático.')
            return estado
        }, mensajesPublicos)
    }

    return { consultar, iniciar, detener, guardarAutomatico, cancelarAutomatico }
}

export const servicioRiego = crearServicioRiego(peticionApi)
