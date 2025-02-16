const { exec } = require('child_process');
const { ipcRenderer } = require('electron');
const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('./db/games.db'); 

//intro, removed after games are loaded (in loadGames() function)
const intro = document.getElementById('intro-screen');

let cachedGames = [];
let currentScreen = 1; 
let profile = '';  

document.addEventListener("DOMContentLoaded", function() {
    
    const screen2 = document.getElementById('screen2');
	const screen3 = document.getElementById('screen3');
    const contentDiv = document.getElementById('content');

    function showScreen(screenNumber) {

        if (screenNumber === 1) {
            screen2.classList.add('blur');
            screen2.style.display = 'flex';
            screen2.style.opacity = '1';
			screen3.style.display = 'none';
            screen3.style.opacity = '0';
        } else if (screenNumber === 2) {
			screen1.style.display = 'none';
            screen1.style.opacity = '0';
			screen3.style.display = 'none';
            screen3.style.opacity = '0';
            screen2.classList.remove('blur');
        }
		if (screenNumber === 3) {
			screen2.style.display = 'none';
            screen2.style.opacity = '0';
        }

        const activeScreen = document.getElementById(`screen${screenNumber}`);
        activeScreen.style.display = 'flex';
        setTimeout(() => {
            activeScreen.style.opacity = '1';
        }, 10);
    }

    function nextScreen(screenNumber, pageChoice) {
        if (screenNumber === 3) {
            const gameScreen = document.getElementById('game-options');
            gameScreen.innerHTML = '';

            const gameData = cachedGames.find(game => game.game === pageChoice);
            if (gameData) {
                const index = gameData.background.indexOf("images");
                if (index !== -1) {
                    const result = gameData.background.substring(index);
                    gameScreen.style.backgroundImage = `url('${result}')`;
                } else {
                    console.log("The specified directory 'images' was not found in the path.");
                }

                createButton(gameScreen, "Play", () => {
                    runShortcut(profile === 'dancchi' ? gameData.dancchi : gameData.niballs);
                });

                if (gameData.backup !== 'NA') {
                    createButton(gameScreen, "Backup", () => runShortcut(gameData.backup), "assets/saveIcon.svg");
                }

                // Satisfactory tools
                if (gameData.game === 'Satisfactory') {
                    createButton(gameScreen, "Tools", () => {
                        ipcRenderer.send('open-link', 'https://www.satisfactorytools.com/1.0/production');
                    });
                }
            }
        } else if (screenNumber === 2) {
            profile = pageChoice; 
        }
        currentScreen = screenNumber;
        showScreen(currentScreen);
    }

    function createButton(parent, text, onClick, iconSrc) {
        const button = document.createElement('div');
        button.className = "gameButton";
        button.innerHTML = text;
        button.onclick = onClick;

        if (iconSrc) {
            const icon = document.createElement('img');
            icon.src = iconSrc;
            button.appendChild(icon);
        }

        parent.appendChild(button);
    }

    function prevScreen(screenNumber) {
        currentScreen = screenNumber;
        showScreen(currentScreen);
    }

    // Initialize the first screen
    showScreen(currentScreen);

    // Expose the functions to the global scope
    window.nextScreen = nextScreen;
    window.prevScreen = prevScreen;

    // Load games once and cache the results
    loadGames();
});

function loadGames() {
    db.all('SELECT * FROM games ORDER BY game ASC', [], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        cachedGames = rows; // Cache the results
        const contentDiv = document.getElementById('content');
        const fragment = document.createDocumentFragment(); // Create a DocumentFragment

        rows.forEach(row => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.onclick = () => nextScreen(3, row.game); 
            
            const gameImage = document.createElement('img');
            gameImage.className = 'image';
            const index = row.poster.indexOf("images");

            if (index !== -1) {
                const result = row.poster.substring(index);
                gameImage.src = result; 
            } else {
                console.log("The specified directory 'images' was not found in the path.");
            }

            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = row.game;

            cardDiv.appendChild(gameImage);
            cardDiv.appendChild(title);
            fragment.appendChild(cardDiv); 
        });

        for(let i=0 ; i<10 ; i++) {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add("card");
            cardDiv.classList.add("hidden");
            fragment.appendChild(cardDiv);
        }

        contentDiv.appendChild(fragment);
    });

    
    setTimeout(() => {
        intro.style.opacity = '0';
    }, 1000);

    setTimeout(() => {
        intro.style.display = 'none';
    }, 3000);
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

