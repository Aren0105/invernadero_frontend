/** Duración máxima permitida por el sistema, en minutos. Ajustar al límite real del backend/controlador. */
export const duracionMaxima = 240

export type ErroresAutomatico = { humedad?: string; duracion?: string }

/** Exige un entero mayor que cero dentro del máximo permitido; devuelve el mensaje de error o null. */
export function validarDuracion(texto: string): string | null {
    const valor = texto.trim()
    if (!valor) return 'Ingresa la duración en minutos.'
    if (!/^\d+$/.test(valor)) return 'Ingresa un número entero de minutos, sin decimales.'
    const minutos = Number(valor)
    if (minutos < 1) return 'La duración debe ser mayor que cero.'
    if (minutos > duracionMaxima) return `La duración máxima es de ${duracionMaxima} minutos.`
    return null
}

/** Acepta de 0 a 100 %, con hasta dos decimales. */
export function validarHumedad(texto: string): string | null {
    const valor = texto.trim()
    if (!valor) return 'Ingresa la humedad mínima.'
    if (!/^\d+(?:\.\d{1,2})?$/.test(valor) || Number(valor) > 100) return 'Ingresa un porcentaje entre 0 y 100.'
    return null
}

export function validarAutomatico(humedad: string, duracion: string): ErroresAutomatico {
    const errores: ErroresAutomatico = {}
    const errorHumedad = validarHumedad(humedad)
    const errorDuracion = validarDuracion(duracion)
    if (errorHumedad) errores.humedad = errorHumedad
    if (errorDuracion) errores.duracion = errorDuracion
    return errores
}

/** Formatea segundos como mm:ss para la cuenta regresiva. */
export function formatearRestante(segundos: number): string {
    const total = Math.max(0, Math.floor(segundos))
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
