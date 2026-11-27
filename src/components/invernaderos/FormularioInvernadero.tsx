import type { FormEvent } from 'react'
import Boton from '../ui/Boton'
import Entrada, { AreaTexto } from '../ui/Entrada'
import { Texto } from '../ui/Tipografia'
import type { ErroresInvernadero, FormularioInvernadero as ValoresInvernadero } from '../../utils/invernaderos'

type Props = {
  valores: ValoresInvernadero
  errores: ErroresInvernadero
  ocupado: boolean
  bloqueado: boolean
  onCambiar: (campo: keyof ValoresInvernadero, valor: string) => void
  onEnviar: (evento: FormEvent<HTMLFormElement>) => void
  etiquetaEnviar: string
}

const campos = [
  { nombre: 'nombre', etiqueta: 'Nombre del invernadero', ejemplo: 'Ej. Invernadero Norte', tipo: 'text' },
  { nombre: 'ubicacion', etiqueta: 'Ubicación', ejemplo: 'Ej. Sector A', tipo: 'text' },
  { nombre: 'cultivo', etiqueta: 'Cultivo', ejemplo: 'Ej. Tomate', tipo: 'text' },
  { nombre: 'dimension', etiqueta: 'Dimensión (m²)', ejemplo: 'Ej. 50', tipo: 'number' },
] as const

/** Formulario de datos generales compartido entre registro y edición; el consumidor controla estado y persistencia. */
export default function FormularioInvernadero({ valores, errores, ocupado, bloqueado, onCambiar, onEnviar, etiquetaEnviar }: Props) {
  return <form noValidate onSubmit={onEnviar} className="space-y-4" aria-busy={ocupado}>
    <fieldset disabled={ocupado || bloqueado} className="space-y-4 disabled:opacity-70">
      {campos.map(({ nombre, etiqueta, ejemplo, tipo }) => <div key={nombre}>
        <label htmlFor={nombre} className="mb-1.5 block text-sm font-semibold">{etiqueta}</label>
        <Entrada id={nombre} name={nombre} type={tipo} required placeholder={ejemplo} variante="redondeada"
          value={valores[nombre]} onChange={(evento) => onCambiar(nombre, evento.target.value)}
          {...(tipo === 'number' ? { min: '0.01', max: '999999.99', step: '0.01', inputMode: 'decimal' as const } : {})}
          aria-invalid={!!errores[nombre]} aria-describedby={errores[nombre] ? `error-${nombre}` : undefined} />
        {errores[nombre] && <Texto id={`error-${nombre}`} className="mt-1 text-sm text-red-700">{errores[nombre]}</Texto>}
      </div>)}
      <div>
        <label htmlFor="descripcion" className="mb-1.5 block text-sm font-semibold">Descripción</label>
        <AreaTexto id="descripcion" name="descripcion" rows={3} placeholder="Breve descripción" value={valores.descripcion}
          onChange={(evento) => onCambiar('descripcion', evento.target.value)} aria-invalid={!!errores.descripcion} aria-describedby={errores.descripcion ? 'error-descripcion' : undefined} />
        {errores.descripcion && <Texto id="error-descripcion" className="mt-1 text-sm text-red-700">{errores.descripcion}</Texto>}
      </div>
      <Boton type="submit" variante="azul" disabled={ocupado || bloqueado} className="disabled:opacity-60">{ocupado ? 'GUARDANDO…' : etiquetaEnviar}</Boton>
    </fieldset>
  </form>
}
