import type { ReactNode } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import Tarjeta from '../../../components/ui/Tarjeta'
import ProteccionSalida from '../../../components/ProteccionSalida'
import { Texto, Titulo } from '../../../components/ui/Tipografia'

/** Identifica cuál de las tres pantallas del equipo está abierta actualmente. */
export type PasoEquipo = 'controlador' | 'sensores' | 'conexion'

type Props = {
  /** Título principal que aparece en el encabezado de la pantalla. */
  titulo: string
  /** Explicación breve debajo del título para orientar al usuario. */
  subtitulo: string
  /** Paso activo en la barra de navegación superior entre las 3 pantallas. */
  pasoActivo: PasoEquipo
  /** Nombre del invernadero cargado desde el servidor. */
  invernaderoNombre?: string
  /** Rol del usuario actual en este invernadero (solo ADMIN puede editar). */
  rol?: 'ADMIN' | 'OPERATOR'
  /** Estado actual del invernadero; si está Desactivado se bloquean cambios en el equipo. */
  estadoInvernadero?: 'Activo' | 'EnMantenimiento' | 'Desactivado'
  /** Indica si se están consultando datos al backend. */
  cargando: boolean
  /** Indica si hay una operación de escritura en curso (evita salir o enviar dos veces). */
  ocupado: boolean
  /** Error general al cargar los datos iniciales. */
  error: string
  /** Error devuelto al intentar guardar o modificar algo. */
  errorOperacion: string
  /** Mensaje de confirmación tras completar una acción exitosamente. */
  aviso: string
  /** True cuando un token recién emitido sigue visible en pantalla sin confirmar que se guardó. */
  secretoVisible?: boolean
  /** Texto del botón de recarga; cambia si se quiere resaltar otra acción. */
  etiquetaActualizar?: string
  /** Oculta el botón superior de recarga cuando la pantalla ya ofrece un botón de comprobación propio. */
  ocultarActualizar?: boolean
  /** Callback para volver a consultar los datos reales desde la API. */
  onActualizar: () => void
  /** Callback para regresar al detalle del invernadero. */
  onVolver: () => void
  /** Callbacks de navegación entre las 3 pantallas sin duplicar lógica. */
  onIrControlador: () => void
  onIrSensores: () => void
  onIrConexion: () => void
  /** Contenido propio de cada una de las tres pantallas. */
  children: ReactNode
}

/**
 * Contenedor compartido por las 3 pantallas de equipo (Controlador, Sensores y Conexión).
 * Evita repetir encabezado, barra de navegación entre pasos, mensajes de estado,
 * protección de salida y validación de permisos ADMIN.
 */
export default function MarcoEquipo({
  titulo,
  subtitulo,
  pasoActivo,
  invernaderoNombre,
  rol,
  estadoInvernadero,
  cargando,
  ocupado,
  error,
  errorOperacion,
  aviso,
  secretoVisible = false,
  etiquetaActualizar = 'Actualizar datos',
  ocultarActualizar = false,
  onActualizar,
  onVolver,
  onIrControlador,
  onIrSensores,
  onIrConexion,
  children,
}: Props) {
  // Definimos las pestañas de navegación en un arreglo para renderizarlas de forma uniforme.
  const pasos = [
    { id: 'controlador' as const, etiqueta: '1. Controlador', onClick: onIrControlador },
    { id: 'sensores' as const, etiqueta: '2. Sensores', onClick: onIrSensores },
    { id: 'conexion' as const, etiqueta: '3. Conexión', onClick: onIrConexion },
  ]

  return (
    <main className="min-h-dvh bg-[#F5F8F5] px-5 pb-8 pt-3 text-[#233D32]">
      {/* Protege contra cierres o cambios de ruta mientras se guarda o hay un token visible sin copiar. */}
      <ProteccionSalida pendiente={ocupado} secreto={secretoVisible} />

      <header className="mb-4">
        {/* Botón para regresar al detalle del invernadero */}
        <Boton
          type="button"
          disabled={ocupado}
          onClick={onVolver}
          className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm focus-visible:outline-2 focus-visible:outline-[#47885C]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al invernadero
        </Boton>

        <Titulo className="text-2xl font-bold tracking-tight">{titulo}</Titulo>
        {invernaderoNombre && (
          <Texto className="mt-1 break-words text-sm font-medium text-[#2F704B]">{invernaderoNombre}</Texto>
        )}
        <Texto className="mt-1 text-sm text-[#64766A]">{subtitulo}</Texto>
      </header>

      {/* Navegación entre las 3 pantallas para repartir la configuración sin sobrecargar una sola vista */}
      <nav aria-label="Secciones de configuración del equipo" className="mb-5 flex gap-1.5 rounded-full bg-[#E6EFE8] p-1">
        {pasos.map((paso) => {
          const activo = paso.id === pasoActivo
          return (
            <Boton
              key={paso.id}
              type="button"
              variante="segmento"
              disabled={ocupado || activo}
              aria-current={activo ? 'page' : undefined}
              onClick={paso.onClick}
              className={activo ? 'bg-[#2F704B] font-semibold text-white' : 'text-[#233D32] hover:bg-white/60'}
            >
              {paso.etiqueta}
            </Boton>
          )
        })}
      </nav>

      {/* Zona centralizada de feedback: carga, guardado, errores, avisos y botón de recarga */}
      <div className="mb-5 space-y-3">
        {cargando && <Texto role="status" className="text-sm">Consultando datos del equipo…</Texto>}
        {ocupado && <Texto role="status" className="text-sm">Guardando cambios…</Texto>}
        {(error || errorOperacion) && (
          <Texto role="alert" className="text-sm text-red-700">{error || errorOperacion}</Texto>
        )}
        {aviso && <Texto role="status" className="text-sm text-[#2F704B]">{aviso}</Texto>}

        {/* Solo permite recargar si no es OPERATOR y la pantalla no ocultó el botón superior */}
        {(!rol || rol === 'ADMIN') && !ocultarActualizar && (
          <Boton
            type="button"
            disabled={ocupado || cargando}
            onClick={onActualizar}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#91A595] px-4 text-sm disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {etiquetaActualizar}
          </Boton>
        )}
      </div>

      {/* Si el usuario no es ADMIN, mostramos el aviso y ocultamos formularios administrativos */}
      {rol === 'OPERATOR' ? (
        <Tarjeta>
          <Texto role="status" className="text-sm">
            Solo un administrador de este invernadero puede configurar el controlador, sus sensores o sus tokens.
          </Texto>
        </Tarjeta>
      ) : (
        <div className="space-y-5">
          {/* Aviso preventivo si el invernadero está desactivado */}
          {estadoInvernadero === 'Desactivado' && (
            <Tarjeta variante="aviso">
              <Texto role="status">
                El invernadero está desactivado. Reactívalo desde Editar datos y estado antes de registrar o habilitar su ESP32.
              </Texto>
            </Tarjeta>
          )}
          {children}
        </div>
      )}
    </main>
  )
}
