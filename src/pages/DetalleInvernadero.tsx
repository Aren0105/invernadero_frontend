import { useRef } from 'react'
import { ArrowLeft, ArrowRight, Droplets, Thermometer, Waves, House, Bell, Settings, User, Trash2 } from 'lucide-react'

type DetalleInvernaderoProps = {
  onVolver: () => void
  onMediciones: () => void
  onControlRiego?: () => void
  onHistorialRiego?: () => void
}

const navegacion = [
  { nombre: 'Inicio', icono: House },
  { nombre: 'Notificaciones', icono: Bell },
  { nombre: 'Configuración', icono: Settings },
  { nombre: 'Perfil', icono: User },
]

export default function DetalleInvernadero({ onVolver, onMediciones, onControlRiego, onHistorialRiego }: DetalleInvernaderoProps) {
  const dialogo = useRef<HTMLDialogElement>(null)
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="bg-[#E6F3E9] px-5 pb-5 pt-4">
        <div className="flex items-start gap-2">
          <button type="button" onClick={onVolver} aria-label="Volver a Mis invernaderos" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 pt-1">
            <h1 className="text-xl font-semibold">Detalle del invernadero</h1>
            <p className="mt-1 text-sm text-[#64766A]">Ubicación: —</p>
          </div>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-[#DCE6DF] px-3 py-1 text-xs text-[#52675A]">Estado: —</span>
      </header>

      <main className="flex-1 space-y-6 px-5 py-6">
        <section aria-labelledby="estado-actual">
          <h2 id="estado-actual" className="mb-3 text-xs font-semibold tracking-wide text-[#64766A]">ESTADO ACTUAL</h2>
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-[#D8E1DA] bg-white p-4">
              <Droplets className="mb-3 h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />
              <p className="text-2xl font-semibold">— <span className="text-base font-normal">%</span></p>
              <h3 className="mt-1 text-sm text-[#64766A]">Humedad del suelo</h3>
            </article>
            <article className="rounded-2xl border border-[#D8E1DA] bg-white p-4">
              <Thermometer className="mb-3 h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />
              <p className="text-2xl font-semibold">— <span className="text-base font-normal">°C</span></p>
              <h3 className="mt-1 text-sm text-[#64766A]">Temperatura</h3>
            </article>
          </div>
          <article className="mt-3 rounded-2xl border border-[#D8E1DA] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-medium"><Waves className="h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />Nivel de agua</h3>
              <p className="font-semibold text-[#2B7E9B]">— %</p>
            </div>
            <div aria-hidden="true" className="mt-3 h-1.5 rounded-full bg-[#DCE2DE]" />
          </article>
          <p className="mt-3 text-sm text-[#64766A]">Sin datos disponibles</p>
          <p className="mt-1 text-xs text-[#64766A]">Última medición: —</p>
          <button type="button" onClick={onMediciones} className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#D8E1DA] bg-white px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-green-700">
            Monitoreo de mediciones <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </section>

        <section aria-labelledby="sistema-riego">
          <h2 id="sistema-riego" className="mb-3 text-xs font-semibold tracking-wide text-[#64766A]">SISTEMA DE RIEGO</h2>
          <div className="rounded-2xl border border-[#D8E1DA] bg-[#E6F3E9] p-4">
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[#64766A]">Modo actual</dt><dd className="mt-1 font-medium">—</dd></div>
              <div><dt className="text-[#64766A]">Estado de la bomba</dt><dd className="mt-1 font-medium">—</dd></div>
            </dl>
            <button type="button" onClick={onControlRiego} disabled={!onControlRiego} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#47885C] disabled:cursor-default">
              Control de riego <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={onHistorialRiego} disabled={!onHistorialRiego} className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#D8E1DA] bg-white px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#47885C] disabled:cursor-default">
            Historial de riego <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </section>

        <section aria-labelledby="informacion">
          <h2 id="informacion" className="mb-3 text-xs font-semibold tracking-wide text-[#64766A]">INFORMACIÓN DEL INVERNADERO</h2>
          <dl className="space-y-3 rounded-2xl border border-[#D8E1DA] bg-white p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Cultivo</dt><dd>—</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Ubicación</dt><dd>—</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Dimensión</dt><dd>— m²</dd></div>
          </dl>
        </section>
        <button
          type="button"
          onClick={() => dialogo.current?.showModal()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Eliminar invernadero
        </button>
      </main>

      <dialog ref={dialogo} aria-labelledby="titulo-eliminar" aria-describedby="descripcion-eliminar" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-[#233D32] shadow-xl backdrop:bg-black/50">
        <h2 id="titulo-eliminar" className="text-xl font-semibold">¿Eliminar invernadero?</h2>
        <p id="descripcion-eliminar" className="mt-3 text-sm text-[#64766A]">La eliminación todavía no está disponible. No se borrarán datos.</p>
        <form method="dialog" className="mt-6 flex gap-3">
          <button autoFocus className="min-h-11 flex-1 rounded-xl border border-[#D3DBD5] px-3">Cancelar</button>
          <button type="button" disabled className="min-h-11 flex-1 rounded-xl bg-red-100 px-3 text-red-700 opacity-60">Eliminar</button>
        </form>
      </dialog>
      <nav aria-label="Navegación principal" className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {navegacion.map(({ nombre, icono: Icono }) => (
          <button key={nombre} type="button" onClick={nombre === 'Inicio' ? onVolver : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#28583A] ${nombre === 'Inicio' ? 'bg-[#DCEBD1] text-[#28583A]' : 'text-[#486D4D]'}`}>
            <Icono className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px]">{nombre}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}



