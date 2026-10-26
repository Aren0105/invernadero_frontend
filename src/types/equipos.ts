export const tiposSensor = ['HumedadAmbiental', 'HumedadSuelo', 'NivelAgua'] as const
export type TipoSensor = typeof tiposSensor[number]
export type ConexionEquipo = 'Conectado' | 'Desconectado'
export type Controlador = {
  id: string; invernaderoId: string; nombre: string; activo: boolean; conexion: ConexionEquipo
  creadoEn: string | null; ultimaComunicacion: string | null
}
export type Sensor = { id: string; controladorId: string; tipo: TipoSensor; unidad: string; conexion: ConexionEquipo }
export type CredencialEquipo = { id: string; controladorId: string; creadaEn: string; venceEn: string | null; revocadaEn: string | null }
/** Secreto efímero: solo se conserva en memoria hasta que la persona confirma que lo guardó. */
export type CredencialEmitida = CredencialEquipo & { secreto: string }

export const nombresSensor: Record<TipoSensor, string> = {
  HumedadAmbiental: 'Humedad ambiental', HumedadSuelo: 'Humedad del suelo', NivelAgua: 'Nivel de agua',
}

/** Calcula la vigencia visual; el servidor vuelve a verificarla al activar o recibir mediciones. */
export function credencialVigente(credencial: CredencialEquipo, ahora: number): boolean {
  return !credencial.revocadaEn && (!credencial.venceEn || Date.parse(credencial.venceEn) > ahora)
}

/** Da formato local a una fecha sin inventar una comunicación para equipos que todavía no contactaron. */
export function fechaEquipo(fecha: string | null): string {
  return fecha ? new Date(fecha).toLocaleString('es-PE') : 'Sin registro'
}
