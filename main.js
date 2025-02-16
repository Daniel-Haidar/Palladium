const { dir } = require("console");
const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron/main");
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024, 
    minHeight: 576, 
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false,
    },
  });

  Menu.setApplicationMenu(null);	
  
  win.loadFile("index.html");
  
  // open browser window
  // currently has no implementations, this is to add a button for a specific app
  // example usecase: added satisfactory-tools to satisfactory
  ipcMain.on('open-link', (event, url) => {
    const newWindow = new BrowserWindow({
      width: 1280,
      height: 720,
    });
    newWindow.loadURL(url);
  });

  // load (forward) or unload (backward) the crud page
  ipcMain.on('crud-screen', (event, direction) => {
    if(direction === 'forward') {
      win.loadFile("crud.html");
    } else if(direction === 'backward') {
      win.loadFile("index.html");
    } else {
      console.log('Invalid CRUD screen direction');
    }
  });

};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

const softwareAssetsFolder = path.join(__dirname, '_files');
if (!fs.existsSync(softwareAssetsFolder)) {
  fs.mkdirSync(softwareAssetsFolder);
}
const databaseFolder = path.join(__dirname, 'db');
if (!fs.existsSync(databaseFolder)) {
  fs.mkdirSync(databaseFolder);
}
const configFile = path.join(__dirname, 'config.json');
if (!fs.existsSync(configFile)) {
  const defaultConfig = { steamPath: "", showTitle: false };
  fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2), (writeErr) => {});
}

// SQLite Database Setup
const dbPath = path.join(__dirname, 'db/software.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    db.run(`CREATE TABLE IF NOT EXISTS software (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      shortcut TEXT,
      backup TEXT,
      poster TEXT,
      background TEXT,
      isSteam INTEGER,
      steamAppID TEXT
    )`);
  }
});

// Function to copy files to a new folder
function copyFileToFolder(sourcePath, softwareName, folderName) {
  const softwareFolder = path.join(__dirname, '_files', softwareName, folderName);
  if (!fs.existsSync(softwareFolder)) {
    fs.mkdirSync(softwareFolder, { recursive: true });
  }
  const fileName = path.basename(sourcePath);
  const destinationPath = path.join(softwareFolder, fileName);
  fs.copyFileSync(sourcePath, destinationPath);
  return path.relative(__dirname, destinationPath);
}

// Helper for update file paths
// Copies current files to temp before updating
function getPath(filePath, name, field) {
  if(fs.existsSync(filePath)) {
    fullPath = filePath;
  } else {
    fullPath = path.join(__dirname, filePath);
  }
  const tempPath = copyFileToFolder(fullPath, 'temp', field);
  return copyFileToFolder(path.join(__dirname, tempPath), name, field);
}

// Helper function to delete a directory and its contents
function deleteDirectoryRecursive(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        deleteDirectoryRecursive(filePath); // Recursively delete subdirectories
      } else {
        fs.unlinkSync(filePath); // Delete files
      }
    });
    fs.rmdirSync(directory); // Delete the directory
  }
}

// IPC Handlers
ipcMain.handle('get-software', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM software ORDER BY name Asc', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-software', async (event, software) => {
  return new Promise((resolve, reject) => {
    const { name, shortcut, backup, poster, background, isSteam, steamAppID} = software;

    try {
      // Copy files to new folders and get relative paths
      const shortcutPath = shortcut ? '.\\' + copyFileToFolder(shortcut, name, 'shortcut') : null;
      const backupPath = backup ? '.\\' + copyFileToFolder(backup, name, 'backup') : null;
      const posterPath = '.\\' + copyFileToFolder(poster, name, 'poster');
      const backgroundPath = '.\\' + copyFileToFolder(background, name, 'background');

      db.run(
        'INSERT INTO software (name, shortcut, backup, poster, background, isSteam, steamAppID) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, shortcutPath, backupPath, posterPath, backgroundPath, isSteam, steamAppID],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        } 
      );
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('update-software', async (event, software) => {
  return new Promise((resolve, reject) => {
    const { id, name, shortcut, backup, poster, background, isSteam, steamAppID } = software;

    try {
      // Get the old software data to delete its files
      db.get('SELECT * FROM software WHERE id = ?', [id], (err, oldSoftware) => {
        if (err) return reject(err);

        const shortcutPath = shortcut ? '.\\' + getPath(shortcut, name, 'shortcut') : null;
        const backupPath = backup ? '.\\' + getPath(backup, name, 'backup') : null;
        const posterPath =  '.\\' + getPath(poster, name, 'poster');
        const backgroundPath = '.\\' + getPath(background, name, 'background');

        // delete temp folder
        if (fs.existsSync(path.join(__dirname, '_files', 'temp'))) {
          const tempFolder = path.join(__dirname, '_files', 'temp');
          deleteDirectoryRecursive(tempFolder);
        }

        // check if the name changed, delete the old one if true
        if(oldSoftware.name != name) {
          deleteDirectoryRecursive(path.join(__dirname, '_files', oldSoftware.name));
        }


        // Update the database
        db.run(
          'UPDATE software SET name = ?, shortcut = ?, backup = ?, poster = ?, background = ?, isSteam = ?, steamAppID = ?  WHERE id = ?',
          [name, shortcutPath, backupPath, posterPath, backgroundPath, isSteam, steamAppID, id],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('delete-software', async (event, id) => {
  return new Promise((resolve, reject) => {
    try {
      db.get('SELECT * FROM software WHERE id = ?', [id], (err, software) => {
        if (err) return reject(err);

        if (software) {
          // Delete the software's directory
          const softwareFolder = path.join(__dirname, '_files', software.name);
          deleteDirectoryRecursive(softwareFolder);
        }

        db.run('DELETE FROM software WHERE id = ?', [id], function (err) {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('select-shortcut-file', async () => {
  return dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Shortcuts', extensions: ['lnk'] }
    ],
  });
});

ipcMain.handle('select-image-file', async () => {
  return dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['webp', 'jpg', 'jpeg', 'png', 'gif'] }
    ],
  });
});

// Options control
ipcMain.on('select-steam-exe', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { 
        name: 'steam', 
        extensions: ['exe'],
        custom: (filePath) => path.basename(filePath).toLowerCase() === 'steam.exe'
      }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      event.reply('steam-exe-selected', result.filePaths[0]);
    }
  });
});

