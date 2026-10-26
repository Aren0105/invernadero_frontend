import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioInvernaderos } from '../../services/invernaderos'
import EditorDatosInvernadero from './components/EditorDatosInvernadero'

type Props = { id: string; onVolver: () => void }

/** Consulta el registro y su permiso actual antes de montar el editor; una revisión descarta respuestas de cargas anteriores. */
export default function EditarInvernadero({ id, onVolver }: Props) {
  const consultar = useCallback((signal: AbortSignal) => servicioInvernaderos.consultar(id, signal), [id])
  const { datos, error, cargando, recargar } = useConsulta(consultar)
  return <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
    <header className="mb-5">
      <Boton type="button" onClick={onVolver} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Mis invernaderos
      </Boton>
      <Titulo className="text-2xl font-bold tracking-tight">Editar Invernadero</Titulo>
      <Texto className="mt-2 text-sm text-[#64766A]">Actualiza sus datos. Los campos con * son obligatorios.</Texto>
    </header>
    {cargando ? <Texto role="status">Cargando invernadero…</Texto> : error ? <div>
      <Texto role="alert" className="text-sm text-red-700">{error}</Texto>
      <Boton type="button" onClick={recargar} className="mt-4 min-h-11 rounded-xl border border-[#91A595] px-5">Reintentar</Boton>
    </div> : datos && <EditorDatosInvernadero invernadero={datos} onRevisar={recargar} />}
  </main>
}
