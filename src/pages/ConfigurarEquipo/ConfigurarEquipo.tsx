import { useEffect, useState } from 'react'
import Boton from '../../components/ui/Boton'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioEquipos } from '../../services/equipos'
import { fechaEquipo } from '../../types/equipos'
import { useConfiguracionEquipo } from './useConfiguracionEquipo'
import MarcoEquipo from './components/MarcoEquipo'
import FormularioControlador from './components/FormularioControlador'
import PanelCredenciales from './components/PanelCredenciales'

type Props = {
  /** Identificador del invernadero recibido desde la ruta. */
  id: string
  /** Regresa al detalle del invernadero. */
  onVolver: () => void
  /** Navega a la pantalla 2 (Gestión y asociación de sensores). */
  onIrSensores: () => void
  /** Navega a la pantalla 3 (Probar conexión y activar placa). */
  onIrConexion: () => void
}

/**
 * Pantalla 1: Asociar controlador al invernadero y crear su token de conexión.
 * Se separaron sensores y pruebas de conexión en otras vistas para evitar sobrecargar esta pantalla.
 */
export default function ConfigurarEquipo({ id, onVolver, onIrSensores, onIrConexion }: Props) {
  // Hook compartido que consulta el invernadero, controlador, sensores y credenciales.
  const flujo = useConfiguracionEquipo(id)

  // Reloj local para actualizar visualmente si una credencial sigue vigente o ya venció.
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    const temporizador = window.setInterval(() => setAhora(Date.now()), 10000)
    return () => window.clearInterval(temporizador)
  }, [])

  const { datos, cargando, ocupado, secreto, requiereRevisar } = flujo
  // Bloqueamos acciones mientras carga, guarda, hay un error, un token visible sin guardar o una operación incierta.
  const bloqueado = ocupado || cargando || !!flujo.error || !!secreto || requiereRevisar
  const controlador = datos?.controlador

  return (
    <MarcoEquipo
      titulo="Asociar controlador"
      subtitulo="Registra el ESP32 del invernadero y genera el token necesario para su conexión."
      pasoActivo="controlador"
      invernaderoNombre={datos?.invernadero.nombre}
      rol={datos?.invernadero.rol}
      estadoInvernadero={datos?.invernadero.estado}
      cargando={cargando}
      ocupado={ocupado}
      error={flujo.error}
      errorOperacion={flujo.errorOperacion}
      aviso={flujo.aviso}
      secretoVisible={!!secreto}
      onActualizar={flujo.actualizar}
      onVolver={onVolver}
      onIrControlador={() => {}}
      onIrSensores={onIrSensores}
      onIrConexion={onIrConexion}
    >
      {datos && (
        <>
          {/* Bloque 1: Asociar el controlador ESP32 al invernadero o mostrar el que ya está asociado */}
          <Tarjeta como="section" className="space-y-3" aria-labelledby="titulo-controlador">
            <Titulo nivel={2} id="titulo-controlador" variante="seccion">
              CONTROLADOR ESP32 DEL INVERNADERO
            </Titulo>
            {controlador ? (
              <div className="space-y-1.5 text-sm">
                <Texto className="break-words font-semibold">{controlador.nombre}</Texto>
                <Texto className="text-[#64766A]">
                  ID: {controlador.id} · Este invernadero admite un único controlador ESP32.
                </Texto>
                <Texto className="text-xs text-[#64766A]">
                  Estado: {controlador.activo ? 'Habilitado' : 'Bloqueado'} · Conexión: {controlador.conexion} · Último contacto:{' '}
                  {fechaEquipo(controlador.ultimaComunicacion)}
                </Texto>
              </div>
            ) : (
              <FormularioControlador
                deshabilitado={bloqueado || datos.invernadero.estado === 'Desactivado'}
                onRegistrar={(nombre) =>
                  flujo.ejecutar(
                    () => servicioEquipos.registrar(id, nombre),
                    'Controlador asociado al invernadero. Ahora genera su token de conexión.',
                  )
                }
              />
            )}
          </Tarjeta>

          {/* Bloque 2: Una vez asociado el controlador, habilitamos la emisión y manejo del token */}
          {controlador && (
            <>
              <Tarjeta>
                <PanelCredenciales
                  key={controlador.id}
                  credenciales={datos.credenciales}
                  secreto={secreto}
                  deshabilitado={bloqueado}
                  ahora={ahora}
                  onEmitir={(venceEn, reemplazar) =>
                    flujo.ejecutar(
                      () => servicioEquipos.emitir(controlador.id, venceEn, reemplazar),
                      'Token emitido. Cópialo y guárdalo antes de ocultarlo.',
                      flujo.setSecreto,
                    )
                  }
                  onRevocar={(credencialId) =>
                    flujo.ejecutar(
                      () => servicioEquipos.revocar(controlador.id, credencialId),
                      'Token revocado.',
                    )
                  }
                  onCerrarSecreto={() => flujo.setSecreto(null)}
                />
              </Tarjeta>

              {/* Bloque 3: Accesos directos a las otras dos pantallas para continuar el flujo */}
              <Tarjeta como="section" variante="verde" className="space-y-3" aria-labelledby="titulo-siguientes-pasos">
                <Titulo nivel={2} id="titulo-siguientes-pasos" variante="seccion">
                  SIGUIENTES PASOS
                </Titulo>
                <Texto className="text-sm">
                  Sensores asociados actualmente: <strong>{datos.sensores.length}</strong>. Adminístralos y luego comprueba la conexión física.
                </Texto>
                <div className="flex flex-col gap-2">
                  <Boton type="button" variante="verde" disabled={ocupado} onClick={onIrSensores}>
                    Ir a gestión de sensores
                  </Boton>
                  <Boton
                    type="button"
                    disabled={ocupado}
                    onClick={onIrConexion}
                    className="min-h-11 w-full rounded-full border border-[#91A595] bg-white px-4 py-2 text-sm font-semibold text-[#233D32] disabled:opacity-60"
                  >
                    Ir a probar conexión y activar
                  </Boton>
                </div>
              </Tarjeta>
            </>
          )}
        </>
      )}
    </MarcoEquipo>
  )
}
