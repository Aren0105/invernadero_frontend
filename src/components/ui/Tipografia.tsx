import type { HTMLAttributes } from 'react'

const estilosTitulo = {
  normal: 'text-2xl font-semibold',
  seccion: 'mb-3 text-xs font-semibold tracking-wide text-[#64766A]',
}

type TituloProps = HTMLAttributes<HTMLHeadingElement> & {
  nivel?: 1 | 2 | 3 | 4 | 5 | 6
  variante?: keyof typeof estilosTitulo
}

/** Encabezado único: nivel define la jerarquía y variante el estilo; className sustituye el estilo base. */
export function Titulo({ nivel = 1, variante = 'normal', className, ...props }: TituloProps) {
  const Etiqueta = `h${nivel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <Etiqueta {...props} className={className ?? estilosTitulo[variante]} />
}

/** Párrafo de presentación; contenido, roles y regiones vivas se configuran desde el consumidor. */
export function Texto({ className = 'text-sm text-[#64766A]', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={className} />
}
