import { useState } from 'react'
import MisInvernaderos from './pages/MisInvernaderos'
import RegistrarInvernadero from './pages/RegistrarInvernadero'
import DetalleInvernadero from './pages/DetalleInvernadero'

type Pantalla = 'invernaderos' | 'registro' | 'detalle'

export default function App() {
  // Permite revisar el diseño con /#detalle sin inventar invernaderos.
  const [pantalla, setPantalla] = useState<Pantalla>(
    () => window.location.hash === '#detalle' ? 'detalle' : 'invernaderos',
  )

  function navegar(destino: Pantalla) {
    setPantalla(destino)
    window.history.replaceState(null, '', destino === 'detalle' ? '#detalle' : window.location.pathname + window.location.search)
    window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-dvh bg-black">
      <div className="mx-auto w-full max-w-[430px]">
        {pantalla === 'registro' ? (
          <RegistrarInvernadero onVolver={() => navegar('invernaderos')} />
        ) : pantalla === 'detalle' ? (
          <DetalleInvernadero onVolver={() => navegar('invernaderos')} />
        ) : (
          <MisInvernaderos onRegistrar={() => navegar('registro')} />
        )}
      </div>
    </div>
  )
}
