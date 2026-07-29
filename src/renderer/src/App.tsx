import { useState, useEffect, type ReactElement, type SyntheticEvent } from 'react'

interface UsuarioSesion {
  id: number
  rolId: number
  rolNombre: string
  primerInicio: boolean
}

function App(): ReactElement {
  const [cargando, setCargando] = useState(true)
  const [necesitaSetup, setNecesitaSetup] = useState(false)
  const [usuarioSesion, setUsuarioSesion] = useState<UsuarioSesion | null>(null)
  const [codigoRecuperacion, setCodigoRecuperacion] = useState<string | null>(null)
  const [archivoRecuperacion, setArchivoRecuperacion] = useState<string | null>(null)
  const [vistaAcceso, setVistaAcceso] = useState<'login' | 'recuperacion'>('login')

  useEffect(() => {
    window.api.existeUsuario().then((existe) => {
      setNecesitaSetup(!existe)
      setCargando(false)
    })
  }, [])

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando...</p>
  }

  if (necesitaSetup) {
    return <FormularioSetupInicial />
  }

  if (!usuarioSesion) {
    if (vistaAcceso === 'recuperacion') {
      return <FormularioRecuperacion onVolverALogin={() => setVistaAcceso('login')} />
    }
    return (
      <FormularioLogin
        onLoginExitoso={setUsuarioSesion}
        onIrARecuperacion={() => setVistaAcceso('recuperacion')}
      />
    )
  }

  if (codigoRecuperacion) {
    return (
      <ConfirmacionCodigoRecuperacion
        codigo={codigoRecuperacion}
        archivo={archivoRecuperacion}
        textoBoton="Ya guardé mis datos, continuar al sistema"
        onContinuar={() => {
          setUsuarioSesion({ ...usuarioSesion, primerInicio: false })
          setCodigoRecuperacion(null)
          setArchivoRecuperacion(null)
        }}
      />
    )
  }

  if (usuarioSesion.primerInicio) {
    return (
      <FormularioCambioPassword
        usuarioId={usuarioSesion.id}
        onCambioExitoso={(codigo, archivo) => {
          setCodigoRecuperacion(codigo)
          setArchivoRecuperacion(archivo ?? null)
        }}
      />
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <p>Bienvenido, sesión iniciada correctamente. (rol: {usuarioSesion.rolNombre})</p>
      {usuarioSesion.rolNombre === 'administrador' && (
        <PanelUsuariosBloqueados usuarioAdminId={usuarioSesion.id} />
      )}
    </div>
  )
}

function FormularioSetupInicial(): ReactElement {
  const [primerNombre, setPrimerNombre] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  const manejarEnvio = async (evento: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    evento.preventDefault()
    setEnviando(true)

    await window.api.crearPrimerAdmin({
      primerNombre,
      apellidoPaterno,
      apellidoMaterno,
      usuario,
      password
    })

    window.location.reload()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '360px' }}>
      <h1>Configuración inicial</h1>
      <p>Crea la cuenta del primer administrador del sistema.</p>

      <form onSubmit={manejarEnvio}>
        <div>
          <label>Primer nombre</label>
          <input value={primerNombre} onChange={(e) => setPrimerNombre(e.target.value)} required />
        </div>
        <div>
          <label>Apellido paterno</label>
          <input
            value={apellidoPaterno}
            onChange={(e) => setApellidoPaterno(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Apellido materno</label>
          <input
            value={apellidoMaterno}
            onChange={(e) => setApellidoMaterno(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Usuario</label>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        </div>
        <div>
          <label>Contraseña temporal</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Creando...' : 'Crear administrador'}
        </button>
      </form>
    </div>
  )
}

interface FormularioLoginProps {
  onLoginExitoso: (usuario: UsuarioSesion) => void
  onIrARecuperacion: () => void
}

function FormularioLogin({
  onLoginExitoso,
  onIrARecuperacion
}: FormularioLoginProps): ReactElement {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [intentosFallidos, setIntentosFallidos] = useState(0)

  const manejarEnvio = async (evento: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.api.iniciarSesion(usuario, password)

    if (!resultado.exito || !resultado.usuario) {
      setError(resultado.mensaje ?? 'No se pudo iniciar sesión')
      setIntentosFallidos((previo) => previo + 1)
      setEnviando(false)
      return
    }

    onLoginExitoso(resultado.usuario)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '360px' }}>
      <h1>Iniciar sesión</h1>

      <form onSubmit={manejarEnvio}>
        <div>
          <label>Usuario</label>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        </div>
        <div>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <button
          type="button"
          onClick={onIrARecuperacion}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: intentosFallidos >= 2 ? 'red' : '#555',
            fontWeight: intentosFallidos >= 2 ? 'bold' : 'normal',
            textDecoration: 'underline'
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </div>
  )
}

