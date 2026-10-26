import { useState } from 'react'
import { validarFormulario, enfocarPrimerError } from '../utils/validacion'
import { ArrowLeft } from 'lucide-react'

type RegistrarInvernaderoProps = {
  onVolver: () => void
}

const campo = 'min-h-12 w-full rounded-2xl border border-[#D3DBD5] bg-white px-4 py-3 text-base text-[#233D32] placeholder:text-[#808680] focus:border-[#47885C] focus:outline-none focus:ring-2 focus:ring-[#47885C]/20'

export default function RegistrarInvernadero({ onVolver }: RegistrarInvernaderoProps) {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState('')
  return (
    <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
      <header className="mb-5">
        <button type="button" onClick={onVolver} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Registrar Invernadero</h1>
        <p className="mt-2 text-sm text-[#64766A]">Ingresa los datos de tu invernadero</p><p className="mt-2 text-xs text-[#64766A]">Los campos con * son obligatorios.</p>
      </header>

      <form noValidate
        onInput={(event) => {
          const input = event.target
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            setErrores((actual) => ({ ...actual, [input.name]: '' }))
            setAviso('')
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          const nuevos = validarFormulario(event.currentTarget)
          setErrores(nuevos)
          setAviso(Object.keys(nuevos).length ? '' : 'El registro aún no está conectado. No se ha guardado el invernadero ni comprobado la disponibilidad del controlador.')
          if (Object.keys(nuevos).length) enfocarPrimerError(event.currentTarget, nuevos)
        }} className="flex flex-col gap-4">
        <div>
          <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold">Nombre del invernadero *</label>
          <input id="nombre" aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'error-nombre' : undefined} name="nombre" required maxLength={100} type="text" placeholder="Ej. Invernadero Norte" className={campo} />
          {errores.nombre && <p id="error-nombre" role="alert" className="mt-2 text-sm text-red-700">{errores.nombre}</p>}
        </div>

        <div>
          <label htmlFor="ubicacion" className="mb-1.5 block text-sm font-semibold">Ubicación</label>
          <input id="ubicacion" aria-invalid={!!errores.ubicacion} aria-describedby={errores.ubicacion ? 'error-ubicacion' : undefined} name="ubicacion" maxLength={200} type="text" placeholder="Ej. Sector A" className={campo} />
          {errores.ubicacion && <p id="error-ubicacion" role="alert" className="mt-2 text-sm text-red-700">{errores.ubicacion}</p>}
        </div>

        <div>
          <label htmlFor="cultivo" className="mb-1.5 block text-sm font-semibold">Cultivo</label>
          <input id="cultivo" aria-invalid={!!errores.cultivo} aria-describedby={errores.cultivo ? 'error-cultivo' : undefined} name="cultivo" type="text" placeholder="Ej. Tomate" className={campo} />
          {errores.cultivo && <p id="error-cultivo" role="alert" className="mt-2 text-sm text-red-700">{errores.cultivo}</p>}
        </div>

        <div>
          <label htmlFor="dimension" className="mb-1.5 block text-sm font-semibold">Dimensión (m²)</label>
          <input id="dimension" aria-invalid={!!errores.dimension} aria-describedby={errores.dimension ? 'error-dimension' : undefined} name="dimension" type="number" inputMode="decimal" min="0" step="any" placeholder="Ej. 50" className={campo} />
          {errores.dimension && <p id="error-dimension" role="alert" className="mt-2 text-sm text-red-700">{errores.dimension}</p>}
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-1.5 block text-sm font-semibold">Descripción</label>
          <textarea id="descripcion" aria-invalid={!!errores.descripcion} aria-describedby={errores.descripcion ? 'error-descripcion' : undefined} name="descripcion" maxLength={500} rows={2} placeholder="Breve descripción" className={`${campo} resize-y`} />
          {errores.descripcion && <p id="error-descripcion" role="alert" className="mt-2 text-sm text-red-700">{errores.descripcion}</p>}
        </div>

        <div>
          <label htmlFor="controlador" className="mb-1.5 block text-sm font-semibold">Código del controlador (opcional)</label>
          <input id="controlador" aria-invalid={!!errores.controlador} aria-describedby={errores.controlador ? 'error-controlador' : undefined} name="controlador" type="text" placeholder="Ej. CTRL-014" className={campo} />
          {errores.controlador && <p id="error-controlador" role="alert" className="mt-2 text-sm text-red-700">{errores.controlador}</p>}
        </div>

        <button type="submit" className="mt-2 min-h-12 w-full rounded-full bg-[#2B7E9B] px-4 py-3 text-sm font-bold text-white hover:bg-[#256D86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B7E9B]">
          REGISTRAR INVERNADERO
        </button>
        <p role="status" className="text-sm text-[#52675A]">{aviso}</p>
      </form>
    </main>
  )
}

