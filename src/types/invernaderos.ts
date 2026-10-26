export type EstadoInvernadero = 'Activo' | 'EnMantenimiento' | 'Desactivado'

/** Datos públicos de una pertenencia; los identificadores bigint conservan su precisión como cadenas. */
export type Invernadero = {
  id: string
  nombre: string
  descripcion: string | null
  estado: EstadoInvernadero
  rol: 'ADMIN' | 'OPERATOR'
  ubicacion: string
  largo: string | null
  ancho: string | null
  alto: string | null
  modoOperacion: 'Manual' | 'Automatico' | null
}

export const nombresEstado: Record<EstadoInvernadero, string> = {
  Activo: 'Activo',
  EnMantenimiento: 'En mantenimiento',
  Desactivado: 'Desactivado',
}

/** Valida los identificadores aceptados por PostgreSQL sin convertirlos a Number. */
export function esIdInvernadero(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[1-9]\d{0,18}$/.test(valor) && BigInt(valor) <= 9223372036854775807n
}

/** Busca una coincidencia parcial por nombre, ignorando mayúsculas y tildes. */
export function filtrarInvernaderos(invernaderos: Invernadero[], busqueda: string): Invernadero[] {
  const normalizar = (valor: string) => valor.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')
  const termino = normalizar(busqueda)
  return termino ? invernaderos.filter(({ nombre }) => normalizar(nombre).includes(termino)) : invernaderos
}
