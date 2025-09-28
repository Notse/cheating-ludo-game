import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS } from './ludo/constants.js';

export class GameLogic {
    currentPositions = {
        P1: [],
        P2: []
    };

    pityCounter = {
        P1: 0,
        P2: 0
    };
    PITY_LIMIT = 15;

    diceValue;
    turn;
    state;

    constructor() {
        this.reset();
    }

    reset() {
        this.currentPositions = structuredClone(BASE_POSITIONS);
        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
        this.pityCounter.P1 = 0;
        this.pityCounter.P2 = 0;
    }

    incrementTurn() {
        this.turn = this.turn === 0 ? 1 : 0;
        this.state = STATE.DICE_NOT_ROLLED;
    }

    getEligiblePieces(player) {
        return [0, 1, 2, 3].filter(piece => {
            const currentPosition = this.currentPositions[player][piece];

            if (currentPosition === HOME_POSITIONS[player]) {
                return false;
            }

            if (
                BASE_POSITIONS[player].includes(currentPosition)
                && this.diceValue !== 6
            ) {
                return false;
            }

            if (
                HOME_ENTRANCE[player].includes(currentPosition)
                && this.diceValue > HOME_POSITIONS[player] - currentPosition
            ) {
                return false;
            }

            return true;
        });
    }

    movePiece(player, piece, moveBy) {
        const currentPosition = this.currentPositions[player][piece];

        if (BASE_POSITIONS[player].includes(currentPosition) && this.diceValue === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            return { path: [START_POSITIONS[player]], killInfo: null };
        }

        const path = [];
        let newPosition = currentPosition;
        for (let i = 0; i < moveBy; i++) {
            newPosition = this.getIncrementedPosition(player, newPosition);
            path.push(newPosition);
        }

        this.setPiecePosition(player, piece, newPosition);
        const killInfo = this.checkForKill(player, piece);

        return { path, killInfo };
    }

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        const opponent = player === 'P1' ? 'P2' : 'P1';
        let killInfo = null;

        [0, 1, 2, 3].forEach(p => {
            const opponentPosition = this.currentPositions[opponent][p];

            if (currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                this.setPiecePosition(opponent, p, BASE_POSITIONS[opponent][p]);
                killInfo = {
                    player: opponent,
                    piece: p,
                    newPosition: BASE_POSITIONS[opponent][p]
                };
            }
        });

        return killInfo;
    }

    hasPlayerWon(player) {
        return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player]);
    }

    getIncrementedPosition(player, currentPosition) {
        if (currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        }
        else if (currentPosition === 51) {
            return 0;
        }
        return currentPosition + 1;
    }
}