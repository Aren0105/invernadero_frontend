import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import Entrada, { AreaTexto } from '../../../components/ui/Entrada'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { credencialVigente, fechaEquipo, type CredencialEmitida, type CredencialEquipo } from '../../../types/equipos'

type Props = {
  credenciales: CredencialEquipo[]; secreto: CredencialEmitida | null; deshabilitado: boolean; ahora: number
  onEmitir: (venceEn: string | null, reemplazar: boolean) => Promise<boolean>
  onRevocar: (id: string) => Promise<boolean>; onCerrarSecreto: () => void
}

/** Emite claves solo mediante acciones explícitas; su original no se persiste ni aparece en la lista histórica. */
export default function PanelCredenciales({ credenciales, secreto, deshabilitado, ahora, onEmitir, onRevocar, onCerrarSecreto }: Props) {
  const [vence, setVence] = useState('')
  const [error, setError] = useState('')
  const [avisoCopia, setAvisoCopia] = useState('')
  const [confirmacion, setConfirmacion] = useState<'rotar' | string | null>(null)

  function vencimiento(): string | null | undefined {
    if (!vence) return null
    const fecha = new Date(vence)
    if (!Number.isFinite(fecha.getTime()) || fecha.getTime() <= Date.now()) { setError('Selecciona una fecha futura.'); return undefined }
    return fecha.toISOString()
  }

  return <section className="space-y-4" aria-labelledby="titulo-credenciales">
    <Titulo nivel={2} id="titulo-credenciales" variante="seccion">3. CREDENCIALES DEL ESP32</Titulo>
    {secreto && <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <Titulo nivel={3} className="font-semibold">Guarda esta credencial ahora</Titulo>
      <Texto className="text-sm">Solo se muestra en esta emisión. Configúrala en la placa; es independiente de tu contraseña y tu sesión.</Texto>
      <label htmlFor="credencial-original" className="block text-sm">Credencial #{secreto.id}</label>
      <AreaTexto id="credencial-original" value={secreto.secreto} readOnly rows={3} autoComplete="off" spellCheck={false} className="break-all font-mono text-sm" />
      <Boton type="button" className="min-h-11 rounded-xl border px-4" onClick={() => {
        setAvisoCopia('')
        void navigator.clipboard?.writeText(secreto.secreto).then(() => setAvisoCopia('Credencial copiada. El portapapeles contiene una clave privada.')).catch(() => setAvisoCopia('No se pudo copiar. Selecciona el texto y cópialo manualmente.'))
        if (!navigator.clipboard) setAvisoCopia('Selecciona el texto y cópialo manualmente.')
      }}>Copiar credencial</Boton>
      {avisoCopia && <Texto role="status" className="text-xs">{avisoCopia}</Texto>}
      <Boton type="button" variante="verde" onClick={() => { setAvisoCopia(''); onCerrarSecreto() }}>Ya la guardé; ocultar credencial</Boton>
    </div>}
    <form className="space-y-3" noValidate onSubmit={(evento) => {
      evento.preventDefault()
      if (deshabilitado) return
      setError('')
      const fecha = vencimiento()
      if (fecha !== undefined) void onEmitir(fecha, false)
    }}>
      <label htmlFor="vencimiento-clave" className="block text-sm font-semibold">Vencimiento (opcional, hora local)</label>
      <Entrada id="vencimiento-clave" type="datetime-local" value={vence} onChange={(evento) => { setVence(evento.target.value); setError('') }} disabled={deshabilitado}
        variante="redondeada" aria-invalid={!!error} aria-describedby={error ? 'error-vencimiento' : undefined} />
      {error && <Texto id="error-vencimiento" role="alert" className="text-sm text-red-700">{error}</Texto>}
      <Texto className="text-xs text-[#64766A]">Sin fecha, la clave sigue vigente hasta que la revoques. Una clave adicional permite reemplazarla en la placa antes de revocar la anterior.</Texto>
      <Boton type="submit" variante="verde" disabled={deshabilitado} className="disabled:opacity-60">Generar {credenciales.length ? 'otra credencial' : 'credencial'}</Boton>
      {credenciales.length > 0 && <Boton type="button" disabled={deshabilitado} onClick={() => setConfirmacion('rotar')} className="min-h-11 w-full rounded-xl border border-red-300 px-3 text-sm text-red-700 disabled:opacity-60">Reemplazar todas las credenciales</Boton>}
    </form>
    <ul className="space-y-3">{credenciales.map((clave) => <li key={clave.id} className="space-y-1 rounded-xl border border-[#D8E1DA] p-3 text-sm">
      <strong>Credencial #{clave.id} · {clave.revocadaEn ? 'Revocada' : credencialVigente(clave, ahora) ? 'Vigente' : 'Vencida'}</strong>
      <Texto className="text-xs text-[#64766A]">Creada: {fechaEquipo(clave.creadaEn)}</Texto>
      <Texto className="text-xs text-[#64766A]">Vencimiento: {clave.venceEn ? fechaEquipo(clave.venceEn) : 'Sin vencimiento'}</Texto>
      {!clave.revocadaEn && <Boton type="button" disabled={deshabilitado} onClick={() => setConfirmacion(clave.id)} className="min-h-11 text-red-700 underline disabled:opacity-60">Revocar credencial #{clave.id}</Boton>}
    </li>)}</ul>
    {confirmacion && <div role="alert" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
      <Texto>{confirmacion === 'rotar' ? 'Se revocarán todas las claves anteriores. Tendrás que instalar la nueva en el ESP32 para que vuelva a comunicarse.' : `La credencial #${confirmacion} dejará de autorizar al ESP32. Si es la que usa la placa, perderá la comunicación.`}</Texto>
      <div className="flex gap-3">
        <Boton type="button" disabled={deshabilitado} onClick={() => setConfirmacion(null)} className="min-h-11 flex-1 rounded-xl border px-3">Cancelar</Boton>
        <Boton type="button" disabled={deshabilitado} className="min-h-11 flex-1 rounded-xl bg-red-700 px-3 text-white disabled:opacity-60" onClick={() => {
          if (deshabilitado) return
          setError('')
          if (confirmacion === 'rotar') {
            const fecha = vencimiento()
            if (fecha !== undefined) void onEmitir(fecha, true).then((ok) => { if (ok) setConfirmacion(null) })
          } else void onRevocar(confirmacion).then((ok) => { if (ok) setConfirmacion(null) })
        }}>Confirmar</Boton>
      </div>
    </div>}
  </section>
}
