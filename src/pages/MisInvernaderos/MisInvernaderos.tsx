import { opcionesNavegacion } from '../../config/navegacion'
import { useState } from 'react'
import { Leaf, LoaderCircle, Plus } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import NavegacionPrincipal from '../../components/NavegacionPrincipal'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { filtrarInvernaderos } from '../../types/invernaderos'
import { useInvernaderos } from './useInvernaderos'
import BusquedaInvernaderos from './components/BusquedaInvernaderos'
import TarjetaInvernadero from './components/TarjetaInvernadero'

type Props = {
  onRegistrar: () => void
  onPerfil: () => void
  onAbrir: (id: string) => void
  onEditar: (id: string) => void
}

/** Compone la consulta y la búsqueda; las tarjetas reciben datos y acciones sin conocer el router. */
export default function MisInvernaderos({ onRegistrar, onPerfil, onAbrir, onEditar }: Props) {
  const { registros, estado, error, recargar } = useInvernaderos()
  const [busqueda, setBusqueda] = useState('')
  const [termino, setTermino] = useState('')
  const visibles = filtrarInvernaderos(registros, termino)

  function cambiarBusqueda(valor: string) {
    setBusqueda(valor)
    // Borrar el campo restaura todos los registros sin exigir otro envío.
    if (!valor.trim()) setTermino('')
  }
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="bg-[#BCD7A7] px-6 pb-7 pt-8">
        <Titulo className="text-3xl font-medium tracking-tight">Mis Invernaderos</Titulo>
        <Texto className="mt-2 text-sm text-[#5F735F]">Gestiona y monitorea tus cultivos</Texto>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-5 pt-6">
        <Tarjeta como="section" aria-label="Resumen de invernaderos" variante="resumen" className="mb-5">
          <Leaf className="h-9 w-9 shrink-0 text-[#47885C]" aria-hidden="true" />
          <div>
            <Titulo nivel={2} className="text-sm text-[#64766A]">Invernaderos registrados</Titulo>
            <Texto aria-label={estado === 'listo' ? `${registros.length} invernaderos registrados` : 'Cantidad no disponible'} className="mt-1 text-4xl font-medium text-[#47885C]">{estado === 'listo' ? registros.length : '—'}</Texto>
          </div>
        </Tarjeta>

        <BusquedaInvernaderos valor={busqueda} onCambiar={cambiarBusqueda} onBuscar={() => setTermino(busqueda.trim())} />
        <Titulo nivel={2} id="tus-invernaderos" className="mb-4 mt-6 text-xs font-semibold tracking-wide text-[#64766A]">TUS INVERNADEROS</Titulo>

        <section aria-labelledby="tus-invernaderos" aria-busy={estado === 'cargando'} className="flex flex-1 flex-col gap-3">
          {estado === 'cargando' && <Texto role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-[#64766A]">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Cargando invernaderos…
          </Texto>}
          {estado === 'error' && <div className="py-12 text-center">
            <Texto role="alert" className="text-sm text-red-700">{error}</Texto>
            <Boton type="button" onClick={recargar} className="mt-4 min-h-11 rounded-xl border border-[#91A595] px-5 text-sm font-semibold">Reintentar</Boton>
          </div>}
          {estado === 'listo' && <>
            <Texto role="status" className="sr-only">{visibles.length} invernaderos encontrados</Texto>
            {visibles.map((invernadero) => <TarjetaInvernadero key={invernadero.id} invernadero={invernadero} onAbrir={onAbrir} onEditar={onEditar} />)}
            {!visibles.length && <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <Leaf className="mb-6 h-20 w-20 text-[#47885C]" strokeWidth={1.8} aria-hidden="true" />
              <Texto role="status" className="max-w-64 text-base text-[#64766A]">{registros.length === 0 ? 'No hay invernaderos registrados' : 'No se encontraron invernaderos'}</Texto>
            </div>}
          </>}
        </section>

        <div className="mt-auto flex justify-end pt-8">
          <Boton type="button" aria-label="Agregar invernadero" onClick={onRegistrar} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#47885C] text-white shadow-md hover:bg-[#386E49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47885C]">
            <Plus className="h-8 w-8" aria-hidden="true" />
          </Boton>
        </div>
      </main>

      <NavegacionPrincipal opciones={opcionesNavegacion.map((opcion) => ({ ...opcion, onClick: opcion.id === 'perfil' ? onPerfil : undefined }))} activa="inicio" paginaActual="inicio" />
    </div>
  )
}
