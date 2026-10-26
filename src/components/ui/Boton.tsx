import type { ComponentPropsWithRef } from 'react'

const estilos = {
  libre: '',
  segmento: 'min-h-11 flex-1 rounded-full px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
  celeste: 'flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#77AEC6] px-6 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60',
  azul: 'min-h-12 w-full rounded-full bg-[#2B7E9B] px-4 py-3 text-sm font-bold text-white hover:bg-[#256D86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B7E9B]',
  verde: 'flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2F704B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#265E3E]',
}

type Props = ComponentPropsWithRef<'button'> & {
  variante?: keyof typeof estilos
}

/** Botón de presentación; el consumidor controla disabled, eventos e indicadores mediante children. */
export default function Boton({ variante = 'libre', className = '', ...props }: Props) {
  return <button {...props} className={[className, estilos[variante]].filter(Boolean).join(' ')} />
}
