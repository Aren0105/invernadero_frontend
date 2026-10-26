/** Valida los controles habilitados del formulario según las reglas generales de la interfaz. */
export function validarFormulario(
  form: HTMLFormElement,
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const elemento of Array.from(form.elements)) {
    if (
      !(
        elemento instanceof HTMLInputElement ||
        elemento instanceof HTMLTextAreaElement
      )
    )
      continue;
    if (!elemento.name || elemento.disabled) continue;
    const valor = elemento.value;
    if (elemento.validity.badInput) {
      errores[elemento.name] = "Ingresa un número válido.";
    } else if (elemento.required && !valor.trim()) {
      errores[elemento.name] = "Este campo es obligatorio.";
    } else if (valor && elemento.validity.typeMismatch) {
      errores[elemento.name] = "Ingresa un correo electrónico válido.";
    } else if (elemento.maxLength > 0 && valor.length > elemento.maxLength) {
      errores[elemento.name] =
        `Usa como máximo ${elemento.maxLength} caracteres.`;
    } else if (
      elemento instanceof HTMLInputElement &&
      elemento.type === "number" &&
      valor &&
      (!Number.isFinite(Number(valor)) || Number(valor) <= 0)
    ) {
      errores[elemento.name] =
        "Ingresa un número mayor que cero. Puedes usar decimales.";
    }
  }
  return errores;
}

/** Mueve el foco al primer campo con error, siguiendo el orden de inserción del registro recibido. */
export function enfocarPrimerError(
  form: HTMLFormElement,
  errores: Record<string, string>,
) {
  const elemento = form.elements.namedItem(Object.keys(errores)[0]);
  if (elemento instanceof HTMLElement) elemento.focus();
}
