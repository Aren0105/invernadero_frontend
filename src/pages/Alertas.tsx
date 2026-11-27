import { useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, CircleAlert, CircleCheck, House, Settings, User } from 'lucide-react'

export type Alerta = {
  id: string
  titulo: string
  invernadero: string
  sensor: string
  valor: string
  umbral: string
  fecha: string
  estado: 'Activa' | 'Resuelta'
  nivel: 'Alta' | 'Media' | 'Informativa'
  descripcion: string
}

export const alertasEjemplo: Alerta[] = [
  {
    id: 'temperatura-alta',
    titulo: 'Temperatura por encima del límite',
    invernadero: 'Invernadero Norte',
    sensor: 'Temperatura',
    valor: '34 °C',
    umbral: '30 °C',
    fecha: '26 nov, 14:35',
    estado: 'Activa',
    nivel: 'Alta',
    descripcion: 'La última lectura de temperatura superó el límite configurado.',
  },
  {
    id: 'humedad-suelo',
    titulo: 'Humedad del suelo baja',
    invernadero: 'Invernadero Norte',
    sensor: 'Humedad del suelo',
    valor: '28 %',
    umbral: '35 %',
    fecha: '26 nov, 13:50',
    estado: 'Activa',
    nivel: 'Media',
    descripcion: 'La humedad del suelo está por debajo del límite configurado.',
  },
  {
    id: 'nivel-agua-restablecido',
    titulo: 'Nivel de agua restablecido',
    invernadero: 'Invernadero Sur',
    sensor: 'Nivel de agua',
    valor: '62 %',
    umbral: '20 %',
    fecha: '25 nov, 18:10',
    estado: 'Resuelta',
    nivel: 'Informativa',
    descripcion: 'El nivel de agua volvió a estar dentro del rango configurado.',
  },
]

type Props = {
  onAbrirAlerta: (id: string) => void
  onInicio: () => void
  onConfigurar: () => void
}

export default function Alertas({ onAbrirAlerta, onInicio, onConfigurar }: Props) {
  const [filtro, setFiltro] = useState<'Todas' | 'Activas' | 'Resueltas'>('Todas')
  const visibles = filtro === 'Todas'
    ? alertasEjemplo
    : alertasEjemplo.filter((alerta) => alerta.estado === (filtro === 'Activas' ? 'Activa' : 'Resuelta'))

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="flex items-center justify-between bg-[#E6F3E9] px-5 pb-5 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64766A]">Centro de actividad</p>
          <h1 className="mt-1 text-2xl font-semibold">Alertas</h1>
        </div>
        <button type="button" onClick={onConfigurar} aria-label="Configurar alertas" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D8E1DA] bg-white">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <main className="flex-1 space-y-5 px-5 py-5">
        <aside className="rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]">
          <p className="font-semibold">Datos de ejemplo</p>
          <p className="mt-1 text-xs">Estas alertas son ilustrativas y no provienen de tus sensores ni del servidor.</p>
        </aside>

        <section aria-label="Resumen de alertas" className="grid grid-cols-2 gap-3">
          <article className="flex items-center gap-3 rounded-2xl border border-[#D8E1DA] bg-white p-4">
            <CircleAlert className="h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
            <div><p className="text-xs text-[#64766A]">Activas</p><p className="mt-1 text-2xl font-semibold">{alertasEjemplo.filter((alerta) => alerta.estado === 'Activa').length}</p></div>
          </article>
          <article className="flex items-center gap-3 rounded-2xl border border-[#D8E1DA] bg-white p-4">
            <CircleCheck className="h-6 w-6 shrink-0 text-[#47885C]" aria-hidden="true" />
            <div><p className="text-xs text-[#64766A]">Resueltas</p><p className="mt-1 text-2xl font-semibold">{alertasEjemplo.filter((alerta) => alerta.estado === 'Resuelta').length}</p></div>
          </article>
        </section>

        <div role="group" aria-label="Filtrar alertas" className="flex gap-2">
          {(['Todas', 'Activas', 'Resueltas'] as const).map((opcion) => (
            <button key={opcion} type="button" aria-pressed={filtro === opcion} onClick={() => setFiltro(opcion)}
              className={`min-h-10 rounded-full border px-4 text-sm font-medium ${filtro === opcion ? 'border-[#2F704B] bg-[#2F704B] text-white' : 'border-[#D8E1DA] bg-white text-[#52675A]'}`}>
              {opcion}
            </button>
          ))}
        </div>

        <section aria-label="Listado de alertas" className="space-y-3">
          {visibles.map((alerta) => (
            <button key={alerta.id} type="button" onClick={() => onAbrirAlerta(alerta.id)}
              className="flex w-full items-start gap-3 rounded-2xl border border-[#D8E1DA] bg-white p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47885C]">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alerta.nivel === 'Alta' ? 'bg-red-50 text-red-700' : alerta.estado === 'Resuelta' ? 'bg-[#E6F3E9] text-[#47885C]' : 'bg-amber-50 text-amber-700'}`}>
                {alerta.estado === 'Resuelta' ? <CircleCheck className="h-5 w-5" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{alerta.titulo}</span>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#64766A]" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-xs text-[#64766A]">{alerta.invernadero} · {alerta.sensor}</span>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${alerta.estado === 'Activa' ? 'bg-red-50 text-red-700' : 'bg-[#E6F3E9] text-[#2F704B]'}`}>{alerta.estado}</span>
                  <span className="text-xs text-[#64766A]">{alerta.fecha}</span>
                </span>
              </span>
            </button>
          ))}
          {!visibles.length && <p role="status" className="py-10 text-center text-sm text-[#64766A]">No hay alertas en esta categoría.</p>}
        </section>
      </main>

      <nav aria-label="Navegación principal" className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onInicio} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><House className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Inicio</span></button>
        <button type="button" aria-current="page" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#DCEBD1] text-[#28583A]"><Bell className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Notificaciones</span></button>
        <button type="button" onClick={onConfigurar} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><Settings className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Configuración</span></button>
        <button type="button" disabled className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D] opacity-50"><User className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Perfil</span></button>
      </nav>
    </div>
  )
}
