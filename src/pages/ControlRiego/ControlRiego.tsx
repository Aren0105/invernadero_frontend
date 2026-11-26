import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioInvernaderos } from '../../services/invernaderos'
import { servicioRiego } from '../../services/riego'
import PanelRiego from './components/PanelRiego'

type Props = { id: string; onVolver: () => void }

/** Consulta el invernadero y su estado de riego antes de montar el panel; volver regresa al detalle. */
export default function ControlRiego({ id, onVolver }: Props) {
    const consultar = useCallback(async (signal: AbortSignal) => {
        const [invernadero, riego] = await Promise.all([servicioInvernaderos.consultar(id, signal), servicioRiego.consultar(id, signal)])
        return { invernadero, riego }
    }, [id])
    const { datos, error, cargando, recargar } = useConsulta(consultar)
    return <div className="min-h-dvh bg-[#F5F8F5] text-[#233D32]">
        <header className="flex items-center gap-2 bg-[#EEF1EE] px-3 py-2">
            <Boton type="button" onClick={onVolver} aria-label="Volver al detalle del invernadero" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Boton>
            <div className="min-w-0">
                <Titulo className="text-lg font-semibold">Control de riego</Titulo>
                {datos && <Texto className="truncate text-xs text-[#64766A]">{datos.invernadero.nombre}</Texto>}
            </div>
        </header>
        <main className="px-5 pb-8 pt-4">
            {cargando ? <Texto role="status">Cargando control de riego…</Texto> : error ? <div>
                <Texto role="alert" className="text-sm text-red-700">{error}</Texto>
                <Boton type="button" onClick={recargar} className="mt-4 min-h-11 rounded-xl border border-[#91A595] px-5">Reintentar</Boton>
            </div> : datos && <PanelRiego invernadero={datos.invernadero} inicial={datos.riego} />}
        </main>
    </div>
}
