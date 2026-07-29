import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  existeUsuario: () => ipcRenderer.invoke('auth:existeUsuario'),
  crearPrimerAdmin: (datos: unknown) => ipcRenderer.invoke('auth:crearPrimerAdmin', datos),
  iniciarSesion: (usuario: string, password: string) =>
    ipcRenderer.invoke('auth:iniciarSesion', usuario, password),
  cambiarPasswordPrimerInicio: (usuarioId: number, nuevaPassword: string) =>
    ipcRenderer.invoke('auth:cambiarPasswordPrimerInicio', usuarioId, nuevaPassword),
  listarUsuariosBloqueados: () => ipcRenderer.invoke('auth:listarUsuariosBloqueados'),
  desbloquearUsuario: (usuarioIdEjecutor: number, usuarioIdObjetivo: number) =>
    ipcRenderer.invoke('auth:desbloquearUsuario', usuarioIdEjecutor, usuarioIdObjetivo),
  verificarCodigoRecuperacion: (usuario: string, codigo: string) =>
    ipcRenderer.invoke('auth:verificarCodigoRecuperacion', usuario, codigo),
  restablecerPasswordConCodigo: (usuarioId: number, nuevaPassword: string) =>
    ipcRenderer.invoke('auth:restablecerPasswordConCodigo', usuarioId, nuevaPassword),
  guardarArchivoRecuperacion: (contenido: string) =>
    ipcRenderer.invoke('auth:guardarArchivoRecuperacion', contenido),
  leerArchivoRecuperacion: () => ipcRenderer.invoke('auth:leerArchivoRecuperacion'),
  verificarArchivoRecuperacion: (usuario: string, contenidoArchivo: string) =>
    ipcRenderer.invoke('auth:verificarArchivoRecuperacion', usuario, contenidoArchivo),
  restablecerPasswordConArchivo: (usuarioId: number, nuevaPassword: string) =>
    ipcRenderer.invoke('auth:restablecerPasswordConArchivo', usuarioId, nuevaPassword)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
