
import { useId } from 'react'
import {
  ordenarLecturas,
  segmentarLecturas,
  fechaLectura
} from '../../../types/mediciones'
import { valorMedicion } from '../../../types/historial'
import type { Lectura } from '../../../types/mediciones'

type Props = {
  lecturas: Lectura[]
  nombre: string
  unidad?: string
  periodo?: 'hoy' | 'semana'
  promedios?: boolean
  alcance?: string
  mensajeVacio?: string
}

export default function GraficaHistorial({
  lecturas,
  nombre,
  unidad = '%',
  periodo = 'hoy',
  promedios = false,
  alcance,
  mensajeVacio = 'Sin datos para este período'
}: Props) {

  const tituloId = useId()
  const degradadoId = useId()

  const nombreSensor = nombre.toLowerCase()

  const color = nombreSensor.includes('temperatura')
    ? '#E99A36'
    : nombreSensor.includes('suelo')
      ? '#43865C'
      : nombreSensor.includes('agua')
        ? '#199EAA'
        : '#4299D5'

  const datos = ordenarLecturas(lecturas)

  const min = Math.min(0, ...datos.map(item => item.valor))

  const observado = datos.reduce(
    (maximo, item) => Math.max(maximo, item.valor),
    0
  )

  const max = unidad === '%'
    ? Math.max(100, observado)
    : observado > 0 ? observado * 1.05 : 1

  const segmentos = segmentarLecturas(
    datos,
    promedios ? 3600000 : undefined
  )

  const inicio = datos.length
    ? Date.parse(datos[0].fechaHora)
    : 0

  const fin = datos.length
    ? Date.parse(datos[datos.length - 1].fechaHora)
    : 1

  const x = (fecha: string) =>
    inicio === fin
      ? 196
      : 58 + ((Date.parse(fecha) - inicio) / (fin - inicio)) * 276

  const y = (valor: number) =>
    178 - ((valor - min) / (max - min)) * 150

  const etiquetaFecha = (fecha: string) =>
    new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      ...(periodo === 'semana'
        ? {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          } as const
        : {
            hour: '2-digit',
            minute: '2-digit'
          } as const)
    }).format(new Date(fecha))

  return (
    <figure className="rounded-xl bg-white p-3">

      <div className="relative">

        <svg
          viewBox="0 0 350 215"
          role="img"
          aria-labelledby={tituloId}
          className="block w-full"
        >

          <title id={tituloId}>
            {`${nombre}: ${datos.length
              ? `${datos.length} ${promedios ? 'promedios horarios' : 'lecturas'} en ${unidad}`
              : 'Sin datos disponibles'}${alcance ? `. ${alcance}` : ''}`}
          </title>

          <defs>
            <linearGradient
              id={degradadoId}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor={color}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {[min, (min + max) / 2, max].map(valor => (
            <g key={valor}>
              <line
                x1="58"
                x2="334"
                y1={y(valor)}
                y2={y(valor)}
                stroke="#DFE5E1"
                strokeDasharray="4 4"
              />

              <text
                x="50"
                y={y(valor) + 4}
                textAnchor="end"
                fontSize="9"
                fill="#64766A"
              >
                {valor.toLocaleString('es-PE', {
                  maximumFractionDigits: 1
                })}
              </text>
            </g>
          ))}

          {segmentos.map((segmento, indice) => {
            if (segmento.length < 2) return null

            const primero = segmento[0]
            const ultimo = segmento[segmento.length - 1]

            const puntos = segmento
              .map(item => `${x(item.fechaHora)},${y(item.valor)}`)
              .join(' L')

            return (
              <path
                key={`area-${indice}`}
                d={`M${x(primero.fechaHora)},178 L${puntos} L${x(ultimo.fechaHora)},178 Z`}
                fill={`url(#${degradadoId})`}
              />
            )
          })}

          {segmentos.map((segmento, indice) =>
            segmento.length > 1 && (
              <polyline
                key={indice}
                points={segmento
                  .map(item => `${x(item.fechaHora)},${y(item.valor)}`)
                  .join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          )}

          {datos.map((item, indice) => (
          (indice % Math.max(1, Math.ceil(datos.length / 18)) === 0 ||
          indice === datos.length - 1) && (
           <circle
              key={item.id ?? `${item.fechaHora}:${indice}`}
              cx={x(item.fechaHora)}
              cy={y(item.valor)}
             r={datos.length === 1 ? 4.5 : 3.5}
             fill={color}
            stroke="white"
            strokeWidth="1.2"
            >
              <title>
                {`${fechaLectura(item.fechaHora)}: ${valorMedicion(item.valor, unidad)}${item.conteo ? ` · ${item.conteo} muestras` : ''}`}
              </title>
              </circle>
              )
             ))}

          {datos.length > 0 && (
            <text
              x="58"
              y="201"
              fontSize="10"
              fill="#64766A"
            >
              {etiquetaFecha(datos[0].fechaHora)}
            </text>
          )}

          {datos.length > 1 && (
            <text
              x="334"
              y="201"
              textAnchor="end"
              fontSize="10"
              fill="#64766A"
            >
              {etiquetaFecha(datos[datos.length - 1].fechaHora)}
            </text>
          )}

        </svg>

        {!datos.length && (
          <div className="absolute inset-0 flex items-center justify-center pl-8">
            <p className="max-w-48 rounded-lg bg-[#FAFBFA]/95 p-3 text-center text-sm text-[#738077]">
              {mensajeVacio}
            </p>
          </div>
        )}

      </div>

      <figcaption className="space-y-1 text-center text-xs text-[#64766A]">
        <p>
          {nombre} ({unidad}) · {promedios
            ? 'Promedios por hora'
            : 'Lecturas individuales'}
        </p>

        <p>
          {alcance ? `${alcance} · ` : ''}Hora de Perú
        </p>
      </figcaption>

      {datos.length > 0 && (
        <details className="mt-3 border-t border-[#E8EDE9] pt-2 text-xs text-[#52675A]">

          <summary className="cursor-pointer py-2">
            Ver valores de esta gráfica
          </summary>

          <div className="max-h-64 overflow-auto">

            <table className="w-full text-left">

              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>

                  <th scope="col">
                    {promedios ? 'Promedio' : 'Valor'} ({unidad})
                  </th>

                  {promedios && (
                    <th scope="col">Muestras</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {datos.map((item, indice) => (
                  <tr key={item.id ?? `${item.fechaHora}:${indice}`}>

                    <td className="py-1 pr-2">
                      {fechaLectura(item.fechaHora)}
                    </td>

                    <td>
                      {valorMedicion(item.valor, unidad)}
                    </td>

                    {promedios && (
                      <td>{item.conteo}</td>
                    )}

                  </tr>
                ))}
              </tbody>

            </table>

          </div>

        </details>
      )}

    </figure>
  )
}
