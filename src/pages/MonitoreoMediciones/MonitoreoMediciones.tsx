import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioHistorial } from '../../services/historial'
import type { TipoMedicion } from '../../types/mediciones'
import HistorialSensores from './components/HistorialSensores'

type Props = { id: string; onVolver: () => void; onTiempoReal: (tipo: TipoMedicion) => void }

/** Consulta el inventario autorizado antes de solicitar lecturas; diferencia ausencia de equipo, sensores y mediciones. */
export default function MonitoreoMediciones({ id, onVolver, onTiempoReal }: Props) {
  const consultar = useCallback((signal: AbortSignal) => servicioHistorial.sensores(id, signal), [id])
  const { datos, cargando, error, recargar } = useConsulta(consultar)
  return <div className="min-h-dvh bg-white text-[#233D32]">
    <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-[#F4F5F4] px-4 py-2">
      <Boton type="button" onClick={onVolver} aria-label="Volver al detalle" className="flex h-11 w-11 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Boton>
      <Titulo className="text-lg font-semibold">Mediciones</Titulo>
    </header>
    <main className="space-y-4 px-5 py-5">
      <Boton type="button" disabled={cargando} onClick={recargar} className="min-h-11 rounded-xl border border-[#D8DEDA] px-4 text-sm disabled:opacity-50">Actualizar sensores</Boton>
      {cargando ? <Texto role="status" className="py-10 text-center text-sm">Consultando sensores…</Texto> : error ? <div className="space-y-3">
        <Texto role="alert" className="text-sm text-red-700">{error}</Texto><Boton type="button" variante="verde" onClick={recargar}>Reintentar</Boton>
      </div> : datos?.controladorId === null ? <Texto role="status" className="py-12 text-center text-sm text-[#64766A]">Este invernadero todavía no tiene controlador registrado.</Texto>
        : datos && !datos.sensores.length ? <Texto role="status" className="py-12 text-center text-sm text-[#64766A]">El controlador todavía no tiene sensores registrados.</Texto>
          : datos && <HistorialSensores sensores={datos.sensores} onTiempoReal={onTiempoReal} />}
    </main>
  </div>
}
