
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import { Texto } from '../../../components/ui/Tipografia'
import { totalPaginas, type PaginaHistorial } from '../../../types/historial'

/** Navega páginas explícitas sin truncar conteos bigint ni superar el máximo admitido por la API. */
export default function PaginacionHistorial({
  paginacion,
  agrupado,
  onPagina
}: {
  paginacion: PaginaHistorial['paginacion']
  agrupado: boolean
  onPagina: (pagina: number) => void
}) {
  const paginas = totalPaginas(paginacion.total, paginacion.limite)

  return (
    <nav aria-label="Páginas del historial" className="space-y-3">

      <Texto
        role="status"
        className="text-center text-sm font-medium text-[#64766A]"
      >
        {paginas === 0n
          ? 'Sin registros'
          : `Página ${paginacion.pagina} de ${paginas}`}
        {' · '}
        {BigInt(paginacion.total).toLocaleString('es-PE')}
        {' '}
        {agrupado ? 'horas con muestras' : 'lecturas'}
      </Texto>

      <div className="flex gap-3">

        <Boton
          type="button"
          disabled={paginacion.pagina <= 1}
          onClick={() => onPagina(paginacion.pagina - 1)}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D8DEDA] bg-white px-3 text-sm font-medium text-[#245B40] shadow-sm transition-colors hover:bg-[#E2EFE5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Boton>

        <Boton
          type="button"
          disabled={!paginacion.haySiguiente || paginacion.pagina >= 10000}
          onClick={() => onPagina(paginacion.pagina + 1)}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D8DEDA] bg-white px-3 text-sm font-medium text-[#245B40] shadow-sm transition-colors hover:bg-[#E2EFE5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Boton>

      </div>

      {paginacion.pagina >= 10000 && paginacion.haySiguiente && (
        <Texto className="text-sm text-amber-800">
          Se alcanzó el límite de páginas. Usa promedios por hora para consultar todo el período.
        </Texto>
      )}

    </nav>
  )
}
