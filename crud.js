const { ipcRenderer } = require("electron");
const path = require('path');
const fs = require('fs'); 

function backToHomepage() {
  ipcRenderer.send('crud-screen', 'backward');
}

let selectedId = null;
let backupOption = 0;
let steamOption = 0;

const configPath = path.join(__dirname, 'config.json');
const steam = fs.readFileSync(configPath, 'utf8');

// Helper function, mainly to shorten selected file names to fit
function truncateFilename(str, maxLength = 34) {
  const lastDotIndex = str.lastIndexOf('.');
  let name = str;
  let extension = '';
  
  if (lastDotIndex !== -1) {
      name = str.slice(0, lastDotIndex);
      extension = str.slice(lastDotIndex + 1);
  }

  // Total required characters: 3 dots + 3 name-end chars + "." + extension
  const requiredSpace = 3 + 3 + 1 + extension.length;

  if (str.length <= maxLength) {
      return str; // No truncation needed
  }

  if (maxLength < requiredSpace) {
      // Edge case: Not enough space for the minimal pattern, prioritize extension and last 3 chars
      const minimalPart = `...${name.slice(-3)}.${extension}`;
      return minimalPart.slice(0, maxLength);
  }

  // Calculate how much of the name's start we can keep
  const maxNameStartLength = maxLength - requiredSpace;
  const nameStart = name.slice(0, maxNameStartLength);
  const nameEnd = name.slice(-3); // Last 3 chars of the original name

  return `${nameStart}...${nameEnd}.${extension}`;
}


document.getElementById('browse-shortcut').addEventListener('click', async () => {
  if(document.getElementById('is-steam').checked == true) { return; }
  const { filePaths } = await ipcRenderer.invoke('select-shortcut-file');
  if (filePaths && filePaths[0]) {
    document.getElementById('shortcut').value = filePaths[0];
    document.getElementById('shortcut-text').innerHTML = filePaths[0].split('\\').pop();
  }
});

function enableBackup() {
  const backup = document.getElementById('backup');
  backup.disabled = false;
  backup.parentElement.style.height = '45px';
  document.getElementById('toggle-backup').checked = true;
  backupOption = 1;
}

function disableBackup() {
  const backup = document.getElementById('backup');
  backup.disabled = true;
  backup.value = false
  backup.parentElement.style.height = '0px';
  document.getElementById('toggle-backup').checked = false;
  backupOption = 0;
}

function toggleBackup() {
  if(document.getElementById('toggle-backup').checked == true) {
    enableBackup();
  } else {
    disableBackup();
  }
}

document.getElementById('browse-backup').addEventListener('click', async () => {
  if(document.getElementById('toggle-backup').checked == false) { return; }
  const { filePaths } = await ipcRenderer.invoke('select-shortcut-file');
  if (filePaths && filePaths[0]) {
    document.getElementById('backup').value = filePaths[0];
    document.getElementById('backup-text').innerHTML = filePaths[0].split('\\').pop();
  }
});

document.getElementById('browse-poster').addEventListener('click', async () => {
  const { filePaths } = await ipcRenderer.invoke('select-image-file');
  if (filePaths && filePaths[0]) {
    document.getElementById('poster').value = filePaths[0];
    setPreviewPoster(filePaths[0]);
  }
});

document.getElementById('browse-background').addEventListener('click', async () => {
  const { filePaths } = await ipcRenderer.invoke('select-image-file');
  if (filePaths && filePaths[0]) {
    document.getElementById('background').value = filePaths[0];
    setPreviewBackground(filePaths[0]);
  }
});

function enableSteam() {
  const shortcut = document.getElementById('shortcut');
  const steamAppID = document.getElementById('steam-app-id');
  
  shortcut.disabled = true;
  shortcut.value = '';
  steamAppID.disabled = false;
  document.getElementById('is-steam').checked = true;

  shortcut.parentElement.parentElement.style.height = '0px';
  steamAppID.parentElement.parentElement.style.height = '45px';

  steamOption = 1;
}

function disableSteam() {
  const shortcut = document.getElementById('shortcut');
  const steamAppID = document.getElementById('steam-app-id');

  shortcut.disabled = false;
  steamAppID.disabled = true;
  document.getElementById('is-steam').checked = false;

  steamAppID.value = '';

  shortcut.parentElement.parentElement.style.height = '45px';
  steamAppID.parentElement.parentElement.style.height = '0px';

  steamOption = 0;
}

function isSteam() {
  if (document.getElementById('is-steam').checked == true) {
    enableSteam();
  } else {
    disableSteam();
  }
}

document.getElementById('add-item').addEventListener('click', async () => {
  const software = {
    name: document.getElementById('name').value,
    shortcut: (steamOption==0) ? document.getElementById('shortcut').value : null,
    backup: (backupOption==1) ? document.getElementById('backup').value : null,
    poster: document.getElementById('poster').value,
    background: document.getElementById('background').value,
    isSteam: steamOption,
    steamAppID: (steamOption==1) ? document.getElementById('steam-app-id').value : null
  };
  const id = await ipcRenderer.invoke('add-software', software);
  toast(`Game added with ID: ${id}`, 'green');
  clearForm();
  loadGames();
});

