import { useEffect, useState } from 'react'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto } from '../../../components/ui/Tipografia'
import { formatearRestante } from '../../../utils/riego'
import type { EstadoBomba } from '../../../types/riego'

/** Cuenta regresiva informativa; el servidor decide cuándo termina realmente el riego. */
function Restante({ finEn }: { finEn: number }) {
    const [ahora, setAhora] = useState(() => Date.now())
    useEffect(() => {
        const temporizador = window.setInterval(() => setAhora(Date.now()), 1000)
        return () => window.clearInterval(temporizador)
    }, [])
    return <Texto className="mt-1 text-xs text-[#64766A]">Tiempo restante: {formatearRestante((finEn - ahora) / 1000)}</Texto>
}

/** Muestra Encendida o Apagada según el estado confirmado por el servidor. */
export default function TarjetaBomba({ bomba, finEn }: { bomba: EstadoBomba; finEn: number | null }) {
    return <Tarjeta className="rounded-2xl border border-[#D8E1DA] bg-white p-4 text-center">
        <Texto className="text-xs text-[#64766A]">Estado de la bomba</Texto>
        <Texto role="status" className={`mt-1 text-2xl font-semibold ${bomba === 'Encendida' ? 'text-[#2F704B]' : 'text-[#233D32]'}`}>{bomba}</Texto>
        {bomba === 'Encendida' && finEn != null && <Restante finEn={finEn} />}
    </Tarjeta>
}
