import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import Entrada, { AreaTexto } from '../../../components/ui/Entrada'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { credencialVigente, fechaEquipo, type CredencialEmitida, type CredencialEquipo } from '../../../types/equipos'

type Props = {
  /** Lista histórica de tokens emitidos (metadatos sin el secreto). */
  credenciales: CredencialEquipo[]
  /** Token recién generado que permanece visible solo hasta que el usuario lo oculte. */
  secreto: CredencialEmitida | null
  /** Bloquea controles cuando hay peticiones en curso o un secreto abierto. */
  deshabilitado: boolean
  /** Marca de tiempo actual para determinar si un token está vigente o vencido. */
  ahora: number
  /** Emite un nuevo token o rota todos los anteriores (`reemplazar = true`). */
  onEmitir: (venceEn: string | null, reemplazar: boolean) => Promise<boolean>
  /** Revoca un token específico por su identificador. */
  onRevocar: (id: string) => Promise<boolean>
  /** Limpia el secreto de la memoria una vez que el usuario confirma haberlo guardado. */
  onCerrarSecreto: () => void
}

/**
 * Administra los tokens de conexión del controlador ESP32.
 * El texto completo del token solo se muestra en el momento de su emisión; nunca se guarda en el navegador.
 */
export default function PanelCredenciales({
  credenciales,
  secreto,
  deshabilitado,
  ahora,
  onEmitir,
  onRevocar,
  onCerrarSecreto,
}: Props) {
  const [vence, setVence] = useState('')
  const [error, setError] = useState('')
  const [avisoCopia, setAvisoCopia] = useState('')
  // Guarda qué acción destructiva espera confirmación ('rotar' o el ID de una credencial a revocar).
  const [confirmacion, setConfirmacion] = useState<'rotar' | string | null>(null)

  /** Valida la fecha opcional de vencimiento y la convierte a formato ISO UTC para el backend. */
  function vencimiento(): string | null | undefined {
    if (!vence) return null
    const fecha = new Date(vence)
    if (!Number.isFinite(fecha.getTime()) || fecha.getTime() <= Date.now()) {
      setError('Selecciona una fecha futura.')
      return undefined
    }
    return fecha.toISOString()
  }

  return (
    <section className="space-y-4" aria-labelledby="titulo-credenciales">
      <Titulo nivel={2} id="titulo-credenciales" variante="seccion">
        TOKEN DE CONEXIÓN DEL CONTROLADOR
      </Titulo>

      {/* Caja de alerta que muestra el token recién generado una única vez */}
      {secreto && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <Titulo nivel={3} className="font-semibold">
            Guarda este token ahora
          </Titulo>
          <Texto className="text-sm">
            Solo se muestra en esta emisión. Configúralo en la placa; es independiente de tu contraseña y tu sesión.
          </Texto>
          <label htmlFor="credencial-original" className="block text-sm">
            Credencial #{secreto.id}
          </label>
          <AreaTexto
            id="credencial-original"
            value={secreto.secreto}
            readOnly
            rows={3}
            autoComplete="off"
            spellCheck={false}
            className="break-all font-mono text-sm"
          />
          <Boton
            type="button"
            className="min-h-11 rounded-xl border px-4"
            onClick={() => {
              setAvisoCopia('')
              void navigator.clipboard
                ?.writeText(secreto.secreto)
                .then(() => setAvisoCopia('Token copiado. El portapapeles contiene una clave privada.'))
                .catch(() => setAvisoCopia('No se pudo copiar. Selecciona el texto y cópialo manualmente.'))
              if (!navigator.clipboard) setAvisoCopia('Selecciona el texto y cópialo manualmente.')
            }}
          >
            Copiar token
          </Boton>
          {avisoCopia && (
            <Texto role="status" className="text-xs">
              {avisoCopia}
            </Texto>
          )}
          <Boton
            type="button"
            variante="verde"
            onClick={() => {
              setAvisoCopia('')
              onCerrarSecreto()
            }}
          >
            Ya lo guardé; ocultar token
          </Boton>
        </div>
      )}

      {/* Formulario para generar un token nuevo (con vencimiento opcional) */}
      <form
        className="space-y-3"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          if (deshabilitado) return
          setError('')
          const fecha = vencimiento()
          if (fecha !== undefined) void onEmitir(fecha, false)
        }}
      >
        <label htmlFor="vencimiento-clave" className="block text-sm font-semibold">
          Vencimiento (opcional, hora local)
        </label>
        <Entrada
          id="vencimiento-clave"
          type="datetime-local"
          value={vence}
          onChange={(evento) => {
            setVence(evento.target.value)
            setError('')
          }}
          disabled={deshabilitado}
          variante="redondeada"
          aria-invalid={!!error}
          aria-describedby={error ? 'error-vencimiento' : undefined}
        />
        {error && (
          <Texto id="error-vencimiento" role="alert" className="text-sm text-red-700">
            {error}
          </Texto>
        )}
        <Texto className="text-xs text-[#64766A]">
          Sin fecha, el token sigue vigente hasta que lo revoques. Emitir uno adicional permite actualizar la placa antes de revocar el anterior.
        </Texto>
        <Boton type="submit" variante="verde" disabled={deshabilitado} className="disabled:opacity-60">
          Generar {credenciales.length ? 'otro token' : 'token de conexión'}
        </Boton>

        {/* Opción para reemplazar todos los tokens existentes de una sola vez */}
        {credenciales.length > 0 && (
          <Boton
            type="button"
            disabled={deshabilitado}
            onClick={() => setConfirmacion('rotar')}
            className="min-h-11 w-full rounded-xl border border-red-300 px-3 text-sm text-red-700 disabled:opacity-60"
          >
            Reemplazar todos los tokens
          </Boton>
        )}
      </form>

      {/* Historial de tokens emitidos con su estado actual (Vigente, Vencida o Revocada) */}
      <ul className="space-y-3">
        {credenciales.map((clave) => (
          <li key={clave.id} className="space-y-1 rounded-xl border border-[#D8E1DA] p-3 text-sm">
            <strong>
              Token #{clave.id} · {clave.revocadaEn ? 'Revocado' : credencialVigente(clave, ahora) ? 'Vigente' : 'Vencido'}
            </strong>
            <Texto className="text-xs text-[#64766A]">Creado: {fechaEquipo(clave.creadaEn)}</Texto>
            <Texto className="text-xs text-[#64766A]">
              Vencimiento: {clave.venceEn ? fechaEquipo(clave.venceEn) : 'Sin vencimiento'}
            </Texto>
            {!clave.revocadaEn && (
              <Boton
                type="button"
                disabled={deshabilitado}
                onClick={() => setConfirmacion(clave.id)}
                className="min-h-11 text-red-700 underline disabled:opacity-60"
              >
                Revocar token #{clave.id}
              </Boton>
            )}
          </li>
        ))}
      </ul>

      {/* Cuadro de confirmación antes de rotar todos los tokens o revocar uno */}
      {confirmacion && (
        <div role="alert" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
          <Texto>
            {confirmacion === 'rotar'
              ? 'Se revocarán todos los tokens anteriores. Tendrás que instalar el nuevo en el ESP32 para que vuelva a comunicarse.'
              : `El token #${confirmacion} dejará de autorizar al ESP32. Si es el que usa la placa, perderá la comunicación.`}
          </Texto>
          <div className="flex gap-3">
            <Boton
              type="button"
              disabled={deshabilitado}
              onClick={() => setConfirmacion(null)}
              className="min-h-11 flex-1 rounded-xl border px-3"
            >
              Cancelar
            </Boton>
            <Boton
              type="button"
              disabled={deshabilitado}
              className="min-h-11 flex-1 rounded-xl bg-red-700 px-3 text-white disabled:opacity-60"
              onClick={() => {
                if (deshabilitado) return
                setError('')
                if (confirmacion === 'rotar') {
                  const fecha = vencimiento()
                  if (fecha !== undefined) {
                    void onEmitir(fecha, true).then((ok) => {
                      if (ok) setConfirmacion(null)
                    })
                  }
                } else {
                  void onRevocar(confirmacion).then((ok) => {
                    if (ok) setConfirmacion(null)
                  })
                }
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
