import { ArrowLeft, Droplets, Waves } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import GraficaMediciones from '../../components/GraficaMediciones'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import type { SensorMediciones, TipoMedicion } from '../../types/mediciones'
import { nombresMedicion, ordenarLecturas, fechaLectura } from '../../types/mediciones'

type Props = { onVolver: () => void; tipo: TipoMedicion; sensor?: SensorMediciones }

/** Presenta las últimas lecturas recibidas mediante las propiedades del sensor. */
export default function MonitoreoTiempoReal({ onVolver, tipo, sensor }: Props) {
  // Al recibir nuevas lecturas por props se actualizan el valor y la gráfica.
  const seleccionado = sensor?.tipo === tipo ? sensor : undefined
  const lecturas = ordenarLecturas(seleccionado?.lecturas ?? []).slice(-60)
  const ultima = lecturas.at(-1)
  const Icono = tipo === 'HumedadSuelo' ? Droplets : Waves
  return (
    <div className="min-h-dvh bg-[#F5F8F5] text-[#233D32]">
      <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-white px-4 py-3"><Boton type="button" onClick={onVolver} aria-label="Volver a Mediciones" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Boton><Titulo className="text-lg font-semibold">Monitoreo en tiempo real</Titulo></header>
      <main className="space-y-5 px-5 py-6">
        <div><Titulo nivel={2} className="text-xl font-semibold">{nombresMedicion[tipo]}</Titulo><Texto className="mt-1 text-sm text-[#738077]">Sensor: {seleccionado?.nombre ?? 'Pendiente de conexión'}</Texto></div>
        <Tarjeta como="section" variante="centrada" aria-label="Última medición recibida">
          <Icono className="mx-auto mb-4 h-10 w-10 text-[#2F704B]" aria-hidden="true" />
          <Texto className="text-xs font-semibold tracking-wide text-[#738077]">ÚLTIMA MEDICIÓN RECIBIDA</Texto>
          <Texto aria-live="polite" aria-atomic="true" className="my-4 text-5xl font-semibold">{ultima?.valor ?? '—'}<span className="ml-1 text-2xl">%</span></Texto>
          <Texto className="text-xs text-[#738077]">Última actualización: {fechaLectura(ultima?.fechaHora)}</Texto>
        </Tarjeta>
        <Tarjeta como="div" variante="aviso">{ultima ? 'Se muestra la última lectura recibida. Revisa su fecha para conocer su antigüedad.' : 'Sin datos disponibles. Esperando la conexión con las mediciones del sensor.'}</Tarjeta>
        <section><Titulo nivel={2} className="mb-3 text-sm font-semibold">Lecturas recientes</Titulo><GraficaMediciones lecturas={lecturas} nombre={nombresMedicion[tipo]} /></section>
      </main>
    </div>
  )
}
