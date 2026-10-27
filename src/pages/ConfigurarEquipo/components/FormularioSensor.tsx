import { useState } from 'react'
import Seleccion from '../../../components/ui/Seleccion'
import Boton from '../../../components/ui/Boton'
import { Texto } from '../../../components/ui/Tipografia'
import { nombresSensor, unidadesSensor, type TipoSensor } from '../../../types/equipos'

type Props = {
  tipos: TipoSensor[]; inicial?: TipoSensor; id: string; deshabilitado: boolean; etiqueta: string
  onGuardar: (tipo: TipoSensor) => Promise<unknown>; onCancelar?: () => void
}

/** Comparte alta y edición; deriva la unidad del tipo sin pedirla ni convertir lecturas. */
export default function FormularioSensor({ tipos, inicial, id, deshabilitado, etiqueta, onGuardar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoSensor | undefined>(inicial)
  const seleccionado = tipo && tipos.includes(tipo) ? tipo : tipos[0]
  return <form className="space-y-3" onSubmit={(evento) => {
    evento.preventDefault()
    if (!deshabilitado && seleccionado) void onGuardar(seleccionado)
  }}>
    <label htmlFor={id} className="block text-sm font-semibold">Tipo de sensor</label>
    <Seleccion id={id} value={seleccionado ?? ''} disabled={deshabilitado || !seleccionado} onChange={(evento) => setTipo(evento.target.value as TipoSensor)}>
      {!seleccionado && <option value="">No hay tipos disponibles</option>}
      {tipos.map((opcion) => <option key={opcion} value={opcion}>{nombresSensor[opcion]}</option>)}
    </Seleccion>
    {seleccionado && <Texto className="text-xs text-[#64766A]">Unidad: {unidadesSensor[seleccionado]}{seleccionado === 'Temperatura' ? ' (grados Celsius)' : ' (porcentaje)'}. La placa debe enviar valores en esta unidad.</Texto>}
    <div className="flex flex-wrap gap-2">
      <Boton type="submit" variante="verde" disabled={deshabilitado || !seleccionado} className="disabled:opacity-60">{etiqueta}</Boton>
      {onCancelar && <Boton type="button" disabled={deshabilitado} onClick={onCancelar} className="min-h-11 rounded-xl border px-4">Cancelar</Boton>}
    </div>
  </form>
}
