// main.js
const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');

let win;
let view;

async function setupAdblock() {
  try {
    const blocker = await ElectronBlocker.fromLists(fetch, [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt'
    ]);
    // enable blocking for defaultSession (BrowserView uses defaultSession)
    blocker.enableBlockingInSession(session.defaultSession);
    console.log('Adblock: lists loaded and enabled.');
  } catch (err) {
    console.warn('Adblock init failed:', err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: false, // frameless to implement custom chrome
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');

  // Create BrowserView for web content
  view = new BrowserView({
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      // share defaultSession so adblock applies
    }
  });

  win.setBrowserView(view);

  // initial layout (header height 92)
  const headerH = 92;
  function resizeView() {
    const [w, h] = win.getContentSize();
    view.setBounds({ x: 0, y: headerH, width: w, height: h - headerH });
    view.setAutoResize({ width: true, height: true });
  }
  resizeView();
  win.on('resize', resizeView);

  // start with a home page
  view.webContents.loadURL('https://example.com');

  // forward some events for navigation state
  view.webContents.on('did-start-loading', () => {
    win.webContents.send('nav-event', { type: 'loading' });
  });
  view.webContents.on('did-stop-loading', () => {
    win.webContents.send('nav-event', {
      type: 'loaded',
      url: view.webContents.getURL(),
      canGoBack: view.webContents.canGoBack(),
      canGoForward: view.webContents.canGoForward()
    });
  });

  // navigation IPC handlers
  ipcMain.handle('navigate', (_, url) => {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    view.webContents.loadURL(url);
  });

  ipcMain.handle('go-back', () => view.webContents.canGoBack() && view.webContents.goBack());
  ipcMain.handle('go-forward', () => view.webContents.canGoForward() && view.webContents.goForward());
  ipcMain.handle('reload', () => view.webContents.reload());
  ipcMain.handle('get-url', () => view.webContents.getURL());

  // window controls
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) win.unmaximize(); else win.maximize();
  });
  ipcMain.on('window-close', () => win.close());
}

app.whenReady().then(async () => {
  await setupAdblock();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
