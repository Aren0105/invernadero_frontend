import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Radio, Droplets, Waves, X } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import GraficaMediciones from '../../components/GraficaMediciones'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import type { SensorMediciones, TipoMedicion } from '../../types/mediciones'
import { fechaLectura, lecturasDelPeriodo, nombresMedicion } from '../../types/mediciones'

type Props = {
  onVolver: () => void
  onTiempoReal: (tipo: TipoMedicion) => void
  sensores?: SensorMediciones[]
}

/** Filtra las lecturas por tipo y período y permite abrir el monitoreo en tiempo real. */
export default function MonitoreoMediciones({ onVolver, onTiempoReal, sensores = [] }: Props) {
  const [tipo, setTipo] = useState<TipoMedicion>('HumedadSuelo')
  const [periodo, setPeriodo] = useState<'hoy' | 'semana'>('hoy')
  const selector = useRef<HTMLDialogElement>(null)
  const sensor = sensores.find((item) => item.tipo === tipo)
  const lecturas = lecturasDelPeriodo(sensor?.lecturas ?? [], periodo)
  const ultima = lecturas.at(-1)
  const nombre = nombresMedicion[tipo]

  function abrirTiempoReal(seleccion: TipoMedicion) {
    selector.current?.close()
    onTiempoReal(seleccion)
  }

  return (
    <div className="min-h-dvh bg-white text-[#233D32]">
      <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-[#F4F5F4] px-4 py-2">
        <Boton type="button" onClick={onVolver} aria-label="Volver al detalle" className="flex h-11 w-11 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Boton>
        <Titulo className="text-lg font-semibold">Mediciones</Titulo>
      </header>
      <main className="space-y-4 px-5 py-5">
        <div role="group" aria-label="Tipo de medición" className="flex gap-2 rounded-full border border-[#D8DEDA] p-1">
          {(['HumedadSuelo', 'NivelAgua'] as const).map((valor) => <Boton key={valor} type="button" variante="segmento" aria-pressed={tipo === valor} onClick={() => setTipo(valor)} className={tipo === valor ? 'bg-[#2F704B] font-semibold text-white' : 'text-[#68756D]'}>{nombresMedicion[valor]}</Boton>)}
        </div>
        <div role="group" aria-label="Período de consulta" className="flex rounded-full border border-[#D8DEDA] p-1">
          <Boton type="button" variante="segmento" aria-pressed={periodo === 'hoy'} onClick={() => setPeriodo('hoy')} className={periodo === 'hoy' ? 'bg-[#EDEEEE] font-medium' : 'text-[#68756D]'}>Hoy</Boton>
          <Boton type="button" variante="segmento" aria-pressed={periodo === 'semana'} onClick={() => setPeriodo('semana')} className={periodo === 'semana' ? 'bg-[#EDEEEE] font-medium' : 'text-[#68756D]'}>Última semana</Boton>
        </div>
        <section aria-label="Última lectura del período">
          <Texto className="text-3xl font-bold">{ultima ? `${ultima.valor}%` : '— %'}</Texto>
          <Texto className="mt-2 text-xs text-[#7B857E]">Última lectura del período: {fechaLectura(ultima?.fechaHora)}</Texto>
        </section>
        <GraficaMediciones lecturas={lecturas} nombre={nombre} periodo={periodo} />
        <Texto className="text-center text-xs text-[#7B857E]">Historial · {periodo === 'hoy' ? 'Hoy' : 'Últimos 7 días'} · Hora de Perú</Texto>
        {!sensor && <Texto className="text-center text-sm text-[#7B857E]">Mediciones pendientes de conexión.</Texto>}
        <Boton type="button" onClick={() => selector.current?.showModal()} variante="verde" className="mt-4">
          <Radio className="h-5 w-5" aria-hidden="true" />Ver datos en tiempo real
        </Boton>
      </main>
      <dialog ref={selector} aria-labelledby="titulo-selector" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-5 text-[#233D32] shadow-xl backdrop:bg-black/40">
        <div className="flex items-center justify-between gap-2"><Titulo nivel={2} id="titulo-selector" className="text-lg font-semibold">¿Qué variable quieres ver?</Titulo><Boton type="button" autoFocus aria-label="Cerrar selector" onClick={() => selector.current?.close()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><X className="h-5 w-5" /></Boton></div>
        <Texto className="mb-4 text-sm text-[#738077]">Selecciona el tipo de sensor.</Texto>
        {(['HumedadSuelo', 'NivelAgua'] as const).map((valor) => {
          const Icono = valor === 'HumedadSuelo' ? Droplets : Waves
          return <Boton key={valor} type="button" onClick={() => abrirTiempoReal(valor)} className="mt-3 flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#D8DEDA] bg-[#F5F8F5] p-4 text-left"><Icono className="h-6 w-6 text-[#2F704B]" aria-hidden="true" /><span className="flex-1 text-sm font-medium">{nombresMedicion[valor]}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Boton>
        })}
      </dialog>
    </div>
  )
}
