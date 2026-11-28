import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { fechaEquipo, type Controlador } from '../../../types/equipos'

type Props = {
  /** Datos del controlador asociado. */
  controlador: Controlador
  /** True si el invernadero está desactivado (impide habilitar el ESP32). */
  invernaderoDesactivado: boolean
  /** True si existe al menos un token vigente (requisito obligatorio para habilitar). */
  tieneCredencial: boolean
  /** Deshabilita acciones durante carga o escritura en curso. */
  deshabilitado: boolean
  /** Envía PATCH /controllers/:id para habilitar o bloquear comunicaciones. */
  onCambiar: (activo: boolean) => Promise<boolean>
}

/**
 * Permite autorizar o bloquear las comunicaciones del controlador con el servidor.
 * Bloquear conserva sensores, historial y tokens; además es requisito para editar o borrar sensores.
 */
export default function PanelEstadoControlador({
  controlador,
  invernaderoDesactivado,
  tieneCredencial,
  deshabilitado,
  onCambiar,
}: Props) {
  // Muestra un cuadro de confirmación antes de cambiar el estado de autorización.
  const [confirmar, setConfirmar] = useState(false)

  return (
    <section className="space-y-3" aria-labelledby="titulo-activacion">
      <Titulo nivel={2} id="titulo-activacion" variante="seccion">
        ACTIVACIÓN DEL CONTROLADOR
      </Titulo>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-[#64766A]">Autorización</dt>
          <dd className="font-semibold">{controlador.activo ? 'Habilitado' : 'Bloqueado'}</dd>
        </div>
        <div>
          <dt className="text-[#64766A]">Último estado registrado</dt>
          <dd>{controlador.conexion}</dd>
        </div>
        <div>
          <dt className="text-[#64766A]">Última comunicación</dt>
          <dd>{fechaEquipo(controlador.ultimaComunicacion)}</dd>
        </div>
      </dl>

      <Texto className="text-xs text-[#64766A]">
        Habilitar autoriza al ESP32 a comunicarse con la API; no lo conecta automáticamente. Si necesitas editar o eliminar sensores, bloquea las comunicaciones desde aquí.
      </Texto>

      {!tieneCredencial && (
        <Texto className="text-sm text-amber-800">
          Genera un token vigente en la pantalla Controlador antes de habilitar el ESP32. Sin token no podrá autenticarse.
        </Texto>
      )}

      <Boton
        type="button"
        disabled={deshabilitado || (!controlador.activo && (!tieneCredencial || invernaderoDesactivado))}
        onClick={() => setConfirmar(true)}
        className="min-h-12 w-full rounded-xl border border-[#91A595] px-4 text-sm font-semibold disabled:opacity-60"
      >
        {controlador.activo ? 'Bloquear comunicaciones del ESP32' : 'Habilitar ESP32'}
      </Boton>

      {/* Confirmación explícita antes de habilitar o bloquear comunicaciones */}
      {confirmar && (
        <div className="space-y-3 rounded-xl bg-[#E8F3EC] p-4 text-sm">
          <Texto>
            {controlador.activo
              ? 'Se impedirán las comunicaciones del controlador. Se conservarán sus sensores, historial y tokens; podrás habilitarlo después.'
              : 'El controlador podrá comunicarse con sus tokens vigentes. Comprueba que ya configuraste la placa con sus sensores y su token.'}
          </Texto>
          <div className="flex gap-3">
            <Boton
              type="button"
              disabled={deshabilitado}
              onClick={() => setConfirmar(false)}
              className="min-h-11 flex-1 rounded-xl border px-3"
            >
              Cancelar
            </Boton>
            <Boton
              type="button"
              disabled={deshabilitado || (!controlador.activo && (!tieneCredencial || invernaderoDesactivado))}
              className="min-h-11 flex-1 rounded-xl bg-[#2F704B] px-3 text-white disabled:opacity-60"
              onClick={() => {
                void onCambiar(!controlador.activo).then((ok) => {
                  if (ok) setConfirmar(false)
                })
              }}
            >
              Confirmar
            </Boton>
          </div>
        </div>
      )}
    </section>
  )
}
