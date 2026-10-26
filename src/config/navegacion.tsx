import { House, Bell, Settings, User } from 'lucide-react'

/** Opciones del menú de la aplicación; las páginas suministran las acciones y la selección. */
export const opcionesNavegacion = [
  { id: 'inicio', etiqueta: 'Inicio', icono: <House className="h-6 w-6" aria-hidden="true" /> },
  { id: 'notificaciones', etiqueta: 'Notificaciones', icono: <Bell className="h-6 w-6" aria-hidden="true" /> },
  { id: 'configuracion', etiqueta: 'Configuración', icono: <Settings className="h-6 w-6" aria-hidden="true" /> },
  { id: 'perfil', etiqueta: 'Perfil', icono: <User className="h-6 w-6" aria-hidden="true" /> },
]
