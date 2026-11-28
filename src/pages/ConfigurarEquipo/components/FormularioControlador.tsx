import { useRef, useState } from 'react'
import isLength from 'validator/lib/isLength'
import Entrada from '../../../components/ui/Entrada'
import Boton from '../../../components/ui/Boton'
import { Texto } from '../../../components/ui/Tipografia'

/**
 * Formulario para asociar un controlador ESP32 al invernadero.
 * Solo pide el nombre; el ID del invernadero y el administrador vienen del contexto autenticado.
 */
export default function FormularioControlador({
  deshabilitado,
  onRegistrar,
}: {
  deshabilitado: boolean
  onRegistrar: (nombre: string) => Promise<boolean>
}) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const entrada = useRef<HTMLInputElement>(null)

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        if (deshabilitado) return
        // Validamos la longitud del nombre (1 a 100 caracteres) antes de llamar al servidor.
        if (!isLength(nombre.trim(), { min: 1, max: 100 })) {
          setError('Usa entre 1 y 100 caracteres.')
          entrada.current?.focus()
          return
        }
        setError('')
        void onRegistrar(nombre)
      }}
      className="space-y-3"
    >
      <Texto className="text-sm text-[#64766A]">
        Este invernadero todavía no tiene controlador. Registra su ESP32 para asociarlo y luego crear su token.
      </Texto>
      <label htmlFor="nombre-controlador" className="block text-sm font-semibold">
        Nombre del ESP32
      </label>
      <Entrada
        id="nombre-controlador"
        ref={entrada}
        value={nombre}
        onChange={(evento) => {
          setNombre(evento.target.value)
          setError('')
        }}
        required
        disabled={deshabilitado}
        variante="redondeada"
        placeholder="Ej. ESP32 principal"
        aria-invalid={!!error}
        aria-describedby={error ? 'error-controlador' : undefined}
      />
      {error && (
        <Texto id="error-controlador" role="alert" className="text-sm text-red-700">
          {error}
        </Texto>
      )}
      <Boton type="submit" variante="verde" disabled={deshabilitado} className="disabled:opacity-60">
        Asociar controlador ESP32
      </Boton>
    </form>
  )
}
