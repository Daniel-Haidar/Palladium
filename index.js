const { exec } = require('child_process');
// ipcRenderer and path are imported in config.js

//intro, removed after all software are loaded (in loadSoftware() function)
const intro = document.getElementById('intro-screen');

let cachedSoftware = [];
let currentScreen = 1;
  

const bar = document.getElementById('top-bar');
const screen1 = document.getElementById('screen1');
const screen2 = document.getElementById('screen2');
const contentDiv = document.getElementById('content');

function showScreen(screenNumber) {

    if (screenNumber === 1) {
        screen2.style.display = 'none';
        screen2.style.opacity = '0';
    } else if (screenNumber === 2) {
        screen1.style.display = 'none';
        screen1.style.opacity = '0';
    }

    const activeScreen = document.getElementById(`screen${screenNumber}`);
    activeScreen.style.display = 'flex';
    setTimeout(() => {
        activeScreen.style.opacity = '1';
    }, 10);
}

function nextScreen(screenNumber, pageChoice) {
    if (screenNumber === 2) {
        const softwareScreen = document.getElementById('software-options');
        softwareScreen.innerHTML = '';

        const softwareData = cachedSoftware.find(software => software.id === pageChoice);
        if (softwareData) {
            softwareScreen.style.backgroundImage = `url('${softwareData.background.replace(/[\\']/g, m => m === '\\' ? '/' : "\\'")}')`;

                if(softwareData.isSteam == 0){
                    createButton(softwareScreen, "Launch", () => {
                        const shortcutPath = softwareData.shortcut;
                        const shortcutFullPath = path.join(__dirname, shortcutPath);
                        runShortcut(shortcutFullPath);
                    });
                } else {
                    if(document.getElementById('steam-path').value == '') {
                        toast('Steam Location not set', 'red');
                    }
                    createButton(softwareScreen, "Launch", () => {
                        launchSteamApp(document.getElementById('steam-path').value, softwareData.steamAppID)
                    });
                }

            if (softwareData.backup) {
                createButton(softwareScreen, "Backup", () => runShortcut(softwareData.backup), "./assets/saveIcon.svg");
            }
        }
    } else if (screenNumber === 3) {
        ipcRenderer.send('crud-screen', 'forward');
    }
    currentScreen = screenNumber;
    showScreen(currentScreen);
}

function createButton(parent, text, onClick, iconSrc) {
    const button = document.createElement('div');
    button.className = "softwareButton";
    button.innerHTML = text;
    button.onclick = onClick;

    // when creating the backup button, add a save icon
    if (iconSrc) {
        const icon = document.createElement('img');
        icon.src = iconSrc;
        button.appendChild(icon);
    }

    parent.appendChild(button);
}

function prevScreen() {;
    currentScreen--;
    showScreen(currentScreen);
}

// Initialize the first screen
showScreen(currentScreen);

window.nextScreen = nextScreen;
window.prevScreen = prevScreen;

// Load software once and cache the results
loadSoftware();

async function loadSoftware() {
    const software = await ipcRenderer.invoke('get-software');

    // sort by name, and cache the array for later use
    cachedSoftware = software
    // .sort((a, b) => 
    //     a.name.localeCompare(b.name)
    // );;
    const contentDiv = document.getElementById('content');
    const fragment = document.createDocumentFragment();
    
    cachedSoftware.forEach(row => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.onclick = () => nextScreen(2, row.id); 
        
        const softwareImage = document.createElement('img');
        softwareImage.className = 'image';
        softwareImage.src = row.poster;

        cardDiv.appendChild(softwareImage);

        const title = document.createElement('div');
        title.className = 'title';
        title.classList.add('hidden');
        title.textContent = row.name;
        cardDiv.appendChild(title);
        
        fragment.appendChild(cardDiv); 
    });

    contentDiv.prepend(fragment); // the "Add App" card should be last, so prepend the list

    intro.style.opacity = '0';
    setTimeout(() => {
        intro.style.display = 'none';
    }, 2000);

    // this flag is in config.js
    if(document.getElementById('show-title').checked){
        enableTitles();
    } 
}

function runShortcut(shortcutPath) {
    exec(`start "" "${shortcutPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing shortcut: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
    });
}

// Title toggle that is called from config.js, part of user options
function enableTitles() {
    const titleDivs = document.querySelectorAll('div.title');
    titleDivs.forEach(div => {
        div.classList.remove('hidden');
    });
}

function disableTitles() {
    const titleDivs = document.querySelectorAll('div.title');
    titleDivs.forEach(cardTitle => {
        cardTitle.classList.add('hidden');
    });
}

// Steam app launch functions
function isSteamRunning() {
    return new Promise((resolve, reject) => {
        exec(`tasklist`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const isRunning = stdout.toLowerCase().includes('steam.exe'.toLowerCase());
            resolve(isRunning);
        });
    });
}
  
  // Wait for Steam to start
async function waitForSteam() {
    let i=1;
    while (!(await isSteamRunning())) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        i++;
    }
}
  
async function launchSteamApp(steamPath, appID){
    await exec(`start "" "${steamPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing shortcut: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
    });

    await waitForSteam();

    await exec(`start "" "steam://rungameid/${appID}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing shortcut: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
    });
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