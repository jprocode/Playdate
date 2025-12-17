// Connections Game Implementation
// Find 4 groups of 4 related items

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface ConnectionGroup {
  category: string;
  difficulty: 1 | 2 | 3 | 4;
  words: string[];
}

export interface ConnectionsPuzzle {
  id: string;
  groups: ConnectionGroup[];
}

export interface ConnectionsState extends GameState {
  gameKey: 'connections';
  puzzle: ConnectionsPuzzle;
  remainingWords: string[];
  foundGroups: ConnectionGroup[];
  strikes: number;
  maxStrikes: number;
  selectedWords: string[];
  lastGuessResult: 'correct' | 'incorrect' | 'one-away' | null;
}

export interface ConnectionsAction {
  type: 'select' | 'deselect' | 'submit' | 'shuffle';
  word?: string;
}

export interface ConnectionsView {
  remainingWords: string[];
  foundGroups: ConnectionGroup[];
  strikes: number;
  maxStrikes: number;
  selectedWords: string[];
  lastGuessResult: 'correct' | 'incorrect' | 'one-away' | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  isMyTurn: boolean;
}

const MAX_STRIKES = 4;
const GROUPS_COUNT = 4;
const ITEMS_PER_GROUP = 4;

// Sample puzzles (will be loaded from JSON)
const SAMPLE_PUZZLES: ConnectionsPuzzle[] = [
  {
    id: '1',
    groups: [
      { category: 'Fruits', difficulty: 1, words: ['Apple', 'Banana', 'Orange', 'Grape'] },
      { category: 'Languages', difficulty: 2, words: ['Python', 'Ruby', 'Swift', 'Go'] },
      { category: 'Card Games', difficulty: 3, words: ['Poker', 'Bridge', 'Solitaire', 'Blackjack'] },
      { category: 'Dances', difficulty: 4, words: ['Salsa', 'Tango', 'Waltz', 'Foxtrot'] },
    ],
  },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomPuzzle(): ConnectionsPuzzle {
  return SAMPLE_PUZZLES[Math.floor(Math.random() * SAMPLE_PUZZLES.length)];
}

function checkGuess(selectedWords: string[], groups: ConnectionGroup[]): { 
  correct: boolean; 
  group: ConnectionGroup | null; 
  oneAway: boolean;
} {
  for (const group of groups) {
    const matchCount = selectedWords.filter(w => 
      group.words.some(gw => gw.toLowerCase() === w.toLowerCase())
    ).length;
    
    if (matchCount === ITEMS_PER_GROUP) {
      return { correct: true, group, oneAway: false };
    }
    if (matchCount === ITEMS_PER_GROUP - 1) {
      return { correct: false, group: null, oneAway: true };
    }
  }
  return { correct: false, group: null, oneAway: false };
}

// Game implementation
export const connectionsGame: Game<ConnectionsState, ConnectionsAction, ConnectionsView> = {
  init(_seed?: string): ConnectionsState {
    const puzzle = getRandomPuzzle();
    const allWords = puzzle.groups.flatMap(g => g.words);
    
    return {
      gameKey: 'connections',
      status: 'playing',
      currentTurn: 'host', // Both can play cooperatively
      serverSeq: 0,
      puzzle,
      remainingWords: shuffleArray(allWords),
      foundGroups: [],
      strikes: 0,
      maxStrikes: MAX_STRIKES,
      selectedWords: [],
      lastGuessResult: null,
    };
  },

  validateAction(
    state: ConnectionsState,
    role: 'host' | 'peer',
    action: ConnectionsAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type === 'select') {
      if (!action.word) {
        return { valid: false, error: 'No word specified' };
      }
      if (!state.remainingWords.some(w => w.toLowerCase() === action.word!.toLowerCase())) {
        return { valid: false, error: 'Word not available' };
      }
      if (state.selectedWords.length >= ITEMS_PER_GROUP) {
        return { valid: false, error: 'Already selected 4 words' };
      }
      if (state.selectedWords.some(w => w.toLowerCase() === action.word!.toLowerCase())) {
        return { valid: false, error: 'Word already selected' };
      }
      return { valid: true };
    }

    if (action.type === 'deselect') {
      if (!action.word) {
        return { valid: false, error: 'No word specified' };
      }
      if (!state.selectedWords.some(w => w.toLowerCase() === action.word!.toLowerCase())) {
        return { valid: false, error: 'Word not selected' };
      }
      return { valid: true };
    }

    if (action.type === 'submit') {
      if (state.selectedWords.length !== ITEMS_PER_GROUP) {
        return { valid: false, error: 'Must select exactly 4 words' };
      }
      return { valid: true };
    }

    if (action.type === 'shuffle') {
      return { valid: true };
    }

    return { valid: false, error: 'Invalid action type' };
  },

  applyAction(
    state: ConnectionsState,
    role: 'host' | 'peer',
    action: ConnectionsAction
  ): ConnectionsState {
    if (action.type === 'select' && action.word) {
      return {
        ...state,
        selectedWords: [...state.selectedWords, action.word],
        lastGuessResult: null,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'deselect' && action.word) {
      return {
        ...state,
        selectedWords: state.selectedWords.filter(
          w => w.toLowerCase() !== action.word!.toLowerCase()
        ),
        lastGuessResult: null,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'shuffle') {
      return {
        ...state,
        remainingWords: shuffleArray(state.remainingWords),
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'submit') {
      const unfoundGroups = state.puzzle.groups.filter(
        g => !state.foundGroups.some(fg => fg.category === g.category)
      );
      
      const result = checkGuess(state.selectedWords, unfoundGroups);

      if (result.correct && result.group) {
        const newFoundGroups = [...state.foundGroups, result.group];
        const newRemainingWords = state.remainingWords.filter(
          w => !result.group!.words.some(gw => gw.toLowerCase() === w.toLowerCase())
        );
        const isFinished = newFoundGroups.length === GROUPS_COUNT;

        return {
          ...state,
          foundGroups: newFoundGroups,
          remainingWords: newRemainingWords,
          selectedWords: [],
          lastGuessResult: 'correct',
          status: isFinished ? 'finished' : 'playing',
          serverSeq: state.serverSeq + 1,
        };
      }

      // Incorrect guess
      const newStrikes = state.strikes + 1;
      const isGameOver = newStrikes >= state.maxStrikes;

      return {
        ...state,
        strikes: newStrikes,
        selectedWords: [],
        lastGuessResult: result.oneAway ? 'one-away' : 'incorrect',
        status: isGameOver ? 'finished' : 'playing',
        serverSeq: state.serverSeq + 1,
      };
    }

    return state;
  },

  getView(state: ConnectionsState, role: 'host' | 'peer'): ConnectionsView {
    const won = state.foundGroups.length === GROUPS_COUNT;
    const lost = state.strikes >= state.maxStrikes;

    let winner: 'host' | 'peer' | 'draw' | null = null;
    if (won) {
      winner = 'host'; // Cooperative win
    } else if (lost) {
      winner = 'draw'; // Loss counted as draw
    }

    return {
      remainingWords: state.remainingWords,
      foundGroups: state.foundGroups,
      strikes: state.strikes,
      maxStrikes: state.maxStrikes,
      selectedWords: state.selectedWords,
      lastGuessResult: state.lastGuessResult,
      status: state.status,
      winner,
      isMyTurn: true, // Cooperative - both can play
    };
  },

  checkWinCondition(state: ConnectionsState): WinResult | null {
    if (state.foundGroups.length === GROUPS_COUNT) {
      return { winner: 'host', reason: 'Found all groups' }; // Cooperative win
    }
    if (state.strikes >= state.maxStrikes) {
      return { winner: 'draw', reason: 'Out of strikes' };
    }
    return null;
  },
};

// Function to load puzzles from JSON
export function loadConnectionsPuzzles(data: { puzzles: ConnectionsPuzzle[] }): void {
  SAMPLE_PUZZLES.length = 0;
  SAMPLE_PUZZLES.push(...data.puzzles);
}

export default connectionsGame;

