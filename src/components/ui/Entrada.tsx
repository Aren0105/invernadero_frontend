import type { ComponentPropsWithRef } from 'react'

const estilos = {
  suave: 'h-14 w-full rounded-xl border border-[#D3D7D3] bg-white px-4 text-base placeholder:text-gray-400 focus:border-[#77AEC6] focus:outline-none focus:ring-2 focus:ring-[#77AEC6]/30 disabled:opacity-60',
  redondeada: 'min-h-12 w-full rounded-2xl border border-[#D3DBD5] bg-white px-4 py-3 text-base text-[#233D32] placeholder:text-[#808680] focus:border-[#47885C] focus:outline-none focus:ring-2 focus:ring-[#47885C]/20',
  busqueda: 'h-14 w-full rounded-2xl border border-[#D3DBD5] bg-white pl-11 pr-3 text-base placeholder:text-[#738077] focus:outline-2 focus:outline-[#47885C]',
}

type Props = ComponentPropsWithRef<'input'> & { variante?: keyof typeof estilos }

/** Entrada de presentación sin estado propio.
 * El consumidor controla type, value/defaultValue, eventos, accesibilidad y ref mediante atributos nativos.
 */
export default function Entrada({ variante = 'suave', className = '', ...props }: Props) {
  return <input {...props} className={[estilos[variante], className].filter(Boolean).join(' ')} />
}

/** Área de texto nativa con estilo redondeado; valor, eventos y referencia se controlan desde afuera. */
export function AreaTexto({ className = '', ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} className={[estilos.redondeada, 'resize-y', className].filter(Boolean).join(' ')} />
}
