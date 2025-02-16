const { ipcRenderer } = require("electron");
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, 'config.json');

function saveConfig() {
  const config = {
    steamPath: document.getElementById('steam-path').value,
    showTitle: document.getElementById('show-title').checked
  };

  fs.writeFile(configPath, JSON.stringify(config), (err) => {
    if (err) {
      console.error('Error saving config:', err);
      return;
    }
    console.log('Config saved successfully');
  });

  if(document.getElementById('show-title').checked) {
    enableTitles();
  } else {
    disableTitles();
  }
}

// Load configuration function
function loadConfig() {
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      return;
    } else try {
      const config = JSON.parse(data);
      document.getElementById('steam-path').value = config.steamPath || '';
      document.getElementById('show-title').checked = config.showTitle || false;
      const indexScript = document.createElement('script');
      indexScript.src='./index.js';
      document.head.appendChild(indexScript);
    } catch (parseError) {
      console.error('Error parsing config:', parseError);
    }
  });
}
function selectSteamExe() {
  ipcRenderer.send('select-steam-exe');
}

ipcRenderer.on('steam-exe-selected', (event, path) => {
  document.getElementById('steam-path').value = path;
  saveConfig();
});

window.addEventListener('DOMContentLoaded', () => {
  loadConfig();
});


async function openSettingsMenu(){
  const options = document.getElementById('options-screen');
  options.style.display = 'flex';
  setTimeout(() => {
    options.style.opacity = '1';
  }, 100);
}

async function closeSettingsMenu(){
  const options = document.getElementById('options-screen');
  options.style.opacity = '0';
  setTimeout(() => {
    options.style.display = 'none';
  }, 300);
}

