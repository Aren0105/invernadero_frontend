import { ArrowLeft, Droplets, Waves } from 'lucide-react'
import GraficaMediciones from '../components/GraficaMediciones'
import { nombresMedicion, ordenarLecturas, fechaLectura } from '../types/mediciones'
import type { SensorMediciones, TipoMedicion } from '../types/mediciones'

type Props = { onVolver: () => void; tipo: TipoMedicion; sensor?: SensorMediciones }

export default function MonitoreoTiempoReal({ onVolver, tipo, sensor }: Props) {
  // Al recibir nuevas lecturas por props se actualizan el valor y la gráfica.
  const seleccionado = sensor?.tipo === tipo ? sensor : undefined
  const lecturas = ordenarLecturas(seleccionado?.lecturas ?? []).slice(-60)
  const ultima = lecturas.at(-1)
  const Icono = tipo === 'HumedadSuelo' ? Droplets : Waves
  return (
    <div className="min-h-dvh bg-[#F5F8F5] text-[#233D32]">
      <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-white px-4 py-3"><button type="button" onClick={onVolver} aria-label="Volver a Mediciones" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button><h1 className="text-lg font-semibold">Monitoreo en tiempo real</h1></header>
      <main className="space-y-5 px-5 py-6">
        <div><h2 className="text-xl font-semibold">{nombresMedicion[tipo]}</h2><p className="mt-1 text-sm text-[#738077]">Sensor: {seleccionado?.nombre ?? 'Pendiente de conexión'}</p></div>
        <section className="rounded-3xl border border-[#D8DEDA] bg-white p-6 text-center" aria-label="Última medición recibida">
          <Icono className="mx-auto mb-4 h-10 w-10 text-[#2F704B]" aria-hidden="true" />
          <p className="text-xs font-semibold tracking-wide text-[#738077]">ÚLTIMA MEDICIÓN RECIBIDA</p>
          <p aria-live="polite" aria-atomic="true" className="my-4 text-5xl font-semibold">{ultima?.valor ?? '—'}<span className="ml-1 text-2xl">%</span></p>
          <p className="text-xs text-[#738077]">Última actualización: {fechaLectura(ultima?.fechaHora)}</p>
        </section>
        <div className="rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]">{ultima ? 'Se muestra la última lectura recibida. Revisa su fecha para conocer su antigüedad.' : 'Sin datos disponibles. Esperando la conexión con las mediciones del sensor.'}</div>
        <section><h2 className="mb-3 text-sm font-semibold">Lecturas recientes</h2><GraficaMediciones lecturas={lecturas} nombre={nombresMedicion[tipo]} /></section>
      </main>
    </div>
  )
}
