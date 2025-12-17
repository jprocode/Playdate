// Pictionary Game Implementation
// One player draws, the other guesses

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface PictionaryState extends GameState {
  gameKey: 'pictionary';
  wordPool: string[];
  currentWord: string;
  drawerRole: 'host' | 'peer';
  guesserRole: 'host' | 'peer';
  strokes: DrawingStroke[];
  guesses: { text: string; correct: boolean; by: 'host' | 'peer' }[];
  roundNumber: number;
  maxRounds: number;
  roundTimeSeconds: number;
  roundStartTime: number;
  roundEndTime: number | null;
  hostScore: number;
  peerScore: number;
  phase: 'drawing' | 'revealed' | 'finished';
}

export interface PictionaryAction {
  type: 'stroke' | 'guess' | 'clear' | 'undo';
  stroke?: DrawingStroke;
  guess?: string;
}

export interface PictionaryView {
  strokes: DrawingStroke[];
  guesses: { text: string; correct: boolean; by: 'host' | 'peer' }[];
  isDrawer: boolean;
  isGuesser: boolean;
  currentWord: string | null; // Only visible to drawer
  wordHint: string; // e.g., "_ _ _ _ _"
  roundNumber: number;
  maxRounds: number;
  timeRemaining: number;
  myScore: number;
  opponentScore: number;
  phase: 'drawing' | 'revealed' | 'finished';
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
}

const WORD_POOL = [
  'cat', 'dog', 'house', 'tree', 'sun', 'moon', 'star', 'car', 'boat', 'plane',
  'fish', 'bird', 'flower', 'book', 'phone', 'clock', 'chair', 'table', 'lamp', 'door',
  'apple', 'banana', 'pizza', 'cake', 'ice cream', 'coffee', 'guitar', 'piano', 'drum',
  'beach', 'mountain', 'river', 'forest', 'rainbow', 'cloud', 'rain', 'snow', 'fire',
  'heart', 'smile', 'crown', 'sword', 'shield', 'castle', 'dragon', 'unicorn', 'robot',
];

const MAX_ROUNDS = 6;
const ROUND_TIME_SECONDS = 60;

