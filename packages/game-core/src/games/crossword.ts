// Co-op Crossword Game Implementation
// Both players work together to fill in the puzzle

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
  startRow: number;
  startCol: number;
}

export interface CrosswordPuzzle {
  id: string;
  size: number;
  grid: (string | null)[][]; // null = black square, '' = empty, letter = filled
  clues: CrosswordClue[];
}

export interface CrosswordCell {
  value: string;
  filledBy: 'host' | 'peer' | null;
  isCorrect: boolean | null;
}

export interface CrosswordState extends GameState {
  gameKey: 'crossword';
  puzzle: CrosswordPuzzle;
  playerGrid: CrosswordCell[][];
  completedClues: { clueNumber: number; direction: 'across' | 'down' }[];
  hostCursor: { row: number; col: number } | null;
  peerCursor: { row: number; col: number } | null;
  startTime: number;
  completionTime: number | null;
}

export interface CrosswordAction {
  type: 'setCell' | 'clearCell' | 'moveCursor';
  row?: number;
  col?: number;
  letter?: string;
}

export interface CrosswordView {
  grid: CrosswordCell[][];
  clues: Omit<CrosswordClue, 'answer'>[];
  completedClues: { clueNumber: number; direction: 'across' | 'down' }[];
  myCursor: { row: number; col: number } | null;
  partnerCursor: { row: number; col: number } | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  elapsedTime: number;
  percentComplete: number;
}

// Sample puzzle (will be loaded from JSON)
const SAMPLE_PUZZLES: CrosswordPuzzle[] = [
  {
    id: '1',
    size: 5,
    grid: [
      ['', '', '', null, ''],
      ['', null, '', '', ''],
      ['', '', '', '', ''],
      ['', '', null, '', null],
      ['', '', '', '', ''],
    ],
    clues: [
      { number: 1, direction: 'across', text: 'Opposite of no', answer: 'YES', startRow: 0, startCol: 0 },
      { number: 1, direction: 'down', text: 'Feline pet', answer: 'CAT', startRow: 0, startCol: 0 },
      { number: 2, direction: 'down', text: 'Opposite of old', answer: 'NEW', startRow: 0, startCol: 2 },
      { number: 3, direction: 'across', text: 'Canine pet', answer: 'DOG', startRow: 2, startCol: 0 },
      { number: 4, direction: 'across', text: 'Used for seeing', answer: 'EYE', startRow: 4, startCol: 0 },
    ],
  },
];

function getRandomPuzzle(): CrosswordPuzzle {
  return SAMPLE_PUZZLES[Math.floor(Math.random() * SAMPLE_PUZZLES.length)];
}

function createEmptyPlayerGrid(puzzle: CrosswordPuzzle): CrosswordCell[][] {
  return puzzle.grid.map(row =>
    row.map(cell => ({
      value: cell === null ? '' : '',
      filledBy: null,
      isCorrect: null,
    }))
  );
}

function isBlackCell(puzzle: CrosswordPuzzle, row: number, col: number): boolean {
  return puzzle.grid[row]?.[col] === null;
}

function checkPuzzleComplete(playerGrid: CrosswordCell[][], puzzle: CrosswordPuzzle): boolean {
  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      if (puzzle.grid[row][col] !== null) {
        // Find the expected letter
        const expectedLetter = getExpectedLetter(puzzle, row, col);
        if (playerGrid[row][col].value.toUpperCase() !== expectedLetter) {
          return false;
        }
      }
    }
  }
  return true;
}

function getExpectedLetter(puzzle: CrosswordPuzzle, row: number, col: number): string {
  for (const clue of puzzle.clues) {
    let currentRow = clue.startRow;
    let currentCol = clue.startCol;
    
    for (let i = 0; i < clue.answer.length; i++) {
      if (currentRow === row && currentCol === col) {
        return clue.answer[i].toUpperCase();
      }
      
      if (clue.direction === 'across') {
        currentCol++;
      } else {
        currentRow++;
      }
    }
  }
  return '';
}

function calculatePercentComplete(playerGrid: CrosswordCell[][], puzzle: CrosswordPuzzle): number {
  let totalCells = 0;
  let correctCells = 0;

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      if (puzzle.grid[row][col] !== null) {
        totalCells++;
        const expected = getExpectedLetter(puzzle, row, col);
        if (playerGrid[row][col].value.toUpperCase() === expected) {
          correctCells++;
        }
      }
    }
  }

  return totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;
}

