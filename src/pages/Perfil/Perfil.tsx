import { useRef, useState } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import type { UsuarioAutenticado } from '../../services/api'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'

type Props = { usuario: UsuarioAutenticado; onVolver: () => void; onCerrarSesion: () => Promise<void> }

/** Muestra el perfil real de la cuenta y solicita el cierre; la revocación pertenece al gestor de sesión. */
export default function Perfil({ usuario, onVolver, onCerrarSesion }: Props) {
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')
  const enCurso = useRef(false)
  const iniciales = usuario.name.trim().split(/\s+/).slice(0, 2).map((parte) => Array.from(parte)[0]).join('').toLocaleUpperCase('es-PE')
  return <div className="min-h-dvh bg-white text-[#233D32]">
    <header className="flex items-center gap-1 border-b border-[#D8DEDA] bg-[#F4F5F4] px-4 py-3">
      <Boton type="button" disabled={cerrando} onClick={onVolver} aria-label="Volver a Mis invernaderos" className="flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Boton>
      <Titulo className="text-lg font-semibold">Perfil</Titulo>
    </header>
    <main className="px-5 py-7">
      <section aria-label="Datos de tu cuenta" className="text-center">
        <div aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#99C4AC] bg-[#E8F0EB] text-2xl font-semibold text-[#2F704B]">{iniciales}</div>
        <Titulo nivel={2} className="mt-5 break-words text-lg font-semibold">{usuario.name}</Titulo>
        <Texto className="mt-1 break-words text-sm text-[#738077]">{usuario.email}</Texto>
      </section>
      <Boton type="button" disabled={cerrando} onClick={async () => {
        if (enCurso.current) return
        enCurso.current = true
        setCerrando(true)
        setError('')
        try { await onCerrarSesion() }
        catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo cerrar la sesión.') }
        finally { enCurso.current = false; setCerrando(false) }
      }} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-600 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60">
        {cerrando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </Boton>
      {error && <Texto role="alert" className="mt-4 text-sm text-red-700">{error}</Texto>}
    </main>
  </div>
}
