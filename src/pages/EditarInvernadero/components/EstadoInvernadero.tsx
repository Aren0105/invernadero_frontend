import { useRef } from 'react'
import Boton from '../../../components/ui/Boton'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresEstado, type EstadoInvernadero as Estado } from '../../../types/invernaderos'

type Props = {
  estado: Estado; ocupado: boolean; bloqueado: boolean; cambios: boolean
  onCambiar: (estado: 'Activo' | 'Desactivado') => Promise<boolean>
}

/** Confirma una transición reversible sin guardar implícitamente los cambios generales del formulario. */
export default function EstadoInvernadero({ estado, ocupado, bloqueado, cambios, onCambiar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const desactivado = estado === 'Desactivado'
  return <Tarjeta como="section" className="mt-6 space-y-3" aria-labelledby="titulo-estado">
    <Titulo nivel={2} id="titulo-estado" className="text-base font-semibold">Estado del invernadero</Titulo>
    <Texto className="text-sm">Estado actual: <strong>{nombresEstado[estado]}</strong></Texto>
    <Texto className="text-sm text-[#64766A]">{desactivado ? 'Puedes reactivar este invernadero. Después deberás habilitar su ESP32 por separado si deseas recibir mediciones.' : 'Desactivar conservará los registros y el historial, y bloqueará las comunicaciones del controlador.'}</Texto>
    <Boton type="button" disabled={ocupado || bloqueado} onClick={() => dialogo.current?.showModal()}
      className={`min-h-12 w-full rounded-xl border px-4 text-sm font-semibold disabled:opacity-60 ${desactivado ? 'border-[#91A595] text-[#2F704B]' : 'border-red-300 text-red-700'}`}>
      {desactivado ? 'Reactivar invernadero' : 'Desactivar invernadero'}
    </Boton>
    <dialog ref={dialogo} aria-labelledby="confirmacion-estado-titulo" aria-describedby="confirmacion-estado-texto" onCancel={(evento) => { if (ocupado) evento.preventDefault() }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-[#233D32] shadow-xl backdrop:bg-black/50">
      <Titulo nivel={2} id="confirmacion-estado-titulo" className="text-xl font-semibold">¿{desactivado ? 'Reactivar' : 'Desactivar'} invernadero?</Titulo>
      <Texto id="confirmacion-estado-texto" className="mt-3 text-sm text-[#64766A]">{desactivado ? 'Volverá al estado Activo. Esta acción no habilita automáticamente su ESP32.' : 'Se bloquearán las comunicaciones del ESP32. Se conservarán los datos, los sensores, las credenciales y el historial.'}</Texto>
      {cambios && <Texto className="mt-3 text-sm text-amber-800">Esta acción no guarda los cambios pendientes del formulario.</Texto>}
      <div className="mt-5 flex gap-3">
        <Boton autoFocus type="button" disabled={ocupado} onClick={() => dialogo.current?.close()} className="min-h-11 flex-1 rounded-xl border px-3">Cancelar</Boton>
        <Boton type="button" disabled={ocupado || bloqueado} onClick={() => {
          void onCambiar(desactivado ? 'Activo' : 'Desactivado').then(() => dialogo.current?.close())
        }} className={`min-h-11 flex-1 rounded-xl px-3 text-white disabled:opacity-60 ${desactivado ? 'bg-[#2F704B]' : 'bg-red-700'}`}>{ocupado ? 'Guardando…' : 'Confirmar'}</Boton>
      </div>
    </dialog>
  </Tarjeta>
}
