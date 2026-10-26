import { useRef, useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { validarFormulario, enfocarPrimerError } from '../utils/validacion'
import { iniciarSesion, type RolUsuario } from '../services/api'

export default function Login({ onAcceso, onRegistro }: { onAcceso: (duracion: number, rol: RolUsuario) => void; onRegistro: () => void }) {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mostrarClave, setMostrarClave] = useState(false)
  const [aviso, setAviso] = useState('')
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)
  const enCurso = useRef(false)
  const campo = 'h-14 w-full rounded-xl border border-[#D3D7D3] bg-white px-4 text-base placeholder:text-gray-400 focus:border-[#77AEC6] focus:outline-none focus:ring-2 focus:ring-[#77AEC6]/30 disabled:opacity-60'

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-12 text-[#23392F]">
      <header className="mb-10 flex flex-col items-center">
        <img src="/gota.png" alt="Logo de AquaSmart" className="mb-6 h-32 w-24 object-contain" />
        <h1 className="text-4xl font-medium tracking-tight">AquaSmart</h1>
        <p className="mt-3 text-center text-base text-[#808980]">Inicia sesión para continuar</p>
      </header>
      <form noValidate aria-busy={cargando} className="flex flex-col" onInput={(event) => {
        const input = event.target
        if (input instanceof HTMLInputElement) {
          setErrores((actual) => ({ ...actual, [input.name]: '' }))
          setErrorApi('')
          setAviso('')
        }
      }} onSubmit={async (event) => {
        event.preventDefault()
        if (enCurso.current) return
        const form = event.currentTarget
        const nuevos = validarFormulario(form)
        const datos = new FormData(form)
        const password = String(datos.get('password') ?? '')
        if (password && (password.length < 8 || password.length > 128)) nuevos.password = 'La contraseña debe tener entre 8 y 128 caracteres.'
        setErrores(nuevos)
        setErrorApi('')
        setAviso('')
        if (Object.keys(nuevos).length) { enfocarPrimerError(form, nuevos); return }
        enCurso.current = true
        setCargando(true)
        try {
          const sesion = await iniciarSesion(String(datos.get('correo') ?? ''), password)
          form.reset()
          onAcceso(sesion.expiresIn, sesion.role)
        } catch (error) {
          setErrorApi(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
        } finally {
          enCurso.current = false
          setCargando(false)
        }
      }}>
        <label htmlFor="correo" className="mb-2 text-base">Correo electrónico</label>
        <input id="correo" name="correo" type="email" autoComplete="email" required maxLength={254} disabled={cargando} aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'error-correo' : undefined} placeholder="Ingresa tu correo" className={campo} />
        {errores.correo && <p id="error-correo" role="alert" className="mt-2 text-sm text-red-700">{errores.correo}</p>}
        <label htmlFor="password" className="mb-2 mt-5 text-base">Contraseña</label>
        <div className="relative">
          <input id="password" name="password" type={mostrarClave ? 'text' : 'password'} autoComplete="current-password" required minLength={8} maxLength={128} disabled={cargando} aria-invalid={!!errores.password} aria-describedby={errores.password ? 'error-password' : undefined} placeholder="Ingresa tu contraseña" className={`${campo} pr-14`} />
          <button type="button" disabled={cargando} onClick={() => setMostrarClave(!mostrarClave)} aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarClave} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarClave ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errores.password && <p id="error-password" role="alert" className="mt-2 text-sm text-red-700">{errores.password}</p>}
        <button type="button" onClick={() => setAviso('Contacta al administrador para recuperar tu acceso')} className="mt-2 min-h-11 self-end text-sm text-[#54869C]">¿Olvidaste tu contraseña?</button>
        {errorApi && <p role="alert" className="mt-3 text-sm text-red-700">{errorApi}</p>}
        <button type="submit" disabled={cargando} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#77AEC6] px-6 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60">
          {cargando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {cargando ? 'INICIANDO SESIÓN…' : 'INICIAR SESIÓN'}
        </button>
        <button type="button" onClick={onRegistro} disabled={cargando} className="mt-4 min-h-11 text-sm font-semibold text-[#54869C] disabled:opacity-60">
          ¿No tienes cuenta? Regístrate
        </button>
        <p role="status" className="mt-4 text-sm text-[#52675A]">{aviso}</p>
      </form>
    </main>
  )
}


