# AquaSmart · Invernadero Frontend

Frontend para gestionar invernaderos y visualizar mediciones, construido con React, TypeScript, Vite, Tailwind CSS y React Router.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Utiliza una versión de Node.js compatible con la versión de Vite instalada.
Configura la dirección del backend en un archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:3000
```

Sin esta variable, los servicios muestran un error de configuración al intentar conectarse.

## Scripts

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: comprueba TypeScript y genera la aplicación en `dist/`.
- `npm run lint`: ejecuta ESLint.
- `npm run test:auth`: verifica el contrato del login con respuestas HTTP simuladas, sin credenciales reales.
- `npm run test:invernaderos`: comprueba la paginación, búsqueda, identificadores y errores con respuestas simuladas.
- `npm run test:equipos`: verifica registro de invernadero, sensores, credenciales y activación con transporte simulado.
- `npm run test:historial`: comprueba rangos de Perú, inventarios, unidades, paginación, grupos horarios y renderizado SVG con respuestas simuladas.
- `npm run test:monitoreo`: verifica el ciclo de vida, renovaciones, secuencias y cancelación del canal con reloj y transporte simulados.
- `npm run preview`: sirve la compilación para comprobarla localmente.

## Estructura

```text
src/
├── main.tsx            # Punto de entrada con RouterProvider
├── router.tsx          # Configuración de createBrowserRouter
├── rutas.tsx           # Adaptadores y protección de rutas
├── App.tsx             # Diseño, recuperación inicial y renovación programada
├── components/         # Componentes reutilizables y gráfica SVG
├── hooks/              # Consultas cancelables compartidas
├── pages/              # Una carpeta por pantalla, con index.ts y su componente principal
├── services/           # Transporte HTTP, sesión, invernaderos y administración de equipos
├── types/              # Tipos y transformaciones de invernaderos, equipos y mediciones
└── utils/              # Validación de formularios y adaptación al contrato de creación
```

## Navegación

Se utiliza una instancia de `createBrowserRouter` creada fuera del renderizado de React. `main.tsx` la entrega a `RouterProvider`; `App.tsx` muestra las rutas hijas mediante `Outlet` y mantiene el diseño móvil de ancho máximo de 430 px.

| URL | Pantalla | Acceso |
| --- | --- | --- |
| `/` | Redirección a `/invernaderos` | Según sesión |
| `/login` | Inicio de sesión | Sin sesión |
| `/registro` | Registro de usuario | Sin sesión |
| `/perfil` | Perfil y cierre de sesión | Sesión vigente |
| `/invernaderos` | Mis invernaderos | Sesión vigente |
| `/invernaderos/nuevo` | Registrar invernadero | Sesión vigente |
| `/invernaderos/:invernaderoId/editar` | Edición y desactivación/reactivación | ADMIN; OPERATOR solo puede consultar |
| `/invernaderos/:invernaderoId` | Detalle | Sesión vigente |
| `/invernaderos/:invernaderoId/equipo` | Configurar equipo | ADMIN de ese invernadero |
| `/invernaderos/:invernaderoId/mediciones` | Mediciones | Sesión vigente |
| `/invernaderos/:invernaderoId/mediciones/tiempo-real/:tipo` | Tiempo real | Sesión vigente |
| Cualquier otra URL | Página no encontrada | Público |

El parámetro `tipo` acepta `HumedadAmbiental`, `HumedadSuelo` o `NivelAgua`; otros valores redirigen a mediciones. Los identificadores se conservan como cadenas bigint. Detalle, edición, configuración, historial y monitoreo validan el formato y consultan el recurso autorizado. Configurar equipo verifica el rol vigente antes de consultar los recursos administrativos; una pertenencia OPERATOR recibe un aviso sin lanzar esas consultas. Historial y monitoreo obtienen el inventario mediante una ruta de lectura separada, válida tanto para ADMIN como para OPERATOR.

Las pantallas conservan sus callbacks de navegación; los adaptadores de `rutas.tsx` los conectan con `useNavigate`. Los botones Atrás y Adelante del navegador funcionan con el historial de URLs. `ScrollRestoration` recupera la posición al volver y reinicia el desplazamiento en nuevas entradas.

Si se solicita una ruta protegida sin sesión, se redirige a `/login` conservando el destino. Después de iniciar sesión se recupera esa URL. Cualquier cuenta autenticada puede abrir `/invernaderos/nuevo`: el backend asigna `ADMIN` al creador de ese nuevo invernadero.

## Sesión y API

La autenticación sigue el contrato de `invernadero__server/src/auth/auth.controller.ts` y `auth.service.ts`:

| Operación | Petición y resultado |
| --- | --- |
| Login | `POST /auth/login` con correo y contraseña; obtiene acceso, duración, perfil y cookie refresh. |
| Alta | `POST /auth/register` con nombre, correo y contraseña; aprovecha la sesión emitida para entrar directamente. |
| Verificación | `GET /auth/me` con Bearer tras login o alta; valida `{ id, name, email }`. |
| Recuperación y renovación | `POST /auth/refresh` con cookie HttpOnly, sin Bearer; rota el refresh de uso único. |
| Cierre | `POST /auth/logout` con cookie, incluso si venció el acceso. Si falta la cookie y el acceso sigue vigente, utiliza ese acceso como respaldo para revocar. |

El token de acceso permanece en una variable privada del gestor. El refresh solo viaja como cookie HttpOnly: React no lo lee. No se guardan tokens, contraseñas ni perfiles en localStorage o sessionStorage. Las operaciones de cookie usan `credentials: 'include'`; los recursos protegidos usan Bearer y `credentials: 'omit'`.

`App.tsx` observa el gestor con `useSyncExternalStore` y espera la recuperación inicial antes de renderizar las rutas. El arranque comparte una promesa para evitar dobles renovaciones con StrictMode. Renueva aproximadamente 30 segundos antes del vencimiento y comprueba el tiempo al recuperar foco, visibilidad o conexión. Los temporizadores no sustituyen la verificación del servidor.

Las peticiones protegidas usan `peticionApi`. Si el acceso ya venció, renueva antes de enviar; si el servidor devuelve 401, comparte una renovación con las demás peticiones y reintenta el recurso una sola vez. Un 401 tardío reutiliza el acceso ya renovado. Un segundo 401 termina la sesión. Los códigos 403 y 5xx y los errores de red no reenvían la operación. La cancelación del consumidor se conserva y los cuerpos ReadableStream se rechazan porque no pueden reenviarse. El transporte impone 15 segundos de timeout, `cache: 'no-store'` y rechaza redirecciones HTTP y URLs externas.

El gestor invalida las respuestas que llegan tras un cierre o cambio de sesión. Si la renovación devuelve otra cuenta, no reenvía una operación de la cuenta anterior; el diseño desmonta el contenido privado al cambiar de usuario. Los roles `ADMIN` y `OPERATOR` se consultan por invernadero; no existe un rol global en el perfil.

### Pestañas y cierre pendiente

Web Locks serializa login, alta, refresh y logout entre pestañas del mismo origen y para la misma URL de API. BroadcastChannel y el evento storage notifican cambios. localStorage conserva únicamente una revisión aleatoria, un estado abierto/cerrado y una bandera de cierre pendiente. No se comparten tokens por esos canales. Cada pestaña recibe su acceso mediante un canje serial de la cookie ya actualizada.

Al cerrar se bloquea inmediatamente la interfaz y se solicita la revocación. Los demás clientes del mismo origen descartan su acceso. Si falla la red o no se consigue el bloqueo, la intención de cierre queda persistida y se muestra **Cierre de sesión pendiente**. Al recargar se intenta completar `/auth/logout`, sin recuperar automáticamente esa cuenta. El botón de reintento permite confirmar el cierre. Un 401 de logout se interpreta como cookie ya no autorizada; el controlador también la elimina.

Los errores de red, 429, origen o respuesta inesperada durante la recuperación muestran un estado de error con reintento explícito. No se crean bucles de refresh ni se interpretan fallos de red como credenciales incorrectas. Un 401 de refresh vuelve al acceso.

### Requisitos del navegador y despliegue

- Abrir la aplicación con HTTPS o localhost y un navegador con Web Locks. Si no hay coordinación segura, se muestra el error en vez de rotar cookies en paralelo.
- Permitir el almacenamiento local para los metadatos de coordinación. Su borrado manual elimina la marca de cierre pendiente.
- El servidor debe permitir el origen exacto del frontend en `WEB_ORIGINS` y CORS con credenciales; el código actual del servidor ya configura `credentials: true`. `localhost` y `127.0.0.1` son orígenes distintos.
- Con frontend y API en sitios distintos, el servidor requiere `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` y API HTTPS. Si el navegador bloquea cookies de terceros, no se puede garantizar la recuperación tras recarga; para ese entorno se necesita un despliegue en el mismo sitio o permitir las cookies de la API.
- No se fija manualmente el encabezado Origin ni se intenta leer Set-Cookie; los gestiona el navegador. El servidor comprueba Origin en refresh y logout y conserva el vencimiento absoluto de la sesión.
- La coordinación cubre pestañas del mismo origen. No sincroniza aplicaciones alojadas en orígenes diferentes, navegadores diferentes o dispositivos distintos.

### Pruebas

`npm run test:auth` ejecuta escenarios con transporte y coordinación simulados: login/alta, recuperación, tokens inválidos, concurrencia de 401, rotación serial entre pestañas, cierre durante renovación, respuestas tardías, cambio de cuenta, cierre pendiente y cancelación. No utiliza cuentas, cookies, tokens ni bases de datos reales. La aceptación efectiva de cookies, CORS y la revocación en PostgreSQL deben comprobarse además con el despliegue real y las pruebas del backend.

## Registro de usuarios

`RegistroUsuario` sigue `RegisterDto`, `LoginDto` y `UsersService` del servidor. La validación local se comparte con login en `src/utils/autenticacion.ts` y utiliza validator.js 13.15.35, la versión instalada en el backend, para mantener el formato de correo y el cómputo de longitud Unicode.

| Campo | Regla |
| --- | --- |
| Nombre | Se recortan los espacios exteriores; de 2 a 80 caracteres. |
| Correo | Se recorta y normaliza a minúsculas; `IsEmail` y hasta 254 caracteres, con los límites internos del formato de correo. |
| Contraseña | De 8 a 128 caracteres; se conserva exactamente, incluidos los espacios. No se agregan requisitos de composición que el servidor no tenga. |
| Confirmación | Obligatoria e idéntica a la contraseña; se comprueba localmente y no se envía. |

Los controles no truncan cadenas mediante un máximo HTML contado en unidades UTF-16: las longitudes se comprueban al enviar con la misma regla Unicode del servidor. Nombre y contraseña muestran sus límites en la interfaz. Login utiliza las mismas reglas de credenciales para permitir acceder con los datos que fueron válidos durante el alta.

Se envía únicamente `{ name, email, password }` a `POST /auth/register`, con cookie habilitada. La página bloquea los controles y el botón de volver mientras se procesa el envío, impide el doble envío y abre la aplicación después de verificar la sesión. No envía roles, identificadores ni campos de confirmación.

Los rechazos 400/422 identifican los campos conocidos del DTO y se muestran en español; el 409 señala el correo duplicado. El foco vuelve al campo rechazado después de habilitarlo. Los códigos 403 y 429 conservan mensajes de origen no autorizado y límite de intentos, respectivamente. Un rechazo 4xx no provoca un logout adicional que pudiera ocultar la validación o consumir otro intento.

La cuenta puede guardarse antes de que falle una etapa posterior. Si la respuesta del alta fue exitosa pero falla el token o `/auth/me`, se muestra **Tu cuenta ya está creada** y se ofrece iniciar sesión. Si se pierde la respuesta o hay un 5xx, se muestra **Registro pendiente de confirmar** y se recomienda intentar el acceso antes de repetir el alta. El POST de registro nunca se reintenta automáticamente. Si además falla la limpieza de la sesión, se mantiene el cierre pendiente con el aviso de que la cuenta fue creada.

Las pruebas de `npm run test:auth` incluyen los límites del formulario, Unicode, espacios en contraseñas, contrato JSON exacto, 201/400/403/409/429/5xx, errores de perfil y resultados inciertos. Se utilizan datos ficticios y respuestas simuladas; no se crean cuentas reales ni se modifican bases de datos.

## Mis invernaderos

`services/invernaderos.ts` usa el transporte autenticado para consultar `GET /greenhouses`. Recupera todas las páginas mediante `nextBeforeId` y `beforeId`; solo publica la lista completa cuando todas las páginas son válidas. Comprueba el orden de los identificadores y el avance del cursor para evitar duplicados o ciclos. Los errores de conexión o contrato se presentan con reintento, nunca como una lista vacía.

La página separa la carga en `useInvernaderos`, la búsqueda en `components/BusquedaInvernaderos` y cada registro en `components/TarjetaInvernadero`. Los componentes reciben sus valores y callbacks; el servicio adapta el contrato del servidor y las rutas deciden la navegación. Los controles generales continúan en `components/ui`.

Cada tarjeta muestra nombre, descripción y estado. La descripción procede de `description` en el servidor; si es nula o está vacía, se muestra **Sin descripción**. La pantalla de edición consulta el mismo dato y lo presenta en un área de texto.

La búsqueda se aplica por nombre al enviar con Enter o con la lupa, sin distinguir mayúsculas ni tildes. Al borrar el campo se restauran todos los registros. Se muestran **No hay invernaderos registrados** para una cuenta sin registros y **No se encontraron invernaderos** cuando un nombre no coincide. El resumen cuenta todas las pertenencias, incluidos los invernaderos en mantenimiento o desactivados.

La tarjeta abre el detalle del identificador seleccionado. El lápiz, visible para ADMIN, abre `/invernaderos/:invernaderoId/editar` mediante un botón independiente. La lista se vuelve a consultar al entrar, al recuperar el foco o la visibilidad y al recuperar conexión; las consultas se cancelan al salir. Volver desde registro o edición provoca una nueva consulta, sin depender de una lista almacenada en memoria. Los invernaderos desactivados se conservan en la lista y pueden reactivarse.

### Edición y estado del invernadero

El servidor incluye `PATCH /greenhouses/:id` para editar datos generales y `PATCH /greenhouses/:id/status` para cambiar el estado. Ambas rutas exigen ADMIN del recurso, comprobado en PostgreSQL dentro de la transacción. Los cambios utilizan las columnas existentes, sin migraciones. No existe borrado físico por estas rutas.

La edición precarga nombre, ubicación, largo, ancho, alto y descripción. Comparte `components/invernaderos/FormularioInvernadero` y la validación con RegistrarInvernadero. `useEditarInvernadero` coordina las escrituras y `components/EstadoInvernadero` confirma el cambio de estado. Un OPERATOR que abra la URL ve el formulario deshabilitado; el servidor también rechaza las escrituras con 403.

La actualización parcial admite los mismos límites que la creación; omitir campos los conserva. Para borrar alto o descripción se envía null. El formulario envía sus datos generales completos, incluidos los opcionales nulos cuando se vacían, pero no manda estado, equipo, rol ni propietario. Guardar datos no reactiva un invernadero desactivado. Las ediciones concurrentes se serializan en el servidor; si varias personas editan el mismo campo, prevalece la última escritura, sin detección de versiones en la interfaz.

Desactivar exige confirmación y conserva registros, pertenencias, credenciales e historial. En la misma transacción bloquea las comunicaciones del ESP32 y marca sus sensores Desconectado. No equivale a enviar una orden física a una bomba o un relé. Reactivar pasa el registro a Activo, pero el ESP32 permanece bloqueado hasta habilitarlo expresamente desde Configurar equipo. Se impide registrar o habilitar equipos mientras el invernadero esté Desactivado. EnMantenimiento sigue siendo un estado válido en la API y conserva las comunicaciones autorizadas.

Cambiar el estado no guarda los cambios pendientes del formulario; el diálogo lo advierte y esos valores se conservan. Tras guardar se muestra la confirmación y los valores devueltos por el servidor. Los controles se bloquean durante cada escritura para impedir envíos dobles. Ante una respuesta incierta, otro recurso/estado en la respuesta o permisos revocados, se ofrece consultar de nuevo antes de escribir. Revisar datos guardados descarta los valores locales y vuelve a cargar el registro. Al salir con cambios sin guardar se pide confirmación mediante ProteccionSalida.

`npm run test:invernaderos` utiliza respuestas HTTP simuladas para comprobar páginas sucesivas, búsqueda por nombre, bigint, cancelación, edición, limpieza de opcionales, transiciones de estado, errores y rechazo de contratos inválidos. No modifica cuentas ni la base de datos y no reemplaza una comprobación de navegación en el navegador con el backend desplegado. El servidor incorpora pruebas de permisos, DTOs y desactivación transaccional, además de escenarios HTTP preparados para una base PostgreSQL de pruebas explícita.

## Registro de invernaderos y configuración del equipo

RegistrarInvernadero crea exclusivamente el invernadero mediante `POST /greenhouses`. Exige nombre (1–100 caracteres después de recortar), ubicación (1–200), largo y ancho en metros (0.01–999999.99, hasta dos decimales). Alto y descripción son opcionales; la descripción admite hasta 500 caracteres. El área se calcula para mostrarla, pero no se envía. No se envían cultivo, controlador, sensores, propietario ni rol. El servidor obtiene la cuenta de su sesión y asigna ADMIN en la misma transacción del alta.

Al guardar, el formulario abre el detalle con la confirmación de éxito y la opción Configurar equipo; la navegación espera a liberar el bloqueo de la escritura. No repite el POST automáticamente. Ante una respuesta perdida, 5xx o una respuesta exitosa que no puede interpretarse, bloquea nuevos envíos desde ese formulario y ofrece revisar Mis invernaderos antes de repetir el registro. Los rechazos 4xx permiten corregir el formulario.

El detalle consulta nombre, descripción, ubicación, dimensiones, estado y modo de operación reales. Para ADMIN agrega la sección Equipo, que permite comenzar o retomar la configuración. Si falla la consulta del equipo, conserva la información del invernadero y ofrece abrir su configuración para reintentar. Los estados de riego y las lecturas no se simulan.

ConfigurarEquipo separa la coordinación en `useConfiguracionEquipo` y la presentación en componentes para registrar el ESP32, administrar sensores, administrar credenciales, mostrar parámetros de instalación y controlar la activación. `services/equipos.ts` interpreta y valida los recursos HTTP; los controles de presentación siguen en `components/ui`.

| Acción | API utilizada | Comportamiento |
| --- | --- | --- |
| Consultar equipo | `GET /controllers?beforeId=...` | Recorre todas las páginas y localiza el único ESP32 del invernadero. |
| Registrar ESP32 | `POST /controllers` | Envía greenhouseId y nombre; se crea desactivado. |
| Consultar/agregar sensores | `GET/POST /controllers/:id/sensors` | Permite HumedadAmbiental, Temperatura, HumedadSuelo y NivelAgua, uno de cada tipo. |
| Consultar claves | `GET /controllers/:id/credentials?beforeId=...` | Recorre todas las páginas de metadatos; no conserva campos secretos adicionales. |
| Emitir clave | `POST /controllers/:id/credentials` | Vencimiento opcional; muestra el original únicamente durante esa visita. |
| Reemplazar claves | `POST /controllers/:id/credentials/rotate` | Requiere confirmación porque invalida las anteriores. |
| Revocar clave | `DELETE /controllers/:id/credentials/:credentialId` | Requiere confirmación y conserva el registro revocado. |
| Habilitar/bloquear | `PATCH /controllers/:id` | Cambia active; habilitar exige una credencial vigente y un invernadero que no esté Desactivado. |

Las fechas opcionales del formulario se interpretan en la zona local y se envían en ISO con zona UTC. La UI distingue credenciales vigentes, vencidas y revocadas. Una clave sin vencimiento puede revocarse. La rotación no se confunde con emitir una clave adicional, que permite una transición sin invalidar inmediatamente la anterior.

Las escrituras se ejecutan de una en una, con bloqueo síncrono de dobles envíos. Cada éxito vuelve a consultar los recursos persistidos. No hay reintentos automáticos de emisión o alta; los resultados inciertos bloquean otras escrituras hasta actualizar y revisar los datos. La renovación de sesión puede repetir una petición rechazada con 401 antes de ejecutarse, conforme al gestor de autenticación existente.

Los secretos originales permanecen solamente en el estado de la página, nunca en localStorage, sessionStorage, la URL o metadatos de coordinación. La persona puede copiarlos y debe confirmar que los guardó antes de ocultarlos. Al intentar salir con una clave visible se muestra un diálogo nativo; durante una escritura se pide esperar. Recargar o cerrar la pestaña utiliza el aviso del navegador. El permiso de copiar depende del contexto seguro y del navegador; si falla, se ofrece copia manual. El portapapeles queda bajo control del sistema operativo.

### Instalación y comunicación física

La pantalla muestra la URL de API y los identificadores reales del controlador y sus sensores para configurar el firmware, junto con la credencial emitida por separado. Registrar sensores no configura pines, drivers ni calibración. Una unidad registrada no transforma los valores recibidos: debe coincidir con lo que envía la placa.

Habilitado significa autorización para comunicarse, no presencia física continua. Se muestran el último estado registrado y la fecha de última comunicación; Actualizar datos vuelve a consultarlos. No se envían JWT humanos a `/controllers/me` ni a `/telemetry` para simular que la placa está conectada. Esas rutas deben ser usadas por el ESP32 con su propia clave.

El firmware local revisado en `esp32__client/esp32_monitoring/esp32_monitoring.ino` solo inicia lecturas locales por Serial. La integración de sus drivers con `sensorAvailable`/`readSensorValue`, su calibración y el arranque de la comunicación deben completarse en el proyecto de la placa para recibir datos reales. Esta implementación de la interfaz no modifica el firmware ni carga configuraciones en hardware.

`npm run test:equipos` verifica el flujo de aprovisionamiento con respuestas simuladas, contratos exactos, cancelación, cursores, pertenencias cruzadas, límites Unicode y numéricos, expiración, rotación, revocación y respuestas inciertas. No crea registros o credenciales reales. La interacción visual en navegador y la puesta en marcha del hardware requieren comprobación adicional.

## Historial de mediciones

`/invernaderos/:invernaderoId/mediciones` consulta `GET /greenhouses/:id/sensors` para obtener el inventario público. Devuelve greenhouseId, controllerId (null cuando no hay equipo) e items con id, controllerId, type, unit y connectionStatus. La ruta requiere pertenencia ADMIN u OPERATOR al invernadero, sin exponer claves ni ampliar los permisos de administración de `/controllers`. Funciona aunque el invernadero esté desactivado o su equipo esté bloqueado. No requiere migraciones.

La página distingue carga, error con reintento, invernadero sin equipo, equipo sin sensores y sensor sin lecturas en el período. El inventario es real: solo se ofrecen sensores registrados, incluidos HumedadAmbiental, Temperatura, HumedadSuelo y NivelAgua. Actualizar sensores vuelve a verificar el inventario; no se realizan consultas administrativas para descubrir IDs.

El historial usa `GET /telemetry/sensors/:sensorId/history` con from, to, groupBy, page y limit. Hoy comienza a medianoche de Perú y termina al consultar; Últimos 7 días incluye los seis días anteriores y el día de la consulta. Se envían fechas explícitas ISO UTC: inicio incluido y final excluido. El intervalo permanece fijo al cambiar de página; Actualizar lecturas calcula una ventana nueva y vuelve a la primera página. Esta ventana fija evita que el período avance entre consultas, pero no equivale a una instantánea de PostgreSQL entre peticiones: las muestras enviadas con retraso pueden modificar resultados y conteos.

Cada gráfica muestra exclusivamente los registros de la página indicada, en orden cronológico. Los controles permiten ir a Anterior/Siguiente, regresar a la primera página y elegir 50, 100, 200 o 500 registros. Se respeta el límite de 10000 páginas de la API, con un aviso para usar promedios horarios si se alcanza. Los conteos e identificadores bigint se mantienen como cadenas y los cálculos de páginas usan BigInt.

Se puede alternar entre lecturas individuales y promedios por hora. Últimos 7 días selecciona inicialmente promedios horarios, y Hoy lecturas individuales. La agrupación se calcula en el servidor; la gráfica y su tabla accesible indican si muestran muestras o promedios y el número de muestras de cada grupo. Las estadísticas de promedio, mínimo, máximo y cantidad abarcan el período completo y proceden del resumen de la API, no de la página visible.

La unidad procede del sensor y aparece en cifras, leyendas, títulos accesibles y tabla. Solo las unidades `%` utilizan una escala porcentual; otras unidades ajustan la escala a los valores observados. Las lecturas que coinciden en fecha conservan sus identificadores y no se descartan. En agrupación horaria, las horas sin datos se omiten y no se unen a través de huecos; los valores ausentes y estadísticas null se muestran sin inventar ceros. Una lectura real de cero se conserva.

El servidor usa la fecha medida o, si falta, la de recepción. La interfaz presenta esa fecha en America/Lima. Al cambiar sensor, período, agrupación o página se desmonta la consulta anterior y se cancela su petición, para que una respuesta tardía no sustituya los datos seleccionados. El servicio valida identidad del sensor, unidad, rango, estadísticas, secuencia de fechas y coherencia de paginación antes de publicar una respuesta.

La composición se divide en HistorialSensores (filtros y ventana fija), ConsultaHistorial (carga cancelable), ResumenHistorial y PaginacionHistorial. El transporte y la validación del contrato están en `services/historial.ts`; GraficaMediciones recibe datos y unidades por propiedades. Los comentarios y documentación se mantienen en español.

`npm run test:historial` no usa cuentas ni bases reales. Incluye pruebas con respuestas HTTP simuladas y renderizado estático de las gráficas; no sustituye la comprobación interactiva en navegador ni el historial contra PostgreSQL desplegado. La ruta de inventario debe estar desplegada para que la pantalla funcione con la API de Cloudflare. Desde el historial se abre el monitoreo en vivo descrito en la siguiente sección.

## Monitoreo en tiempo real

La pantalla de tiempo real consulta el mismo inventario público que el historial y selecciona el tipo de la URL. Antes de cada inicio vuelve a comprobar el inventario y la sesión por HTTP, para no abrir un canal usando permisos o metadatos antiguos. Sin equipo, sensor o pertenencia no se habilita un inicio válido. El servidor revalida además JWT y permisos durante la conexión.

`services/monitoreo.ts` adapta el cliente oficial socket.io-client al namespace /monitoring y al path /socket.io, usando VITE_API_URL. El token viaja exclusivamente en auth del protocolo, sin cookies del canal ni parámetros de URL. El gestor de sesión entrega una capacidad efímera para el adaptador, con vencimiento y comprobación de vigencia; el token no se publica en ContextoSesion ni en el estado de React. Si se renueva el acceso, cambia la cuenta, se cierra sesión o vence el acceso, el canal se cierra y exige un nuevo inicio explícito.

La nueva verificación de origen del servidor reutiliza exactamente WEB_ORIGINS. No modifica configureApp, la lista configurada ni el CORS de HTTP. Se rechazan handshakes Socket.IO con Origin ajeno, vacío o null. Los clientes nativos sin Origin siguen permitidos, pero deben autenticarse; un nativo que envíe Origin debe utilizar uno permitido. El WebSocket del ESP32 continúa usando su protocolo y credencial independientes.

El control se separa en gestorMonitoreo (máquina de estados y reloj sustituible), el adaptador Socket.IO, useMonitoreo (ciclo de vida de la pantalla) y SesionEnVivo (controles y presentación). Solo pulsar Iniciar crea una conexión nueva. No se habilitan reconexión ni reenvíos automáticos. Detener durante la autorización cancela el intento y evita abrir un socket después de abandonar la pantalla.

monitoring.start solicita una frecuencia entre 1000 y 10000 ms. La aceptación inicial no implica que la placa haya confirmado: se muestra Solicitando hasta monitoring.state=active. El intervalo realmente aplicado puede ser más lento y se presenta por separado. Cada concesión se renueva con monitoring.renew cada 20 segundos, respetando su expiresAt; no se emite start para renovar.

El gestor exige confirmaciones con un plazo de ocho segundos, limita la apertura del canal a diez segundos y termina la sesión si vence la concesión o dejan de recibirse muestras recientes. También interpreta estados de rechazo del driver, desconexión del equipo, apagado del servidor y pérdida de permisos. Se valida sensor, invernadero, controlador, tipo, unidad, requestId y secuencia antes de mostrar datos. Las secuencias repetidas, órdenes retiradas y respuestas de una conexión anterior se ignoran. Las estructuras de deduplicación y la gráfica están acotadas; se conservan únicamente las últimas 60 lecturas.

Al detener, salir de la ruta, ocultar la pestaña o perder la red, se envía stop cuando es posible y se cierra la conexión con sus oyentes y temporizadores. Una caída de red puede impedir entregar stop; la limpieza del servidor y la concesión máxima de 60 segundos del firmware siguen siendo necesarias. La salida de una persona no detiene a los demás espectadores. Volver al primer plano nunca reanuda el envío automáticamente.

La última lectura se mantiene como referencia al detener y muestra su fecha y antigüedad de recepción; no se presenta un valor antiguo como una muestra nueva. Si no hay hora de medición se usa la de recepción. Las unidades provienen del inventario y las muestras rápidas no se insertan en Medicion; la telemetría histórica periódica del equipo sigue siendo independiente.

Las pruebas del cliente usan reloj y canal simulados y las pruebas de origen del servidor utilizan conexiones Socket.IO/WebSocket reales con autenticación simulada. No se modifican equipos ni cuentas reales y todavía debe comprobarse el flujo con el firmware físico y PostgreSQL desplegado. La validación de orígenes debe desplegarse con el servidor; WEB_ORIGINS debe incluir el origen real del frontend. El firmware actual de lectura local requiere integrar sus drivers y el arranque de comunicación para entregar muestras reales.

## Estado de funcionalidades

- Login y registro de usuario: conectados al servicio HTTP; requieren un backend compatible.
- Lista de invernaderos: conectada, con contador, búsqueda por nombre, selección, mensajes vacíos y reintento.
- Edición de invernaderos: guardado, desactivación y reactivación conectados; exige ADMIN del invernadero.
- Registro de invernaderos: conectado con validación del DTO y creación separada del equipo.
- Detalle: datos, acceso a edición y configuración de equipo conectados; control de riego pendiente. Se utiliza desactivación reversible en lugar del botón de eliminación pendiente.
- Equipo: registro de ESP32, sensores, credenciales, activación y bloqueo conectados a la API existente.
- Historial: conectado al inventario y la API de lecturas con unidades, estadísticas, fechas de Perú, agrupación y paginación.
- Tiempo real: conectado al canal Socket.IO, con inicio explícito, renovaciones, parada, lecturas y manejo de desconexiones; pendiente de verificación física.
- Perfil y cierre de sesión: conectados; accesibles desde la navegación inferior. Filtros, notificaciones y configuración: pendientes de implementación.

Las pantallas de detalle y mediciones pueden abrirse por URL con sesión y el detalle puede abrirse desde una tarjeta de la lista. Los valores de resumen de sensores en el detalle y los actuadores permanecen pendientes de integración con sus respectivas pantallas. No se generan identificadores ni lecturas ficticias.

## Despliegue

El servidor de producción debe servir `index.html` para las URLs de la aplicación que no correspondan a archivos estáticos. Esta regla de fallback es necesaria para abrir enlaces directos o recargar rutas como `/invernaderos/123/mediciones` con `createBrowserRouter`.

## Componentes reutilizables

Los componentes generales de presentación se limitan a renderizar estilos y elementos HTML. Las páginas y sus hooks controlan carga, persistencia y navegación; los formularios de dominio pueden administrar su selección o validación local y reciben callbacks para solicitar las escrituras. Los controles de `components/ui` no interpretan datos del dominio ni realizan peticiones.

| Componente | Responsabilidad |
| --- | --- |
| `ui/Entrada` | Único input con variantes visuales `suave`, `redondeada` y `busqueda`. Recibe `type`, `value`, `defaultValue`, eventos, atributos ARIA y `ref` nativos. |
| `AreaTexto` | Control `textarea` nativo con estilo redondeado; conserva sus atributos y su referencia. |
| `ui/Seleccion` | Selector nativo sin estado; recibe opciones mediante children y atributos nativos para valor, eventos y accesibilidad. |
| `ui/Boton` | Botón de presentación con variantes `libre`, `celeste`, `azul`, `verde` y `segmento`. Recibe contenido por `children`, y eventos, `disabled` y `ref` nativos. |
| `ui/Tipografia` | Un solo `Titulo` para los niveles `h1` a `h6`, con estilo `normal` o `seccion`, y `Texto` para párrafos. |
| `ui/Tarjeta` | Contenedor sin interpretación de datos, con variantes `normal`, `verde`, `centrada`, `resumen` y `aviso`. Recibe contenido mediante `children`. |
| `NavegacionPrincipal` | Menú que recibe opciones, iconos, acciones y selección; no conoce rutas ni opciones específicas de AquaSmart. |

Las opciones propias de la aplicación están en `src/config/navegacion.tsx`. Cada página suministra las acciones y los identificadores de selección al menú.

Los campos de contraseña utilizan el mismo `Entrada` que los campos de texto. La página decide el atributo `type` y compone por separado el botón de visibilidad, la etiqueta y los mensajes. Los botones de envío reciben el indicador de carga como contenido; la página decide cuándo deshabilitarlos. Los selectores utilizan `Boton` con la variante `segmento` y reciben `aria-pressed` y sus colores desde la página.

```tsx
const [visible, setVisible] = useState(false)

