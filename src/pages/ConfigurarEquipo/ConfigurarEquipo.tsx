import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import Tarjeta from '../../components/ui/Tarjeta'
import ProteccionSalida from '../../components/ProteccionSalida'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioEquipos } from '../../services/equipos'
import { credencialVigente } from '../../types/equipos'
import { useConfiguracionEquipo } from './useConfiguracionEquipo'
import FormularioControlador from './components/FormularioControlador'
import PanelSensores from './components/PanelSensores'
import PanelCredenciales from './components/PanelCredenciales'
import PanelEstadoControlador from './components/PanelEstadoControlador'
import GuiaInstalacion from './components/GuiaInstalacion'

type Props = { id: string; onVolver: () => void }

/** Compone el aprovisionamiento reanudable; cada paso usa recursos ya guardados y acciones explícitas. */
export default function ConfigurarEquipo({ id, onVolver }: Props) {
  const flujo = useConfiguracionEquipo(id)
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    const temporizador = window.setInterval(() => setAhora(Date.now()), 10000)
    return () => window.clearInterval(temporizador)
  }, [])
  const { datos, cargando, ocupado, secreto, requiereRevisar } = flujo
  const bloqueado = ocupado || cargando || !!flujo.error || !!secreto || requiereRevisar
  const controlador = datos?.controlador

  return <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
    <ProteccionSalida pendiente={ocupado} secreto={!!secreto} />
    <header className="mb-5">
      <Boton type="button" disabled={ocupado} onClick={onVolver} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver al invernadero
      </Boton>
      <Titulo className="text-2xl font-bold tracking-tight">Configurar equipo</Titulo>
      {datos && <Texto className="mt-2 break-words text-sm text-[#64766A]">{datos.invernadero.nombre}</Texto>}
    </header>
    <div className="mb-5 space-y-3">
      {cargando && <Texto role="status" className="text-sm">Actualizando equipo…</Texto>}
      {ocupado && <Texto role="status" className="text-sm">Guardando cambios…</Texto>}
      {(flujo.error || flujo.errorOperacion) && <Texto role="alert" className="text-sm text-red-700">{flujo.error || flujo.errorOperacion}</Texto>}
      {flujo.aviso && <Texto role="status" className="text-sm text-[#2F704B]">{flujo.aviso}</Texto>}
      {(!datos || datos.invernadero.rol === 'ADMIN') && <Boton type="button" disabled={ocupado || cargando} onClick={flujo.actualizar}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#91A595] px-4 text-sm disabled:opacity-60">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />Actualizar datos
      </Boton>}
    </div>
    {datos?.invernadero.rol === 'OPERATOR' ? <Tarjeta><Texto role="status" className="text-sm">Solo un administrador de este invernadero puede configurar el equipo.</Texto></Tarjeta> : datos && <div className="space-y-5">
      {datos.invernadero.estado === 'Desactivado' && <Tarjeta variante="aviso"><Texto role="status">El invernadero está desactivado. Reactívalo desde Editar datos y estado antes de registrar o habilitar su ESP32.</Texto></Tarjeta>}
      <Tarjeta como="section" className="space-y-4">
        <Titulo nivel={2} variante="seccion">1. CONTROLADOR ESP32</Titulo>
        {controlador ? <div className="space-y-2 text-sm">
          <Texto className="break-words font-semibold">{controlador.nombre}</Texto>
          <Texto className="text-[#64766A]">ID: {controlador.id}. Este invernadero admite un único ESP32.</Texto>
        </div> : <FormularioControlador deshabilitado={bloqueado || datos.invernadero.estado === 'Desactivado'} onRegistrar={(nombre) => flujo.ejecutar(() => servicioEquipos.registrar(id, nombre), 'ESP32 registrado. Continúa con sus sensores.')} />}
      </Tarjeta>
      {controlador && <>
        <Tarjeta><PanelSensores sensores={datos.sensores} deshabilitado={bloqueado}
          onAgregar={(tipo, unidad) => flujo.ejecutar(() => servicioEquipos.agregarSensor(controlador.id, tipo, unidad), 'Sensor registrado. Configura su identificador en la placa.')} /></Tarjeta>
        <Tarjeta><PanelCredenciales key={controlador.id} credenciales={datos.credenciales} secreto={secreto} deshabilitado={bloqueado} ahora={ahora}
          onEmitir={(venceEn, reemplazar) => flujo.ejecutar(() => servicioEquipos.emitir(controlador.id, venceEn, reemplazar), 'Credencial emitida. Guárdala antes de continuar.', flujo.setSecreto)}
          onRevocar={(credencialId) => flujo.ejecutar(() => servicioEquipos.revocar(controlador.id, credencialId), 'Credencial revocada.')}
          onCerrarSecreto={() => flujo.setSecreto(null)} /></Tarjeta>
        <Tarjeta><GuiaInstalacion controlador={controlador} sensores={datos.sensores} /></Tarjeta>
        <Tarjeta><PanelEstadoControlador controlador={controlador} invernaderoDesactivado={datos.invernadero.estado === 'Desactivado'} tieneCredencial={datos.credenciales.some((clave) => credencialVigente(clave, ahora))}
          deshabilitado={bloqueado} onCambiar={(activo) => flujo.ejecutar(() => servicioEquipos.activar(controlador.id, activo), activo ? 'ESP32 habilitado. Comprueba su última comunicación después de conectar la placa.' : 'Comunicaciones del ESP32 bloqueadas.')} /></Tarjeta>
      </>}
    </div>}
  </main>
}
