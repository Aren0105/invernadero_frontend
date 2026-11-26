import { useState, type FormEvent } from 'react'
import Boton from '../../../components/ui/Boton'
import Entrada from '../../../components/ui/Entrada'
import { Texto } from '../../../components/ui/Tipografia'
import { enfocarPrimerError } from '../../../utils/validacion'
import { validarDuracion } from '../../../utils/riego'
import type { Accion } from '../useControlRiego'

type Props = {
    encendida: boolean
    bloqueado: boolean
    accion: Accion | null
    onIniciar: (minutos: number) => Promise<boolean>
    onDetener: () => Promise<boolean>
}

/** Duración obligatoria, Iniciar riego y Detener riego; Iniciar se deshabilita con la bomba encendida o el invernadero bloqueado. */
export default function RiegoManual({ encendida, bloqueado, accion, onIniciar, onDetener }: Props) {
    const [duracion, setDuracion] = useState('')
    const [error, setError] = useState<string | null>(null)
    const ocupado = accion !== null

    function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        if (bloqueado || encendida || ocupado) return
        const falla = validarDuracion(duracion)
        setError(falla)
        if (falla) { enfocarPrimerError(evento.currentTarget, { duracion: falla }); return }
        void onIniciar(Number(duracion.trim()))
    }

    return <form noValidate onSubmit={enviar} className="space-y-4" aria-busy={ocupado}>
        <div>
            <label htmlFor="duracion" className="mb-1.5 block text-sm font-semibold">Duración del riego (minutos) *</label>
            <Entrada id="duracion" name="duracion" type="number" required variante="redondeada" placeholder="Ej. 15" min="1" step="1" inputMode="numeric"
                value={duracion} disabled={ocupado} onChange={(evento) => { setDuracion(evento.target.value); setError(null) }}
                aria-invalid={!!error} aria-describedby={error ? 'error-duracion' : undefined} />
            {error && <Texto id="error-duracion" className="mt-1 text-sm text-red-700">{error}</Texto>}
        </div>
        <Boton type="submit" variante="verde" disabled={bloqueado || encendida || ocupado} className="disabled:cursor-not-allowed disabled:opacity-50">
            {accion === 'iniciar' ? 'Iniciando…' : 'Iniciar riego'}
        </Boton>
        <Boton type="button" disabled={!encendida || ocupado} onClick={() => { void onDetener() }}
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#E6E8E6] disabled:text-[#9AA39C]">
            {accion === 'detener' ? 'Deteniendo…' : 'Detener riego'}
        </Boton>
    </form>
}
