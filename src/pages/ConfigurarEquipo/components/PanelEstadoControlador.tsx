import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { fechaEquipo, type Controlador } from '../../../types/equipos'

type Props = { controlador: Controlador; tieneCredencial: boolean; deshabilitado: boolean; onCambiar: (activo: boolean) => Promise<boolean> }

/** Distingue autorización administrativa de conexión física; bloquear no borra sensores ni claves. */
export default function PanelEstadoControlador({ controlador, tieneCredencial, deshabilitado, onCambiar }: Props) {
  const [confirmar, setConfirmar] = useState(false)
  return <section className="space-y-3" aria-labelledby="titulo-activacion">
    <Titulo nivel={2} id="titulo-activacion" variante="seccion">5. ACTIVACIÓN Y COMUNICACIÓN</Titulo>
    <dl className="space-y-2 text-sm">
      <div><dt className="text-[#64766A]">Autorización</dt><dd className="font-semibold">{controlador.activo ? 'Habilitado' : 'Bloqueado'}</dd></div>
      <div><dt className="text-[#64766A]">Último estado registrado</dt><dd>{controlador.conexion}</dd></div>
      <div><dt className="text-[#64766A]">Última comunicación</dt><dd>{fechaEquipo(controlador.ultimaComunicacion)}</dd></div>
    </dl>
    <Texto className="text-xs text-[#64766A]">Habilitar permite comunicarse a la placa; no la conecta. El estado registrado puede corresponder a un contacto anterior. Actualiza para consultar la última comunicación.</Texto>
    {!tieneCredencial && <Texto className="text-sm text-amber-800">Genera una credencial vigente antes de habilitar el ESP32. Sin ella no podrá comunicarse, aunque figure habilitado.</Texto>}
    <Boton type="button" disabled={deshabilitado || (!controlador.activo && !tieneCredencial)} onClick={() => setConfirmar(true)}
      className="min-h-12 w-full rounded-xl border border-[#91A595] px-4 text-sm font-semibold disabled:opacity-60">
      {controlador.activo ? 'Bloquear comunicaciones del ESP32' : 'Habilitar ESP32'}
    </Boton>
    {confirmar && <div className="space-y-3 rounded-xl bg-[#E8F3EC] p-4 text-sm">
      <Texto>{controlador.activo ? 'Se impedirán las comunicaciones del equipo. Se conservarán sus sensores, historial y credenciales; podrás habilitarlo después.' : 'El equipo podrá comunicarse con sus credenciales vigentes. Comprueba que ya configuraste la placa con sus sensores y su clave.'}</Texto>
      <div className="flex gap-3">
        <Boton type="button" disabled={deshabilitado} onClick={() => setConfirmar(false)} className="min-h-11 flex-1 rounded-xl border px-3">Cancelar</Boton>
        <Boton type="button" disabled={deshabilitado} className="min-h-11 flex-1 rounded-xl bg-[#2F704B] px-3 text-white disabled:opacity-60"
          onClick={() => { void onCambiar(!controlador.activo).then((ok) => { if (ok) setConfirmar(false) }) }}>Confirmar</Boton>
      </div>
    </div>}
  </section>
}
