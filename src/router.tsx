import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import {
  RutaProtegida, RutaLogin, RutaRegistroUsuario,
  RutaInvernaderos, RutaRegistroInvernadero, RutaDetalle, RutaMediciones,
  RutaTiempoReal, RutaNoEncontrada, RutaPerfil, RutaEditarInvernadero, RutaConfigurarEquipo,
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
          { path: 'invernaderos/:invernaderoId/equipo', Component: RutaConfigurarEquipo },
          { path: 'invernaderos/:invernaderoId', Component: RutaDetalle },
          { path: 'invernaderos/:invernaderoId/mediciones', Component: RutaMediciones },
          { path: 'invernaderos/:invernaderoId/mediciones/tiempo-real/:tipo', Component: RutaTiempoReal },
        ],
      },
      { path: '*', Component: RutaNoEncontrada },
    ],
  },
])
