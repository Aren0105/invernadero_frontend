import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import ProteccionSalida from '../../../components/ProteccionSalida'
import VentanaFlotante from '../../../components/VentanaFlotante'
import { Texto } from '../../../components/ui/Tipografia'
import { nombresEstado, type Invernadero } from '../../../types/invernaderos'
import type { EstadoRiego } from '../../../types/riego'
import { useControlRiego } from '../useControlRiego'
import PestanasRiego, { type Pestana } from './PestanasRiego'
import RiegoAutomatico from './RiegoAutomatico'
import RiegoManual from './RiegoManual'
import TarjetaBomba from './TarjetaBomba'

const estiloVentana = 'min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-60'

/** Compone el control de riego; el estado de la bomba y la configuración provienen siempre del servidor. */
export default function PanelRiego({ invernadero, inicial }: { invernadero: Invernadero; inicial: EstadoRiego }) {
    const control = useControlRiego(invernadero, inicial)
    const [pestana, setPestana] = useState<Pestana>(inicial.modo === 'Automatico' ? 'automatico' : 'manual')
    const [avisoAbierto, setAvisoAbierto] = useState(control.bloqueado)
    const [confirmando, setConfirmando] = useState(false)
    const estado = nombresEstado[invernadero.estado].toLowerCase()
    const textoBloqueo = pestana === 'automatico'
        ? `El riego automático está suspendido mientras el invernadero esté ${estado}.`
        : `No se pueden iniciar nuevos riegos mientras el invernadero esté ${estado}.`
    const config = control.riego.automatico

    return <div className="space-y-4">
        <ProteccionSalida pendiente={control.accion !== null && control.accion !== 'revisar'} />
        <PestanasRiego activa={pestana} onSeleccionar={(siguiente) => { setPestana(siguiente); setAvisoAbierto(control.bloqueado) }} />
        <TarjetaBomba bomba={control.riego.bomba} finEn={control.riego.finEn} />
        <div role="tabpanel" id="panel-riego" aria-labelledby={`pestana-${pestana}`} className="space-y-4">
            {pestana === 'manual'
                ? <RiegoManual encendida={control.encendida} bloqueado={control.bloqueado} accion={control.accion} onIniciar={control.iniciar} onDetener={control.detener} />
                : <RiegoAutomatico key={config ? `${config.humedadMinima}:${config.duracionMinutos}` : 'sin-configuracion'} config={config} bloqueado={control.bloqueado}
                    accion={control.accion} onGuardar={control.guardarAutomatico} onCancelarAuto={() => setConfirmando(true)} />}
        </div>
        {control.bloqueado && <Texto role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{textoBloqueo}</Texto>}
        {control.error && <Texto role="alert" className="text-sm text-red-700">{control.error}</Texto>}
        {control.aviso && <Texto role="status" className="text-sm text-[#2F704B]">{control.aviso}</Texto>}
        {control.requiereRevisar && <div className="space-y-2">
            <Texto className="text-sm text-[#64766A]">Actualiza el estado del riego antes de enviar otra orden.</Texto>
            <Boton type="button" variante="verde" disabled={control.accion !== null} onClick={() => { void control.revisar() }}>Actualizar estado</Boton>
        </div>}

        <VentanaFlotante id="aviso-estado" abierta={avisoAbierto} titulo="Riego no disponible" onCerrar={() => setAvisoAbierto(false)}>
            <Texto className="mt-3 text-sm text-[#64766A]">{textoBloqueo}</Texto>
            <Boton autoFocus type="button" onClick={() => setAvisoAbierto(false)} className={`${estiloVentana} mt-5 w-full bg-[#2F704B] text-white`}>Entendido</Boton>
        </VentanaFlotante>

        <VentanaFlotante id="guardado" abierta={control.guardadoAbierto} titulo="Configuración guardada" onCerrar={control.cerrarGuardado}>
            <Texto className="mt-3 text-sm text-[#64766A]">
                {config ? `Se regará durante ${config.duracionMinutos} min cuando la humedad del suelo baje de ${config.humedadMinima} %.` : 'La configuración se guardó correctamente.'}
            </Texto>
            <Boton autoFocus type="button" onClick={control.cerrarGuardado} className={`${estiloVentana} mt-5 w-full bg-[#2F704B] text-white`}>Aceptar</Boton>
        </VentanaFlotante>

        <VentanaFlotante id="cancelar-auto" abierta={confirmando} titulo="¿Cancelar riego automático?" bloquearCierre={control.accion === 'cancelar'} onCerrar={() => setConfirmando(false)}>
            <Texto className="mt-3 text-sm text-[#64766A]">Se eliminará la configuración guardada y el sistema dejará de regar por humedad.</Texto>
            <div className="mt-5 flex gap-3">
                <Boton autoFocus type="button" disabled={control.accion === 'cancelar'} onClick={() => setConfirmando(false)} className={`${estiloVentana} border`}>Volver</Boton>
                <Boton type="button" disabled={control.accion !== null} onClick={() => { void control.cancelarAutomatico().then(() => setConfirmando(false)) }} className={`${estiloVentana} bg-red-700 text-white`}>
                    {control.accion === 'cancelar' ? 'Cancelando…' : 'Sí, cancelar'}
                </Boton>
            </div>
        </VentanaFlotante>
    </div>
}
