import MonitoreoMediciones from './pages/MonitoreoMediciones'
import MonitoreoTiempoReal from './pages/MonitoreoTiempoReal'
import type { TipoMedicion } from './types/mediciones'
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import MisInvernaderos from './pages/MisInvernaderos'
import RegistrarInvernadero from './pages/RegistrarInvernadero'
import DetalleInvernadero from './pages/DetalleInvernadero'
import Alertas, { alertasEjemplo } from './pages/Alertas'
import DetalleAlerta from './pages/DetalleAlerta'
import ConfiguracionAlertas from './pages/ConfiguracionAlertas'
import { cerrarSesionLocal } from './services/api'

type Pantalla = 'invernaderos' | 'registro' | 'detalle' | 'mediciones' | 'tiempoReal' | 'alertas' | 'detalleAlerta' | 'configuracionAlertas'
export default function App() {
  const [sensorSeleccionado, setSensorSeleccionado] = useState<TipoMedicion>('HumedadSuelo')
  const [sesionHasta, setSesionHasta] = useState<number | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>('invernaderos')
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(alertasEjemplo[0].id)


  useEffect(() => {
    if (!sesionHasta) return
    const temporizador = window.setTimeout(() => {
      cerrarSesionLocal()
      setSesionHasta(null)
    }, Math.max(0, sesionHasta - Date.now()))
    return () => window.clearTimeout(temporizador)
  }, [sesionHasta])

  function navegar(destino: Pantalla) {
    setPantalla(destino)
    window.scrollTo(0, 0)
  }



  const actual = !sesionHasta ? 'login' : pantalla

  return (
    <div className="min-h-dvh bg-black">
      <div className="mx-auto w-full max-w-[430px]">
        {actual === 'login' ? <Login onAcceso={(duracion) => {
          setSesionHasta(Date.now() + duracion * 1000)
          navegar('invernaderos')
        }} /> : actual === 'registro' ? (
          <RegistrarInvernadero onVolver={() => navegar('invernaderos')} />
        ) : actual === 'mediciones' ? (
          <MonitoreoMediciones onVolver={() => navegar('detalle')} onTiempoReal={(tipo) => { setSensorSeleccionado(tipo); navegar('tiempoReal') }} />
        ) : actual === 'tiempoReal' ? (
          <MonitoreoTiempoReal tipo={sensorSeleccionado} onVolver={() => navegar('mediciones')} />
        ) : actual === 'detalleAlerta' ? (
          <DetalleAlerta
            alerta={alertasEjemplo.find((alerta) => alerta.id === alertaSeleccionada) ?? alertasEjemplo[0]}
            onVolver={() => navegar('alertas')}
            onInicio={() => navegar('invernaderos')}
            onConfigurar={() => navegar('configuracionAlertas')}
          />
        ) : actual === 'configuracionAlertas' ? (
          <ConfiguracionAlertas onVolver={() => navegar('alertas')} onInicio={() => navegar('invernaderos')} />
        ) : actual === 'alertas' ? (
          <Alertas
            onAbrirAlerta={(id) => { setAlertaSeleccionada(id); navegar('detalleAlerta') }}
            onInicio={() => navegar('invernaderos')}
            onConfigurar={() => navegar('configuracionAlertas')}
          />
        ) : actual === 'detalle' ? (
          <DetalleInvernadero
            onVolver={() => navegar('invernaderos')}
            onMediciones={() => navegar('mediciones')}
            onAlertas={() => navegar('alertas')}
            onConfiguracionAlertas={() => navegar('configuracionAlertas')}
          />
        ) : (
          <MisInvernaderos
            onRegistrar={() => navegar('registro')}
            onAlertas={() => navegar('alertas')}
            onConfiguracionAlertas={() => navegar('configuracionAlertas')}
          />
        )}
      </div>
    </div>
  )
}






