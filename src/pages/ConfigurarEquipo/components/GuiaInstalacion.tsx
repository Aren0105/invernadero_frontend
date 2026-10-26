import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresSensor, type Controlador, type Sensor } from '../../../types/equipos'

/** Entrega parámetros reales para el firmware; no simula una conexión ni escribe la configuración física. */
export default function GuiaInstalacion({ controlador, sensores }: { controlador: Controlador; sensores: Sensor[] }) {
  return <section className="space-y-3" aria-labelledby="titulo-instalacion">
    <Titulo nivel={2} id="titulo-instalacion" variante="seccion">4. CONFIGURA LA PLACA</Titulo>
    <Texto className="text-sm text-[#64766A]">En el firmware del ESP32 configura tu Wi-Fi, la dirección del servidor, la credencial que guardaste y los identificadores de sus sensores.</Texto>
    <dl className="space-y-2 break-words text-sm">
      <div><dt className="font-semibold">Servidor</dt><dd>{import.meta.env.VITE_API_URL || 'Falta configurar la dirección de la API'}</dd></div>
      <div><dt className="font-semibold">ID del controlador</dt><dd>{controlador.id}</dd></div>
      {sensores.map((sensor) => <div key={sensor.id}><dt className="font-semibold">{nombresSensor[sensor.tipo]}</dt><dd>ID del sensor: {sensor.id} · Unidad: {sensor.unidad}</dd></div>)}
    </dl>
    {!sensores.length && <Texto className="text-sm text-amber-800">Agrega los sensores para obtener sus identificadores antes de configurar la placa.</Texto>}
    <Texto className="text-xs text-[#64766A]">Registrar un sensor no configura sus pines ni su calibración. El firmware debe enviar valores reales en la unidad indicada y tener habilitada la comunicación con el servidor.</Texto>
  </section>
}
