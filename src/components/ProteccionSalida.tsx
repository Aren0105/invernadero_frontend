import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import Boton from './ui/Boton'
import { Texto, Titulo } from './ui/Tipografia'

/** Evita abandonar una escritura pendiente o perder una credencial que solo existe en memoria. */
export default function ProteccionSalida({ pendiente, secreto }: { pendiente: boolean; secreto?: boolean }) {
  const bloqueo = useBlocker(pendiente || !!secreto)
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (bloqueo.state === 'blocked' && !pendiente && !secreto) { bloqueo.reset(); return }
    if (bloqueo.state === 'blocked') {
      if (!dialogo.current?.open) dialogo.current?.showModal()
    } else dialogo.current?.close()
  }, [bloqueo, pendiente, secreto])
  useBeforeUnload(useCallback((evento) => {
    if (pendiente || secreto) { evento.preventDefault(); evento.returnValue = '' }
  }, [pendiente, secreto]))
  return <dialog ref={dialogo} aria-labelledby="salida-titulo" aria-describedby="salida-descripcion" onCancel={(evento) => {
    evento.preventDefault()
    if (bloqueo.state === 'blocked') bloqueo.reset()
  }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-[#233D32] shadow-xl backdrop:bg-black/50">
      <Titulo nivel={2} id="salida-titulo" className="text-lg font-semibold">{pendiente ? 'Operación en curso' : '¿Salir sin guardar la credencial?'}</Titulo>
      <Texto id="salida-descripcion" className="mt-3 text-sm">{pendiente ? 'Espera a que termine la solicitud antes de salir.' : 'La credencial dejará de mostrarse. Si no la guardaste, tendrás que emitir otra.'}</Texto>
      <div className="mt-5 flex gap-3">
        <Boton autoFocus type="button" className="min-h-11 flex-1 rounded-xl border px-3" onClick={() => { if (bloqueo.state === 'blocked') bloqueo.reset() }}>Permanecer</Boton>
        {!pendiente && <Boton type="button" className="min-h-11 flex-1 rounded-xl border border-red-300 px-3 text-red-700" onClick={() => { if (bloqueo.state === 'blocked') bloqueo.proceed() }}>Salir</Boton>}
      </div>
  </dialog>
}