// Valida la nueva contraseña antes de enviarla al backend.
// Devuelve un mensaje de error, o null si todo está correcto.
function validarNuevaPassword(password: string, confirmacion: string): string | null {
  if (password !== password.trim()) {
    return 'La contraseña no debe empezar ni terminar con espacios'
  }

  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres'
  }

  if (password !== confirmacion) {
    return 'Las contraseñas no coinciden'
  }

  return null
}

interface FormularioCambioPasswordProps {
  usuarioId: number
  onCambioExitoso: (codigoRecuperacion: string, archivoRecuperacion?: string) => void
}

function FormularioCambioPassword({
  usuarioId,
  onCambioExitoso
}: FormularioCambioPasswordProps): ReactElement {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const manejarEnvio = async (evento: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    evento.preventDefault()
    setError('')

    const errorValidacion = validarNuevaPassword(password, confirmacion)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setEnviando(true)
    const resultado = await window.api.cambiarPasswordPrimerInicio(usuarioId, password)

    if (!resultado.exito || !resultado.codigoRecuperacion) {
      setError(resultado.mensaje ?? 'No se pudo cambiar la contraseña')
      setEnviando(false)
      return
    }

    onCambioExitoso(resultado.codigoRecuperacion, resultado.archivoRecuperacion)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '360px' }}>
      <h1>Cambio de contraseña obligatorio</h1>
      <p>Este es tu primer inicio de sesión. Debes definir una nueva contraseña.</p>

      <form onSubmit={manejarEnvio}>
        <div>
          <label>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  )
}

// Convierte lo que el usuario escribe en el formato XXXX-XXXX-XXXX automaticamente:
// mayusculas, sin caracteres invalidos, con guiones insertados cada 4 caracteres.
function formatearCodigoRecuperacion(valorCrudo: string): string {
  const soloAlfanumerico = valorCrudo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const limitado = soloAlfanumerico.slice(0, 12)

  const grupos = limitado.match(/.{1,4}/g) ?? []
  return grupos.join('-')
}

interface FormularioRecuperacionProps {
  onVolverALogin: () => void
}

