import { ArrowLeft } from 'lucide-react'

type RegistrarInvernaderoProps = {
  onVolver: () => void
}

const campo = 'min-h-12 w-full rounded-2xl border border-[#D3DBD5] bg-white px-4 py-3 text-base text-[#233D32] placeholder:text-[#808680] focus:border-[#47885C] focus:outline-none focus:ring-2 focus:ring-[#47885C]/20'

export default function RegistrarInvernadero({ onVolver }: RegistrarInvernaderoProps) {
  return (
    <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
      <header className="mb-5">
        <button type="button" onClick={onVolver} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Registrar Invernadero</h1>
        <p className="mt-2 text-sm text-[#64766A]">Ingresa los datos de tu invernadero</p>
      </header>

      <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-4">
        <div>
          <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold">Nombre del invernadero</label>
          <input id="nombre" name="nombre" type="text" placeholder="Ej. Invernadero Norte" className={campo} />
        </div>

        <div>
          <label htmlFor="ubicacion" className="mb-1.5 block text-sm font-semibold">Ubicación</label>
          <input id="ubicacion" name="ubicacion" type="text" placeholder="Ej. Sector A" className={campo} />
        </div>

        <div>
          <label htmlFor="cultivo" className="mb-1.5 block text-sm font-semibold">Cultivo</label>
          <input id="cultivo" name="cultivo" type="text" placeholder="Ej. Tomate" className={campo} />
        </div>

        <div>
          <label htmlFor="dimension" className="mb-1.5 block text-sm font-semibold">Dimensión (m²)</label>
          <input id="dimension" name="dimension" type="number" inputMode="decimal" min="0" step="any" placeholder="Ej. 50" className={campo} />
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-1.5 block text-sm font-semibold">Descripción</label>
          <textarea id="descripcion" name="descripcion" rows={2} placeholder="Breve descripción" className={`${campo} resize-y`} />
        </div>

        <div>
          <label htmlFor="controlador" className="mb-1.5 block text-sm font-semibold">Código del controlador</label>
          <input id="controlador" name="controlador" type="text" placeholder="Ej. CTRL-014" className={campo} />
        </div>

        <button type="button" className="mt-2 min-h-12 w-full rounded-full bg-[#2B7E9B] px-4 py-3 text-sm font-bold text-white hover:bg-[#256D86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B7E9B]">
          REGISTRAR INVERNADERO
        </button>
      </form>
    </main>
  )
}
