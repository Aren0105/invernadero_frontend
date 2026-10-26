import { Link } from 'react-router'

/** Muestra una salida clara cuando la dirección solicitada no coincide con ninguna ruta. */
export default function NoEncontrada() {
  return <main className="min-h-dvh bg-[#F5F8F5] px-6 py-12 text-[#233D32]">
    <h1 className="text-2xl font-semibold">Página no encontrada</h1>
    <p className="my-4">La dirección solicitada no existe.</p>
    <Link to="/invernaderos" className="text-[#2F704B] underline">Volver al inicio</Link>
  </main>
}
