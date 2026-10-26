import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import Boton from './ui/Boton'
import { Texto, Titulo } from './ui/Tipografia'

/** Evita abandonar una escritura pendiente, perder cambios del formulario o descartar una credencial efímera. */
export default function ProteccionSalida({ pendiente, secreto, cambios }: { pendiente: boolean; secreto?: boolean; cambios?: boolean }) {
  const bloqueo = useBlocker(pendiente || !!secreto || !!cambios)
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (bloqueo.state === 'blocked' && !pendiente && !secreto && !cambios) { bloqueo.reset(); return }
    if (bloqueo.state === 'blocked') {
      if (!dialogo.current?.open) dialogo.current?.showModal()
    } else dialogo.current?.close()
  }, [bloqueo, pendiente, secreto, cambios])
  useBeforeUnload(useCallback((evento) => {
    if (pendiente || secreto || cambios) { evento.preventDefault(); evento.returnValue = '' }
  }, [pendiente, secreto, cambios]))
  return <dialog ref={dialogo} aria-labelledby="salida-titulo" aria-describedby="salida-descripcion" onCancel={(evento) => {
    evento.preventDefault()
    if (bloqueo.state === 'blocked') bloqueo.reset()
  }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-[#233D32] shadow-xl backdrop:bg-black/50">
      <Titulo nivel={2} id="salida-titulo" className="text-lg font-semibold">{pendiente ? 'Operación en curso' : secreto ? '¿Salir sin guardar la credencial?' : '¿Salir sin guardar los cambios?'}</Titulo>
      <Texto id="salida-descripcion" className="mt-3 text-sm">{pendiente ? 'Espera a que termine la solicitud antes de salir.' : secreto ? 'La credencial dejará de mostrarse. Si no la guardaste, tendrás que emitir otra.' : 'Se descartarán los cambios que todavía no guardaste en el formulario.'}</Texto>
      <div className="mt-5 flex gap-3">
        <Boton autoFocus type="button" className="min-h-11 flex-1 rounded-xl border px-3" onClick={() => { if (bloqueo.state === 'blocked') bloqueo.reset() }}>Permanecer</Boton>
        {!pendiente && <Boton type="button" className="min-h-11 flex-1 rounded-xl border border-red-300 px-3 text-red-700" onClick={() => { if (bloqueo.state === 'blocked') bloqueo.proceed() }}>Salir</Boton>}
      </div>
  </dialog>
}
