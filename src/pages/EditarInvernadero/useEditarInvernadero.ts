import { useRef, useState, type FormEvent } from 'react'
import { servicioInvernaderos } from '../../services/invernaderos'
import { ErrorOperacion } from '../../services/contratoApi'
import type { Invernadero } from '../../types/invernaderos'
import { datosActualizarInvernadero, formularioDesdeInvernadero, validarInvernadero, type ErroresInvernadero, type FormularioInvernadero } from '../../utils/invernaderos'
import { enfocarPrimerError } from '../../utils/validacion'

/** Coordina edición y estado por separado; las respuestas inciertas exigen volver a consultar antes de escribir. */
export function useEditarInvernadero(inicial: Invernadero) {
  const [actual, setActual] = useState(inicial)
  const [valores, setValores] = useState(() => formularioDesdeInvernadero(inicial))
  const [errores, setErrores] = useState<ErroresInvernadero>({})
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [requiereRevisar, setRequiereRevisar] = useState(false)
  const operando = useRef(false)
  const cambios = JSON.stringify(valores) !== JSON.stringify(formularioDesdeInvernadero(actual))

  async function ejecutar(operacion: () => Promise<Invernadero>, guardarDatos: boolean): Promise<boolean> {
    if (operando.current || requiereRevisar || actual.rol !== 'ADMIN') return false
    operando.current = true
    setOcupado(true)
    setError('')
    setAviso('')
    try {
      const resultado = await operacion()
      setActual(resultado)
      // Una transición conserva lo escrito por la persona; sin cambios pendientes adopta los datos actuales del servidor.
      if (guardarDatos || !cambios) { setValores(formularioDesdeInvernadero(resultado)); setErrores({}) }
      setAviso(guardarDatos ? 'Cambios guardados correctamente.' : resultado.estado === 'Desactivado'
        ? 'Invernadero desactivado. Se bloquearon las comunicaciones de su ESP32 y se conservó el historial.'
        : 'Invernadero reactivado. El ESP32 seguirá bloqueado hasta que lo habilites desde Configurar equipo.')
      return true
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudieron guardar los cambios.')
      if (fallo instanceof ErrorOperacion && (fallo.resultado !== 'rechazada' || [403, 404, 409].includes(fallo.status ?? 0))) setRequiereRevisar(true)
      return false
    } finally { operando.current = false; setOcupado(false) }
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (operando.current || requiereRevisar || actual.rol !== 'ADMIN') return
    const nuevos = validarInvernadero(valores)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(evento.currentTarget, nuevos); return }
    void ejecutar(() => servicioInvernaderos.actualizar(actual.id, datosActualizarInvernadero(valores)), true)
  }

  function cambiar(campo: keyof FormularioInvernadero, valor: string) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: '' }))
    setAviso('')
    if (!requiereRevisar) setError('')
  }

  return {
    actual, valores, errores, error, aviso, ocupado, requiereRevisar, cambios, cambiar, guardar,
    cambiarEstado: (estado: 'Activo' | 'Desactivado') => ejecutar(() => servicioInvernaderos.cambiarEstado(actual.id, estado), false),
  }
}
