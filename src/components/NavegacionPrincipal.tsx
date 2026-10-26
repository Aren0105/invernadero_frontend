import type { ComponentPropsWithRef, ReactNode } from 'react'
import Boton from './ui/Boton'

/** Datos de presentación de una opción; no define rutas ni acciones del dominio. */
export type OpcionNavegacion = {
  id: string
  etiqueta: string
  icono: ReactNode
  onClick?: () => void
}

type Props = ComponentPropsWithRef<'nav'> & {
  opciones: readonly OpcionNavegacion[]
  activa?: string
  paginaActual?: string
}

/** Menú de presentación: el consumidor proporciona opciones, iconos, acciones y selección.
 * className permite sustituir la distribución predeterminada de cuatro columnas.
 */
export default function NavegacionPrincipal({ opciones, activa, paginaActual,
  className = 'sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  ...props }: Props) {
  return <nav aria-label="Navegación principal" {...props} className={className}>
    {opciones.map(({ id, etiqueta, icono, onClick }) => (
      <Boton key={id} type="button" aria-current={id === paginaActual ? 'page' : undefined} onClick={onClick}
        className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#28583A] ${id === activa ? 'bg-[#DCEBD1] text-[#28583A]' : 'text-[#486D4D]'}`}>
        {icono}
        <span className="text-[10px]">{etiqueta}</span>
      </Boton>
    ))}
  </nav>
}
