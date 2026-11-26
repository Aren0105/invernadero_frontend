import isLength from 'validator/lib/isLength'
import type { Invernadero } from '../types/invernaderos'

/** Valores editables; la dimensión conserva su texto hasta completar la validación. */
export type FormularioInvernadero = { nombre: string; ubicacion: string; cultivo: string; dimension: string; descripcion: string }
/** Contrato HTTP: `crop` es texto y `area` son m² con hasta dos decimales. */
export type DatosCrearInvernadero = { name: string; location: string; crop: string; area: number; description?: string }
export type DatosActualizarInvernadero = Omit<DatosCrearInvernadero, 'description'> & { description: string | null }
export type ErroresInvernadero = Partial<Record<keyof FormularioInvernadero, string>>

/** Replica los límites del DTO: dos decimales, dimensión positiva y longitudes Unicode. */
export function validarInvernadero(datos: FormularioInvernadero): ErroresInvernadero {
  const errores: ErroresInvernadero = {}
  if (!isLength(datos.nombre.trim(), { min: 1, max: 100 })) errores.nombre = 'Usa entre 1 y 100 caracteres.'
  if (!isLength(datos.ubicacion.trim(), { min: 1, max: 200 })) errores.ubicacion = 'Usa entre 1 y 200 caracteres.'
  if (!isLength(datos.cultivo.trim(), { min: 1, max: 100 })) errores.cultivo = 'Usa entre 1 y 100 caracteres.'
  const texto = datos.dimension.trim()
  const numero = Number(texto)
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto) || numero < 0.01 || numero > 999999.99) {
    errores.dimension = 'Ingresa entre 0.01 y 999999.99 m², con hasta dos decimales.'
  }
  if (!isLength(datos.descripcion, { max: 500 })) errores.descripcion = 'Usa como máximo 500 caracteres.'
  return errores
}

/** Convierte un formulario válido al contrato de creación; nunca incluye equipos ni roles. */
export function datosCrearInvernadero(datos: FormularioInvernadero): DatosCrearInvernadero {
  if (Object.keys(validarInvernadero(datos)).length) throw new Error('Los datos del invernadero no son válidos.')
  return {
    name: datos.nombre.trim(), location: datos.ubicacion.trim(), crop: datos.cultivo.trim(), area: Number(datos.dimension),
    ...(datos.descripcion ? { description: datos.descripcion } : {}),
  }
}

/** Precarga el formulario conservando los decimales entregados por PostgreSQL y los opcionales vacíos. */
export function formularioDesdeInvernadero(datos: Invernadero): FormularioInvernadero {
  return { nombre: datos.nombre, ubicacion: datos.ubicacion, cultivo: datos.cultivo ?? '', dimension: datos.area ?? '', descripcion: datos.descripcion ?? '' }
}

/** Convierte una edición válida; null permite limpiar la descripción sin enviar ni alterar el estado. */
export function datosActualizarInvernadero(datos: FormularioInvernadero): DatosActualizarInvernadero {
  return { ...datosCrearInvernadero(datos), description: datos.descripcion || null }
}
