// Speed Wordle Game Implementation
// Both players race to solve the same word

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export type LetterResult = 'correct' | 'present' | 'absent';

export interface WordleGuess {
  word: string;
  result: LetterResult[];
}

export interface WordleState extends GameState {
  gameKey: 'speed-wordle';
  targetWord: string;
  hostGuesses: WordleGuess[];
  peerGuesses: WordleGuess[];
  hostSolved: boolean;
  peerSolved: boolean;
  hostSolveTime: number | null;
  peerSolveTime: number | null;
  maxGuesses: number;
  wordLength: number;
  startTime: number;
}

export interface WordleAction {
  type: 'guess';
  word: string;
}

export interface WordleView {
  myGuesses: WordleGuess[];
  opponentGuesses: WordleGuess[];
  mySolved: boolean;
  opponentSolved: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  maxGuesses: number;
  wordLength: number;
  targetWord: string | null; // Only revealed when game is finished
}

// Sample word list (will be loaded from JSON)
const WORD_LIST = [
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ADMIT', 'ADULT', 'AFTER', 'AGAIN',
  'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALLOW',
  'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGLE', 'ANGRY', 'APPLE', 'APPLY',
  'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'ARRAY', 'ASIDE', 'ASSET', 'AVOID',
  // ... more words would be added
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

function getRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

function checkGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = new Array(WORD_LENGTH).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.toUpperCase().split('');

  // First pass: mark correct letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = '*'; // Mark as used
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    
    const targetIndex = targetChars.indexOf(guessChars[i]);
    if (targetIndex !== -1) {
      result[i] = 'present';
      targetChars[targetIndex] = '*'; // Mark as used
    }
  }

  return result;
}

function isValidWord(word: string): boolean {
  // In production, check against a dictionary
  return word.length === WORD_LENGTH && /^[A-Za-z]+$/.test(word);
}

// Game implementation
export const wordleGame: Game<WordleState, WordleAction, WordleView> = {
  init(seed?: string): WordleState {
    const targetWord = seed || getRandomWord();
    
    return {
      gameKey: 'speed-wordle',
      status: 'playing',
      currentTurn: 'host', // Both can guess simultaneously
      serverSeq: 0,
      targetWord: targetWord.toUpperCase(),
      hostGuesses: [],
      peerGuesses: [],
      hostSolved: false,
      peerSolved: false,
      hostSolveTime: null,
      peerSolveTime: null,
      maxGuesses: MAX_GUESSES,
      wordLength: WORD_LENGTH,
      startTime: Date.now(),
    };
  },

  validateAction(
    state: WordleState,
    role: 'host' | 'peer',
    action: WordleAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type !== 'guess') {
      return { valid: false, error: 'Invalid action type' };
    }

    // Check if player already solved
    if ((role === 'host' && state.hostSolved) || (role === 'peer' && state.peerSolved)) {
      return { valid: false, error: 'You already solved the puzzle' };
    }

    // Check guess count
    const guesses = role === 'host' ? state.hostGuesses : state.peerGuesses;
    if (guesses.length >= state.maxGuesses) {
      return { valid: false, error: 'No more guesses remaining' };
    }

    // Validate word
    if (!isValidWord(action.word)) {
      return { valid: false, error: 'Invalid word' };
    }

    return { valid: true };
  },

  applyAction(
    state: WordleState,
    role: 'host' | 'peer',
    action: WordleAction
  ): WordleState {
    const word = action.word.toUpperCase();
    const result = checkGuess(word, state.targetWord);
    const isCorrect = word === state.targetWord;
    const solveTime = isCorrect ? Date.now() - state.startTime : null;

    const newGuess: WordleGuess = { word, result };

    let newHostGuesses = state.hostGuesses;
    let newPeerGuesses = state.peerGuesses;
    let newHostSolved = state.hostSolved;
    let newPeerSolved = state.peerSolved;
    let newHostSolveTime = state.hostSolveTime;
    let newPeerSolveTime = state.peerSolveTime;

    if (role === 'host') {
      newHostGuesses = [...state.hostGuesses, newGuess];
      if (isCorrect) {
        newHostSolved = true;
        newHostSolveTime = solveTime;
      }
    } else {
      newPeerGuesses = [...state.peerGuesses, newGuess];
      if (isCorrect) {
        newPeerSolved = true;
        newPeerSolveTime = solveTime;
      }
    }

    // Check if game is over
    const hostDone = newHostSolved || newHostGuesses.length >= state.maxGuesses;
    const peerDone = newPeerSolved || newPeerGuesses.length >= state.maxGuesses;
    const isFinished = hostDone && peerDone;

    return {
      ...state,
      hostGuesses: newHostGuesses,
      peerGuesses: newPeerGuesses,
      hostSolved: newHostSolved,
      peerSolved: newPeerSolved,
      hostSolveTime: newHostSolveTime,
      peerSolveTime: newPeerSolveTime,
      status: isFinished ? 'finished' : 'playing',
      serverSeq: state.serverSeq + 1,
    };
  },

  getView(state: WordleState, role: 'host' | 'peer'): WordleView {
    const myGuesses = role === 'host' ? state.hostGuesses : state.peerGuesses;
    const opponentGuesses = role === 'host' ? state.peerGuesses : state.hostGuesses;
    const mySolved = role === 'host' ? state.hostSolved : state.peerSolved;
    const opponentSolved = role === 'host' ? state.peerSolved : state.hostSolved;

    let winner: 'host' | 'peer' | 'draw' | null = null;
    if (state.status === 'finished') {
      if (state.hostSolved && state.peerSolved) {
        // Both solved - faster one wins
        if (state.hostSolveTime! < state.peerSolveTime!) {
          winner = 'host';
        } else if (state.peerSolveTime! < state.hostSolveTime!) {
          winner = 'peer';
        } else {
          winner = 'draw';
        }
      } else if (state.hostSolved) {
        winner = 'host';
      } else if (state.peerSolved) {
        winner = 'peer';
      } else {
        winner = 'draw'; // Neither solved
      }
    }

    return {
      myGuesses,
      opponentGuesses: opponentGuesses.map(g => ({ word: '?????', result: g.result })), // Hide opponent's actual words
      mySolved,
      opponentSolved,
      status: state.status,
      winner,
      maxGuesses: state.maxGuesses,
      wordLength: state.wordLength,
      targetWord: state.status === 'finished' ? state.targetWord : null,
    };
  },

  checkWinCondition(state: WordleState): WinResult | null {
    if (state.status !== 'finished') return null;

    if (state.hostSolved && state.peerSolved) {
      if (state.hostSolveTime! < state.peerSolveTime!) {
        return { winner: 'host', reason: 'Solved faster' };
      } else if (state.peerSolveTime! < state.hostSolveTime!) {
        return { winner: 'peer', reason: 'Solved faster' };
      }
      return { winner: 'draw', reason: 'Tied on time' };
    }

    if (state.hostSolved) {
      return { winner: 'host', reason: 'Solved the word' };
    }
    if (state.peerSolved) {
      return { winner: 'peer', reason: 'Solved the word' };
    }

    return { winner: 'draw', reason: 'Neither player solved the word' };
  },
};

// Function to load words from JSON
export function loadWordleWords(data: { answers: string[] }): void {
  WORD_LIST.length = 0;
  WORD_LIST.push(...data.answers.map(w => w.toUpperCase()));
}

export default wordleGame;

