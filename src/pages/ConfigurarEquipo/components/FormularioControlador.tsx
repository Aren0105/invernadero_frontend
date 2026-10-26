import { useRef, useState } from 'react'
import isLength from 'validator/lib/isLength'
import Entrada from '../../../components/ui/Entrada'
import Boton from '../../../components/ui/Boton'
import { Texto } from '../../../components/ui/Tipografia'

/** Solicita únicamente el nombre: el invernadero y su administrador proceden del contexto verificado. */
export default function FormularioControlador({ deshabilitado, onRegistrar }: { deshabilitado: boolean; onRegistrar: (nombre: string) => Promise<boolean> }) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  return <form noValidate onSubmit={(evento) => {
    evento.preventDefault()
    if (deshabilitado) return
    if (!isLength(nombre.trim(), { min: 1, max: 100 })) { setError('Usa entre 1 y 100 caracteres.'); entrada.current?.focus(); return }
    setError('')
    void onRegistrar(nombre)
  }} className="space-y-3">
    <Texto className="text-sm text-[#64766A]">Este invernadero todavía no tiene equipo. Registra su ESP32 para continuar.</Texto>
    <label htmlFor="nombre-controlador" className="block text-sm font-semibold">Nombre del ESP32</label>
    <Entrada id="nombre-controlador" ref={entrada} value={nombre} onChange={(evento) => { setNombre(evento.target.value); setError('') }} required disabled={deshabilitado}
      variante="redondeada" placeholder="Ej. ESP32 principal" aria-invalid={!!error} aria-describedby={error ? 'error-controlador' : undefined} />
    {error && <Texto id="error-controlador" role="alert" className="text-sm text-red-700">{error}</Texto>}
    <Boton type="submit" variante="verde" disabled={deshabilitado} className="disabled:opacity-60">Registrar ESP32</Boton>
  </form>
}
