import { ArrowLeft, Bell, CircleAlert, CircleCheck, House, Settings, User } from 'lucide-react'
import type { Alerta } from './Alertas'

type Props = {
  alerta: Alerta
  onVolver: () => void
  onInicio: () => void
  onConfigurar: () => void
}

export default function DetalleAlerta({ alerta, onVolver, onInicio, onConfigurar }: Props) {
  const Icono = alerta.estado === 'Activa' ? CircleAlert : CircleCheck

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="flex items-center gap-2 border-b border-[#D8DEDA] bg-white px-4 py-3">
        <button type="button" onClick={onVolver} aria-label="Volver a alertas" className="flex h-11 w-11 items-center justify-center rounded-xl">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold">Detalle de alerta</h1>
      </header>

      <main className="flex-1 space-y-5 px-5 py-6">
        <aside className="rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]">
          <p className="font-semibold">Dato de ejemplo</p>
          <p className="mt-1 text-xs">Este registro es ilustrativo; no corresponde a una lectura real.</p>
        </aside>

        <section className="text-center">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${alerta.estado === 'Activa' ? 'bg-red-50 text-red-700' : 'bg-[#E6F3E9] text-[#47885C]'}`}>
            <Icono className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">{alerta.titulo}</h2>
          <p className="mt-2 text-sm text-[#64766A]">{alerta.invernadero}</p>
        </section>

        <section aria-label="Estado de la alerta" className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8E1DA] bg-white p-4">
          <span className="flex items-center gap-2"><Bell className="h-5 w-5 text-[#47885C]" aria-hidden="true" /><span className="text-sm font-medium">Estado</span></span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alerta.estado === 'Activa' ? 'bg-red-50 text-red-700' : 'bg-[#E6F3E9] text-[#2F704B]'}`}>{alerta.estado}</span>
        </section>

        <section aria-labelledby="lectura-alerta">
          <h2 id="lectura-alerta" className="mb-3 text-xs font-semibold tracking-wide text-[#64766A]">LECTURA Y LÍMITE</h2>
          <dl className="space-y-4 rounded-2xl border border-[#D8E1DA] bg-white p-4">
            <div className="flex justify-between gap-4"><dt className="text-sm text-[#64766A]">Sensor</dt><dd className="text-right text-sm font-medium">{alerta.sensor}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-sm text-[#64766A]">Lectura</dt><dd className="text-right text-lg font-semibold">{alerta.valor}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-sm text-[#64766A]">Límite configurado</dt><dd className="text-right text-sm font-medium">{alerta.umbral}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-sm text-[#64766A]">Fecha y hora</dt><dd className="text-right text-sm">{alerta.fecha}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[#D8E1DA] bg-white p-4">
          <h2 className="text-sm font-semibold">Qué ocurrió</h2>
          <p className="mt-2 text-sm text-[#64766A]">{alerta.descripcion}</p>
        </section>
      </main>

      <nav aria-label="Navegación principal" className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onInicio} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><House className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Inicio</span></button>
        <button type="button" aria-current="page" onClick={onVolver} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#DCEBD1] text-[#28583A]"><Bell className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Notificaciones</span></button>
        <button type="button" onClick={onConfigurar} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><Settings className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Configuración</span></button>
        <button type="button" disabled className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D] opacity-50"><User className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Perfil</span></button>
      </nav>
    </div>
  )
}
