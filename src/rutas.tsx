import { cerrarSesion } from './services/api'
import Perfil from './pages/Perfil'
import NoEncontrada from './pages/NoEncontrada'
import { Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router'
import type { ContextoSesion } from './App'
import Login from './pages/Login'
import RegistroUsuario from './pages/RegistroUsuario'
import MisInvernaderos from './pages/MisInvernaderos'
import RegistrarInvernadero from './pages/RegistrarInvernadero'
import EditarInvernadero from './pages/EditarInvernadero'
import ConfigurarEquipo from './pages/ConfigurarEquipo'
import { esIdInvernadero } from './types/invernaderos'
import DetalleInvernadero from './pages/DetalleInvernadero'
import MonitoreoMediciones from './pages/MonitoreoMediciones'
import MonitoreoTiempoReal from './pages/MonitoreoTiempoReal'

/** Redirige al acceso y conserva la URL solicitada cuando no hay sesión vigente. */
export function RutaProtegida() {
  const sesion = useOutletContext<ContextoSesion>()
  const ubicacion = useLocation()
  return sesion.autenticado
    ? <Outlet context={sesion} />
    : <Navigate to="/login" replace state={{ destino: ubicacion.pathname + ubicacion.search + ubicacion.hash }} />
}

/** Recupera la ruta protegida solicitada después de un acceso exitoso. */
export function RutaLogin() {
  const sesion = useOutletContext<ContextoSesion>()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const solicitado: unknown = ubicacion.state?.destino
  const destino = typeof solicitado === 'string' && /^\/(?:invernaderos|perfil)(?:\/|$|[?#])/.test(solicitado)
    ? solicitado : '/invernaderos'

  if (sesion.autenticado) return <Navigate to={destino} replace />
  return <Login onRegistro={() => navegar('/registro')} mensajeSesion={sesion.mensaje} onAcceso={() => {
    navegar(destino, { replace: true })
  }} />
}

export function RutaRegistroUsuario() {
  const sesion = useOutletContext<ContextoSesion>()
  const navegar = useNavigate()
  return sesion.autenticado ? <Navigate to="/invernaderos" replace />
    : <RegistroUsuario onVolver={() => navegar('/login')} onRegistrado={() => navegar('/invernaderos', { replace: true })} />
}

export function RutaInvernaderos() {
  const navegar = useNavigate()
  return <MisInvernaderos onRegistrar={() => navegar('/invernaderos/nuevo')} onPerfil={() => navegar('/perfil')}
    onAbrir={(id) => navegar(`/invernaderos/${encodeURIComponent(id)}`)} onEditar={(id) => navegar(`/invernaderos/${encodeURIComponent(id)}/editar`)} />
}

/** Crear un invernadero exige sesión; el servidor asigna ADMIN al creador en ese recurso. */
export function RutaRegistroInvernadero() {
  const navegar = useNavigate()
  return <RegistrarInvernadero onVolver={() => navegar('/invernaderos')}
    onRegistrado={(id) => navegar(`/invernaderos/${encodeURIComponent(id)}`, { replace: true, state: { invernaderoCreado: id } })} />
}

/** Valida el identificador antes de consultar; la clave descarta datos al cambiar de invernadero. */
export function RutaEditarInvernadero() {
  const { invernaderoId } = useParams()
  const navegar = useNavigate()
  return esIdInvernadero(invernaderoId)
    ? <EditarInvernadero key={invernaderoId} id={invernaderoId} onVolver={() => navegar('/invernaderos')} />
    : <NoEncontrada />
}

export function RutaDetalle() {
  const navegar = useNavigate()
  const { invernaderoId } = useParams()
  const ubicacion = useLocation()
  return esIdInvernadero(invernaderoId)
    ? <DetalleInvernadero key={invernaderoId} id={invernaderoId} recienCreado={ubicacion.state?.invernaderoCreado === invernaderoId}
      onPerfil={() => navegar('/perfil')} onVolver={() => navegar('/invernaderos')} onMediciones={() => navegar('mediciones')} onConfigurar={() => navegar('equipo')} onEditar={() => navegar('editar')} />
    : <NoEncontrada />
}

/** La página verifica el rol actual con el servidor antes de consultar recursos administrativos del equipo. */
export function RutaConfigurarEquipo() {
  const navegar = useNavigate()
  const { invernaderoId } = useParams()
  return esIdInvernadero(invernaderoId)
    ? <ConfigurarEquipo key={invernaderoId} id={invernaderoId} onVolver={() => navegar(`/invernaderos/${encodeURIComponent(invernaderoId)}`)} />
    : <NoEncontrada />
}

export function RutaMediciones() {
  const navegar = useNavigate()
  const { invernaderoId } = useParams()
  const detalle = `/invernaderos/${encodeURIComponent(invernaderoId!)}`
  return <MonitoreoMediciones onVolver={() => navegar(detalle)} onTiempoReal={(tipo) => navegar(`${detalle}/mediciones/tiempo-real/${tipo}`)} />
}

/** Valida el tipo de sensor de la URL antes de mostrar la pantalla de tiempo real. */
export function RutaTiempoReal() {
  const navegar = useNavigate()
  const { invernaderoId, tipo } = useParams()
  const mediciones = `/invernaderos/${encodeURIComponent(invernaderoId!)}/mediciones`
  if (tipo !== 'HumedadSuelo' && tipo !== 'NivelAgua') return <Navigate to={mediciones} replace />
  return <MonitoreoTiempoReal tipo={tipo} onVolver={() => navegar(mediciones)} />
}

export function RutaNoEncontrada() { return <NoEncontrada /> }

/** Perfil protegido con datos de la sesión; el cierre solo navega al acceso tras revocar la cookie. */
export function RutaPerfil() {
  const { usuario } = useOutletContext<ContextoSesion>()
  const navegar = useNavigate()
  if (!usuario) return <Navigate to="/login" replace />
  return <Perfil usuario={usuario} onVolver={() => navegar('/invernaderos')} onCerrarSesion={async () => {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }} />
}
