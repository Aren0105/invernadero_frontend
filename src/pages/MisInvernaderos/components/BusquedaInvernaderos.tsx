import { Search } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import Entrada from '../../../components/ui/Entrada'

type Props = { valor: string; onCambiar: (valor: string) => void; onBuscar: () => void }

/** Búsqueda controlada: Enter y la lupa envían el mismo formulario; el estado pertenece a la página. */
export default function BusquedaInvernaderos({ valor, onCambiar, onBuscar }: Props) {
  return <form role="search" className="flex gap-3" onSubmit={(evento) => { evento.preventDefault(); onBuscar() }}>
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 -translate-y-1/2 text-[#738077]" aria-hidden="true" />
      <Entrada type="search" aria-label="Buscar invernadero por nombre" placeholder="Buscar invernadero..." variante="busqueda"
        value={valor} onChange={(evento) => onCambiar(evento.target.value)} />
    </div>
    <Boton type="submit" aria-label="Buscar invernaderos" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#91A595] bg-[#E8F3EC] text-[#47885C] focus-visible:outline-2 focus-visible:outline-offset-2">
      <Search className="h-6 w-6" aria-hidden="true" />
    </Boton>
  </form>
}
