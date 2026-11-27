import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Bell, House, Save, Settings, User } from 'lucide-react'

const clavePreferencias = 'invernadero:alertas:preferencias'
const ajustesIniciales = {
  habilitadas: true,
  temperaturaMinima: '15',
  temperaturaMaxima: '30',
  humedadSueloMinima: '35',
  humedadAmbientalMaxima: '80',
  nivelAguaMinimo: '20',
}
type Ajustes = typeof ajustesIniciales

function sonAjustes(valor: unknown): valor is Ajustes {
  if (!valor || typeof valor !== 'object') return false
  const datos = valor as Record<string, unknown>
  return typeof datos.habilitadas === 'boolean'
    && typeof datos.temperaturaMinima === 'string'
    && typeof datos.temperaturaMaxima === 'string'
    && typeof datos.humedadSueloMinima === 'string'
    && typeof datos.humedadAmbientalMaxima === 'string'
    && typeof datos.nivelAguaMinimo === 'string'
}

type Props = {
  onVolver: () => void
  onInicio: () => void
}

const campos: { campo: Exclude<keyof Ajustes, 'habilitadas'>; etiqueta: string; unidad: string; min: string; max: string }[] = [
  { campo: 'temperaturaMinima', etiqueta: 'Temperatura mínima', unidad: '°C', min: '-20', max: '60' },
  { campo: 'temperaturaMaxima', etiqueta: 'Temperatura máxima', unidad: '°C', min: '-20', max: '60' },
  { campo: 'humedadSueloMinima', etiqueta: 'Humedad del suelo mínima', unidad: '%', min: '0', max: '100' },
  { campo: 'humedadAmbientalMaxima', etiqueta: 'Humedad ambiental máxima', unidad: '%', min: '0', max: '100' },
  { campo: 'nivelAguaMinimo', etiqueta: 'Nivel de agua mínimo', unidad: '%', min: '0', max: '100' },
]

export default function ConfiguracionAlertas({ onVolver, onInicio }: Props) {
  const [ajustes, setAjustes] = useState<Ajustes>(ajustesIniciales)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(clavePreferencias)
      if (!guardado) return
      const valor: unknown = JSON.parse(guardado)
      if (!sonAjustes(valor)) throw new Error('Las preferencias guardadas no tienen el formato esperado.')
      setAjustes(valor)
    } catch {
      setError('No se pudieron cargar las preferencias guardadas. Se muestran los valores iniciales.')
    }
  }, [])

  function actualizar<K extends keyof Ajustes>(campo: K, valor: Ajustes[K]) {
    setAjustes((actuales) => ({ ...actuales, [campo]: valor }))
    setMensaje('')
    setError('')
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensaje('')
    setError('')
    if (Number(ajustes.temperaturaMinima) >= Number(ajustes.temperaturaMaxima)) {
      setError('La temperatura mínima debe ser menor que la máxima.')
      return
    }
    try {
      localStorage.setItem(clavePreferencias, JSON.stringify(ajustes))
      setMensaje('Preferencias guardadas en este dispositivo.')
    } catch {
      setError('No se pudieron guardar las preferencias en este dispositivo.')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="flex items-center gap-2 border-b border-[#D8DEDA] bg-white px-4 py-3">
        <button type="button" onClick={onVolver} aria-label="Volver a alertas" className="flex h-11 w-11 items-center justify-center rounded-xl"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
        <h1 className="text-lg font-semibold">Configurar alertas</h1>
      </header>

      <main className="flex-1 space-y-5 px-5 py-6">
        <aside className="rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]">
          <p className="font-semibold">Configuración local de ejemplo</p>
          <p className="mt-1 text-xs">Se guarda en este navegador. Aún no se sincroniza con el servidor ni modifica los sensores.</p>
        </aside>

        <form onSubmit={guardar} className="space-y-5">
          <section className="rounded-2xl border border-[#D8E1DA] bg-white p-4">
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
              <span className="flex items-center gap-3"><Bell className="h-5 w-5 text-[#47885C]" aria-hidden="true" /><span><span className="block text-sm font-semibold">Alertas habilitadas</span><span className="mt-1 block text-xs text-[#64766A]">Preferencia en este dispositivo</span></span></span>
              <input type="checkbox" checked={ajustes.habilitadas} onChange={(evento) => actualizar('habilitadas', evento.target.checked)} className="h-5 w-5 accent-[#2F704B]" />
            </label>
          </section>

          <section aria-labelledby="umbrales-title">
            <h2 id="umbrales-title" className="mb-3 text-xs font-semibold tracking-wide text-[#64766A]">UMBRALES DE EJEMPLO</h2>
            <div className="space-y-4 rounded-2xl border border-[#D8E1DA] bg-white p-4">
              {campos.map(({ campo, etiqueta, unidad, min, max }) => (
                <label key={campo} className="block">
                  <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span>
                  <span className="flex items-center gap-3">
                    <input type="number" required min={min} max={max} step="any" value={ajustes[campo]} onChange={(evento) => actualizar(campo, evento.target.value)}
                      className="min-h-11 w-full rounded-xl border border-[#D8E1DA] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]" />
                    <span className="w-8 shrink-0 text-sm text-[#64766A]">{unidad}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="text-sm text-[#2F704B]">{mensaje}</p>}
          <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2F704B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#265E3E]">
            <Save className="h-5 w-5" aria-hidden="true" />Guardar preferencias
          </button>
        </form>
      </main>

      <nav aria-label="Navegación principal" className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onInicio} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><House className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Inicio</span></button>
        <button type="button" onClick={onVolver} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D]"><Bell className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Notificaciones</span></button>
        <button type="button" aria-current="page" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#DCEBD1] text-[#28583A]"><Settings className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Configuración</span></button>
        <button type="button" disabled className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[#486D4D] opacity-50"><User className="h-6 w-6" aria-hidden="true" /><span className="text-[10px]">Perfil</span></button>
      </nav>
    </div>
  )
}
