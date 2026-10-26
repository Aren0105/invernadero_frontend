import { useRef, useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import Entrada from '../../components/ui/Entrada'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { iniciarSesion } from '../../services/api'
import { enfocarPrimerError } from '../../utils/validacion'
import { validarCredenciales } from '../../utils/autenticacion'

/** Presenta el acceso y conserva la validación y el envío de credenciales en la página. */
export default function Login({ onAcceso, onRegistro, mensajeSesion }: { onAcceso: () => void; onRegistro: () => void; mensajeSesion?: string | null }) {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState('')
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)
  const enCurso = useRef(false)
  const [mostrarClave, setMostrarClave] = useState(false)

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-12 text-[#23392F]">
      <header className="mb-10 flex flex-col items-center">
        <img src="/gota.png" alt="Logo de AquaSmart" className="mb-6 h-32 w-24 object-contain" />
        <Titulo className="text-4xl font-medium tracking-tight">AquaSmart</Titulo>
        <Texto className="mt-3 text-center text-base text-[#808980]">Inicia sesión para continuar</Texto>
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
        const datos = new FormData(form)
        const password = String(datos.get('password') ?? '')
        const nuevos = validarCredenciales({ correo: String(datos.get('correo') ?? ''), password })
        setErrores(nuevos)
        setErrorApi('')
        setAviso('')
        if (Object.keys(nuevos).length) { enfocarPrimerError(form, nuevos); return }
        enCurso.current = true
        setCargando(true)
        try {
          await iniciarSesion(String(datos.get('correo') ?? ''), password)
          form.reset()
          onAcceso()
        } catch (error) {
          setErrorApi(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
        } finally {
          enCurso.current = false
          setCargando(false)
        }
      }}>
        <label htmlFor="correo" className="mb-2 text-base">Correo electrónico</label>
        <Entrada id="correo" name="correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={cargando} aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'error-correo' : undefined} placeholder="Ingresa tu correo" />
        {errores.correo && <Texto id="error-correo" role="alert" className="mt-2 text-sm text-red-700">{errores.correo}</Texto>}
        <label htmlFor="password" className="mb-2 mt-5 text-base">Contraseña</label>
        <div className="relative">
          <Entrada id="password" name="password" autoComplete="current-password" required minLength={8} disabled={cargando} placeholder="Ingresa tu contraseña" type={mostrarClave ? 'text' : 'password'} aria-invalid={!!errores.password} aria-describedby={errores.password ? 'error-password' : undefined} className="pr-14" />
          <Boton type="button" disabled={cargando} onClick={() => setMostrarClave(!mostrarClave)}
            aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarClave}
            className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-xl text-[#54869C]">
            {mostrarClave ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Boton>
        </div>
        {errores.password && <Texto id="error-password" role="alert" className="mt-2 text-sm text-red-700">{errores.password}</Texto>}
        <Boton type="button" onClick={() => setAviso('Contacta al administrador para recuperar tu acceso')} className="mt-2 min-h-11 self-end text-sm text-[#54869C]">¿Olvidaste tu contraseña?</Boton>
        {errorApi && <Texto role="alert" className="mt-3 text-sm text-red-700">{errorApi}</Texto>}
        <Boton type="submit" disabled={cargando} variante="celeste" className="mt-6">
          {cargando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {cargando ? 'INICIANDO SESIÓN…' : 'INICIAR SESIÓN'}
        </Boton>
        <Boton type="button" onClick={onRegistro} disabled={cargando} className="mt-4 min-h-11 text-sm font-semibold text-[#54869C] disabled:opacity-60">
          ¿No tienes cuenta? Regístrate
        </Boton>
        <Texto role="status" className="mt-4 text-sm text-[#52675A]">{aviso || mensajeSesion}</Texto>
      </form>
    </main>
  )
}