function getRandomWord(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function createWordHint(word: string): string {
  return word.split('').map(c => c === ' ' ? '  ' : '_').join(' ');
}

// Game implementation
export const pictionaryGame: Game<PictionaryState, PictionaryAction, PictionaryView> = {
  init(_seed?: string): PictionaryState {
    const currentWord = getRandomWord(WORD_POOL);
    
    return {
      gameKey: 'pictionary',
      status: 'playing',
      currentTurn: 'host', // Host draws first
      serverSeq: 0,
      wordPool: [...WORD_POOL],
      currentWord,
      drawerRole: 'host',
      guesserRole: 'peer',
      strokes: [],
      guesses: [],
      roundNumber: 1,
      maxRounds: MAX_ROUNDS,
      roundTimeSeconds: ROUND_TIME_SECONDS,
      roundStartTime: Date.now(),
      roundEndTime: null,
      hostScore: 0,
      peerScore: 0,
      phase: 'drawing',
    };
  },

  validateAction(
    state: PictionaryState,
    role: 'host' | 'peer',
    action: PictionaryAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type === 'stroke') {
      if (role !== state.drawerRole) {
        return { valid: false, error: 'Only the drawer can draw' };
      }
      if (state.phase !== 'drawing') {
        return { valid: false, error: 'Not in drawing phase' };
      }
      if (!action.stroke || !action.stroke.points || action.stroke.points.length === 0) {
        return { valid: false, error: 'Invalid stroke' };
      }
      return { valid: true };
    }

    if (action.type === 'guess') {
      if (role !== state.guesserRole) {
        return { valid: false, error: 'Only the guesser can guess' };
      }
      if (state.phase !== 'drawing') {
        return { valid: false, error: 'Not in drawing phase' };
      }
      if (!action.guess || action.guess.trim().length === 0) {
        return { valid: false, error: 'Guess cannot be empty' };
      }
      return { valid: true };
    }

    if (action.type === 'clear') {
      if (role !== state.drawerRole) {
        return { valid: false, error: 'Only the drawer can clear' };
      }
      return { valid: true };
    }

    if (action.type === 'undo') {
      if (role !== state.drawerRole) {
        return { valid: false, error: 'Only the drawer can undo' };
      }
      return { valid: true };
    }

    return { valid: false, error: 'Invalid action type' };
  },

  applyAction(
    state: PictionaryState,
    role: 'host' | 'peer',
    action: PictionaryAction
  ): PictionaryState {
    if (action.type === 'stroke' && action.stroke) {
      return {
        ...state,
        strokes: [...state.strokes, action.stroke],
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'guess' && action.guess) {
      const isCorrect = action.guess.toLowerCase().trim() === state.currentWord.toLowerCase();
      const newGuess = { text: action.guess.trim(), correct: isCorrect, by: role };
      const newGuesses = [...state.guesses, newGuess];

      if (isCorrect) {
        // Update scores
        let newHostScore = state.hostScore;
        let newPeerScore = state.peerScore;

        // Both drawer and guesser get points for correct guess
        if (state.guesserRole === 'host') {
          newHostScore += 1; // Guesser gets 1 point
          newPeerScore += 1; // Drawer gets 1 point
        } else {
          newPeerScore += 1;
          newHostScore += 1;
        }

        // Check if game is over
        const isGameOver = state.roundNumber >= state.maxRounds;

        if (isGameOver) {
          return {
            ...state,
            guesses: newGuesses,
            hostScore: newHostScore,
            peerScore: newPeerScore,
            phase: 'finished',
            status: 'finished',
            roundEndTime: Date.now(),
            serverSeq: state.serverSeq + 1,
          };
        }

        // Move to next round
        const nextWord = getRandomWord(state.wordPool);
        return {
          ...state,
          guesses: [],
          strokes: [],
          currentWord: nextWord,
          drawerRole: state.drawerRole === 'host' ? 'peer' : 'host',
          guesserRole: state.guesserRole === 'host' ? 'peer' : 'host',
          roundNumber: state.roundNumber + 1,
          hostScore: newHostScore,
          peerScore: newPeerScore,
          roundStartTime: Date.now(),
          serverSeq: state.serverSeq + 1,
        };
      }

      return {
        ...state,
        guesses: newGuesses,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'clear') {
      return {
        ...state,
        strokes: [],
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'undo') {
      return {
        ...state,
        strokes: state.strokes.slice(0, -1),
        serverSeq: state.serverSeq + 1,
      };
    }

    return state;
  },

  getView(state: PictionaryState, role: 'host' | 'peer'): PictionaryView {
    const isDrawer = role === state.drawerRole;
    const isGuesser = role === state.guesserRole;
    
    const elapsed = (Date.now() - state.roundStartTime) / 1000;
    const timeRemaining = Math.max(0, state.roundTimeSeconds - elapsed);

    let winner: 'host' | 'peer' | 'draw' | null = null;
    if (state.status === 'finished') {
      if (state.hostScore > state.peerScore) {
        winner = 'host';
      } else if (state.peerScore > state.hostScore) {
        winner = 'peer';
      } else {
        winner = 'draw';
      }
    }

    return {
      strokes: state.strokes,
      guesses: state.guesses,
      isDrawer,
      isGuesser,
      currentWord: isDrawer ? state.currentWord : null,
      wordHint: createWordHint(state.currentWord),
      roundNumber: state.roundNumber,
      maxRounds: state.maxRounds,
      timeRemaining: Math.floor(timeRemaining),
      myScore: role === 'host' ? state.hostScore : state.peerScore,
      opponentScore: role === 'host' ? state.peerScore : state.hostScore,
      phase: state.phase,
      status: state.status,
      winner,
    };
  },

  checkWinCondition(state: PictionaryState): WinResult | null {
    if (state.status !== 'finished') return null;

    if (state.hostScore > state.peerScore) {
      return { winner: 'host', reason: `Won with ${state.hostScore} points` };
    }
    if (state.peerScore > state.hostScore) {
      return { winner: 'peer', reason: `Won with ${state.peerScore} points` };
    }
    return { winner: 'draw', reason: 'Tied game' };
  },
};

export default pictionaryGame;

