const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'libreria.db');
const db = new Database(dbPath);

// Activa el soporte real de claves foraneas (SQLite lo trae desactivado por defecto)
db.pragma('foreign_keys = ON');

db.exec(`
  -- ROLES: catalogo de roles del sistema, gestionable sin tocar codigo
  CREATE TABLE IF NOT EXISTS Roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    estado INTEGER NOT NULL DEFAULT 1
  );

  -- USUARIOS: login, seguridad (bcrypt), y campos del modulo de autenticacion
  CREATE TABLE IF NOT EXISTS Usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primer_nombre TEXT NOT NULL,
    segundo_nombre TEXT,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES Roles(id),
    estado INTEGER NOT NULL DEFAULT 1,
-- Modulo de autenticacion / recuperacion de acceso
    primer_inicio INTEGER NOT NULL DEFAULT 1,
    codigo_recuperacion_hash TEXT,
    archivo_recuperacion_hash TEXT,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
-- Auditoria
    actualizado_por INTEGER REFERENCES Usuarios(id),
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- CATEGORIAS: catalogo de categorias de producto
  CREATE TABLE IF NOT EXISTS Categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    estado INTEGER NOT NULL DEFAULT 1,
    actualizado_por INTEGER REFERENCES Usuarios(id),
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- UNIDADES DE MEDIDA: catalogo compartido (unidad de venta y unidad de compra)
  CREATE TABLE IF NOT EXISTS UnidadesMedida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    estado INTEGER NOT NULL DEFAULT 1,
    actualizado_por INTEGER REFERENCES Usuarios(id),
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- PRODUCTOS: catalogo unificado (reemplaza las tablas separadas de mayor/menor del Excel)
  CREATE TABLE IF NOT EXISTS Productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    codigo_barras TEXT UNIQUE,
    nombre TEXT NOT NULL,
    nombre_busqueda TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    categoria_id INTEGER NOT NULL REFERENCES Categorias(id),
    unidad_medida_id INTEGER NOT NULL REFERENCES UnidadesMedida(id),
    precio_compra REAL NOT NULL DEFAULT 0,
    precio_venta REAL NOT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    estado INTEGER NOT NULL DEFAULT 1,
    actualizado_por INTEGER REFERENCES Usuarios(id),
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- MOVIMIENTOS DE INVENTARIO: reemplaza la hoja HISTORIAL_PRODUCTOS del Excel
  CREATE TABLE IF NOT EXISTS MovimientosInventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES Productos(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad INTEGER NOT NULL,
    unidad_compra_id INTEGER REFERENCES UnidadesMedida(id),
    factor_conversion INTEGER DEFAULT 1,
    precio_compra_lote REAL,
    precio_compra_unitario REAL,
    motivo TEXT,
    usuario_id INTEGER NOT NULL REFERENCES Usuarios(id),
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Datos iniciales: los 3 roles del sistema (estructura tecnica, no dato de negocio)
const insertarRol = db.prepare('INSERT OR IGNORE INTO Roles (nombre, descripcion) VALUES (?, ?)');
insertarRol.run('administrador', 'Acceso total al sistema');
insertarRol.run('supervisor', 'Gestion de productos, precios y reportes');
insertarRol.run('cajero', 'Solo modulo de ventas');

console.log('Base de datos y tablas listas: Roles, Usuarios, Categorias, UnidadesMedida, Productos, MovimientosInventario.');

module.exports = db;