function FormularioRecuperacion({ onVolverALogin }: FormularioRecuperacionProps): ReactElement {
  const [paso, setPaso] = useState<'inicio' | 'password' | 'confirmacion'>('inicio')
  const [metodo, setMetodo] = useState<'codigo' | 'archivo'>('codigo')
  const [usuario, setUsuario] = useState('')
  const [codigo, setCodigo] = useState('')
  const [usuarioIdVerificado, setUsuarioIdVerificado] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [codigoNuevo, setCodigoNuevo] = useState<string | null>(null)
  const [archivoNuevo, setArchivoNuevo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const manejarVerificarCodigo = async (evento: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    evento.preventDefault()
    setError('')
    setEnviando(true)

    const resultado = await window.api.verificarCodigoRecuperacion(usuario, codigo)

    if (!resultado.exito || !resultado.usuarioId) {
      setError(resultado.mensaje ?? 'No se pudo verificar el código')
      setEnviando(false)
      return
    }

    setUsuarioIdVerificado(resultado.usuarioId)
    setPaso('password')
    setEnviando(false)
  }

  const manejarSeleccionarArchivo = async (): Promise<void> => {
    if (!usuario.trim()) {
      setError('Primero escribe tu usuario')
      return
    }

    setError('')
    const contenido = await window.api.leerArchivoRecuperacion()

    if (contenido === null) {
      // El usuario cerro el selector de archivos sin elegir nada
      return
    }

    setEnviando(true)
    const resultado = await window.api.verificarArchivoRecuperacion(usuario, contenido)

    if (!resultado.exito || !resultado.usuarioId) {
      setError(resultado.mensaje ?? 'No se pudo verificar el archivo')
      setEnviando(false)
      return
    }

    setUsuarioIdVerificado(resultado.usuarioId)
    setPaso('password')
    setEnviando(false)
  }

  const manejarNuevaPassword = async (evento: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    evento.preventDefault()
    setError('')

    const errorValidacion = validarNuevaPassword(password, confirmacion)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    if (usuarioIdVerificado === null) {
      setError('Ocurrió un problema, vuelve a verificar tus datos')
      setPaso('inicio')
      return
    }

    setEnviando(true)

    const resultado =
      metodo === 'codigo'
        ? await window.api.restablecerPasswordConCodigo(usuarioIdVerificado, password)
        : await window.api.restablecerPasswordConArchivo(usuarioIdVerificado, password)

    if (!resultado.exito || !resultado.codigoRecuperacion) {
      setError(resultado.mensaje ?? 'No se pudo restablecer la contraseña')
      setEnviando(false)
      return
    }

    setCodigoNuevo(resultado.codigoRecuperacion)
    setArchivoNuevo(resultado.archivoRecuperacion ?? null)
    setPaso('confirmacion')
  }

  if (paso === 'confirmacion' && codigoNuevo) {
    return (
      <ConfirmacionCodigoRecuperacion
        codigo={codigoNuevo}
        archivo={archivoNuevo}
        textoBoton="Ya guardé mis datos, ir al inicio de sesión"
        onContinuar={onVolverALogin}
      />
    )
  }

  if (paso === 'password') {
    return (
      <div style={{ padding: '2rem', maxWidth: '360px' }}>
        <h1>Nueva contraseña</h1>
        <p>Verificación exitosa. Define tu nueva contraseña.</p>

        <form onSubmit={manejarNuevaPassword}>
          <div>
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '360px' }}>
      <h1>Recuperar acceso</h1>

      {metodo === 'codigo' && (
        <>
          <p>Ingresa tu usuario y tu código de recuperación.</p>

          <form onSubmit={manejarVerificarCodigo}>
            <div>
              <label>Usuario</label>
              <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
            </div>
            <div>
              <label>Código de recuperación</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(formatearCodigoRecuperacion(e.target.value))}
                placeholder="XXXX-XXXX-XXXX"
                maxLength={14}
                required
              />
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>

          <p style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setMetodo('archivo')
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#555',
                textDecoration: 'underline'
              }}
            >
              ¿Tienes tu archivo de recuperación en vez del código?
            </button>
          </p>
        </>
      )}

      {metodo === 'archivo' && (
        <>
          <p>Ingresa tu usuario y selecciona tu archivo de recuperación.</p>

          <div>
            <label>Usuario</label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button type="button" onClick={manejarSeleccionarArchivo} disabled={enviando}>
            {enviando ? 'Verificando...' : 'Seleccionar archivo de recuperación'}
          </button>

          <p style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setMetodo('codigo')
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#555',
                textDecoration: 'underline'
              }}
            >
              Usar mi código de recuperación en su lugar
            </button>
          </p>
        </>
      )}

      <p style={{ marginTop: '1rem' }}>
        <button
          type="button"
          onClick={onVolverALogin}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#555',
            textDecoration: 'underline'
          }}
        >
          Volver a iniciar sesión
        </button>
      </p>
    </div>
  )
}

interface ConfirmacionCodigoRecuperacionProps {
  codigo: string
  archivo?: string | null
  textoBoton: string
  onContinuar: () => void
}

