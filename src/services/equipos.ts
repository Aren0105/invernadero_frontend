import isLength from 'validator/lib/isLength'
import { peticionApi } from './api'
import { cuerpoJson, objeto, solicitarApi, type TransporteApi } from './contratoApi'
import { esIdInvernadero } from '../types/invernaderos'
import { tiposSensor, type Controlador, type CredencialEmitida, type CredencialEquipo, type Sensor, type TipoSensor, type ConexionEquipo } from '../types/equipos'

function id(valor: unknown): string {
  if (!esIdInvernadero(valor)) throw new Error('El identificador del recurso no es válido.')
  return valor
}

function fecha(valor: unknown): string {
  if (typeof valor !== 'string' || !Number.isFinite(Date.parse(valor))) throw new Error('La fecha del servidor no es válida.')
  return valor
}

function conexion(valor: unknown): ConexionEquipo {
  if (valor !== 'Conectado' && valor !== 'Desconectado') throw new Error('El estado de conexión no es válido.')
  return valor
}

/** Adapta perfiles públicos; descarta cualquier propiedad adicional, incluidas relaciones o secretos. */
function leerControlador(valor: unknown): Controlador {
  const dato = objeto(valor)
  if (typeof dato.name !== 'string' || typeof dato.active !== 'boolean') throw new Error('El controlador no es válido.')
  return {
    id: id(dato.id), invernaderoId: id(dato.greenhouseId), nombre: dato.name, activo: dato.active, conexion: conexion(dato.connectionStatus),
    creadoEn: dato.createdAt == null ? null : fecha(dato.createdAt), ultimaComunicacion: dato.lastSeenAt == null ? null : fecha(dato.lastSeenAt),
  }
}

function leerSensor(valor: unknown): Sensor {
  const dato = objeto(valor)
  if (!tiposSensor.includes(dato.type as TipoSensor) || typeof dato.unit !== 'string' || !isLength(dato.unit, { min: 1, max: 10 })) throw new Error('El sensor no es válido.')
  return { id: id(dato.id), controladorId: id(dato.controllerId), tipo: dato.type as TipoSensor, unidad: dato.unit, conexion: conexion(dato.connectionStatus) }
}

function leerCredencial(valor: unknown, controladorId: string): CredencialEquipo {
  const dato = objeto(valor)
  if (dato.controllerId !== controladorId) throw new Error('La credencial pertenece a otro controlador.')
  return {
    id: id(dato.id), controladorId, creadaEn: fecha(dato.createdAt),
    venceEn: dato.expiresAt == null ? null : fecha(dato.expiresAt), revocadaEn: dato.revokedAt == null ? null : fecha(dato.revokedAt),
  }
}

