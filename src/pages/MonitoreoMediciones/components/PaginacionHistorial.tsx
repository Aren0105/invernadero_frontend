import Boton from '../../../components/ui/Boton'
import { Texto } from '../../../components/ui/Tipografia'
import { totalPaginas, type PaginaHistorial } from '../../../types/historial'

/** Navega páginas explícitas sin truncar conteos bigint ni superar el máximo admitido por la API. */
export default function PaginacionHistorial({ paginacion, agrupado, onPagina }: { paginacion: PaginaHistorial['paginacion']; agrupado: boolean; onPagina: (pagina: number) => void }) {
  const paginas = totalPaginas(paginacion.total, paginacion.limite)
  return <nav aria-label="Páginas del historial" className="space-y-3">
    <Texto role="status" className="text-center text-sm text-[#52675A]">{paginas === 0n ? 'Sin registros' : `Página ${paginacion.pagina} de ${paginas}`} · {BigInt(paginacion.total).toLocaleString('es-PE')} {agrupado ? 'horas con muestras' : 'lecturas'}</Texto>
    <div className="flex gap-3">
      <Boton type="button" disabled={paginacion.pagina <= 1} onClick={() => onPagina(paginacion.pagina - 1)} className="min-h-11 flex-1 rounded-xl border border-[#D8DEDA] px-3 text-sm disabled:opacity-40">Anterior</Boton>
      <Boton type="button" disabled={!paginacion.haySiguiente || paginacion.pagina >= 10000} onClick={() => onPagina(paginacion.pagina + 1)} className="min-h-11 flex-1 rounded-xl border border-[#D8DEDA] px-3 text-sm disabled:opacity-40">Siguiente</Boton>
    </div>
    {paginacion.pagina >= 10000 && paginacion.haySiguiente && <Texto className="text-sm text-amber-800">Se alcanzó el límite de páginas. Usa promedios por hora para consultar todo el período.</Texto>}
  </nav>
}
