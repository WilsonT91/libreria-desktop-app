import { ElectronAPI } from '@electron-toolkit/preload'

interface DatosNuevoAdmin {
  primerNombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  usuario: string
  password: string
}

interface ResultadoLogin {
  exito: boolean
  mensaje?: string
  usuario?: {
    id: number
    rolId: number
    rolNombre: string
    primerInicio: boolean
  }
}

interface ResultadoCambioPassword {
  exito: boolean
  mensaje?: string
  codigoRecuperacion?: string
  archivoRecuperacion?: string
}

interface UsuarioBloqueado {
  id: number
  usuario: string
  primerNombre: string
  apellidoPaterno: string
  intentosFallidos: number
}

interface ResultadoDesbloqueo {
  exito: boolean
  mensaje?: string
}

interface ResultadoVerificacionCodigo {
  exito: boolean
  mensaje?: string
  usuarioId?: number
}

interface ResultadoRestablecimiento {
  exito: boolean
  mensaje?: string
  codigoRecuperacion?: string
  archivoRecuperacion?: string
}

interface ResultadoVerificacionArchivo {
  exito: boolean
  mensaje?: string
  usuarioId?: number
}

interface Api {
  existeUsuario: () => Promise<boolean>
  crearPrimerAdmin: (datos: DatosNuevoAdmin) => Promise<void>
  iniciarSesion: (usuario: string, password: string) => Promise<ResultadoLogin>
  cambiarPasswordPrimerInicio: (
    usuarioId: number,
    nuevaPassword: string
  ) => Promise<ResultadoCambioPassword>
  listarUsuariosBloqueados: () => Promise<UsuarioBloqueado[]>
  desbloquearUsuario: (
    usuarioIdEjecutor: number,
    usuarioIdObjetivo: number
  ) => Promise<ResultadoDesbloqueo>
  verificarCodigoRecuperacion: (
    usuario: string,
    codigo: string
  ) => Promise<ResultadoVerificacionCodigo>
  restablecerPasswordConCodigo: (
    usuarioId: number,
    nuevaPassword: string
  ) => Promise<ResultadoRestablecimiento>
  guardarArchivoRecuperacion: (contenido: string) => Promise<boolean>
  leerArchivoRecuperacion: () => Promise<string | null>
  verificarArchivoRecuperacion: (
    usuario: string,
    contenidoArchivo: string
  ) => Promise<ResultadoVerificacionArchivo>
  restablecerPasswordConArchivo: (
    usuarioId: number,
    nuevaPassword: string
  ) => Promise<ResultadoRestablecimiento>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