/** Contrato administrativo del equipo; todas las llamadas usan la sesión humana, nunca la clave de la placa. */
export function crearServicioEquipos(enviar: TransporteApi) {
  /** Recorre las páginas y valida cursores antes de publicar una lista completa. */
  async function paginas<T extends { id: string }>(ruta: string, interpretar: (dato: unknown) => T, signal?: AbortSignal): Promise<T[]> {
    const datos: T[] = []
    let cursor: string | null = null
    do {
      signal?.throwIfAborted()
      const pagina: { items: T[]; siguiente: string | null } = await solicitarApi(enviar, `${ruta}${cursor ? `?beforeId=${cursor}` : ''}`, { signal }, (valor) => {
        const dato = objeto(valor)
        if (!Array.isArray(dato.items) || dato.items.length > 50) throw new Error('La página del equipo no es válida.')
        const items = dato.items.map(interpretar)
        const siguiente = dato.nextBeforeId === null ? null : id(dato.nextBeforeId)
        let anterior = cursor
        for (const item of items) {
          if (anterior && BigInt(item.id) >= BigInt(anterior)) throw new Error('El orden de los recursos no es válido.')
          anterior = item.id
        }
        if (siguiente && (!items.length || siguiente !== anterior)) throw new Error('El cursor no avanza correctamente.')
        return { items, siguiente }
      })
      datos.push(...pagina.items)
      cursor = pagina.siguiente
    } while (cursor)
    return datos
  }

  /** La API no filtra por invernadero: recorre las pertenencias ADMIN y obtiene su único ESP32. */
  async function consultar(invernaderoId: string, signal?: AbortSignal): Promise<Controlador | null> {
    id(invernaderoId)
    const encontrados = (await paginas('/controllers', leerControlador, signal)).filter((dato) => dato.invernaderoId === invernaderoId)
    if (encontrados.length > 1) throw new Error('El servidor devolvió varios controladores para el mismo invernadero.')
    return encontrados[0] ?? null
  }

  function registrar(invernaderoId: string, nombre: string): Promise<Controlador> {
    id(invernaderoId)
    if (!isLength(nombre.trim(), { min: 1, max: 100 })) throw new Error('El nombre debe tener entre 1 y 100 caracteres.')
    return solicitarApi(enviar, '/controllers', cuerpoJson('POST', { greenhouseId: invernaderoId, name: nombre.trim() }), (valor) => {
      const equipo = leerControlador(valor)
      if (equipo.invernaderoId !== invernaderoId) throw new Error('El equipo pertenece a otro invernadero.')
      return equipo
    })
  }

  async function sensores(controladorId: string, signal?: AbortSignal): Promise<Sensor[]> {
    return solicitarApi(enviar, `/controllers/${id(controladorId)}/sensors`, { signal }, (valor) => {
      if (!Array.isArray(valor) || valor.length > 3) throw new Error('La lista de sensores no es válida.')
      const datos = valor.map(leerSensor)
      if (datos.some((dato) => dato.controladorId !== controladorId) || new Set(datos.map(({ tipo }) => tipo)).size !== datos.length
        || new Set(datos.map(({ id: sensorId }) => sensorId)).size !== datos.length) throw new Error('Los sensores del equipo no son válidos.')
      return datos
    })
  }

  function agregarSensor(controladorId: string, tipo: TipoSensor, unidad: string): Promise<Sensor> {
    if (!tiposSensor.includes(tipo) || !isLength(unidad.trim(), { min: 1, max: 10 })) throw new Error('Revisa el tipo de sensor y su unidad (de 1 a 10 caracteres).')
    return solicitarApi(enviar, `/controllers/${id(controladorId)}/sensors`, cuerpoJson('POST', { type: tipo, unit: unidad.trim() }), (valor) => {
      const sensor = leerSensor(valor)
      if (sensor.controladorId !== controladorId || sensor.tipo !== tipo) throw new Error('El sensor recibido no corresponde a la solicitud.')
      return sensor
    })
  }

  function credenciales(controladorId: string, signal?: AbortSignal): Promise<CredencialEquipo[]> {
    return paginas(`/controllers/${id(controladorId)}/credentials`, (dato) => leerCredencial(dato, controladorId), signal)
  }

  /** Emite o rota una clave sin reintentar. La clave original no se guarda ni se consulta posteriormente. */
  function emitir(controladorId: string, venceEn: string | null, reemplazar = false): Promise<CredencialEmitida> {
    if (venceEn && (!Number.isFinite(Date.parse(venceEn)) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(venceEn) || Date.parse(venceEn) <= Date.now())) throw new Error('El vencimiento debe ser una fecha futura con zona horaria.')
    return solicitarApi(enviar, `/controllers/${id(controladorId)}/credentials${reemplazar ? '/rotate' : ''}`, cuerpoJson('POST', { expiresAt: venceEn }), (valor) => {
      const dato = objeto(valor)
      if (dato.tokenType !== 'Bearer' || typeof dato.credential !== 'string' || !/^esp32_[A-Za-z0-9_-]{43}$/.test(dato.credential)) throw new Error('La credencial recibida no es válida.')
      return { ...leerCredencial(dato, controladorId), secreto: dato.credential }
    })
  }

  async function revocar(controladorId: string, credencialId: string): Promise<void> {
    await solicitarApi(enviar, `/controllers/${id(controladorId)}/credentials/${id(credencialId)}`, { method: 'DELETE' }, () => undefined)
  }

  function activar(controladorId: string, activo: boolean): Promise<Controlador> {
    return solicitarApi(enviar, `/controllers/${id(controladorId)}`, cuerpoJson('PATCH', { active: activo }), (valor) => {
      const equipo = leerControlador(valor)
      if (equipo.id !== controladorId || equipo.activo !== activo) throw new Error('El controlador recibido no corresponde a la solicitud.')
      return equipo
    })
  }

  return { consultar, registrar, sensores, agregarSensor, credenciales, emitir, revocar, activar }
}

export const servicioEquipos = crearServicioEquipos(peticionApi)
