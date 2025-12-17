// Hangman Game Implementation

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface HangmanState extends GameState {
  gameKey: 'hangman';
  secretWord: string; // Only visible to setter
  maskedWord: string; // e.g., "_ _ L L O"
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  setterRole: 'host' | 'peer';
  guesserRole: 'host' | 'peer';
  phase: 'setting' | 'guessing' | 'finished';
  roundNumber: number;
  hostScore: number;
  peerScore: number;
}

export interface HangmanAction {
  type: 'setWord' | 'guessLetter' | 'guessWord';
  word?: string;
  letter?: string;
}

export interface HangmanView {
  maskedWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  phase: 'setting' | 'guessing' | 'finished';
  isSetter: boolean;
  isGuesser: boolean;
  secretWord: string | null; // Only visible to setter
  myScore: number;
  opponentScore: number;
  winner: 'host' | 'peer' | null;
  roundNumber: number;
}

const MAX_WRONG_GUESSES = 6;

function maskWord(word: string, guessedLetters: string[]): string {
  return word
    .toUpperCase()
    .split('')
    .map(char => {
      if (char === ' ') return '  ';
      if (guessedLetters.includes(char.toUpperCase())) return char;
      return '_';
    })
    .join(' ');
}

function isWordGuessed(word: string, guessedLetters: string[]): boolean {
  return word
    .toUpperCase()
    .split('')
    .filter(char => char !== ' ')
    .every(char => guessedLetters.includes(char.toUpperCase()));
}

