import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';
import { GameLogic } from './GameLogic.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    if (waitingPlayer) {
        const player1 = waitingPlayer;
        const player2 = socket;

        const room = `room_${player1.id}_${player2.id}`;
        player1.join(room);
        player2.join(room);

        waitingPlayer = null;

        const ludoGame = new GameLogic();

        // Assign players and start the game
        io.to(player1.id).emit('gameStart', { player: 'P1', room, initialState: ludoGame.currentPositions });
        io.to(player2.id).emit('gameStart', { player: 'P2', room, initialState: ludoGame.currentPositions });

        io.to(room).emit('turnChange', { turn: ludoGame.turn });

        // Handle dice rolls
        player1.on('diceRoll', () => handleDiceRoll(player1, 'P1', ludoGame, room));
        player2.on('diceRoll', () => handleDiceRoll(player2, 'P2', ludoGame, room));

        // Handle piece movements
        player1.on('pieceMove', ({ piece }) => handlePieceMove(player1, 'P1', piece, ludoGame, room));
        player2.on('pieceMove', ({ piece }) => handlePieceMove(player2, 'P2', piece, ludoGame, room));

        // Handle disconnects
        player1.on('disconnect', () => handleDisconnect(player2, room));
        player2.on('disconnect', () => handleDisconnect(player1, room));

    } else {
        waitingPlayer = socket;
        waitingPlayer.emit('waiting');
    }

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
    });
});

function handleDiceRoll(socket, player, ludoGame, room) {
    if (ludoGame.turn !== (player === 'P1' ? 0 : 1)) {
        return; // Not their turn
    }

    // Pity mechanic: If a player hasn't rolled a 6 in 15 turns, force a 6.
    if (ludoGame.pityCounter[player] >= ludoGame.PITY_LIMIT) {
        ludoGame.diceValue = 6;
    } else {
        ludoGame.diceValue = randomInt(1, 7);
    }

    // Update pity counter
    ludoGame.pityCounter[player] = ludoGame.diceValue === 6 ? 0 : ludoGame.pityCounter[player] + 1;
    console.log(`Player ${player} pity counter: ${ludoGame.pityCounter[player]}`);

    ludoGame.state = 'DICE_ROLLED';

    const eligiblePieces = ludoGame.getEligiblePieces(player);

    io.to(room).emit('diceRolled', { diceValue: ludoGame.diceValue, eligiblePieces, player });

    if (eligiblePieces.length === 0) {
        ludoGame.incrementTurn();
        io.to(room).emit('turnChange', { turn: ludoGame.turn });
    }
}

async function handlePieceMove(socket, player, piece, ludoGame, room) {
    if (ludoGame.turn !== (player === 'P1' ? 0 : 1)) {
        return; // Not their turn
    }

    const moveInfo = ludoGame.movePiece(player, piece, ludoGame.diceValue);

    // If a 6 was rolled but no move was possible (e.g., piece at start is blocked)
    if (ludoGame.diceValue === 6 && moveInfo.path.length === 0) {
        ludoGame.incrementTurn();
        io.to(room).emit('turnChange', { turn: ludoGame.turn });
        return;
    }

    io.to(room).emit('pieceMoved', { ...moveInfo, piece });

    if (moveInfo.killInfo || ludoGame.diceValue === 6) {
        // Same player's turn again
        ludoGame.state = 'DICE_NOT_ROLLED';
        io.to(room).emit('turnChange', { turn: ludoGame.turn });
    } else {
        ludoGame.incrementTurn();
        io.to(room).emit('turnChange', { turn: ludoGame.turn });
    }

    if (ludoGame.hasPlayerWon(player)) {
        io.to(room).emit('playerWon', { player });
    }
}

function handleDisconnect(remainingPlayer, room) {
    io.to(room).emit('opponentDisconnect');
    remainingPlayer.leave(room);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});