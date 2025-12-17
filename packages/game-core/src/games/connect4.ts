// Connect 4 Game Implementation

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export type Connect4Cell = 'red' | 'yellow' | null;
export type Connect4Board = Connect4Cell[][]; // 6 rows x 7 columns

export interface Connect4State extends GameState {
  gameKey: 'connect-4';
  board: Connect4Board; // board[row][col], row 0 is bottom
  moves: number;
  lastMove: { row: number; col: number } | null;
}

export interface Connect4Action {
  type: 'drop';
  column: number; // 0-6
}

export interface Connect4View {
  board: Connect4Board;
  myColor: 'red' | 'yellow';
  isMyTurn: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  lastMove: { row: number; col: number } | null;
}

const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

// Check for a win starting from a position in a direction
function checkDirection(
  board: Connect4Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  color: Connect4Cell
): boolean {
  let count = 0;
  for (let i = 0; i < WIN_LENGTH; i++) {
    const r = row + i * dRow;
    const c = col + i * dCol;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === color) {
      count++;
    } else {
      break;
    }
  }
  return count >= WIN_LENGTH;
}

function checkWinner(board: Connect4Board): Connect4Cell {
  // Check all positions and directions
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = board[row][col];
      if (!color) continue;

      // Check horizontal, vertical, and both diagonals
      const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal down-right
        [1, -1], // Diagonal down-left
      ];

      for (const [dRow, dCol] of directions) {
        if (checkDirection(board, row, col, dRow, dCol, color)) {
          return color;
        }
      }
    }
  }
  return null;
}

function isBoardFull(board: Connect4Board): boolean {
  return board[ROWS - 1].every(cell => cell !== null);
}

function getLowestEmptyRow(board: Connect4Board, col: number): number {
  for (let row = 0; row < ROWS; row++) {
    if (board[row][col] === null) {
      return row;
    }
  }
  return -1; // Column is full
}

function createEmptyBoard(): Connect4Board {
  return Array.from({ length: ROWS }, () => 
    Array.from({ length: COLS }, () => null)
  );
}

// Game implementation
export const connect4Game: Game<Connect4State, Connect4Action, Connect4View> = {
  init(_seed?: string): Connect4State {
    return {
      gameKey: 'connect-4',
      status: 'playing',
      currentTurn: 'host', // Host is red and goes first
      serverSeq: 0,
      board: createEmptyBoard(),
      moves: 0,
      lastMove: null,
    };
  },

  validateAction(
    state: Connect4State,
    role: 'host' | 'peer',
    action: Connect4Action
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
    if (action.type !== 'drop') {
      return { valid: false, error: 'Invalid action type' };
    }

    // Validate column
    if (action.column < 0 || action.column >= COLS) {
      return { valid: false, error: 'Invalid column' };
    }

    // Check if column is full
    if (getLowestEmptyRow(state.board, action.column) === -1) {
      return { valid: false, error: 'Column is full' };
    }

    return { valid: true };
  },

  applyAction(
    state: Connect4State,
    role: 'host' | 'peer',
    action: Connect4Action
  ): Connect4State {
    const color: Connect4Cell = role === 'host' ? 'red' : 'yellow';
    const row = getLowestEmptyRow(state.board, action.column);
    
    // Deep copy board
    const newBoard = state.board.map(row => [...row]);
    newBoard[row][action.column] = color;

    const winner = checkWinner(newBoard);
    const isDraw = !winner && isBoardFull(newBoard);

    return {
      ...state,
      board: newBoard,
      moves: state.moves + 1,
      lastMove: { row, col: action.column },
      currentTurn: role === 'host' ? 'peer' : 'host',
      status: winner || isDraw ? 'finished' : 'playing',
      serverSeq: state.serverSeq + 1,
    };
  },

  getView(state: Connect4State, role: 'host' | 'peer'): Connect4View {
    const winner = checkWinner(state.board);
    const isDraw = !winner && isBoardFull(state.board);

    let winnerRole: 'host' | 'peer' | 'draw' | null = null;
    if (winner === 'red') {
      winnerRole = 'host';
    } else if (winner === 'yellow') {
      winnerRole = 'peer';
    } else if (isDraw) {
      winnerRole = 'draw';
    }

    return {
      board: state.board,
      myColor: role === 'host' ? 'red' : 'yellow',
      isMyTurn: state.currentTurn === role && state.status === 'playing',
      status: state.status,
      winner: winnerRole,
      lastMove: state.lastMove,
    };
  },

  checkWinCondition(state: Connect4State): WinResult | null {
    const winner = checkWinner(state.board);
    if (winner === 'red') {
      return { winner: 'host', reason: 'Four in a row' };
    }
    if (winner === 'yellow') {
      return { winner: 'peer', reason: 'Four in a row' };
    }
    if (isBoardFull(state.board)) {
      return { winner: 'draw', reason: 'Board is full' };
    }
    return null;
  },
};

export default connect4Game;

