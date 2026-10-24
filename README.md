# React + TypeScript + Vite
# Invernadero Frontend

Frontend para la gestión de invernaderos, monitoreo de sensores y visualización de mediciones.

## Descripción general

Esta aplicación permite:

- iniciar sesión y cerrar sesión
- registrar un invernadero
- ver la lista de invernaderos
- consultar el detalle del invernadero
- ver mediciones
- ver monitoreo en tiempo real
- navegar entre pantallas de forma local dentro de la app

La vista principal se controla desde `src/App.tsx`, donde se alternan pantallas según el estado de sesión y la navegación interna.

## Stack

- React
- TypeScript
- Vite
- CSS moderno (sin necesidad de librerías externas)
- Servicios HTTP para comunicación con el backend

## Estructura del proyecto

```text
src/
├── App.tsx
├── components/         # componentes reutilizables
├── pages/              # pantallas principales
│   ├── Login.tsx
│   ├── MisInvernaderos.tsx
│   ├── RegistrarInvernadero.tsx
│   ├── DetalleInvernadero.tsx
│   ├── MonitoreoMediciones.tsx
│   └── MonitoreoTiempoReal.tsx
├── services/
│   └── api.ts
├── types/
│   └── mediciones.ts
├── main.tsx
└── index.css
```

## Pantallas principales

### Login
Pantalla de acceso inicial. Cuando el usuario inicia sesión, se activa la sesión local y se muestra la vista de invernaderos.

### MisInvernaderos
Lista de invernaderos disponibles para el usuario autenticado.

### RegistrarInvernadero
Formulario para registrar un nuevo invernadero.

### DetalleInvernadero
Muestra el detalle del invernadero seleccionado.

### MonitoreoMediciones
Muestra mediciones del tipo seleccionado.

### MonitoreoTiempoReal
Pantalla para ver el estado de una medición en tiempo real.

## Flujo de navegación

La app trabaja con un estado local de pantalla:

- `login`
- `invernaderos`
- `registro`
- `detalle`
- `mediciones`
- `tiempoReal`

La navegación se realiza desde `App.tsx` mediante:

```ts
function navegar(destino: Pantalla) {
  setPantalla(destino)
  window.scrollTo(0, 0)
}
```

## Sesión actual

La sesión se gestiona con un timestamp local:

```ts
const [sesionHasta, setSesionHasta] = useState<number | null>(null)
```

Cuando hay sesión, se dispara un `useEffect` para cerrar automáticamente la sesión al vencerse el tiempo.

```ts
useEffect(() => {
  if (!sesionHasta) return
  const temporizador = window.setTimeout(() => {
    cerrarSesionLocal()
    setSesionHasta(null)
  }, Math.max(0, sesionHasta - Date.now()))
  return () => window.clearTimeout(temporizador)
}, [sesionHasta])
```

Importante:
- Esto es una sesión local de frontend.
- No es persistencia real de autenticación.
- En producción, conviene usar un backend con JWT real y almacenamiento seguro.

## Servicios API

El acceso al backend está centralizado en `src/services/api.ts`.

Funciones esperadas comunes:

- `login`
- `register`
- `logout`
- `obtenerInvernaderos`
- `obtenerDetalleInvernadero`
- `obtenerMediciones`
- `obtenerTiempoReal`

Se recomienda que todas las llamadas a recursos protegidos incluyan:

```http
Authorization: Bearer <token>
```

## Requisitos

- Node.js 18 o superior
- npm o pnpm

## Instalación

```bash
npm install
```

## Scripts

### Desarrollo

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Variables de entorno

Si el proyecto usa configuración externa, crear un archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:3000
```

Ajustar la URL según el backend real.

## Convenciones actuales del proyecto

- Los nombres de pantallas y tipos están en español.
- Los tipos de mediciones se centralizan en `src/types/mediciones.ts`.
- La UI está pensada para una experiencia móvil/compacta con ancho máximo de 430px.
- Los estados de pantalla están manejados localmente, no con router.

## Notas de autenticación y backend

El frontend actual espera que el backend implemente:

- registro de usuarios
- login con email/password
- manejo de sesión JWT
- permisos por rol
- acceso a invernaderos por usuario

En la implementación actual, la sesión se estaba manejando de forma local; esto sirve para prototipos o pruebas, pero para uso real se recomienda:

- guardar token de forma persistente
- validar expiración en backend
- validar rol en cada recurso protegido
- no depender únicamente del estado local del frontend

## Estado del proyecto

El frontend está en una etapa de prototipo funcional para:

- navegación visual
- pruebas de flujo de UI
- integración con backend real

Falta aún:

- autenticación real persistente
- conexión segura con backend de producción
- manejo robusto de roles
- almacenamiento verdadero de sesión
- control de permisos por invernadero y sensor

## Siguientes pasos recomendados

1. Vincular el frontend con el backend real
2. Centralizar los endpoints en `services/api.ts`
3. Guardar el token JWT de forma segura
4. Validar permisos por usuario y rol
5. Persistir sesión entre recargas
6. Añadir manejo de errores global para login, fetch y permisos

```
