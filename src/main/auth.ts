import bcrypt from 'bcryptjs'
import db from './database/db'

export function existeAlgunUsuario(): boolean {
  const resultado = db.prepare('SELECT COUNT(*) as total FROM Usuarios').get() as { total: number }
  return resultado.total > 0
}

interface DatosNuevoAdmin {
  primerNombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  usuario: string
  password: string
}

export function crearPrimerAdministrador(datos: DatosNuevoAdmin): void {
  const passwordHash = bcrypt.hashSync(datos.password, 10)

  const rolAdmin = db.prepare('SELECT id FROM Roles WHERE nombre = ?').get('administrador') as
    { id: number } | undefined

  if (!rolAdmin) {
    throw new Error('El rol administrador no existe en la base de datos')
  }

  db.prepare(
    `INSERT INTO Usuarios (primer_nombre, apellido_paterno, apellido_materno, usuario, password_hash, rol_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    datos.primerNombre,
    datos.apellidoPaterno,
    datos.apellidoMaterno,
    datos.usuario,
    passwordHash,
    rolAdmin.id
  )
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

interface UsuarioDb {
  id: number
  password_hash: string
  rol_id: number
  rol_nombre: string
  primer_inicio: number
  estado: number
}

export function iniciarSesion(usuario: string, password: string): ResultadoLogin {
  const filaUsuario = db
    .prepare(
      `SELECT Usuarios.id, Usuarios.password_hash, Usuarios.rol_id, Usuarios.primer_inicio,
              Usuarios.estado, Roles.nombre AS rol_nombre
       FROM Usuarios
       JOIN Roles ON Usuarios.rol_id = Roles.id
       WHERE Usuarios.usuario = ?`
    )
    .get(usuario) as UsuarioDb | undefined

  // No revelamos si el problema fue "usuario no existe" o "contraseña incorrecta":
  // decir cual de los dos falló es información útil para un atacante
  if (!filaUsuario) {
    return { exito: false, mensaje: 'Credenciales inválidas' }
  }

  if (filaUsuario.estado === 0) {
    return { exito: false, mensaje: 'Este usuario está inactivo' }
  }

  const passwordCorrecta = bcrypt.compareSync(password, filaUsuario.password_hash)

  if (!passwordCorrecta) {
    return { exito: false, mensaje: 'Credenciales inválidas' }
  }

  return {
    exito: true,
    usuario: {
      id: filaUsuario.id,
      rolId: filaUsuario.rol_id,
      rolNombre: filaUsuario.rol_nombre,
      primerInicio: filaUsuario.primer_inicio === 1
    }
  }
}

import crypto from 'crypto'

interface ResultadoCambioPassword {
  exito: boolean
  mensaje?: string
  codigoRecuperacion?: string
  archivoRecuperacion?: string
}

function generarCodigoRecuperacion(): string {
  // Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/l)
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const grupos: string[] = []

  for (let g = 0; g < 3; g++) {
    let grupo = ''
    for (let i = 0; i < 4; i++) {
      const indice = crypto.randomInt(alfabeto.length)
      grupo += alfabeto[indice]
    }
    grupos.push(grupo)
  }

  return grupos.join('-')
}

function generarClaveArchivoRecuperacion(): string {
  // 32 bytes aleatorios en hexadecimal = 64 caracteres.
  // No necesita ser corta ni facil de escribir a mano, vive en un archivo.
  return crypto.randomBytes(32).toString('hex')
}

export function cambiarPasswordPrimerInicio(
  usuarioId: number,
  nuevaPassword: string
): ResultadoCambioPassword {
  const filaUsuario = db
    .prepare(
      `SELECT Usuarios.id, Usuarios.primer_inicio, Roles.nombre AS rol_nombre
       FROM Usuarios
       JOIN Roles ON Usuarios.rol_id = Roles.id
       WHERE Usuarios.id = ?`
    )
    .get(usuarioId) as { id: number; primer_inicio: number; rol_nombre: string } | undefined

  if (!filaUsuario) {
    return { exito: false, mensaje: 'Usuario no encontrado' }
  }

  if (filaUsuario.primer_inicio === 0) {
    return { exito: false, mensaje: 'Este usuario ya completó su configuración inicial' }
  }

  const esAdmin = filaUsuario.rol_nombre === 'administrador'

  const nuevoPasswordHash = bcrypt.hashSync(nuevaPassword, 10)
  const codigoRecuperacion = generarCodigoRecuperacion()
  const codigoRecuperacionHash = bcrypt.hashSync(codigoRecuperacion, 10)

  const archivoRecuperacion = esAdmin ? generarClaveArchivoRecuperacion() : null
  const archivoRecuperacionHash = archivoRecuperacion
    ? bcrypt.hashSync(archivoRecuperacion, 10)
    : null

  db.prepare(
    `UPDATE Usuarios
     SET password_hash = ?, codigo_recuperacion_hash = ?, archivo_recuperacion_hash = ?, primer_inicio = 0
     WHERE id = ?`
  ).run(nuevoPasswordHash, codigoRecuperacionHash, archivoRecuperacionHash, usuarioId)

  return {
    exito: true,
    codigoRecuperacion,
    archivoRecuperacion: archivoRecuperacion ?? undefined
  }
}

interface UsuarioBloqueado {
  id: number
  usuario: string
  primerNombre: string
  apellidoPaterno: string
  intentosFallidos: number
}

export function listarUsuariosBloqueados(): UsuarioBloqueado[] {
  const filas = db
    .prepare(
      `SELECT id, usuario, primer_nombre, apellido_paterno, intentos_fallidos
       FROM Usuarios
       WHERE intentos_fallidos >= 5`
    )
    .all() as {
    id: number
    usuario: string
    primer_nombre: string
    apellido_paterno: string
    intentos_fallidos: number
  }[]

  return filas.map((fila) => ({
    id: fila.id,
    usuario: fila.usuario,
    primerNombre: fila.primer_nombre,
    apellidoPaterno: fila.apellido_paterno,
    intentosFallidos: fila.intentos_fallidos
  }))
}

interface ResultadoDesbloqueo {
  exito: boolean
  mensaje?: string
}

export function desbloquearUsuario(
  usuarioIdEjecutor: number,
  usuarioIdObjetivo: number
): ResultadoDesbloqueo {
  const ejecutor = db
    .prepare(
      `SELECT Roles.nombre AS rol_nombre
       FROM Usuarios
       JOIN Roles ON Usuarios.rol_id = Roles.id
       WHERE Usuarios.id = ?`
    )
    .get(usuarioIdEjecutor) as { rol_nombre: string } | undefined

  if (!ejecutor || ejecutor.rol_nombre !== 'administrador') {
    return { exito: false, mensaje: 'No tienes permisos para realizar esta acción' }
  }

  const resultado = db
    .prepare('UPDATE Usuarios SET intentos_fallidos = 0 WHERE id = ?')
    .run(usuarioIdObjetivo)

  if (resultado.changes === 0) {
    return { exito: false, mensaje: 'Usuario no encontrado' }
  }

  return { exito: true }
}

interface ResultadoVerificacionCodigo {
  exito: boolean
  mensaje?: string
  usuarioId?: number
}

interface FilaVerificacion {
  id: number
  codigo_recuperacion_hash: string | null
  estado: number
  intentos_fallidos: number
}

export function verificarCodigoRecuperacion(
  usuario: string,
  codigo: string
): ResultadoVerificacionCodigo {
  const fila = db
    .prepare(
      'SELECT id, codigo_recuperacion_hash, estado, intentos_fallidos FROM Usuarios WHERE usuario = ?'
    )
    .get(usuario) as FilaVerificacion | undefined

  if (!fila) {
    return { exito: false, mensaje: 'Usuario o código inválido' }
  }

  if (fila.estado === 0) {
    return { exito: false, mensaje: 'Este usuario está inactivo' }
  }

  if (fila.intentos_fallidos >= 5) {
    return {
      exito: false,
      mensaje: 'Cuenta bloqueada por intentos fallidos. Contacta a un administrador.'
    }
  }

  if (!fila.codigo_recuperacion_hash) {
    return { exito: false, mensaje: 'Usuario o código inválido' }
  }

  const coincide = bcrypt.compareSync(codigo, fila.codigo_recuperacion_hash)

  if (!coincide) {
    db.prepare('UPDATE Usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?').run(
      fila.id
    )
    return { exito: false, mensaje: 'Usuario o código inválido' }
  }

  return { exito: true, usuarioId: fila.id }
}

interface ResultadoRestablecimiento {
  exito: boolean
  mensaje?: string
  codigoRecuperacion?: string
  archivoRecuperacion?: string
}

function regenerarCredencialesCompletas(
  usuarioId: number,
  nuevaPassword: string
): ResultadoRestablecimiento {
  const filaUsuario = db
    .prepare(
      `SELECT Usuarios.id, Roles.nombre AS rol_nombre
       FROM Usuarios
       JOIN Roles ON Usuarios.rol_id = Roles.id
       WHERE Usuarios.id = ?`
    )
    .get(usuarioId) as { id: number; rol_nombre: string } | undefined

  if (!filaUsuario) {
    return { exito: false, mensaje: 'Usuario no encontrado' }
  }

  const esAdmin = filaUsuario.rol_nombre === 'administrador'

  const nuevoPasswordHash = bcrypt.hashSync(nuevaPassword, 10)
  const nuevoCodigoRecuperacion = generarCodigoRecuperacion()
  const nuevoCodigoHash = bcrypt.hashSync(nuevoCodigoRecuperacion, 10)

  const nuevoArchivoRecuperacion = esAdmin ? generarClaveArchivoRecuperacion() : null
  const nuevoArchivoHash = nuevoArchivoRecuperacion
    ? bcrypt.hashSync(nuevoArchivoRecuperacion, 10)
    : null

  db.prepare(
    `UPDATE Usuarios
     SET password_hash = ?, codigo_recuperacion_hash = ?, archivo_recuperacion_hash = ?, intentos_fallidos = 0
     WHERE id = ?`
  ).run(nuevoPasswordHash, nuevoCodigoHash, nuevoArchivoHash, usuarioId)

  return {
    exito: true,
    codigoRecuperacion: nuevoCodigoRecuperacion,
    archivoRecuperacion: nuevoArchivoRecuperacion ?? undefined
  }
}

export function restablecerPasswordConCodigo(
  usuarioId: number,
  nuevaPassword: string
): ResultadoRestablecimiento {
  return regenerarCredencialesCompletas(usuarioId, nuevaPassword)
}

interface ResultadoVerificacionArchivo {
  exito: boolean
  mensaje?: string
  usuarioId?: number
}

interface FilaVerificacionArchivo {
  id: number
  archivo_recuperacion_hash: string | null
  estado: number
  intentos_fallidos: number
  rol_nombre: string
}

export function verificarArchivoRecuperacion(
  usuario: string,
  contenidoArchivo: string
): ResultadoVerificacionArchivo {
  const fila = db
    .prepare(
      `SELECT Usuarios.id, Usuarios.archivo_recuperacion_hash, Usuarios.estado,
              Usuarios.intentos_fallidos, Roles.nombre AS rol_nombre
       FROM Usuarios
       JOIN Roles ON Usuarios.rol_id = Roles.id
       WHERE Usuarios.usuario = ?`
    )
    .get(usuario) as FilaVerificacionArchivo | undefined

  // Mismo mensaje generico para todos los casos: usuario no existe, no es admin,
  // no tiene archivo generado, o el archivo no coincide.
  const mensajeGenerico = 'Usuario o archivo de recuperación inválido'

  if (!fila) {
    return { exito: false, mensaje: mensajeGenerico }
  }

  if (fila.rol_nombre !== 'administrador') {
    return { exito: false, mensaje: mensajeGenerico }
  }

  if (fila.estado === 0) {
    return { exito: false, mensaje: 'Este usuario está inactivo' }
  }

  if (fila.intentos_fallidos >= 5) {
    return {
      exito: false,
      mensaje: 'Cuenta bloqueada por intentos fallidos. Contacta a otro administrador.'
    }
  }

  if (!fila.archivo_recuperacion_hash) {
    return { exito: false, mensaje: mensajeGenerico }
  }

  const coincide = bcrypt.compareSync(contenidoArchivo.trim(), fila.archivo_recuperacion_hash)

  if (!coincide) {
    db.prepare('UPDATE Usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?').run(
      fila.id
    )
    return { exito: false, mensaje: mensajeGenerico }
  }

  return { exito: true, usuarioId: fila.id }
}

export function restablecerPasswordConArchivo(
  usuarioId: number,
  nuevaPassword: string
): ResultadoRestablecimiento {
  return regenerarCredencialesCompletas(usuarioId, nuevaPassword)
}
