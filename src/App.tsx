import { useEffect, useSyncExternalStore } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { gestorSesion, type UsuarioAutenticado } from './services/api'
import Boton from './components/ui/Boton'
import { Texto, Titulo } from './components/ui/Tipografia'

/** Perfil verificado compartido con las rutas; los tokens permanecen fuera de React. */
export type ContextoSesion = {
  autenticado: boolean
  usuario: UsuarioAutenticado | null
  mensaje: string | null
}

/** Recupera la sesión antes de abrir rutas y permite reintentar fallos sin exponer contenido privado. */
export default function App() {
  const sesion = useSyncExternalStore(gestorSesion.suscribir, gestorSesion.obtenerEstado)
  useEffect(() => {
    const desconectar = gestorSesion.conectar()
    void gestorSesion.restaurar().catch(() => {})
    return desconectar
  }, [])

  useEffect(() => {
    if (sesion.estado !== 'autenticada' || !sesion.venceEn) return
    const renovar = () => { void gestorSesion.renovar().catch(() => {}) }
    const comprobarAlVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() >= sesion.venceEn! - 30000) renovar()
    }
    // Se renueva cerca del vencimiento; focus/visibility cubren temporizadores suspendidos por el navegador.
    const temporizador = window.setTimeout(renovar, Math.max(1000, sesion.venceEn - Date.now() - 30000))
    document.addEventListener('visibilitychange', comprobarAlVolver)
    window.addEventListener('focus', comprobarAlVolver)
    window.addEventListener('online', comprobarAlVolver)
    return () => {
      window.clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', comprobarAlVolver)
      window.removeEventListener('focus', comprobarAlVolver)
      window.removeEventListener('online', comprobarAlVolver)
    }
  }, [sesion.estado, sesion.venceEn])

  const ocupado = sesion.estado === 'inicializando' || sesion.estado === 'cerrando'
  const pendiente = sesion.estado === 'cierre-pendiente'
  const bloqueada = ocupado || pendiente || sesion.estado === 'error'
  const contexto: ContextoSesion = { autenticado: sesion.estado === 'autenticada', usuario: sesion.usuario, mensaje: sesion.error }

  return <div className="min-h-dvh bg-black">
    <div className="mx-auto w-full max-w-[430px]">
      {bloqueada ? <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F5F8F5] px-8 py-12 text-center text-[#233D32]" aria-busy={ocupado}>
        {ocupado ? <>
          <LoaderCircle className="mb-4 h-8 w-8 animate-spin text-[#47885C]" aria-hidden="true" />
          <Texto role="status">{sesion.estado === 'cerrando' ? 'Cerrando sesión…' : 'Comprobando tu sesión…'}</Texto>
        </> : <>
          <Titulo className="text-xl font-semibold">{pendiente ? 'Cierre de sesión pendiente' : 'No pudimos comprobar tu sesión'}</Titulo>
          <Texto role="alert" className="mt-4 text-sm text-red-700">{sesion.error}</Texto>
          {pendiente && <Texto className="mt-3 text-sm text-[#64766A]">Tu acceso está bloqueado en este dispositivo. Reintenta para confirmar el cierre en el servidor.</Texto>}
          <Boton type="button" variante="verde" className="mt-6" onClick={() => {
            void (pendiente ? gestorSesion.cerrarSesion() : gestorSesion.renovar()).catch(() => {})
          }}>{pendiente ? 'Reintentar cierre' : 'Reintentar'}</Boton>
          {!pendiente && <Boton type="button" className="mt-4 min-h-11 text-sm text-red-700" onClick={() => { void gestorSesion.cerrarSesion().catch(() => {}) }}>Cerrar sesión</Boton>}
        </>}
      </main> : <Outlet key={sesion.usuario?.id ?? 'sin-sesion'} context={contexto} />}
    </div>
    <ScrollRestoration />
  </div>
}