// Game implementation
export const crosswordGame: Game<CrosswordState, CrosswordAction, CrosswordView> = {
  init(_seed?: string): CrosswordState {
    const puzzle = getRandomPuzzle();
    
    return {
      gameKey: 'crossword',
      status: 'playing',
      currentTurn: 'host', // Both can play simultaneously
      serverSeq: 0,
      puzzle,
      playerGrid: createEmptyPlayerGrid(puzzle),
      completedClues: [],
      hostCursor: { row: 0, col: 0 },
      peerCursor: null,
      startTime: Date.now(),
      completionTime: null,
    };
  },

  validateAction(
    state: CrosswordState,
    role: 'host' | 'peer',
    action: CrosswordAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type === 'setCell') {
      if (action.row === undefined || action.col === undefined) {
        return { valid: false, error: 'Row and column required' };
      }
      if (!action.letter || !/^[A-Za-z]$/.test(action.letter)) {
        return { valid: false, error: 'Must be a single letter' };
      }
      if (isBlackCell(state.puzzle, action.row, action.col)) {
        return { valid: false, error: 'Cannot fill black cell' };
      }
      return { valid: true };
    }

    if (action.type === 'clearCell') {
      if (action.row === undefined || action.col === undefined) {
        return { valid: false, error: 'Row and column required' };
      }
      return { valid: true };
    }

    if (action.type === 'moveCursor') {
      if (action.row === undefined || action.col === undefined) {
        return { valid: false, error: 'Row and column required' };
      }
      return { valid: true };
    }

    return { valid: false, error: 'Invalid action type' };
  },

  applyAction(
    state: CrosswordState,
    role: 'host' | 'peer',
    action: CrosswordAction
  ): CrosswordState {
    if (action.type === 'setCell' && action.row !== undefined && action.col !== undefined && action.letter) {
      const newGrid = state.playerGrid.map(row => row.map(cell => ({ ...cell })));
      newGrid[action.row][action.col] = {
        value: action.letter.toUpperCase(),
        filledBy: role,
        isCorrect: null,
      };

      const isComplete = checkPuzzleComplete(newGrid, state.puzzle);

      return {
        ...state,
        playerGrid: newGrid,
        status: isComplete ? 'finished' : 'playing',
        completionTime: isComplete ? Date.now() - state.startTime : null,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'clearCell' && action.row !== undefined && action.col !== undefined) {
      const newGrid = state.playerGrid.map(row => row.map(cell => ({ ...cell })));
      newGrid[action.row][action.col] = {
        value: '',
        filledBy: null,
        isCorrect: null,
      };

      return {
        ...state,
        playerGrid: newGrid,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'moveCursor' && action.row !== undefined && action.col !== undefined) {
      if (role === 'host') {
        return {
          ...state,
          hostCursor: { row: action.row, col: action.col },
          serverSeq: state.serverSeq + 1,
        };
      } else {
        return {
          ...state,
          peerCursor: { row: action.row, col: action.col },
          serverSeq: state.serverSeq + 1,
        };
      }
    }

    return state;
  },

  getView(state: CrosswordState, role: 'host' | 'peer'): CrosswordView {
    const percentComplete = calculatePercentComplete(state.playerGrid, state.puzzle);
    const isComplete = percentComplete === 100;

    return {
      grid: state.playerGrid,
      clues: state.puzzle.clues.map(({ answer, ...clue }) => clue),
      completedClues: state.completedClues,
      myCursor: role === 'host' ? state.hostCursor : state.peerCursor,
      partnerCursor: role === 'host' ? state.peerCursor : state.hostCursor,
      status: state.status,
      winner: isComplete ? 'host' : null, // Cooperative win
      elapsedTime: state.completionTime || (Date.now() - state.startTime),
      percentComplete,
    };
  },

  checkWinCondition(state: CrosswordState): WinResult | null {
    if (checkPuzzleComplete(state.playerGrid, state.puzzle)) {
      const time = state.completionTime || (Date.now() - state.startTime);
      return { 
        winner: 'host', // Cooperative win
        reason: `Completed in ${Math.floor(time / 1000)} seconds!` 
      };
    }
    return null;
  },
};

export default crosswordGame;

