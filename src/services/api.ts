const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
let accessToken: string | null = null;

export type RolUsuario = "ADMIN" | "OPERATOR";

export function cerrarSesionLocal() {
  accessToken = null;
}

export async function peticionApi(ruta: string, opciones: RequestInit = {}) {
  if (!baseUrl)
    throw new Error("Falta configurar VITE_API_URL para este entorno.");
  const headers = new Headers(opciones.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  try {
    return await fetch(`${baseUrl}${ruta}`, {
      ...opciones,
      headers,
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Revisa tu conexión e inténtalo nuevamente.",
    );
  }
}

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<{ expiresIn: number; role: RolUsuario }> {
  cerrarSesionLocal();
  const respuesta = await peticionApi("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  if (respuesta.status === 401)
    throw new Error("Correo y contraseña incorrectos");
  if (respuesta.status === 429)
    throw new Error(
      "Demasiados intentos. Espera un minuto antes de volver a intentar.",
    );
  if (respuesta.status === 400)
    throw new Error(
      "Revisa el correo y la contraseña (entre 8 y 128 caracteres).",
    );
  if (!respuesta.ok)
    throw new Error("El servidor no pudo iniciar sesión. Inténtalo más tarde.");
  const datos = await respuesta.json();
  if (
    typeof datos.accessToken !== "string" ||
    !datos.accessToken ||
    datos.tokenType !== "Bearer" ||
    !Number.isFinite(datos.expiresIn) ||
    datos.expiresIn <= 0
  ) {
    throw new Error("La API devolvió una respuesta de sesión inesperada.");
  }
  accessToken = datos.accessToken;
  try {
    const perfil = await peticionApi("/auth/me");
    if (!perfil.ok)
      throw new Error("No se pudo validar la sesión. Vuelve a iniciar sesión.");
    const usuario = await perfil.json();
    if (usuario.role !== "ADMIN" && usuario.role !== "OPERATOR")
      throw new Error("La API devolvió un rol de usuario inesperado.");
    return { expiresIn: datos.expiresIn, role: usuario.role };
  } catch (error) {
    cerrarSesionLocal();
    throw error;
  }
}

export async function registrarUsuario(
  nombre: string,
  email: string,
  password: string,
): Promise<void> {
  const respuesta = await peticionApi("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nombre.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  if (respuesta.status === 409)
    throw new Error("Ya existe una cuenta registrada con ese correo.");
  if (respuesta.status === 400 || respuesta.status === 422)
    throw new Error("Revisa los datos ingresados e inténtalo nuevamente.");
  if (respuesta.status === 429)
    throw new Error(
      "Demasiados intentos. Espera un minuto antes de volver a intentar.",
    );
  if (!respuesta.ok)
    throw new Error("No se pudo crear la cuenta. Inténtalo más tarde.");
}
