import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  existeAlgunUsuario,
  crearPrimerAdministrador,
  iniciarSesion,
  cambiarPasswordPrimerInicio,
  listarUsuariosBloqueados,
  desbloquearUsuario,
  verificarCodigoRecuperacion,
  restablecerPasswordConCodigo,
  verificarArchivoRecuperacion,
  restablecerPasswordConArchivo
} from './auth'
import { guardarArchivoRecuperacion, leerArchivoRecuperacion } from './archivoRecuperacion'

function createWindow(): void {
  // Crea la ventana principal del navegador
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Establece el id del modelo de usuario de la app en Windows
  electronApp.setAppUserModelId('com.electron')

  // Activa o desactiva las DevTools con F12 en desarrollo,
  // e ignora Ctrl+R en produccion
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC: verifica si ya existe al menos un usuario (para decidir setup inicial o login)
  ipcMain.handle('auth:existeUsuario', () => {
    return existeAlgunUsuario()
  })

  // IPC: crea el primer administrador durante la configuracion inicial
  ipcMain.handle('auth:crearPrimerAdmin', (_event, datos) => {
    crearPrimerAdministrador(datos)
  })

  ipcMain.handle('auth:iniciarSesion', (_event, usuario: string, password: string) => {
    return iniciarSesion(usuario, password)
  })

  ipcMain.handle(
    'auth:cambiarPasswordPrimerInicio',
    (_event, usuarioId: number, nuevaPassword: string) => {
      return cambiarPasswordPrimerInicio(usuarioId, nuevaPassword)
    }
  )

  ipcMain.handle('auth:listarUsuariosBloqueados', () => {
    return listarUsuariosBloqueados()
  })

  ipcMain.handle(
    'auth:desbloquearUsuario',
    (_event, usuarioIdEjecutor: number, usuarioIdObjetivo: number) => {
      return desbloquearUsuario(usuarioIdEjecutor, usuarioIdObjetivo)
    }
  )

  ipcMain.handle('auth:verificarCodigoRecuperacion', (_event, usuario: string, codigo: string) => {
    return verificarCodigoRecuperacion(usuario, codigo)
  })

  ipcMain.handle(
    'auth:restablecerPasswordConCodigo',
    (_event, usuarioId: number, nuevaPassword: string) => {
      return restablecerPasswordConCodigo(usuarioId, nuevaPassword)
    }
  )

  ipcMain.handle('auth:guardarArchivoRecuperacion', (_event, contenido: string) => {
    return guardarArchivoRecuperacion(contenido)
  })

  ipcMain.handle('auth:leerArchivoRecuperacion', () => {
    return leerArchivoRecuperacion()
  })

  ipcMain.handle(
    'auth:verificarArchivoRecuperacion',
    (_event, usuario: string, contenidoArchivo: string) => {
      return verificarArchivoRecuperacion(usuario, contenidoArchivo)
    }
  )

  ipcMain.handle(
    'auth:restablecerPasswordConArchivo',
    (_event, usuarioId: number, nuevaPassword: string) => {
      return restablecerPasswordConArchivo(usuarioId, nuevaPassword)
    }
  )

  createWindow()

  app.on('activate', function () {
    // En macOS es comun recrear una ventana cuando se hace clic en el icono
    // del dock y no hay otras ventanas abiertas
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Cierra la app cuando se cierran todas las ventanas, excepto en macOS.
// Ahi es comun que la app y su barra de menu sigan activas hasta que
// el usuario cierre explicitamente con Cmd + Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
