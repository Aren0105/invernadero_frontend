/** Metadatos de coordinación; nunca contienen tokens, correos ni datos del perfil. */
export type MarcaSesion = { revision: string; estado: 'activa' | 'cerrada'; cierrePendiente: boolean }

/** Dependencias de navegador sustituibles para comprobar las carreras sin cookies reales. */
export type CoordinacionSesion = {
  exclusiva: <T>(operacion: () => Promise<T>) => Promise<T>
  leer: () => MarcaSesion | null
  escribir: (marca: MarcaSesion) => void
  escuchar: (alCambiar: () => void) => () => void
}

/** Serializa operaciones de cookie entre pestañas del mismo origen mediante Web Locks.
 * Requiere HTTPS o localhost y almacenamiento local habilitado; solo persiste metadatos no secretos.
 */
export function crearCoordinacionSesion(ambito: string): CoordinacionSesion {
  const clave = `aquasmart:sesion:${ambito}`
  const canal = `${clave}:cambios`
  let emisor: BroadcastChannel | undefined
  return {
    async exclusiva(operacion) {
      if (typeof navigator === 'undefined' || !navigator.locks) {
        throw new Error('Para mantener tu sesión, abre la aplicación con HTTPS o localhost en un navegador actualizado.')
      }
      try {
        return await navigator.locks.request(clave, { signal: AbortSignal.timeout(30000) }, operacion)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw new Error('La sesión se está actualizando en otra pestaña. Espera un momento e inténtalo nuevamente.', { cause: error })
        }
        throw error
      }
    },
    leer() {
      const texto = localStorage.getItem(clave)
      if (!texto) return null
      const dato = JSON.parse(texto) as MarcaSesion
      if (typeof dato.revision !== 'string' || !['activa', 'cerrada'].includes(dato.estado) || typeof dato.cierrePendiente !== 'boolean') {
        throw new Error('No se pudo leer el estado de la sesión. Revisa el almacenamiento del navegador.')
      }
      return dato
    },
    escribir(marca) {
      localStorage.setItem(clave, JSON.stringify(marca))
      emisor?.postMessage('cambio')
    },
    escuchar(alCambiar) {
      const alGuardar = (evento: StorageEvent) => {
        if (evento.key === clave || evento.key === null) alCambiar()
      }
      window.addEventListener('storage', alGuardar)
      if (typeof BroadcastChannel !== 'undefined') {
        emisor = new BroadcastChannel(canal)
        emisor.addEventListener('message', alCambiar)
      }
      return () => {
        window.removeEventListener('storage', alGuardar)
        emisor?.close()
        emisor = undefined
      }
    },
  }
}
