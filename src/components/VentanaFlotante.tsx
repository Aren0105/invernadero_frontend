import { useEffect, useRef, type ReactNode } from 'react'
import { Titulo } from './ui/Tipografia'

type Props = {
    id: string
    abierta: boolean
    titulo: string
    onCerrar: () => void
    /** Impide cerrar con Escape mientras hay una operación en curso. */
    bloquearCierre?: boolean
    children: ReactNode
}

/** Ventana modal nativa controlada por `abierta`; el consumidor aporta contenido y botones. */
export default function VentanaFlotante({ id, abierta, titulo, onCerrar, bloquearCierre = false, children }: Props) {
    const dialogo = useRef<HTMLDialogElement>(null)
    useEffect(() => {
        const elemento = dialogo.current
        if (!elemento) return
        if (abierta && !elemento.open) elemento.showModal()
        if (!abierta && elemento.open) elemento.close()
    }, [abierta])
    return <dialog ref={dialogo} aria-labelledby={`${id}-titulo`} onClose={onCerrar} onCancel={(evento) => { if (bloquearCierre) evento.preventDefault() }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-[#233D32] shadow-xl backdrop:bg-black/50">
        <Titulo nivel={2} id={`${id}-titulo`} className="text-xl font-semibold">{titulo}</Titulo>
        {children}
    </dialog>
}
