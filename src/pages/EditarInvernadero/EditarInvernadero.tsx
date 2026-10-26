import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import Entrada, { AreaTexto } from '../../components/ui/Entrada'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioInvernaderos } from '../../services/invernaderos'
import { nombresEstado, type Invernadero } from '../../types/invernaderos'

type Props = { id: string; onVolver: () => void }

/** Consulta el registro actual; la edición permanece informativa hasta disponer de una ruta de actualización. */
export default function EditarInvernadero({ id, onVolver }: Props) {
  const [datos, setDatos] = useState<Invernadero | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    void servicioInvernaderos.consultar(id, controlador.signal).then((invernadero) => {
      if (!controlador.signal.aborted) setDatos(invernadero)
    }).catch((fallo: unknown) => {
      if (!controlador.signal.aborted) setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar el invernadero.')
    })
    return () => controlador.abort()
  }, [id, revision])

  return <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
    <header className="mb-5">
      <Boton type="button" onClick={onVolver} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
      </Boton>
      <Titulo className="text-2xl font-bold tracking-tight">Editar Invernadero</Titulo>
    </header>
    {error ? <div>
      <Texto role="alert" className="text-sm text-red-700">{error}</Texto>
      <Boton type="button" onClick={() => { setError(''); setRevision((actual) => actual + 1) }} className="mt-4 min-h-11 rounded-xl border border-[#91A595] px-5">Reintentar</Boton>
    </div> : !datos ? <Texto role="status">Cargando invernadero…</Texto> : <div className="space-y-4">
      <Texto role="status" className="rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]">
        {datos.rol === 'ADMIN' ? 'La edición y desactivación de invernaderos aún no están disponibles. Puedes consultar los datos actuales.' : 'Solo un administrador de este invernadero puede modificar sus datos.'}
      </Texto>
      <div><label htmlFor="editar-nombre" className="mb-1.5 block text-sm font-semibold">Nombre del invernadero</label>
        <Entrada id="editar-nombre" value={datos.nombre} readOnly variante="redondeada" /></div>
      <div><label htmlFor="editar-descripcion" className="mb-1.5 block text-sm font-semibold">Descripción</label>
        <AreaTexto id="editar-descripcion" value={datos.descripcion || ''} placeholder="Sin descripción" readOnly rows={3} /></div>
      <div><label htmlFor="editar-ubicacion" className="mb-1.5 block text-sm font-semibold">Ubicación</label>
        <Entrada id="editar-ubicacion" value={datos.ubicacion} readOnly variante="redondeada" /></div>
      <div><label htmlFor="editar-estado" className="mb-1.5 block text-sm font-semibold">Estado</label>
        <Entrada id="editar-estado" value={nombresEstado[datos.estado]} readOnly variante="redondeada" /></div>
    </div>}
  </main>
}
