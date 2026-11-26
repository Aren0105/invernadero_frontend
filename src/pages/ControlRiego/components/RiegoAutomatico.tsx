import { useState, type FormEvent } from 'react'
import Boton from '../../../components/ui/Boton'
import Entrada from '../../../components/ui/Entrada'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto } from '../../../components/ui/Tipografia'
import { enfocarPrimerError } from '../../../utils/validacion'
import { validarAutomatico, type ErroresAutomatico } from '../../../utils/riego'
import type { ConfigAutomatica } from '../../../types/riego'
import type { Accion } from '../useControlRiego'

type Props = {
    config: ConfigAutomatica | null
    bloqueado: boolean
    accion: Accion | null
    onGuardar: (config: ConfigAutomatica) => Promise<boolean>
    onCancelarAuto: () => void
}

const estiloCancelar = 'flex min-h-12 w-full items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50'

/** Sin configuración muestra el formulario (pantalla 7); con configuración la muestra en lectura con Editar y Cancelar (pantalla 8).
 * El padre usa `key` según la configuración guardada para reiniciar los valores al cambiarla.
 */
export default function RiegoAutomatico({ config, bloqueado, accion, onGuardar, onCancelarAuto }: Props) {
    const [editando, setEditando] = useState(config === null)
    const [humedad, setHumedad] = useState(config ? String(config.humedadMinima) : '')
    const [duracion, setDuracion] = useState(config ? String(config.duracionMinutos) : '')
    const [errores, setErrores] = useState<ErroresAutomatico>({})
    const ocupado = accion !== null

    function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        if (bloqueado || ocupado) return
        const nuevos = validarAutomatico(humedad, duracion)
        setErrores(nuevos)
        if (Object.keys(nuevos).length) { enfocarPrimerError(evento.currentTarget, { ...(nuevos.humedad ? { humedad: nuevos.humedad } : {}), ...(nuevos.duracion ? { duracion: nuevos.duracion } : {}) }); return }
        void onGuardar({ humedadMinima: Number(humedad.trim()), duracionMinutos: Number(duracion.trim()) }).then((guardado) => { if (guardado) setEditando(false) })
    }

    function descartar() {
        if (!config) return
        setHumedad(String(config.humedadMinima))
        setDuracion(String(config.duracionMinutos))
        setErrores({})
        setEditando(false)
    }

    if (config && !editando) {
        return <div className="space-y-4">
            <Tarjeta como="dl" className="space-y-3 rounded-2xl border border-[#D8E1DA] bg-white p-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Humedad mínima para regar</dt><dd className="font-semibold">{config.humedadMinima} %</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Duración del riego</dt><dd className="font-semibold">{config.duracionMinutos} min</dd></div>
            </Tarjeta>
            <Texto className="text-xs text-[#64766A]">Riego automático activo: se regará cuando la humedad del suelo baje de {config.humedadMinima} %.</Texto>
            <Boton type="button" variante="verde" disabled={bloqueado || ocupado} onClick={() => setEditando(true)} className="disabled:cursor-not-allowed disabled:opacity-50">Editar configuración</Boton>
            <Boton type="button" disabled={ocupado} onClick={onCancelarAuto} className={estiloCancelar}>Cancelar riego automático</Boton>
        </div>
    }

    return <form noValidate onSubmit={enviar} className="space-y-4" aria-busy={ocupado}>
        <div>
            <label htmlFor="humedad" className="mb-1.5 block text-sm font-semibold">Humedad mínima para regar (%)</label>
            <Entrada id="humedad" name="humedad" type="number" required variante="redondeada" placeholder="Ej. 30" min="0" max="100" step="0.01" inputMode="decimal"
                value={humedad} disabled={ocupado} onChange={(evento) => { setHumedad(evento.target.value); setErrores((actual) => ({ ...actual, humedad: undefined })) }}
                aria-invalid={!!errores.humedad} aria-describedby={errores.humedad ? 'error-humedad' : undefined} />
            {errores.humedad && <Texto id="error-humedad" className="mt-1 text-sm text-red-700">{errores.humedad}</Texto>}
        </div>
        <div>
            <label htmlFor="duracion-auto" className="mb-1.5 block text-sm font-semibold">Duración del riego (minutos)</label>
            <Entrada id="duracion-auto" name="duracion" type="number" required variante="redondeada" placeholder="Ej. 10" min="1" step="1" inputMode="numeric"
                value={duracion} disabled={ocupado} onChange={(evento) => { setDuracion(evento.target.value); setErrores((actual) => ({ ...actual, duracion: undefined })) }}
                aria-invalid={!!errores.duracion} aria-describedby={errores.duracion ? 'error-duracion-auto' : undefined} />
            {errores.duracion && <Texto id="error-duracion-auto" className="mt-1 text-sm text-red-700">{errores.duracion}</Texto>}
        </div>
        <Boton type="submit" variante="verde" disabled={bloqueado || ocupado} className="disabled:cursor-not-allowed disabled:opacity-50">
            {accion === 'guardar' ? 'Guardando…' : config ? 'Guardar cambios' : 'Guardar configuración'}
        </Boton>
        {config && <Boton type="button" disabled={ocupado} onClick={descartar} className="min-h-11 w-full text-sm underline">Cancelar edición</Boton>}
    </form>
}
