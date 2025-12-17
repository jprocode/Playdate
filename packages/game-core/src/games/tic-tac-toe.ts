// Tic-Tac-Toe Game Implementation

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export type CellValue = 'X' | 'O' | null;
export type TicTacToeBoard = [
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue
];

export interface TicTacToeState extends GameState {
  gameKey: 'tic-tac-toe';
  board: TicTacToeBoard;
  moves: number;
}

export interface TicTacToeAction {
  type: 'place';
  position: number; // 0-8
}

export interface TicTacToeView {
  board: TicTacToeBoard;
  mySymbol: 'X' | 'O';
  isMyTurn: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
}

// Win patterns (indices)
const WIN_PATTERNS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6], // Anti-diagonal
];

function checkWinner(board: TicTacToeBoard): CellValue {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board: TicTacToeBoard): boolean {
  return board.every(cell => cell !== null);
}

// Game implementation
export const ticTacToeGame: Game<TicTacToeState, TicTacToeAction, TicTacToeView> = {
  init(_seed?: string): TicTacToeState {
    return {
      gameKey: 'tic-tac-toe',
      status: 'playing',
      currentTurn: 'host', // Host is X and goes first
      serverSeq: 0,
      board: [null, null, null, null, null, null, null, null, null],
      moves: 0,
    };
  },

  validateAction(
    state: TicTacToeState,
    role: 'host' | 'peer',
    action: TicTacToeAction
  ): ValidationResult {
    // Check if game is still playing
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    // Check if it's the player's turn
    if (state.currentTurn !== role) {
      return { valid: false, error: 'Not your turn' };
    }

    // Validate action type
    if (action.type !== 'place') {
      return { valid: false, error: 'Invalid action type' };
    }

    // Validate position
    if (action.position < 0 || action.position > 8) {
      return { valid: false, error: 'Invalid position' };
    }

    // Check if cell is empty
    if (state.board[action.position] !== null) {
      return { valid: false, error: 'Cell is already occupied' };
    }

    return { valid: true };
  },

  applyAction(
    state: TicTacToeState,
    role: 'host' | 'peer',
    action: TicTacToeAction
  ): TicTacToeState {
    const symbol: CellValue = role === 'host' ? 'X' : 'O';
    const newBoard = [...state.board] as TicTacToeBoard;
    newBoard[action.position] = symbol;

    const winner = checkWinner(newBoard);
    const isDraw = !winner && isBoardFull(newBoard);

    return {
      ...state,
      board: newBoard,
      moves: state.moves + 1,
      currentTurn: role === 'host' ? 'peer' : 'host',
      status: winner || isDraw ? 'finished' : 'playing',
      serverSeq: state.serverSeq + 1,
    };
  },

  getView(state: TicTacToeState, role: 'host' | 'peer'): TicTacToeView {
    const winner = checkWinner(state.board);
    const isDraw = !winner && isBoardFull(state.board);

    let winnerRole: 'host' | 'peer' | 'draw' | null = null;
    if (winner === 'X') {
      winnerRole = 'host';
    } else if (winner === 'O') {
      winnerRole = 'peer';
    } else if (isDraw) {
      winnerRole = 'draw';
    }

    return {
      board: state.board,
      mySymbol: role === 'host' ? 'X' : 'O',
      isMyTurn: state.currentTurn === role && state.status === 'playing',
      status: state.status,
      winner: winnerRole,
    };
  },

  checkWinCondition(state: TicTacToeState): WinResult | null {
    const winner = checkWinner(state.board);
    if (winner === 'X') {
      return { winner: 'host', reason: 'Three in a row' };
    }
    if (winner === 'O') {
      return { winner: 'peer', reason: 'Three in a row' };
    }
    if (isBoardFull(state.board)) {
      return { winner: 'draw', reason: 'Board is full' };
    }
    return null;
  },
};

export default ticTacToeGame;

