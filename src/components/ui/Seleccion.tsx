import type { ComponentPropsWithRef } from 'react'

/** Selector nativo de presentación; opciones, valor, validación y eventos pertenecen al consumidor. */
export default function Seleccion({ className = '', ...props }: ComponentPropsWithRef<'select'>) {
  return <select {...props} className={`min-h-12 w-full rounded-2xl border border-[#D3DBD5] bg-white px-4 py-3 text-base text-[#233D32] focus:outline-2 focus:outline-[#47885C] disabled:opacity-60 ${className}`} />
}
