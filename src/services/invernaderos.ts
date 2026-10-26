import { peticionApi } from './api'
import { esIdInvernadero, nombresEstado, type EstadoInvernadero, type Invernadero } from '../types/invernaderos'
import { cuerpoJson, solicitarApi } from './contratoApi'
import type { DatosCrearInvernadero, DatosActualizarInvernadero } from '../utils/invernaderos'

type Transporte = (ruta: string, opciones?: RequestInit) => Promise<Response>

/** Interpreta únicamente el contrato público; una respuesta malformada nunca se presenta como una lista vacía. */
function leerInvernadero(valor: unknown): Invernadero {
  if (!valor || typeof valor !== 'object') throw new Error('El servidor devolvió un invernadero inválido.')
  const datos = valor as Record<string, unknown>
  if (!esIdInvernadero(datos.id) || typeof datos.name !== 'string' || typeof datos.location !== 'string'
    || (datos.description != null && typeof datos.description !== 'string')
    || !['Activo', 'EnMantenimiento', 'Desactivado'].includes(String(datos.status))
    || (datos.role !== 'ADMIN' && datos.role !== 'OPERATOR')) {
    throw new Error('El servidor devolvió un invernadero inválido.')
  }
  return {
    id: datos.id, nombre: datos.name, ubicacion: datos.location,
    descripcion: typeof datos.description === 'string' && datos.description.trim() ? datos.description : null,
    estado: datos.status as Invernadero['estado'], rol: datos.role,
    largo: typeof datos.length === 'string' ? datos.length : null,
    ancho: typeof datos.width === 'string' ? datos.width : null,
    alto: typeof datos.height === 'string' ? datos.height : null,
    modoOperacion: datos.operationMode === 'Manual' || datos.operationMode === 'Automatico' ? datos.operationMode : null,
  }
}

/** Separa el contrato HTTP de las páginas y permite sustituir el transporte en las pruebas. */
export function crearServicioInvernaderos(enviar: Transporte) {
  /** Edita solo los datos generales; los campos desconocidos del consumidor no pasan al cuerpo HTTP. */
  function actualizar(id: string, datos: DatosActualizarInvernadero): Promise<Invernadero> {
    if (!esIdInvernadero(id)) throw new Error('El identificador del invernadero no es válido.')
    const { name, location, length, width, height, description } = datos
    return solicitarApi(enviar, `/greenhouses/${id}`, cuerpoJson('PATCH', { name, location, length, width, height, description }), (valor) => {
      const actualizado = leerInvernadero(valor)
      if (actualizado.id !== id) throw new Error('El servidor devolvió otro invernadero.')
      return actualizado
    })
  }

  /** Cambia el estado por una acción independiente; desactivar conserva datos y bloquea las comunicaciones del ESP32. */
  function cambiarEstado(id: string, estado: EstadoInvernadero): Promise<Invernadero> {
    if (!esIdInvernadero(id) || !Object.hasOwn(nombresEstado, estado)) throw new Error('El invernadero o su estado no son válidos.')
    return solicitarApi(enviar, `/greenhouses/${id}/status`, cuerpoJson('PATCH', { status: estado }), (valor) => {
      const actualizado = leerInvernadero(valor)
      if (actualizado.id !== id || actualizado.estado !== estado) throw new Error('El servidor no confirmó el estado solicitado.')
      return actualizado
    })
  }
  /** Crea únicamente el invernadero; no reintenta ante pérdidas de conexión para evitar altas duplicadas. */
  function crear(datos: DatosCrearInvernadero): Promise<Invernadero> {
    const { name, location, length, width, height, description } = datos
    return solicitarApi(enviar, '/greenhouses', cuerpoJson('POST', { name, location, length, width, height, description }), leerInvernadero)
  }
  /** Consulta una pertenencia autorizada; rechaza identificadores inválidos antes de enviar la petición. */
  async function consultar(id: string, signal?: AbortSignal): Promise<Invernadero> {
    if (!esIdInvernadero(id)) throw new Error('El identificador del invernadero no es válido.')
    const respuesta = await enviar(`/greenhouses/${id}`, { signal })
    if (!respuesta.ok) throw new Error(respuesta.status === 403 || respuesta.status === 404
      ? 'El invernadero no está disponible o no tienes acceso.'
      : 'No se pudo cargar el invernadero. Inténtalo nuevamente.')
    const invernadero = leerInvernadero(await respuesta.json())
    if (invernadero.id !== id) throw new Error('El servidor devolvió otro invernadero.')
    return invernadero
  }

  /** Recupera todas las páginas autorizadas para buscar y contar sobre la lista completa.
   * @param signal Cancela la carga al abandonar la página o iniciar otra consulta.
   * @returns Pertenencias en orden descendente de identificador.
   * @throws Error si falla una página, el contrato no es válido o el cursor no avanza.
   */
  async function listar(signal?: AbortSignal): Promise<Invernadero[]> {
    const registros: Invernadero[] = []
    let cursor: string | null = null
    do {
      signal?.throwIfAborted()
      const respuesta = await enviar(`/greenhouses${cursor ? `?beforeId=${cursor}` : ''}`, { signal })
      if (!respuesta.ok) throw new Error(respuesta.status === 403
        ? 'No tienes permiso para consultar estos invernaderos.'
        : 'No se pudieron cargar los invernaderos. Inténtalo nuevamente.')
      const pagina: unknown = await respuesta.json()
      if (!pagina || typeof pagina !== 'object') throw new Error('La lista del servidor no es válida.')
      const { items, nextBeforeId } = pagina as Record<string, unknown>
      if (!Array.isArray(items) || items.length > 50 || (nextBeforeId !== null && !esIdInvernadero(nextBeforeId))) {
        throw new Error('La lista del servidor no es válida.')
      }
      const nuevos = items.map(leerInvernadero)
      let anterior = cursor
      for (const registro of nuevos) {
        if (anterior && BigInt(registro.id) >= BigInt(anterior)) throw new Error('El orden de la lista del servidor no es válido.')
        anterior = registro.id
      }
      if (nextBeforeId !== null && (!nuevos.length || nextBeforeId !== anterior || (cursor && BigInt(nextBeforeId) >= BigInt(cursor)))) {
        throw new Error('El cursor de la lista del servidor no es válido.')
      }
      registros.push(...nuevos)
      cursor = nextBeforeId as string | null
    } while (cursor)
    signal?.throwIfAborted()
    return registros
  }

  return { listar, consultar, crear, actualizar, cambiarEstado }
}

export const servicioInvernaderos = crearServicioInvernaderos(peticionApi)
