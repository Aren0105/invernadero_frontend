import { Leaf, Search, Funnel, House, Bell, Settings, User, Plus } from 'lucide-react'

const navegacion = [
  { nombre: 'Inicio', icono: House },
  { nombre: 'Notificaciones', icono: Bell },
  { nombre: 'Configuración', icono: Settings },
  { nombre: 'Perfil', icono: User },
]

export default function MisInvernaderos({ onRegistrar }: { onRegistrar: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F8F5] text-[#233D32]">
      <header className="bg-[#BCD7A7] px-6 pb-7 pt-8">
        <h1 className="text-3xl font-medium tracking-tight">Mis Invernaderos</h1>
        <p className="mt-2 text-sm text-[#5F735F]">Gestiona y monitorea tus cultivos</p>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-5 pt-6">
        <section aria-label="Resumen de invernaderos" className="mb-5 flex items-center gap-5 rounded-3xl bg-[#E8F3EC] px-6 py-6">
          <Leaf className="h-9 w-9 shrink-0 text-[#47885C]" aria-hidden="true" />
          <div>
            <h2 className="text-sm text-[#64766A]">Invernaderos registrados</h2>
            <p aria-label="Cantidad no disponible" className="mt-1 text-4xl font-medium text-[#47885C]">—</p>
          </div>
        </section>

        <div className="flex gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 -translate-y-1/2 text-[#738077]" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar invernadero"
              placeholder="Buscar invernadero..."
              className="h-14 w-full rounded-2xl border border-[#D3DBD5] bg-white pl-11 pr-3 text-base placeholder:text-[#738077] focus:outline-2 focus:outline-[#47885C]"
            />
          </div>
          <button type="button" aria-label="Filtros" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#91A595] bg-[#E8F3EC] text-[#47885C] focus-visible:outline-2 focus-visible:outline-offset-2">
            <Funnel className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <h2 className="mb-4 mt-6 text-xs font-semibold tracking-wide text-[#64766A]">TUS INVERNADEROS</h2>

        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <Leaf className="mb-6 h-20 w-20 text-[#47885C]" strokeWidth={1.8} aria-hidden="true" />
          <p className="max-w-64 text-base text-[#64766A]">Aquí aparecerán tus invernaderos.</p>
        </section>

        <div className="mt-auto flex justify-end pt-8">
          <button type="button" aria-label="Agregar invernadero" onClick={onRegistrar} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#47885C] text-white shadow-md hover:bg-[#386E49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47885C]">
            <Plus className="h-8 w-8" aria-hidden="true" />
          </button>
        </div>
      </main>

      <nav aria-label="Navegación principal" className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#BCD7A7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {navegacion.map(({ nombre, icono: Icono }) => (
          <button key={nombre} type="button" aria-current={nombre === 'Inicio' ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#28583A] ${nombre === 'Inicio' ? 'bg-[#DCEBD1] text-[#28583A]' : 'text-[#486D4D]'}`}>
            <Icono className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px]">{nombre}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

