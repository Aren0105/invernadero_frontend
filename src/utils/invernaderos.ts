import isLength from 'validator/lib/isLength'
import type { Invernadero } from '../types/invernaderos'

/** Valores editables; las dimensiones conservan su texto hasta completar la validación. */
export type FormularioInvernadero = { nombre: string; ubicacion: string; largo: string; ancho: string; alto: string; descripcion: string }
export type DatosCrearInvernadero = { name: string; location: string; length: number; width: number; height?: number; description?: string }
export type DatosActualizarInvernadero = Omit<DatosCrearInvernadero, 'height' | 'description'> & { height: number | null; description: string | null }
export type ErroresInvernadero = Partial<Record<keyof FormularioInvernadero, string>>

/** Replica los límites del DTO: dos decimales, dimensiones positivas y longitudes Unicode. */
export function validarInvernadero(datos: FormularioInvernadero): ErroresInvernadero {
  const errores: ErroresInvernadero = {}
  if (!isLength(datos.nombre.trim(), { min: 1, max: 100 })) errores.nombre = 'Usa entre 1 y 100 caracteres.'
  if (!isLength(datos.ubicacion.trim(), { min: 1, max: 200 })) errores.ubicacion = 'Usa entre 1 y 200 caracteres.'
  for (const campo of ['largo', 'ancho', 'alto'] as const) {
    const texto = datos[campo].trim()
    if (campo === 'alto' && !texto) continue
    const numero = Number(texto)
    if (!/^\d+(?:\.\d{1,2})?$/.test(texto) || numero < 0.01 || numero > 999999.99) {
      errores[campo] = 'Ingresa entre 0.01 y 999999.99 metros, con hasta dos decimales.'
    }
  }
  if (!isLength(datos.descripcion, { max: 500 })) errores.descripcion = 'Usa como máximo 500 caracteres.'
  return errores
}

/** Convierte un formulario válido al contrato de creación; nunca incluye equipos, roles ni área. */
export function datosCrearInvernadero(datos: FormularioInvernadero): DatosCrearInvernadero {
  if (Object.keys(validarInvernadero(datos)).length) throw new Error('Los datos del invernadero no son válidos.')
  return {
    name: datos.nombre.trim(), location: datos.ubicacion.trim(), length: Number(datos.largo), width: Number(datos.ancho),
    ...(datos.alto.trim() ? { height: Number(datos.alto) } : {}),
    ...(datos.descripcion ? { description: datos.descripcion } : {}),
  }
}

/** Precarga el formulario conservando los decimales entregados por PostgreSQL y los opcionales vacíos. */
export function formularioDesdeInvernadero(datos: Invernadero): FormularioInvernadero {
  return { nombre: datos.nombre, ubicacion: datos.ubicacion, largo: datos.largo ?? '', ancho: datos.ancho ?? '', alto: datos.alto ?? '', descripcion: datos.descripcion ?? '' }
}

/** Convierte una edición válida; null permite limpiar los opcionales sin enviar ni alterar el estado. */
export function datosActualizarInvernadero(datos: FormularioInvernadero): DatosActualizarInvernadero {
  return { ...datosCrearInvernadero(datos), height: datos.alto.trim() ? Number(datos.alto) : null, description: datos.descripcion || null }
}
