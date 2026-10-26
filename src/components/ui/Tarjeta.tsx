import type { HTMLAttributes } from 'react'

const estilos = {
  normal: 'rounded-2xl border border-[#D8E1DA] bg-white p-4',
  verde: 'rounded-2xl border border-[#D8E1DA] bg-[#E6F3E9] p-4',
  centrada: 'rounded-3xl border border-[#D8DEDA] bg-white p-6 text-center',
  resumen: 'flex items-center gap-5 rounded-3xl bg-[#E8F3EC] px-6 py-6',
  aviso: 'rounded-xl bg-[#E8F3EC] p-4 text-sm text-[#52675A]',
}

type Props = HTMLAttributes<HTMLElement> & {
  como?: 'div' | 'article' | 'section' | 'dl'
  variante?: keyof typeof estilos
}

/** Contenedor de presentación; recibe el contenido por children y no interpreta datos del dominio. */
export default function Tarjeta({ como: Etiqueta = 'div', variante = 'normal', className = '', ...props }: Props) {
  return <Etiqueta {...props} className={[className, estilos[variante]].filter(Boolean).join(' ')} />
}
