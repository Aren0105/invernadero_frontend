import { useId } from 'react'
import { ordenarLecturas, fechaLectura } from '../types/mediciones'
import type { Lectura } from '../types/mediciones'

type Props = { lecturas: Lectura[]; nombre: string; periodo?: 'hoy' | 'semana' }

export default function GraficaMediciones({ lecturas, nombre, periodo = 'hoy' }: Props) {
  const tituloId = useId()
  const datos = ordenarLecturas(lecturas)
  const min = Math.min(0, ...datos.map((item) => item.valor))
  const max = Math.max(100, ...datos.map((item) => item.valor))
  const inicio = datos.length ? Date.parse(datos[0].fechaHora) : 0
  const fin = datos.length ? Date.parse(datos[datos.length - 1].fechaHora) : 1
  const x = (fecha: string) => inicio === fin ? 188 : 42 + ((Date.parse(fecha) - inicio) / (fin - inicio)) * 292
  const y = (valor: number) => 178 - ((valor - min) / (max - min)) * 150
  const etiquetaFecha = (fecha: string) => new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', ...(periodo === 'semana' ? { day: '2-digit', month: '2-digit' } as const : { hour: '2-digit', minute: '2-digit' } as const),
  }).format(new Date(fecha))

  return (
    <figure className="rounded-xl border border-[#D8DEDA] bg-[#FAFBFA] p-3">
      <div className="relative">
        <svg viewBox="0 0 350 215" role="img" aria-labelledby={tituloId} className="block w-full">
          <title id={tituloId}>{nombre}: {datos.length ? `${datos.length} mediciones históricas, en porcentaje` : 'Sin datos disponibles'}</title>
          {[min, (min + max) / 2, max].map((valor) => (
            <g key={valor}>
              <line x1="42" x2="334" y1={y(valor)} y2={y(valor)} stroke="#DFE5E1" strokeDasharray="4 4" />
              <text x="34" y={y(valor) + 4} textAnchor="end" fontSize="10" fill="#6B7D72">{Math.round(valor)}%</text>
            </g>
          ))}
          {datos.length > 1 && <polyline points={datos.map((item) => `${x(item.fechaHora)},${y(item.valor)}`).join(' ')} fill="none" stroke="#2F704B" strokeWidth="2.5" strokeLinejoin="round" />}
          {datos.map((item) => <circle key={item.fechaHora} cx={x(item.fechaHora)} cy={y(item.valor)} r={datos.length === 1 ? 4 : 2.5} fill="#2F704B"><title>{fechaLectura(item.fechaHora)}: {item.valor}%</title></circle>)}
          {datos.length > 0 && <text x="42" y="201" fontSize="10" fill="#6B7D72">{etiquetaFecha(datos[0].fechaHora)}</text>}
          {datos.length > 1 && <text x="334" y="201" textAnchor="end" fontSize="10" fill="#6B7D72">{etiquetaFecha(datos[datos.length - 1].fechaHora)}</text>}
        </svg>
        {!datos.length && <div className="absolute inset-0 flex items-center justify-center pl-8"><p className="max-w-48 rounded-lg bg-[#FAFBFA]/95 p-3 text-center text-sm text-[#738077]">Sin datos para este período</p></div>}
      </div>
      <figcaption className="text-center text-xs text-[#738077]">{nombre} (%) · {periodo === 'hoy' ? 'Hora' : 'Fecha'} de medición</figcaption>
      {datos.length > 0 && <details className="mt-3 text-xs text-[#52675A]"><summary className="cursor-pointer py-2">Ver valores de la gráfica</summary><div className="max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Valor</th></tr></thead><tbody>{datos.map((item) => <tr key={item.fechaHora}><td className="py-1">{fechaLectura(item.fechaHora)}</td><td>{item.valor}%</td></tr>)}</tbody></table></div></details>}
    </figure>
  )
}