<label htmlFor="clave">Contraseña</label>
<Entrada
  id="clave"
  name="clave"
  type={visible ? 'text' : 'password'}
  autoComplete="current-password"
  aria-invalid={!!error}
  aria-describedby={error ? 'error-clave' : undefined}
/>
<Boton type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>
  {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
</Boton>
{error && <Texto id="error-clave" role="alert">{error}</Texto>}

<Boton variante="celeste" type="submit" disabled={cargando}>
  {cargando && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
  {cargando ? 'GUARDANDO…' : 'GUARDAR'}
</Boton>

<Tarjeta como="section" variante="centrada" aria-label="Última lectura">
  <Titulo nivel={2}>Humedad del suelo</Titulo>
  <Texto>42 %</Texto>
</Tarjeta>
```

En botones, entradas y tarjetas, `className` añade ajustes a la variante. Evita clases contradictorias con esa variante. En tipografía y navegación, `className` sustituye el estilo predeterminado. El consumidor mantiene las asociaciones entre `label`, `id` y `aria-describedby`, y define `type="button"` en las acciones que no envíen formularios.

## Convenciones

Los nombres del dominio y los comentarios del código se escriben en español. Las lecturas se ordenan y deduplican por fecha; los períodos y las etiquetas se calculan para Perú (`America/Lima`).


### Administración del controlador y sensores

La pantalla usa el término controlador y comparte un formulario para agregar y editar sensores. Los cuatro tipos son Temperatura (°C), Humedad ambiental (%), Humedad del suelo (%) y Nivel de agua (%); la unidad se asigna automáticamente. El historial y el canal en vivo aceptan temperatura bajo cero. HumedadAmbiental y Temperatura son registros independientes y pueden coexistir en el mismo controlador; nunca se convierten entre sí.

Cada sensor tiene acciones de edición y eliminación con confirmación. Ambas requieren un controlador con comunicaciones bloqueadas y un sensor sin mediciones; el servidor protege el historial y vuelve a comprobar la pertenencia ADMIN. Después de cambiar un tipo o eliminar un registro, actualizar la configuración de la placa antes de habilitarla. Los enlaces existentes a `/equipo` siguen funcionando.

Requiere desplegar el servidor con `PATCH` y `DELETE /controllers/:id/sensors/:sensorId` y aplicar primero la migración `1792771200011-AdmitirTemperatura`. No se aplican migraciones automáticamente desde React. Pendiente la verificación con PostgreSQL y sensores físicos reales.
