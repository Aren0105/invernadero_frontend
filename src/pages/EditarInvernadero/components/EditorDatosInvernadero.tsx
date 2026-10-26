import Boton from '../../../components/ui/Boton'
import FormularioInvernadero from '../../../components/invernaderos/FormularioInvernadero'
import ProteccionSalida from '../../../components/ProteccionSalida'
import { Texto } from '../../../components/ui/Tipografia'
import type { Invernadero } from '../../../types/invernaderos'
import { useEditarInvernadero } from '../useEditarInvernadero'
import EstadoInvernadero from './EstadoInvernadero'

/** Compone la edición precargada, sus avisos y la acción de estado; consultar de nuevo reinicia el formulario. */
export default function EditorDatosInvernadero({ invernadero, onRevisar }: { invernadero: Invernadero; onRevisar: () => void }) {
  const editor = useEditarInvernadero(invernadero)
  const administrador = editor.actual.rol === 'ADMIN'
  return <>
    <ProteccionSalida pendiente={editor.ocupado} cambios={editor.cambios} />
    {!administrador && <Texto role="status" className="mb-4 rounded-xl bg-[#E8F3EC] p-4 text-sm">Solo un administrador de este invernadero puede modificar sus datos o cambiar su estado.</Texto>}
    <FormularioInvernadero valores={editor.valores} errores={editor.errores} ocupado={editor.ocupado} bloqueado={!administrador || editor.requiereRevisar}
      onCambiar={editor.cambiar} onEnviar={editor.guardar} etiquetaEnviar="GUARDAR CAMBIOS" />
    {editor.error && <Texto role="alert" className="mt-4 text-sm text-red-700">{editor.error}</Texto>}
    {editor.aviso && <Texto role="status" className="mt-4 text-sm text-[#2F704B]">{editor.aviso}</Texto>}
    {editor.requiereRevisar && <div className="mt-4 space-y-2">
      <Texto className="text-sm text-[#64766A]">Revisa los datos actuales antes de volver a guardar. Al revisarlos se reemplazarán los valores de este formulario.</Texto>
      <Boton type="button" variante="verde" onClick={onRevisar}>Revisar datos guardados</Boton>
    </div>}
    {administrador && <EstadoInvernadero estado={editor.actual.estado} ocupado={editor.ocupado} bloqueado={editor.requiereRevisar} cambios={editor.cambios} onCambiar={editor.cambiarEstado} />}
  </>
}
