
import { useState } from 'react'
import { ArrowLeft, Droplets, Clock, User, CircleCheck } from 'lucide-react'

type Props = {
  id: string
  onVolver: () => void
}

type Filtro = 'Todos' | 'Manual' | 'Automático'

// Datos simulados para el diseño de la pantalla
const registros = [
  {
    id: '1',
    fecha: '27/11/26, 11:00 a. m.',
    duracion: 15,
    tipo: 'Automático',
    usuario: null,
    estado: 'Finalizado',
  },
  {
    id: '2',
    fecha: '27/11/26, 09:00 a. m.',
    duracion: 10,
    tipo: 'Manual',
    usuario: 'Ana Torres',
    estado: 'Finalizado',
  },
  {
    id: '3',
    fecha: '26/11/26, 04:20 p. m.',
    duracion: 20,
    tipo: 'Manual',
    usuario: 'Ana Torres',
    estado: 'Finalizado',
  },
]

export default function HistorialRiego({ onVolver }: Props) {

  const [filtro, setFiltro] = useState<Filtro>('Todos')

  // Filtrar los registros
  const registrosFiltrados = registros.filter(
    (registro) =>
      filtro === 'Todos' || registro.tipo === filtro
  )

  return (
    <div className="min-h-dvh bg-[#F3F7F3] text-[#233D32]">

      {/* Encabezado */}
      <header className="flex items-center gap-2 border-b border-[#D8DEDA] bg-[#E2EFE5] px-4 py-3">

        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver"
          className="flex h-11 w-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-semibold">
          Historial de riegos
        </h1>

      </header>

      <main className="space-y-4 px-4 py-5">

        <p className="text-sm text-[#64766A]">
          Consulta los riegos de tu invernadero.
        </p>

        {/* Botones de filtrado */}
        <div className="flex gap-2">

          {(['Todos', 'Manual', 'Automático'] as const).map(
            (tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltro(tipo)}
                aria-pressed={filtro === tipo}
                className={`min-h-11 flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  filtro === tipo
                    ? 'border-[#245B40] bg-[#245B40] text-white'
                    : 'border-[#D8DEDA] bg-white text-[#245B40] hover:bg-[#E2EFE5]'
                }`}
              >
                {tipo}
              </button>
            )
          )}

        </div>

        {/* Tarjetas de riego */}

{/* Tarjetas de riego */}
{registrosFiltrados.map((registro) => (

  <article
    key={registro.id}
    className="space-y-2 rounded-2xl border border-[#D8DEDA] bg-white p-4 shadow-sm"
  >

    {/* Fecha y tipo de riego */}
    <div className="flex items-center gap-2">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E2EFE5]">
        <Droplets className="h-5 w-5 text-[#43865C]" />
      </div>

      <p className="flex-1 text-sm font-semibold">
        {registro.fecha}
      </p>

      <span
        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
          registro.tipo === 'Automático'
            ? 'bg-[#E0EFE1] text-[#245B40]'
            : 'bg-[#EEEEEE] text-[#555555]'
        }`}
      >
        {registro.tipo}
      </span>

    </div>

    {/* Línea divisoria */}
    <div className="border-t border-[#EDF0ED]" />

    {/* Duración */}
    <div className="flex items-center gap-2 text-sm text-[#64766A]">

      <Clock className="h-4 w-4" />

      <span>
        Duración: {registro.duracion} minutos
      </span>

    </div>

    {/* Usuario del riego manual */}
    {registro.usuario && (

      <div className="flex items-center gap-2 text-sm text-[#64766A]">

        <User className="h-4 w-4" />

        <span>
          Usuario: {registro.usuario}
        </span>

      </div>

    )}

    {/* Estado del riego */}
    <div className="flex items-center gap-2 text-sm font-medium text-[#43865C]">

      <CircleCheck className="h-4 w-4" />

      <span>{registro.estado}</span>

    </div>

  </article>

))}

        {/* Estado sin registros */}
        {registrosFiltrados.length === 0 && (

          <div className="rounded-2xl border border-[#D8DEDA] bg-white p-8 text-center">

            <Droplets className="mx-auto mb-3 h-8 w-8 text-[#43865C]" />

            <p className="text-sm font-medium">
              No hay registros de riego
            </p>

            <p className="mt-2 text-xs text-[#64766A]">
              No se encontraron riegos para este filtro.
            </p>

          </div>

        )}

      </main>

    </div>
  )
}