// Game implementation
export const hangmanGame: Game<HangmanState, HangmanAction, HangmanView> = {
  init(_seed?: string): HangmanState {
    return {
      gameKey: 'hangman',
      status: 'playing',
      currentTurn: 'host',
      serverSeq: 0,
      secretWord: '',
      maskedWord: '',
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrongGuesses: MAX_WRONG_GUESSES,
      setterRole: 'host', // Host sets first word
      guesserRole: 'peer',
      phase: 'setting',
      roundNumber: 1,
      hostScore: 0,
      peerScore: 0,
    };
  },

  validateAction(
    state: HangmanState,
    role: 'host' | 'peer',
    action: HangmanAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type === 'setWord') {
      if (state.phase !== 'setting') {
        return { valid: false, error: 'Not in word setting phase' };
      }
      if (role !== state.setterRole) {
        return { valid: false, error: 'You are not the word setter' };
      }
      if (!action.word || action.word.trim().length < 3) {
        return { valid: false, error: 'Word must be at least 3 characters' };
      }
      if (!/^[a-zA-Z\s]+$/.test(action.word)) {
        return { valid: false, error: 'Word must contain only letters and spaces' };
      }
      return { valid: true };
    }

    if (action.type === 'guessLetter') {
      if (state.phase !== 'guessing') {
        return { valid: false, error: 'Not in guessing phase' };
      }
      if (role !== state.guesserRole) {
        return { valid: false, error: 'You are not the guesser' };
      }
      if (!action.letter || action.letter.length !== 1) {
        return { valid: false, error: 'Must guess a single letter' };
      }
      if (!/^[a-zA-Z]$/.test(action.letter)) {
        return { valid: false, error: 'Must be a letter' };
      }
      if (state.guessedLetters.includes(action.letter.toUpperCase())) {
        return { valid: false, error: 'Letter already guessed' };
      }
      return { valid: true };
    }

    if (action.type === 'guessWord') {
      if (state.phase !== 'guessing') {
        return { valid: false, error: 'Not in guessing phase' };
      }
      if (role !== state.guesserRole) {
        return { valid: false, error: 'You are not the guesser' };
      }
      if (!action.word) {
        return { valid: false, error: 'Must provide a word' };
      }
      return { valid: true };
    }

    return { valid: false, error: 'Invalid action type' };
  },

  applyAction(
    state: HangmanState,
    role: 'host' | 'peer',
    action: HangmanAction
  ): HangmanState {
    if (action.type === 'setWord' && action.word) {
      const word = action.word.trim().toUpperCase();
      return {
        ...state,
        secretWord: word,
        maskedWord: maskWord(word, []),
        phase: 'guessing',
        currentTurn: state.guesserRole,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'guessLetter' && action.letter) {
      const letter = action.letter.toUpperCase();
      const newGuessedLetters = [...state.guessedLetters, letter];
      const isCorrect = state.secretWord.toUpperCase().includes(letter);
      const newWrongGuesses = isCorrect ? state.wrongGuesses : state.wrongGuesses + 1;
      const newMaskedWord = maskWord(state.secretWord, newGuessedLetters);

      // Check win/lose conditions
      const wordGuessed = isWordGuessed(state.secretWord, newGuessedLetters);
      const outOfGuesses = newWrongGuesses >= state.maxWrongGuesses;
      const roundOver = wordGuessed || outOfGuesses;

      // Update scores
      let newHostScore = state.hostScore;
      let newPeerScore = state.peerScore;
      if (wordGuessed) {
        // Guesser wins the round
        if (state.guesserRole === 'host') newHostScore++;
        else newPeerScore++;
      } else if (outOfGuesses) {
        // Setter wins the round
        if (state.setterRole === 'host') newHostScore++;
        else newPeerScore++;
      }

      if (roundOver) {
        // Switch roles for next round
        return {
          ...state,
          guessedLetters: newGuessedLetters,
          wrongGuesses: newWrongGuesses,
          maskedWord: newMaskedWord,
          hostScore: newHostScore,
          peerScore: newPeerScore,
          phase: 'finished',
          status: 'finished',
          serverSeq: state.serverSeq + 1,
        };
      }

      return {
        ...state,
        guessedLetters: newGuessedLetters,
        wrongGuesses: newWrongGuesses,
        maskedWord: newMaskedWord,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'guessWord' && action.word) {
      const guessedWord = action.word.trim().toUpperCase();
      const isCorrect = guessedWord === state.secretWord.toUpperCase();

      // Update scores
      let newHostScore = state.hostScore;
      let newPeerScore = state.peerScore;
      if (isCorrect) {
        if (state.guesserRole === 'host') newHostScore++;
        else newPeerScore++;
      } else {
        if (state.setterRole === 'host') newHostScore++;
        else newPeerScore++;
      }

      return {
        ...state,
        maskedWord: isCorrect ? state.secretWord : state.maskedWord,
        hostScore: newHostScore,
        peerScore: newPeerScore,
        phase: 'finished',
        status: 'finished',
        serverSeq: state.serverSeq + 1,
      };
    }

    return state;
  },

  getView(state: HangmanState, role: 'host' | 'peer'): HangmanView {
    const isSetter = role === state.setterRole;
    const isGuesser = role === state.guesserRole;

    let winner: 'host' | 'peer' | null = null;
    if (state.status === 'finished') {
      const wordGuessed = isWordGuessed(state.secretWord, state.guessedLetters);
      if (wordGuessed) {
        winner = state.guesserRole;
      } else {
        winner = state.setterRole;
      }
    }

    return {
      maskedWord: state.maskedWord,
      guessedLetters: state.guessedLetters,
      wrongGuesses: state.wrongGuesses,
      maxWrongGuesses: state.maxWrongGuesses,
      phase: state.phase,
      isSetter,
      isGuesser,
      secretWord: isSetter ? state.secretWord : null,
      myScore: role === 'host' ? state.hostScore : state.peerScore,
      opponentScore: role === 'host' ? state.peerScore : state.hostScore,
      winner,
      roundNumber: state.roundNumber,
    };
  },

  checkWinCondition(state: HangmanState): WinResult | null {
    if (state.phase !== 'finished') return null;

    const wordGuessed = isWordGuessed(state.secretWord, state.guessedLetters);
    if (wordGuessed) {
      return { winner: state.guesserRole, reason: 'Guessed the word' };
    }
    return { winner: state.setterRole, reason: 'Guesser ran out of guesses' };
  },
};

export default hangmanGame;

