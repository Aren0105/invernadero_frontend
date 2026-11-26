import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import ProteccionSalida from '../../components/ProteccionSalida'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioInvernaderos } from '../../services/invernaderos'
import { ErrorOperacion } from '../../services/contratoApi'
import { enfocarPrimerError } from '../../utils/validacion'
import { datosCrearInvernadero, validarInvernadero, type ErroresInvernadero, type FormularioInvernadero } from '../../utils/invernaderos'
import FormularioRegistro from '../../components/invernaderos/FormularioInvernadero'

type Props = { onVolver: () => void; onRegistrado: (id: string) => void }
const inicial: FormularioInvernadero = { nombre: '', ubicacion: '', cultivo: '', dimension: '', descripcion: '' }

/** Crea el invernadero por separado del equipo; una respuesta incierta obliga a revisar la lista antes de repetir el alta. */
export default function RegistrarInvernadero({ onVolver, onRegistrado }: Props) {
  const [valores, setValores] = useState(inicial)
  const [errores, setErrores] = useState<ErroresInvernadero>({})
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [creado, setCreado] = useState<string | null>(null)
  const enviando = useRef(false)
  const navegado = useRef(false)
  useEffect(() => {
    // La navegación espera al render que libera el bloqueo de la solicitud.
    if (creado && !ocupado && !navegado.current) {
      navegado.current = true
      onRegistrado(creado)
    }
  }, [creado, ocupado, onRegistrado])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando.current || bloqueado) return
    const nuevos = validarInvernadero(valores)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(evento.currentTarget, nuevos); return }
    enviando.current = true
    setOcupado(true)
    setError('')
    try {
      const invernadero = await servicioInvernaderos.crear(datosCrearInvernadero(valores))
      // Se ofrece continuar después de liberar el bloqueo de navegación de la escritura.
      setCreado(invernadero.id)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo registrar el invernadero.')
      if (fallo instanceof ErrorOperacion && fallo.resultado !== 'rechazada') setBloqueado(true)
    } finally { enviando.current = false; setOcupado(false) }
  }

  return <div className="min-h-dvh bg-[#F5F8F5] text-[#233D32]">
    <ProteccionSalida pendiente={ocupado} />
    <header className="flex items-center gap-2 bg-[#EEF1EE] px-3 py-2">
      <Boton type="button" disabled={ocupado} onClick={onVolver} aria-label="Volver a Mis invernaderos" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Boton>
      <Titulo className="text-lg font-semibold">Registrar invernadero</Titulo>
    </header>
    <main className="px-5 pb-8 pt-4">
      {creado ? <section className="space-y-4 rounded-2xl border border-[#D8E1DA] bg-white p-5">
        <Titulo nivel={2} className="text-xl font-semibold">Invernadero creado</Titulo>
        <Texto role="status" className="text-sm text-[#64766A]">Se guardó correctamente. Desde su detalle puedes configurar el ESP32 y sus sensores ahora o más adelante.</Texto>
        <Boton type="button" variante="verde" onClick={() => onRegistrado(creado)}>Ver invernadero y configurar controlador</Boton>
        <Boton type="button" className="min-h-11 w-full text-sm underline" onClick={onVolver}>Volver a Mis invernaderos</Boton>
      </section> : <>
        <Texto className="mb-4 text-sm text-[#64766A]">Ingresa los datos de tu invernadero</Texto>
        <FormularioRegistro etiquetaEnviar="REGISTRAR INVERNADERO" valores={valores} errores={errores} ocupado={ocupado} bloqueado={bloqueado} onEnviar={(evento) => { void enviar(evento) }}
          onCambiar={(campo, valor) => { setValores((actual) => ({ ...actual, [campo]: valor })); setErrores((actual) => ({ ...actual, [campo]: '' })); setError('') }} />
        {error && <Texto role="alert" className="mt-4 text-sm text-red-700">{error}</Texto>}
        {bloqueado && <Boton type="button" variante="verde" className="mt-4" onClick={onVolver}>Revisar Mis invernaderos</Boton>}
      </>}
    </main>
  </div>
}
