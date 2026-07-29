import { dialog } from 'electron'
import fs from 'fs'

export async function guardarArchivoRecuperacion(contenido: string): Promise<boolean> {
  const resultado = await dialog.showSaveDialog({
    title: 'Guardar archivo de recuperación',
    defaultPath: 'recovery.key',
    filters: [{ name: 'Archivo de recuperación', extensions: ['key'] }]
  })

  if (resultado.canceled || !resultado.filePath) {
    return false
  }

  fs.writeFileSync(resultado.filePath, contenido, 'utf-8')
  return true
}

export async function leerArchivoRecuperacion(): Promise<string | null> {
  const resultado = await dialog.showOpenDialog({
    title: 'Selecciona tu archivo de recuperación',
    properties: ['openFile'],
    filters: [{ name: 'Archivo de recuperación', extensions: ['key'] }]
  })

  if (resultado.canceled || resultado.filePaths.length === 0) {
    return null
  }

  return fs.readFileSync(resultado.filePaths[0], 'utf-8')
}
