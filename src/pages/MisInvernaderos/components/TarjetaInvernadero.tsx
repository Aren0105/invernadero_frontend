import { Leaf, Pencil } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresEstado, type Invernadero } from '../../../types/invernaderos'

type Props = { invernadero: Invernadero; onAbrir: (id: string) => void; onEditar: (id: string) => void }
const coloresEstado = {
  Activo: 'bg-[#E6F3E9] text-[#2F704B]',
  EnMantenimiento: 'bg-amber-100 text-amber-900',
  Desactivado: 'bg-gray-100 text-gray-700',
}

/** Presenta los datos y dos acciones independientes; la edición nunca dispara la apertura del detalle. */
export default function TarjetaInvernadero({ invernadero, onAbrir, onEditar }: Props) {
  return <Tarjeta como="article" className="relative flex items-start gap-2">
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <Leaf className="mt-1 h-7 w-7 shrink-0 text-[#47885C]" aria-hidden="true" />
      <div className="min-w-0">
        <Titulo nivel={3} className="break-words text-base font-semibold">
          <Boton type="button" onClick={() => onAbrir(invernadero.id)} aria-label={`Ver detalle de ${invernadero.nombre}`}
            className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#47885C] after:absolute after:inset-0 after:rounded-2xl after:content-['']">
            {invernadero.nombre}
          </Boton>
        </Titulo>
        <Texto className="mt-1 whitespace-pre-line break-words text-sm text-[#64766A]">{invernadero.descripcion || 'Sin descripción'}</Texto>
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${coloresEstado[invernadero.estado]}`}>
          {nombresEstado[invernadero.estado]}
        </span>
      </div>
    </div>
    {invernadero.rol === 'ADMIN' && <Boton type="button" onClick={() => onEditar(invernadero.id)} aria-label={`Editar ${invernadero.nombre}`}
      className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#47885C] hover:bg-[#E8F3EC] focus-visible:outline-2 focus-visible:outline-[#47885C]">
      <Pencil className="h-5 w-5" aria-hidden="true" />
    </Boton>}
  </Tarjeta>
}
