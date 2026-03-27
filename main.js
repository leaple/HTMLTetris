const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 650,
    webPreferences: {
      nodeIntegration: true,   // Renderer에서 Node 기능 사용 가능
      contextIsolation: false  // Renderer에서 document 사용 가능
    }
  });

  win.loadFile('ttr.html');  // HTML 로드
  win.setMenuBarVisibility(false); // 메뉴 숨기기
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});