import { useEffect, useRef, useState } from 'react'
import { servicioRiego } from '../../services/riego'
import { ErrorOperacion } from '../../services/contratoApi'
import type { Invernadero } from '../../types/invernaderos'
import type { ConfigAutomatica, EstadoRiego } from '../../types/riego'

export type Accion = 'iniciar' | 'detener' | 'guardar' | 'cancelar' | 'revisar'

/** Coordina las órdenes de riego; la bomba solo cambia tras la confirmación del servidor y una respuesta incierta exige actualizar antes de repetir. */
export function useControlRiego(invernadero: Invernadero, inicial: EstadoRiego) {
    const [riego, setRiego] = useState(inicial)
    const [accion, setAccion] = useState<Accion | null>(null)
    const [error, setError] = useState('')
    const [aviso, setAviso] = useState('')
    const [requiereRevisar, setRequiereRevisar] = useState(false)
    const [guardadoAbierto, setGuardadoAbierto] = useState(false)
    const operando = useRef(false)
    const id = invernadero.id
    const bloqueado = invernadero.estado !== 'Activo'
    const encendida = riego.bomba === 'Encendida'

    // Mientras la bomba esté encendida se consulta el estado: el riego termina solo al cumplirse la duración.
    useEffect(() => {
        if (!encendida) return
        const controlador = new AbortController()
        const temporizador = window.setInterval(() => {
            if (operando.current || document.visibilityState !== 'visible') return
            servicioRiego.consultar(id, controlador.signal).then((nuevo) => {
                if (operando.current) return
                setRiego(nuevo)
                if (nuevo.bomba === 'Apagada') setAviso('El riego finalizó.')
            }).catch(() => { /* El siguiente ciclo reintenta la consulta. */ })
        }, 5000)
        return () => { window.clearInterval(temporizador); controlador.abort() }
    }, [encendida, id])

    async function ejecutar(nombre: Accion, operacion: () => Promise<EstadoRiego>, exito: string): Promise<boolean> {
        if (operando.current || requiereRevisar) return false
        operando.current = true
        setAccion(nombre)
        setError('')
        setAviso('')
        try {
            setRiego(await operacion())
            setAviso(exito)
            return true
        } catch (fallo) {
            setError(fallo instanceof Error ? fallo.message : 'No se pudo completar la operación de riego.')
            if (fallo instanceof ErrorOperacion && (fallo.resultado !== 'rechazada' || [403, 404, 409].includes(fallo.status ?? 0))) setRequiereRevisar(true)
            return false
        } finally { operando.current = false; setAccion(null) }
    }

    /** Vuelve a consultar el estado real tras una respuesta incierta. */
    async function revisar() {
        if (operando.current) return
        operando.current = true
        setAccion('revisar')
        setError('')
        setAviso('')
        try {
            setRiego(await servicioRiego.consultar(id))
            setRequiereRevisar(false)
        } catch (fallo) {
            setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar el estado del riego.')
        } finally { operando.current = false; setAccion(null) }
    }

    async function guardarAutomatico(config: ConfigAutomatica): Promise<boolean> {
        if (bloqueado) return false
        const guardado = await ejecutar('guardar', () => servicioRiego.guardarAutomatico(id, config), '')
        if (guardado) setGuardadoAbierto(true)
        return guardado
    }

    return {
        riego, accion, error, aviso, requiereRevisar, bloqueado, encendida, guardadoAbierto, revisar, guardarAutomatico,
        cerrarGuardado: () => setGuardadoAbierto(false),
        iniciar: (minutos: number) => bloqueado || encendida ? Promise.resolve(false) : ejecutar('iniciar', () => servicioRiego.iniciar(id, minutos), 'Riego iniciado.'),
        // Detener sigue disponible aunque el invernadero pase a mantenimiento o desactivado.
        detener: () => ejecutar('detener', () => servicioRiego.detener(id), 'Riego detenido.'),
        cancelarAutomatico: () => ejecutar('cancelar', () => servicioRiego.cancelarAutomatico(id), 'Riego automático cancelado.'),
    }
}
