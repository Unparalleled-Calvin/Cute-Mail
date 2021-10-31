var electron = require('electron');
var app = electron.app;

// const { app } = require('electron')
var win = null;

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (win) {
            win.focus();
        }
    })
    var BrowserWindow = electron.BrowserWindow;
    var Menu = electron.Menu;

    app.on('ready', function () {
        let rootPath = app.getAppPath() + "\\";
        Menu.setApplicationMenu(null);
        win = new BrowserWindow({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
            width: 1000,
            height: 600,
        });

        //打开控制台
        // win.webContents.openDevTools({
        //     mode: "bottom"
        // });

        win.loadFile('index.html');
        win.on('closed', function () {
            win = null;
        });

        let { ipcMain } = require('electron')
        ipcMain.on('resize', (event, e) => {
            win.setSize(e.width, e.height + 70)
        });
        ipcMain.on('close', (event) => {
            win = null;
            app.exit();
        });
    });
    app.on('window-all-closed', function () {
        app.quit();
    });
}