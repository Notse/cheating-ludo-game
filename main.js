import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

// --- START: Audio Code ---

// Get the audio elements and music button from the HTML
const backgroundMusic = document.getElementById('background-music');
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const musicBtn = document.getElementById('music-btn');
const diceAudio = document.getElementById('dice-sound');

let isMusicPlaying = false;

/**
 * Toggles the background music on and off.
 */
function toggleMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicBtn.textContent = 'Music: Off';
    } else {
        backgroundMusic.play().catch(e => console.error("Music play failed:", e));
        musicBtn.textContent = 'Music: On';
    }
    isMusicPlaying = !isMusicPlaying;
}

// Set initial state and add click listener for the music button
musicBtn.addEventListener('click', toggleMusic);

// Set volume for sounds
backgroundMusic.volume = 0.3; // Background music should be quieter

function playMoveSound() {
    moveSound.currentTime = 0; // Rewind to the start
    moveSound.play().catch(e => console.error("Move sound failed:", e));
}

function playDiceSound() {
    diceAudio.currentTime = 0; // Rewind to the start
    diceAudio.play().catch(e => console.error("Dice sound failed:", e));
}

function playCaptureSound() {
    captureSound.currentTime = 0; // Rewind to the start
    captureSound.play().catch(e => console.error("Capture sound failed:", e));
}
// --- END: Audio Code ---

const socket = io();

let ludo;
let player;
let room;

function showWaitingMessage() {
    UI.showWaitingMessage(true);
}

socket.on('waiting', () => {
    showWaitingMessage();
});

socket.on('gameStart', (data) => {
    player = data.player;
    room = data.room;
    ludo = new Ludo(socket, room, player);
    ludo.currentPositions = data.initialState;
    ludo.drawPieces();
    UI.showWaitingMessage(false);
    console.log(`Game started! You are ${player}`);
});

socket.on('turnChange', ({ turn }) => {
    if (ludo) {
        ludo.turn = turn;
        ludo.state = 'DICE_NOT_ROLLED';
        const activePlayer = ludo.turn === 0 ? 'P1' : 'P2';
        if (activePlayer !== player) {
            UI.disableDice();
        } else {
            UI.enableDice();
        }
    }
});

socket.on('diceRolled', ({ diceValue, eligiblePieces, player: activePlayer }) => {
    if (ludo) {
        playDiceSound(); // Play sound for both players immediately
        ludo.diceValue = diceValue; // Update dice value first
        UI.setDiceValue(diceValue);
        if (activePlayer === player && eligiblePieces.length > 0) {
            ludo.state = 'DICE_ROLLED';
            UI.highlightPieces(player, eligiblePieces);
        }
    }
});

socket.on('pieceMoved', (moveInfo) => {
    if (ludo) {
        // The server's moveInfo object should tell us if a piece was captured.
        // We assume the property is named 'capturedPiece'.
        if (moveInfo.capturedPiece) {
            playCaptureSound();
        } else {
            playMoveSound();
        }
        ludo.animatePieceMove(moveInfo);
    }
});

socket.on('playerWon', ({ player: winner }) => {
    alert(`Player ${winner} has won!`);
    ludo.resetGame();
});

socket.on('opponentDisconnect', () => {
    alert('Your opponent has disconnected. The game will reset.');
    window.location.reload();
});