document.getElementById('update-item').addEventListener('click', async () => {
  if (!selectedId) {
    toast('Please select an app to update.', 'white');
    return;
  }
  console.log(document.getElementById('shortcut').value);
  const software = {
    id: selectedId,
    name: document.getElementById('name').value,
    shortcut: (steamOption==0) ? document.getElementById('shortcut').value : null,
    backup: (backupOption==1) ? document.getElementById('backup').value : null,
    poster: document.getElementById('poster').value,
    background: document.getElementById('background').value,
    isSteam: steamOption,
    steamAppID: (steamOption==1) ? document.getElementById('steam-app-id').value : null
  };  
  await ipcRenderer.invoke('update-software', software);
  clearForm();
  toast(`${software.name} updated succesfuly.`, 'blue');
  loadGames();
});

document.getElementById('delete-item').addEventListener('click', async () => {
  if (!selectedId) {
    toast('Please select an app to delete.', 'white');
    return;
  }
  await ipcRenderer.invoke('delete-software', selectedId);
  toast('Game deleted successfully.', 'blue');
  clearForm();
  loadGames();
});

document.getElementById('clearForm').addEventListener('click', () => {
  clearForm();
});

function clearForm() {
  selectedId = null;
  document.getElementById('software-form').reset();
  document.getElementById('id').parentElement.parentElement.height = '0px';
  document.getElementById('id-text').innerHTML = '';
  document.getElementById('shortcut-text').innerHTML = '';
  document.getElementById('backup-text').innerHTML = '';
  document.getElementById('poster-text').innerHTML = '';
  document.getElementById('background-text').innerHTML = '';
  clearPreview();
  disableSteam();
  disableBackup();
}

// message system
async function toast(message, color) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.style.color = color;
  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}

async function loadGames() {
  const software = await ipcRenderer.invoke('get-software');
  const table = document.getElementById('software-data');
  table.innerHTML = "";
  software.forEach(software => {
    const row = document.createElement('div');
    row.className = "row";

    const dataID = document.createElement('div');
    const dataName = document.createElement('div');
    dataID.className = "data";
    dataID.classList.add('id');
    dataName.className = "data";
    dataID.innerHTML = `${software.id}`;
    dataName.innerHTML = `${software.name}`;

    row.appendChild(dataID);
    row.appendChild(dataName);

    row.addEventListener('click', () => {
      selectedId = software.id;
      document.getElementById('id').value = software.id;
      document.getElementById('id').parentElement.parentElement.height = "45px";
      document.getElementById('id-text').innerHTML = software.id;
      document.getElementById('name').value = software.name;

      if(software.backup == null) {
        disableBackup();
      } else {        
        document.getElementById('backup').value = software.backup;
        const backupString = software.backup.split('\\').pop();
        document.getElementById('backup-text').innerHTML = truncateFilename(backupString, 14);
        enableBackup();
      }

      if(software.isSteam === 1) {
        document.getElementById('steam-app-id').value = software.steamAppID;
        enableSteam();
      }
      else {
        document.getElementById('shortcut').value = software.shortcut;
        const shortcutString = software.shortcut.split('\\').pop();
        document.getElementById('shortcut-text').innerHTML = truncateFilename(shortcutString, 20);
        disableSteam();
      }
      
      
      document.getElementById('poster').value = software.poster;
      document.getElementById('background').value = software.background;

      setPreviewPoster(software.poster);
      setPreviewBackground(software.background)
    });
    table.appendChild(row);
  });
}

loadGames();

// preview poster/background functions
function setPreviewPoster(posterPath) {
  const caption = document.getElementById('caption');
  const poster = document.getElementById('poster-preview');
  const posterImage = posterPath.replace(/\\/g, '/');
  const posterString = posterPath.split('\\').pop();

  document.getElementById('poster-text').innerHTML = truncateFilename(posterString, 20);
  caption.innerHTML = 'Preview';
  poster.style.display = 'flex';
  poster.src = posterImage;
}

function setPreviewBackground(backgroundPath) {
  const caption = document.getElementById('caption');
  const background = document.getElementById('background-preview');
  const backgroundImage = backgroundPath.replace(/\\/g, '/');
  console.log(backgroundImage);
  const backgroundString = backgroundPath.split('\\').pop();

  document.getElementById('background-text').innerHTML = truncateFilename(backgroundString, 20);
  caption.innerHTML = 'Preview';  
  background.style.display = 'flex';
  background.src = backgroundImage;
}

function clearPreview() {
  const caption = document.getElementById('caption');
  const poster = document.getElementById('poster-preview');
  const background = document.getElementById('background-preview');

  poster.style.display = 'none';
  background.style.display = 'none';
  caption.innerHTML = '';
  poster.src = '';
  background.src = '';
}