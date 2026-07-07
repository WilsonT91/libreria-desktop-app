const { app, BrowserWindow } = require('electron');

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1000,
    height: 700,
  });

  ventana.loadFile('index.html');
}

app.whenReady().then(() => {
  crearVentana();
});
