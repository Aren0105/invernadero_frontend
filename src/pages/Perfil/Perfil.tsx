
import { useRef, useState } from 'react'
import {
  ArrowLeft,
  LoaderCircle,
  User,
  Mail,
  LogOut
} from 'lucide-react'
import type { UsuarioAutenticado } from '../../services/api'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'

type Props = {
  usuario: UsuarioAutenticado
  onVolver: () => void
  onCerrarSesion: () => Promise<void>
}

/** Muestra el perfil real de la cuenta y solicita el cierre; la revocación pertenece al gestor de sesión. */
export default function Perfil({
  usuario,
  onVolver,
  onCerrarSesion
}: Props) {

  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')
  const enCurso = useRef(false)

  const iniciales = usuario.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => Array.from(parte)[0])
    .join('')
    .toLocaleUpperCase('es-PE')

  return (
    <div className="min-h-dvh bg-[#F3F7F3] text-[#233D32]">

      {/* Encabezado */}
      <header className="flex items-center gap-2 border-b border-[#D8DEDA] bg-[#E2EFE5] px-4 py-3">

        <Boton
          type="button"
          disabled={cerrando}
          onClick={onVolver}
          aria-label="Volver a Mis invernaderos"
          className="flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Boton>

        <Titulo className="text-lg font-semibold">
          Perfil
        </Titulo>

      </header>

      <main className="space-y-6 px-4 py-5">

        {/* Tarjeta principal del perfil */}
        <section
          aria-label="Perfil del usuario"
          className="overflow-hidden rounded-2xl border border-[#D8DEDA] bg-white shadow-sm"
        >

          <div className="h-20 bg-[#DCECE1]" />

          <div className="relative -mt-10 px-4 pb-6 text-center">

            <div
              aria-hidden="true"
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#245B40] text-3xl font-semibold text-white shadow-sm"
            >
              {iniciales}
            </div>

            <Titulo
              nivel={2}
              className="mt-4 break-words text-lg font-semibold text-[#233D32]"
            >
              {usuario.name}
            </Titulo>

          </div>

        </section>

        {/* Información de la cuenta */}
        <section aria-label="Datos de tu cuenta">

          <Titulo
            nivel={2}
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64766A]"
          >
            Información de la cuenta
          </Titulo>

          <div className="divide-y divide-[#E8EDE9] rounded-2xl border border-[#D8DEDA] bg-white px-4 shadow-sm">

            {/* Nombre del usuario */}
            <div className="flex items-center gap-3 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EC]">
                <User
                  className="h-5 w-5 text-[#43865C]"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <Texto className="text-xs text-[#64766A]">
                  Nombre de usuario
                </Texto>

                <Texto className="mt-1 break-words text-sm font-medium text-[#233D32]">
                  {usuario.name}
                </Texto>

              </div>

            </div>

            {/* Correo electrónico */}
            <div className="flex items-center gap-3 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EC]">
                <Mail
                  className="h-5 w-5 text-[#43865C]"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <Texto className="text-xs text-[#64766A]">
                  Correo electrónico
                </Texto>

                <Texto className="mt-1 break-all text-sm font-medium text-[#233D32]">
                  {usuario.email}
                </Texto>

              </div>

            </div>

          </div>

        </section>

        {/* Cerrar sesión */}
        <Boton
          type="button"
          disabled={cerrando}
          onClick={async () => {
            if (enCurso.current) return

            enCurso.current = true
            setCerrando(true)
            setError('')

            try {
              await onCerrarSesion()
            } catch (fallo) {
              setError(
                fallo instanceof Error
                  ? fallo.message
                  : 'No se pudo cerrar la sesión.'
              )
            } finally {
              enCurso.current = false
              setCerrando(false)
            }
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E7BABA] bg-[#FFF3F3] px-4 py-3 text-sm font-semibold text-[#B83A3A] transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
        >

          {cerrando ? (
            <LoaderCircle
              className="h-5 w-5 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LogOut
              className="h-5 w-5"
              aria-hidden="true"
            />
          )}

          {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}

        </Boton>

        {error && (
          <Texto
            role="alert"
            className="mt-4 text-sm text-red-700"
          >
            {error}
          </Texto>
        )}

      </main>

    </div>
  )
}
