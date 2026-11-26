export type EstadoBomba = 'Encendida' | 'Apagada'
export type ModoRiego = 'Manual' | 'Automatico'

/** Configuración guardada del riego automático. */
export type ConfigAutomatica = { humedadMinima: number; duracionMinutos: number }

/** Estado confirmado por el servidor; la bomba solo se muestra encendida tras su confirmación. */
export type EstadoRiego = {
    bomba: EstadoBomba
    modo: ModoRiego
    /** Instante (ms desde epoch) en que el riego manual debe terminar; null si no hay riego en curso. */
    finEn: number | null
    automatico: ConfigAutomatica | null
}
