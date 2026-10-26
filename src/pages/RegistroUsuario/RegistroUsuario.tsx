import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import Entrada from '../../components/ui/Entrada'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { enfocarPrimerError } from '../../utils/validacion'
import { validarRegistroUsuario, mensajesAutenticacion, type ErroresRegistroUsuario } from '../../utils/autenticacion'
import { ErrorResultadoRegistro, ErrorValidacionAutenticacion } from '../../services/erroresAutenticacion'
import { registrarUsuario } from '../../services/api'

type RegistroUsuarioProps = {
  onVolver: () => void
  onRegistrado: () => void
}

/** Valida RegisterDto, solicita el alta y distingue una cuenta creada de un resultado incierto. */
export default function RegistroUsuario({ onVolver, onRegistrado }: RegistroUsuarioProps) {
  const [errores, setErrores] = useState<ErroresRegistroUsuario>({})
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ErrorResultadoRegistro['resultado'] | null>(null)
  const enCurso = useRef(false)
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  /** Envía únicamente nombre, correo y contraseña; evita duplicados y enfoca los errores al habilitar los campos. */
  async function enviarRegistro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enCurso.current) return
    const form = event.currentTarget
    const valores = new FormData(form)
    const datos = {
      nombre: String(valores.get('nombre') ?? ''),
      correo: String(valores.get('correo') ?? ''),
      password: String(valores.get('password') ?? ''),
      confirmacion: String(valores.get('confirmacion') ?? ''),
    }
    const nuevos = validarRegistroUsuario(datos)
    setErrores(nuevos)
    setErrorApi('')
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form, nuevos)
      return
    }
    enCurso.current = true
    setCargando(true)
    const erroresServidor: ErroresRegistroUsuario = {}
    try {
      await registrarUsuario(datos.nombre, datos.correo, datos.password)
      form.reset()
      onRegistrado()
    } catch (error) {
      if (error instanceof ErrorResultadoRegistro) {
        form.reset()
        setMostrarClave(false)
        setMostrarConfirmacion(false)
        setResultado(error.resultado)
      } else if (error instanceof ErrorValidacionAutenticacion) {
        const equivalencias = { name: 'nombre', email: 'correo', password: 'password' } as const
        for (const campo of error.campos) {
          const local = equivalencias[campo]
          erroresServidor[local] = error.status === 409 ? error.message : mensajesAutenticacion[local]
        }
        setErrores(erroresServidor)
      }
      setErrorApi(error instanceof Error ? error.message : 'No se pudo completar el registro. Inténtalo nuevamente.')
    } finally {
      enCurso.current = false
      setCargando(false)
      // Los campos estaban deshabilitados; se enfoca después de que React actualice su estado.
      if (Object.keys(erroresServidor).length) window.requestAnimationFrame(() => {
        if (form.isConnected) enfocarPrimerError(form, erroresServidor)
      })
    }
  }

  if (resultado) return <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-10 text-center text-[#23392F]">
    <Titulo className="text-2xl font-semibold">{resultado === 'creada' ? 'Tu cuenta ya está creada' : 'Registro pendiente de confirmar'}</Titulo>
    <Texto role="status" className="mt-4 text-sm text-[#64766A]">{errorApi}</Texto>
    <Boton type="button" variante="celeste" className="mt-7" onClick={onVolver}>IR AL INICIO DE SESIÓN</Boton>
    {resultado === 'incierto' && <Boton type="button" className="mt-4 min-h-11 text-sm font-semibold text-[#54869C]" onClick={() => { setResultado(null); setErrorApi('') }}>Volver al formulario</Boton>}
  </main>

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-10 text-[#23392F]">
      <Boton type="button" disabled={cargando} onClick={onVolver} className="mb-8 inline-flex min-h-11 items-center gap-2 self-start rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#54869C]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al inicio de sesión
      </Boton>
      <header className="mb-8">
        <Titulo className="text-3xl font-semibold tracking-tight">Crear cuenta</Titulo>
        <Texto className="mt-2 text-sm text-[#64766A]">Regístrate para gestionar tus invernaderos.</Texto>
      </header>

      <form noValidate aria-busy={cargando} className="flex flex-col" onInput={(event) => {
        const input = event.target
        if (input instanceof HTMLInputElement) {
          setErrores((actual) => ({ ...actual, [input.name]: '', ...(input.name === 'password' ? { confirmacion: '' } : {}) }))
          setErrorApi('')
        }
      }} onSubmit={enviarRegistro}>
        <label htmlFor="nombre" className="mb-2 text-sm font-medium">Nombre completo</label>
        <Entrada id="nombre" name="nombre" type="text" autoComplete="name" required minLength={2} disabled={cargando} aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'error-nombre' : 'ayuda-nombre'} placeholder="Tu nombre" />
        {errores.nombre ? <Texto id="error-nombre" role="alert" className="mt-2 text-sm text-red-700">{errores.nombre}</Texto> : <Texto id="ayuda-nombre" className="mt-2 text-xs text-[#64766A]">Usa entre 2 y 80 caracteres.</Texto>}

        <label htmlFor="correo" className="mb-2 mt-5 text-sm font-medium">Correo electrónico</label>
        <Entrada id="correo" name="correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={cargando} aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'error-correo' : undefined} placeholder="nombre@correo.com" />
        {errores.correo && <Texto id="error-correo" role="alert" className="mt-2 text-sm text-red-700">{errores.correo}</Texto>}

        <label htmlFor="password" className="mb-2 mt-5 text-sm font-medium">Contraseña</label>
        <div className="relative">
          <Entrada id="password" name="password" autoComplete="new-password" required minLength={8} disabled={cargando} placeholder="Mínimo 8 caracteres" type={mostrarClave ? 'text' : 'password'} aria-invalid={!!errores.password} aria-describedby={errores.password ? 'error-password' : 'ayuda-password'} className="pr-14" />
          <Boton type="button" disabled={cargando} onClick={() => setMostrarClave(!mostrarClave)}
            aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarClave}
            className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarClave ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Boton>
        </div>
        {errores.password ? <Texto id="error-password" role="alert" className="mt-2 text-sm text-red-700">{errores.password}</Texto> : <Texto id="ayuda-password" className="mt-2 text-xs text-[#64766A]">Usa entre 8 y 128 caracteres.</Texto>}

        <label htmlFor="confirmacion" className="mb-2 mt-5 text-sm font-medium">Confirmar contraseña</label>
        <div className="relative">
          <Entrada id="confirmacion" name="confirmacion" autoComplete="new-password" required disabled={cargando} placeholder="Repite tu contraseña" type={mostrarConfirmacion ? 'text' : 'password'} aria-invalid={!!errores.confirmacion} aria-describedby={errores.confirmacion ? 'error-confirmacion' : undefined} className="pr-14" />
          <Boton type="button" disabled={cargando} onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
            aria-label={mostrarConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={mostrarConfirmacion}
            className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarConfirmacion ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Boton>
        </div>
        {errores.confirmacion && <Texto id="error-confirmacion" role="alert" className="mt-2 text-sm text-red-700">{errores.confirmacion}</Texto>}

        {errorApi && <Texto role="alert" className="mt-4 text-sm text-red-700">{errorApi}</Texto>}
        <Boton type="submit" disabled={cargando} variante="celeste" className="mt-7">
          {cargando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {cargando ? 'CREANDO CUENTA…' : 'CREAR CUENTA'}
        </Boton>
      </form>
    </main>
  )
}
