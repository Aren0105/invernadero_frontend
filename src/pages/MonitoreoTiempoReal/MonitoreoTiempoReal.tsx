import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioHistorial } from '../../services/historial'
import type { TipoMedicion } from '../../types/mediciones'
import SesionEnVivo from './components/SesionEnVivo'

type Props = { id: string; tipo: TipoMedicion; onVolver: () => void }

/** Obtiene el sensor autorizado para ADMIN y OPERATOR antes de habilitar el inicio explícito del canal. */
export default function MonitoreoTiempoReal({ id, tipo, onVolver }: Props) {
  const consultar = useCallback((signal: AbortSignal) => servicioHistorial.sensores(id, signal), [id])
  const { datos, cargando, error, recargar } = useConsulta(consultar)
  const sensor = datos?.sensores.find((item) => item.tipo === tipo)
  return <div className="min-h-dvh bg-[#F5F8F5] text-[#233D32]">
    <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-white px-4 py-3">
      <Boton type="button" onClick={onVolver} aria-label="Volver a Mediciones" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Boton>
      <Titulo className="text-lg font-semibold">Monitoreo en tiempo real</Titulo>
    </header>
    <main className="space-y-5 px-5 py-6">
      {cargando ? <Texto role="status">Consultando sensor…</Texto> : error ? <div className="space-y-3"><Texto role="alert" className="text-sm text-red-700">{error}</Texto><Boton type="button" variante="verde" onClick={recargar}>Reintentar</Boton></div>
        : datos?.controladorId === null ? <Texto role="status">Este invernadero todavía no tiene equipo registrado.</Texto>
          : !sensor ? <div className="space-y-3"><Texto role="status">Este tipo de sensor no está registrado en el equipo.</Texto><Boton type="button" onClick={recargar} className="min-h-11 rounded-xl border px-4">Actualizar sensores</Boton></div>
            : <SesionEnVivo key={sensor.id} invernaderoId={id} sensor={sensor} />}
    </main>
  </div>
}
