import { opcionesNavegacion } from '../../config/navegacion'
import { ArrowLeft, ArrowRight, Droplets, Waves, Pencil } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import NavegacionPrincipal from '../../components/NavegacionPrincipal'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { nombresEstado } from '../../types/invernaderos'
import { useDetalleInvernadero } from './useDetalleInvernadero'
import SeccionEquipo from './components/SeccionEquipo'

type DetalleInvernaderoProps = {
  id: string
  onVolver: () => void
  onPerfil: () => void
  onMediciones: () => void
  onConfigurar: () => void
  onEditar: () => void
  recienCreado?: boolean
  onControlRiego?: () => void
  onHistorialRiego?: () => void
}

/** Consulta el registro real y permite retomar el equipo; las mediciones y el riego conservan sus integraciones independientes. */
export default function DetalleInvernadero({ id, onVolver, onPerfil, onMediciones, onConfigurar, onEditar, recienCreado, onControlRiego, onHistorialRiego }: DetalleInvernaderoProps) {
  const { datos, error, cargando, recargar } = useDetalleInvernadero(id)
  const invernadero = datos?.invernadero
  const area = invernadero?.largo && invernadero.ancho ? Number(invernadero.largo) * Number(invernadero.ancho) : null
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="bg-[#E6F3E9] px-5 pb-5 pt-4">
        <div className="flex items-start gap-2">
          <Boton type="button" onClick={onVolver} aria-label="Volver a Mis invernaderos" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#47885C]">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Boton>
          <div className="min-w-0 pt-1">
            <Titulo className="break-words text-xl font-semibold">{invernadero?.nombre || 'Detalle del invernadero'}</Titulo>
            <Texto className="mt-1 break-words text-sm text-[#64766A]">Ubicación: {invernadero?.ubicacion || '—'}</Texto>
          </div>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-[#DCE6DF] px-3 py-1 text-xs text-[#52675A]">Estado: {invernadero ? nombresEstado[invernadero.estado] : '—'}</span>
      </header>

      <main className="flex-1 space-y-6 px-5 py-6">
        {cargando && <Texto role="status">Cargando invernadero…</Texto>}
        {error && <div><Texto role="alert" className="text-sm text-red-700">{error}</Texto><Boton type="button" onClick={recargar} className="mt-3 min-h-11 rounded-xl border px-4">Reintentar</Boton></div>}
        {datos && <>
        {recienCreado && <Tarjeta variante="aviso"><Texto role="status">Invernadero creado. Puedes configurar su equipo ahora o más adelante.</Texto></Tarjeta>}
        {invernadero?.rol === 'ADMIN' && <SeccionEquipo equipo={datos.equipo} error={datos.errorEquipo} onConfigurar={onConfigurar} />}
        <section aria-labelledby="estado-actual">
          <Titulo nivel={2} id="estado-actual" variante="seccion">ESTADO ACTUAL</Titulo>
          <div className="grid grid-cols-2 gap-3">
            <Tarjeta como="article">
              <Droplets className="mb-3 h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />
              <Texto className="text-2xl font-semibold">— <span className="text-base font-normal">%</span></Texto>
              <Titulo nivel={3} className="mt-1 text-sm text-[#64766A]">Humedad del suelo</Titulo>
            </Tarjeta>
            <Tarjeta como="article">
              <Droplets className="mb-3 h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />
              <Texto className="text-2xl font-semibold">— <span className="text-base font-normal">%</span></Texto>
              <Titulo nivel={3} className="mt-1 text-sm text-[#64766A]">Humedad ambiental</Titulo>
            </Tarjeta>
          </div>
          <Tarjeta como="article" variante="normal" className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <Titulo nivel={3} className="flex items-center gap-2 text-sm font-medium"><Waves className="h-5 w-5 text-[#2B7E9B]" aria-hidden="true" />Nivel de agua</Titulo>
              <Texto className="font-semibold text-[#2B7E9B]">— %</Texto>
            </div>
            <div aria-hidden="true" className="mt-3 h-1.5 rounded-full bg-[#DCE2DE]" />
          </Tarjeta>
          <Texto className="mt-3 text-sm text-[#64766A]">Sin datos disponibles</Texto>
          <Texto className="mt-1 text-xs text-[#64766A]">Última medición: —</Texto>
          <Boton type="button" onClick={onMediciones} className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#D8E1DA] bg-white px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-green-700">
            Monitoreo de mediciones <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Boton>
        </section>

        <section aria-labelledby="sistema-riego">
          <Titulo nivel={2} id="sistema-riego" variante="seccion">SISTEMA DE RIEGO</Titulo>
          <Tarjeta como="div" variante="verde">
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[#64766A]">Modo actual</dt><dd className="mt-1 font-medium">{invernadero?.modoOperacion || '—'}</dd></div>
              <div><dt className="text-[#64766A]">Estado de la bomba</dt><dd className="mt-1 font-medium">—</dd></div>
            </dl>
            <Boton type="button" onClick={onControlRiego} disabled={!onControlRiego} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#47885C] disabled:cursor-default">
              Control de riego <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Boton>
          </Tarjeta>
          <Boton type="button" onClick={onHistorialRiego} disabled={!onHistorialRiego} className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#D8E1DA] bg-white px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#47885C] disabled:cursor-default">
            Historial de riego <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Boton>
        </section>

        <section aria-labelledby="informacion">
          <Titulo nivel={2} id="informacion" variante="seccion">INFORMACIÓN DEL INVERNADERO</Titulo>
          <Tarjeta como="dl" variante="normal" className="space-y-3 text-sm">
            <div><dt className="text-[#64766A]">Descripción</dt><dd className="mt-1 whitespace-pre-line break-words">{invernadero?.descripcion || 'Sin descripción'}</dd></div>
            <div><dt className="text-[#64766A]">Ubicación</dt><dd className="mt-1 break-words">{invernadero?.ubicacion}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Largo × ancho</dt><dd>{invernadero?.largo || '—'} × {invernadero?.ancho || '—'} m</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Alto</dt><dd>{invernadero?.alto ? `${invernadero.alto} m` : 'No registrado'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#64766A]">Área</dt><dd>{area != null && Number.isFinite(area) ? area.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'} m²</dd></div>
          </Tarjeta>
        </section>
        {invernadero?.rol === 'ADMIN' && <Boton
          type="button"
          onClick={onEditar} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#91A595] bg-white px-4 py-3 text-sm font-semibold text-[#2F704B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47885C]"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
          Editar datos y estado
        </Boton>}
        </>}
      </main>

      <NavegacionPrincipal activa="inicio" opciones={opcionesNavegacion.map((opcion) => ({
        ...opcion,
        onClick: opcion.id === 'inicio' ? onVolver : opcion.id === 'perfil' ? onPerfil : undefined,
      }))} />
    </div>
  )
}
