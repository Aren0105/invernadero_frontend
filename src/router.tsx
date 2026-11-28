import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import {
  RutaProtegida, RutaLogin, RutaRegistroUsuario,
  RutaInvernaderos, RutaRegistroInvernadero, RutaDetalle, RutaMediciones,
  RutaTiempoReal, RutaNoEncontrada, RutaPerfil, RutaEditarInvernadero,
  RutaConfigurarEquipo, RutaGestionSensores, RutaConexionControlador,
} from './rutas'

/** Instancia única del router; las rutas hijas conservan el diseño y la sesión de App. */
export const router = createBrowserRouter([
  {
    Component: App,
    children: [
      { index: true, element: <Navigate to="/invernaderos" replace /> },
      { path: 'login', Component: RutaLogin },
      { path: 'registro', Component: RutaRegistroUsuario },
      {
        Component: RutaProtegida,
        children: [
          { path: 'invernaderos', Component: RutaInvernaderos },
          { path: 'perfil', Component: RutaPerfil },
          { path: 'invernaderos/nuevo', Component: RutaRegistroInvernadero },
          { path: 'invernaderos/:invernaderoId/editar', Component: RutaEditarInvernadero },
          // Pantalla 1: Asociar controlador al invernadero y generar token de conexión.
          { path: 'invernaderos/:invernaderoId/equipo', Component: RutaConfigurarEquipo },
          // Pantalla 2: Gestión y asociación de sensores del invernadero.
          { path: 'invernaderos/:invernaderoId/equipo/sensores', Component: RutaGestionSensores },
          // Pantalla 3: Probar conexión, ver datos de placa y activar/bloquear comunicaciones.
          { path: 'invernaderos/:invernaderoId/equipo/conexion', Component: RutaConexionControlador },
          { path: 'invernaderos/:invernaderoId', Component: RutaDetalle },
          { path: 'invernaderos/:invernaderoId/mediciones', Component: RutaMediciones },
          { path: 'invernaderos/:invernaderoId/mediciones/tiempo-real/:tipo', Component: RutaTiempoReal },
        ],
      },
      { path: '*', Component: RutaNoEncontrada },
    ],
  },
])
