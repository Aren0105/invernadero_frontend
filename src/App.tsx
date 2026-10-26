import MonitoreoMediciones from './pages/MonitoreoMediciones'
import MonitoreoTiempoReal from './pages/MonitoreoTiempoReal'
import type { TipoMedicion } from './types/mediciones'
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import RegistroUsuario from './pages/RegistroUsuario'
import MisInvernaderos from './pages/MisInvernaderos'
import RegistrarInvernadero from './pages/RegistrarInvernadero'
import DetalleInvernadero from './pages/DetalleInvernadero'
import { cerrarSesionLocal, type RolUsuario } from './services/api'

type Pantalla = 'invernaderos' | 'registro' | 'alta' | 'detalle' | 'mediciones' | 'tiempoReal'
export default function App() {
  const [sensorSeleccionado, setSensorSeleccionado] = useState<TipoMedicion>('HumedadSuelo')
  const [sesionHasta, setSesionHasta] = useState<number | null>(null)
  const [rolUsuario, setRolUsuario] = useState<RolUsuario | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>('invernaderos')


  useEffect(() => {
    if (!sesionHasta) return
    const temporizador = window.setTimeout(() => {
      cerrarSesionLocal()
      setSesionHasta(null)
      setRolUsuario(null)
    }, Math.max(0, sesionHasta - Date.now()))
    return () => window.clearTimeout(temporizador)
  }, [sesionHasta])

  function navegar(destino: Pantalla) {
    setPantalla(destino)
    window.scrollTo(0, 0)
  }


  const actual = !sesionHasta && pantalla !== 'alta' ? 'login' : pantalla

  return (
    <div className="min-h-dvh bg-black">
      <div className="mx-auto w-full max-w-[430px]">
        {actual === 'login' ? <Login onRegistro={() => navegar('alta')} onAcceso={(duracion, rol) => {
          setSesionHasta(Date.now() + duracion * 1000)
          setRolUsuario(rol)
          navegar('invernaderos')
        }} /> : actual === 'alta' ? (
          <RegistroUsuario onVolver={() => navegar('invernaderos')} />
        ) : actual === 'registro' && rolUsuario === 'ADMIN' ? (
          <RegistrarInvernadero onVolver={() => navegar('invernaderos')} />
        ) : actual === 'mediciones' ? (
          <MonitoreoMediciones onVolver={() => navegar('detalle')} onTiempoReal={(tipo) => { setSensorSeleccionado(tipo); navegar('tiempoReal') }} />
        ) : actual === 'tiempoReal' ? (
          <MonitoreoTiempoReal tipo={sensorSeleccionado} onVolver={() => navegar('mediciones')} />
        ) : actual === 'detalle' ? (
          <DetalleInvernadero onVolver={() => navegar('invernaderos')} onMediciones={() => navegar('mediciones')} />
        ) : (
          <MisInvernaderos canRegistrar={rolUsuario === 'ADMIN'} onRegistrar={() => navegar('registro')} />
        )}
      </div>
    </div>
  )
}






