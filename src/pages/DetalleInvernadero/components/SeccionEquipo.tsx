import Boton from '../../../components/ui/Boton'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { fechaEquipo, type Controlador } from '../../../types/equipos'

/** Resume la configuración guardada y permite retomarla sin volver a crear el invernadero. */
export default function SeccionEquipo({ equipo, error, onConfigurar }: { equipo: Controlador | null; error: string; onConfigurar: () => void }) {
  return <section aria-labelledby="titulo-equipo">
    <Titulo nivel={2} id="titulo-equipo" variante="seccion">EQUIPO DEL INVERNADERO</Titulo>
    <Tarjeta className="space-y-3 text-sm">
      {error ? <Texto role="alert" className="text-red-700">{error}</Texto> : equipo ? <>
        <Texto className="break-words font-semibold">{equipo.nombre}</Texto>
        <Texto>Comunicaciones: {equipo.activo ? 'Habilitadas' : 'Bloqueadas'}</Texto>
        <Texto className="text-[#64766A]">Última comunicación: {fechaEquipo(equipo.ultimaComunicacion)}</Texto>
      </> : <Texto className="text-[#64766A]">Sin equipo registrado. Puedes configurar el ESP32 y sus sensores ahora o más adelante.</Texto>}
      <Boton type="button" variante="verde" onClick={onConfigurar}>{equipo ? 'Administrar equipo' : 'Configurar equipo'}</Boton>
    </Tarjeta>
  </section>
}