function ConfirmacionCodigoRecuperacion({
  codigo,
  archivo,
  textoBoton,
  onContinuar
}: ConfirmacionCodigoRecuperacionProps): ReactElement {
  const [copiado, setCopiado] = useState(false)
  const [archivoGuardado, setArchivoGuardado] = useState(false)

  const manejarCopiar = async (): Promise<void> => {
    await navigator.clipboard.writeText(codigo)
    setCopiado(true)
  }

  const manejarDescargarArchivo = async (): Promise<void> => {
    if (!archivo) return
    const guardado = await window.api.guardarArchivoRecuperacion(archivo)
    if (guardado) {
      setArchivoGuardado(true)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '420px' }}>
      <h1>Guarda tu código de recuperación</h1>
      <p>
        Este código es la única forma de recuperar tu cuenta si olvidas tu contraseña. Se muestra
        una sola vez: anótalo o cópialo ahora antes de continuar.
      </p>

      <p
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          padding: '1rem',
          border: '1px solid #999',
          textAlign: 'center'
        }}
      >
        {codigo}
      </p>

      <button type="button" onClick={manejarCopiar}>
        {copiado ? 'Copiado' : 'Copiar código'}
      </button>

      {archivo && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ccc' }}>
          <p>
            Además, descarga tu archivo de recuperación como respaldo adicional. Guárdalo en un
            lugar seguro, de preferencia fuera de esta computadora (USB, otra PC). Solo lo
            necesitarás si pierdes tu contraseña y tu código de recuperación al mismo tiempo.
          </p>
          <button type="button" onClick={manejarDescargarArchivo}>
            {archivoGuardado ? 'Archivo descargado' : 'Descargar archivo de recuperación'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <button type="button" onClick={onContinuar}>
          {textoBoton}
        </button>
      </div>
    </div>
  )
}

interface UsuarioBloqueadoVista {
  id: number
  usuario: string
  primerNombre: string
  apellidoPaterno: string
  intentosFallidos: number
}

interface PanelUsuariosBloqueadosProps {
  usuarioAdminId: number
}

function PanelUsuariosBloqueados({ usuarioAdminId }: PanelUsuariosBloqueadosProps): ReactElement {
  const [expandido, setExpandido] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioBloqueadoVista[]>([])
  const [desbloqueandoId, setDesbloqueandoId] = useState<number | null>(null)

  const cargarUsuarios = async (): Promise<void> => {
    setCargando(true)
    const lista = await window.api.listarUsuariosBloqueados()
    setUsuarios(lista)
    setCargando(false)
  }

  const alternarPanel = async (): Promise<void> => {
    const nuevoEstado = !expandido
    setExpandido(nuevoEstado)
    if (nuevoEstado) {
      await cargarUsuarios()
    }
  }

  const manejarDesbloqueo = async (usuarioObjetivoId: number): Promise<void> => {
    setDesbloqueandoId(usuarioObjetivoId)
    await window.api.desbloquearUsuario(usuarioAdminId, usuarioObjetivoId)
    await cargarUsuarios()
    setDesbloqueandoId(null)
  }

  return (
    <div style={{ marginTop: '2rem', maxWidth: '480px' }}>
      <button type="button" onClick={alternarPanel}>
        {expandido ? 'Ocultar usuarios bloqueados' : 'Ver usuarios bloqueados'}
      </button>

      {expandido && (
        <div style={{ marginTop: '1rem', border: '1px solid #999', padding: '1rem' }}>
          {cargando && <p>Cargando...</p>}

          {!cargando && usuarios.length === 0 && <p>No hay usuarios bloqueados por ahora.</p>}

          {!cargando &&
            usuarios.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #ddd'
                }}
              >
                <span>
                  {u.primerNombre} {u.apellidoPaterno} ({u.usuario}) — {u.intentosFallidos} intentos
                  fallidos
                </span>
                <button
                  type="button"
                  onClick={() => manejarDesbloqueo(u.id)}
                  disabled={desbloqueandoId === u.id}
                >
                  {desbloqueandoId === u.id ? 'Desbloqueando...' : 'Desbloquear'}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default App
