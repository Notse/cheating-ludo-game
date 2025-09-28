import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

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
        UI.setDiceValue(diceValue);
        ludo.diceValue = diceValue;
        if (activePlayer === player && eligiblePieces.length > 0) {
            ludo.state = 'DICE_ROLLED';
            UI.highlightPieces(player, eligiblePieces);
        }
    }
});

socket.on('pieceMoved', (moveInfo) => {
    if (ludo) {
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