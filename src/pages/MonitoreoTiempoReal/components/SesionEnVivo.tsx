import { useEffect, useState } from 'react'
import { Droplets, Waves } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import Seleccion from '../../../components/ui/Seleccion'
import Tarjeta from '../../../components/ui/Tarjeta'
import GraficaMediciones from '../../../components/GraficaMediciones'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresSensor, type Sensor } from '../../../types/equipos'
import { valorMedicion } from '../../../types/historial'
import { fechaLectura } from '../../../types/mediciones'
import { useMonitoreo } from '../useMonitoreo'

/** Presenta controles y lecturas recientes; la coordinación y el transporte permanecen fuera de la vista. */
export default function SesionEnVivo({ invernaderoId, sensor }: { invernaderoId: string; sensor: Sensor }) {
  const { estado, iniciar, detener } = useMonitoreo(invernaderoId, sensor)
  const [intervalo, setIntervalo] = useState(1000)
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setAhora(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const enCurso = ['conectando', 'solicitando', 'activo'].includes(estado.fase)
  const ultima = estado.lecturas.at(-1)
  const Icono = sensor.tipo === 'NivelAgua' ? Waves : Droplets
  const fases = { listo: 'Listo para iniciar', conectando: 'Conectando', solicitando: 'Esperando al equipo', activo: 'Activo', detenido: 'Detenido', desconectado: 'Desconectado', error: 'No disponible' }
  const antiguedad = estado.recibidaEn ? Math.max(0, Math.floor((ahora - Date.parse(estado.recibidaEn)) / 1000)) : null
  return <div className="space-y-5">
    <div><Titulo nivel={2} className="text-xl font-semibold">{nombresSensor[sensor.tipo]}</Titulo><Texto className="mt-1 text-sm text-[#738077]">Sensor #{sensor.id} · Unidad: {sensor.unidad}</Texto></div>
    <span className={`inline-flex rounded-full px-3 py-1 text-sm ${estado.fase === 'activo' ? 'bg-[#E6F3E9] text-[#2F704B]' : 'bg-[#EDEEEE] text-[#52675A]'}`}>{fases[estado.fase]}</span>
    <Tarjeta variante="aviso"><Texto role={estado.fase === 'error' ? 'alert' : 'status'}>{estado.mensaje}</Texto></Tarjeta>
    <div>
      <label htmlFor="intervalo-monitoreo" className="mb-2 block text-sm font-semibold">Frecuencia solicitada</label>
      <Seleccion id="intervalo-monitoreo" value={intervalo} disabled={enCurso} onChange={(evento) => setIntervalo(Number(evento.target.value))}>
        {[1000, 2000, 5000, 10000].map((ms) => <option key={ms} value={ms}>Cada {ms / 1000} {ms === 1000 ? 'segundo' : 'segundos'}</option>)}
      </Seleccion>
      <Texto className="mt-2 text-xs text-[#738077]">El equipo puede confirmar una frecuencia más lenta según su sensor.</Texto>
    </div>
    <div className="flex gap-3">
      <Boton type="button" variante="verde" disabled={enCurso} className="disabled:opacity-50" onClick={() => { void iniciar(intervalo) }}>Iniciar monitoreo</Boton>
      <Boton type="button" disabled={!enCurso} className="min-h-12 flex-1 rounded-full border border-[#91A595] px-5 text-sm font-semibold disabled:opacity-40" onClick={() => detener()}>Detener</Boton>
    </div>
    {estado.intervaloMs && <Texto className="text-sm text-[#52675A]">Frecuencia confirmada: cada {estado.intervaloMs / 1000} segundos.</Texto>}
    <Tarjeta como="section" variante="centrada" aria-label="Última medición recibida">
      <Icono className="mx-auto mb-4 h-10 w-10 text-[#2F704B]" aria-hidden="true" />
      <Texto className="text-xs font-semibold tracking-wide text-[#738077]">ÚLTIMA MEDICIÓN RECIBIDA</Texto>
      <Texto aria-live="polite" aria-atomic="true" className="my-4 break-words text-4xl font-semibold">{valorMedicion(ultima?.valor ?? null, sensor.unidad)}</Texto>
      <Texto className="text-xs text-[#738077]">Medición o recepción: {fechaLectura(ultima?.fechaHora)}</Texto>
      {estado.recibidaEn && <Texto className="mt-2 text-xs text-[#738077]">Recibida hace {antiguedad} s. {estado.fase !== 'activo' ? 'Se conserva como referencia; el monitoreo está detenido.' : ''}</Texto>}
      {estado.fase === 'activo' && !ultima && <Texto className="mt-2 text-sm text-[#738077]">Equipo confirmado; esperando la primera lectura.</Texto>}
    </Tarjeta>
    <section><Titulo nivel={2} className="mb-3 text-sm font-semibold">Lecturas recientes</Titulo>
      <GraficaMediciones lecturas={estado.lecturas} nombre={nombresSensor[sensor.tipo]} unidad={sensor.unidad} alcance="Últimas 60 lecturas de esta sesión" mensajeVacio="Sin lecturas en esta sesión" />
    </section>
    <Texto className="text-xs text-[#738077]">Al salir u ocultar esta pantalla se finaliza tu suscripción. Otros espectadores pueden seguir monitoreando. Las muestras rápidas no se guardan en el historial.</Texto>
  </div>
}
