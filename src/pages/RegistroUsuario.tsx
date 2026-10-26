import { useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { registrarUsuario } from '../services/api'
import { enfocarPrimerError, validarFormulario } from '../utils/validacion'

type RegistroUsuarioProps = {
  onVolver: () => void
}

const campo = 'h-14 w-full rounded-xl border border-[#D3D7D3] bg-white px-4 text-base placeholder:text-gray-400 focus:border-[#77AEC6] focus:outline-none focus:ring-2 focus:ring-[#77AEC6]/30 disabled:opacity-60'

export default function RegistroUsuario({ onVolver }: RegistroUsuarioProps) {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const enCurso = useRef(false)

  if (registrado) {
    return (
      <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-12 text-center text-[#23392F]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#DCEBD1] text-3xl text-[#386E49]" aria-hidden="true">✓</div>
        <h1 className="text-2xl font-semibold">Cuenta creada</h1>
        <p className="mt-3 text-sm text-[#64766A]">Tu registro se completó. Ya puedes iniciar sesión.</p>
        <button type="button" onClick={onVolver} className="mt-8 min-h-12 w-full rounded-full bg-[#77AEC6] px-6 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54869C]">
          VOLVER AL INICIO DE SESIÓN
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-10 text-[#23392F]">
      <button type="button" onClick={onVolver} className="mb-8 inline-flex min-h-11 items-center gap-2 self-start rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#54869C]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al inicio de sesión
      </button>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-[#64766A]">Regístrate para gestionar tus invernaderos.</p>
      </header>

      <form noValidate aria-busy={cargando} className="flex flex-col" onInput={(event) => {
        const input = event.target
        if (input instanceof HTMLInputElement) {
          setErrores((actual) => ({ ...actual, [input.name]: '' }))
          setErrorApi('')
        }
      }} onSubmit={async (event) => {
        event.preventDefault()
        if (enCurso.current) return
        const form = event.currentTarget
        const nuevos = validarFormulario(form)
        const datos = new FormData(form)
        const password = String(datos.get('password') ?? '')
        const confirmacion = String(datos.get('confirmacion') ?? '')
        if (password && (password.length < 8 || password.length > 128)) {
          nuevos.password = 'La contraseña debe tener entre 8 y 128 caracteres.'
        }
        if (password && confirmacion && password !== confirmacion) {
          nuevos.confirmacion = 'Las contraseñas no coinciden.'
        }
        setErrores(nuevos)
        setErrorApi('')
        if (Object.keys(nuevos).length) {
          enfocarPrimerError(form, nuevos)
          return
        }

        enCurso.current = true
        setCargando(true)
        try {
          await registrarUsuario(
            String(datos.get('nombre') ?? ''),
            String(datos.get('correo') ?? ''),
            password,
          )
          form.reset()
          setRegistrado(true)
        } catch (error) {
          setErrorApi(error instanceof Error ? error.message : 'No se pudo crear la cuenta.')
        } finally {
          enCurso.current = false
          setCargando(false)
        }
      }}>
        <label htmlFor="nombre" className="mb-2 text-sm font-medium">Nombre completo</label>
        <input id="nombre" name="nombre" type="text" autoComplete="name" required maxLength={100} disabled={cargando} aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'error-nombre' : undefined} placeholder="Tu nombre" className={campo} />
        {errores.nombre && <p id="error-nombre" role="alert" className="mt-2 text-sm text-red-700">{errores.nombre}</p>}

        <label htmlFor="correo" className="mb-2 mt-5 text-sm font-medium">Correo electrónico</label>
        <input id="correo" name="correo" type="email" autoComplete="email" required maxLength={254} disabled={cargando} aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'error-correo' : undefined} placeholder="nombre@correo.com" className={campo} />
        {errores.correo && <p id="error-correo" role="alert" className="mt-2 text-sm text-red-700">{errores.correo}</p>}

        <label htmlFor="password" className="mb-2 mt-5 text-sm font-medium">Contraseña</label>
        <div className="relative">
          <input id="password" name="password" type={mostrarClave ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={cargando} aria-invalid={!!errores.password} aria-describedby={errores.password ? 'error-password' : 'ayuda-password'} placeholder="Mínimo 8 caracteres" className={`${campo} pr-14`} />
          <button type="button" disabled={cargando} onClick={() => setMostrarClave(!mostrarClave)} aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarClave} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarClave ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errores.password ? <p id="error-password" role="alert" className="mt-2 text-sm text-red-700">{errores.password}</p> : <p id="ayuda-password" className="mt-2 text-xs text-[#64766A]">Usa entre 8 y 128 caracteres.</p>}

        <label htmlFor="confirmacion" className="mb-2 mt-5 text-sm font-medium">Confirmar contraseña</label>
        <div className="relative">
          <input id="confirmacion" name="confirmacion" type={mostrarConfirmacion ? 'text' : 'password'} autoComplete="new-password" required maxLength={128} disabled={cargando} aria-invalid={!!errores.confirmacion} aria-describedby={errores.confirmacion ? 'error-confirmacion' : undefined} placeholder="Repite tu contraseña" className={`${campo} pr-14`} />
          <button type="button" disabled={cargando} onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)} aria-label={mostrarConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={mostrarConfirmacion} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarConfirmacion ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errores.confirmacion && <p id="error-confirmacion" role="alert" className="mt-2 text-sm text-red-700">{errores.confirmacion}</p>}

        {errorApi && <p role="alert" className="mt-4 text-sm text-red-700">{errorApi}</p>}
        <button type="submit" disabled={cargando} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#77AEC6] px-6 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60">
          {cargando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {cargando ? 'CREANDO CUENTA…' : 'CREAR CUENTA'}
        </button>
      </form>
    </main>
  )
}
