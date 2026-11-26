import Boton from '../../../components/ui/Boton'

export type Pestana = 'manual' | 'automatico'

const opciones = [['manual', 'Manual'], ['automatico', 'Automático']] as const

/** Selector de modo; cambiar de pestaña solo cambia el contenido y nunca envía órdenes de riego. */
export default function PestanasRiego({ activa, onSeleccionar }: { activa: Pestana; onSeleccionar: (pestana: Pestana) => void }) {
    return <div role="tablist" aria-label="Modo de riego" className="flex gap-1 rounded-full border border-[#D3DBD5] bg-white p-0.5">
        {opciones.map(([id, etiqueta]) => <Boton key={id} type="button" role="tab" id={`pestana-${id}`} aria-selected={activa === id} aria-controls="panel-riego"
            variante="segmento" onClick={() => onSeleccionar(id)} className={activa === id ? 'bg-[#2F704B] font-semibold text-white' : 'text-[#52675A]'}>
            {etiqueta}
        </Boton>)}
    </div>
}
