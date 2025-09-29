
import { PLAYERS, STATE } from './constants.js';
import { playMoveSound } from '../main.js';
import { UI } from './UI.js'
import { GameLogic } from '../GameLogic.js';

export class Ludo {
    currentPositions = {
        P1: [],
        P2: []
    }

    socket;
    room;
    player;
    logic;
    _diceValue;
    get diceValue() {
        return this._diceValue;
    }
    set diceValue(value) {
        this._diceValue = value;
    }

    _turn;
    get turn() {
        return this._turn;
    }
    set turn(value) {
        this._turn = value;
        UI.setTurn(value);
    }

    _state;
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;

        if(value === STATE.DICE_NOT_ROLLED) {
            UI.enableDice();
            UI.unhighlightPieces();
        } else {
            UI.disableDice();
        }
    }

    constructor(socket, room, player) {
        console.log('Hello World! Lets play Ludo!');
        this.socket = socket;
        this.room = room;
        this.player = player;
        this.logic = new GameLogic();

        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();

        this.resetGame();
    }

    listenDiceClick() {
        UI.listenDiceClick(this.onDiceClick.bind(this))
    }

    onDiceClick() {
        if (this.state !== STATE.DICE_NOT_ROLLED) return;

        const activePlayer = this.turn === 0 ? 'P1' : 'P2';
        if (this.player !== activePlayer) {
            console.log("Not your turn!");
            return;
        }

        console.log('dice clicked! sending to server...');
        UI.disableDice();
        this.socket.emit('diceRoll');
    }

    listenResetClick() {
        UI.listenResetClick(() => window.location.reload());
    }

    resetGame() {
        console.log('reset game');
        this.logic.reset();
        this.currentPositions = this.logic.currentPositions;

        this.drawPieces();

        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
    }

    drawPieces() {
        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, this.currentPositions[player][piece])
            })
        });
    }

    listenPieceClick() {
        UI.listenPieceClick(this.onPieceClick.bind(this));
    }

    onPieceClick(event) {
        const target = event.target;

        if(!target.classList.contains('player-piece') || !target.classList.contains('highlight')) {
            return;
        }
        console.log('piece clicked')

        const player = target.getAttribute('player-id');
        const piece = parseInt(target.getAttribute('piece'));

        if (player !== this.player) {
            console.log("Not your piece!");
            return;
        }

        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        console.log(player, piece);
        UI.unhighlightPieces();
        this.socket.emit('pieceMove', { player, piece });
    }

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition)
    }

    animatePieceMove({ path, killInfo, piece }) {
        if (!path || path.length === 0) return;

        const player = this.turn === 0 ? 'P1' : 'P2';

        if (piece === undefined) return;

        let pathIndex = 0;
        const interval = setInterval(() => {
            const currentPathPosition = path[pathIndex];
            this.setPiecePosition(player, piece, currentPathPosition);
            playMoveSound(); // Play sound for each step
            this.currentPositions[player][piece] = currentPathPosition; // Update local state
            pathIndex++;
            if (pathIndex >= path.length) {
                clearInterval(interval);
                if (killInfo) {
                    this.setPiecePosition(killInfo.player, killInfo.piece, killInfo.newPosition);
                    this.currentPositions[killInfo.player][killInfo.piece] = killInfo.newPosition;
                }
            }
        }, 200);
    }
}
