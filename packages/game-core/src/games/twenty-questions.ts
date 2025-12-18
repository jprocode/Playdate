// 20 Questions Game Implementation
// One player thinks of something, the other asks yes/no questions

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface TwentyQObject {
  id: string;
  name: string;
  category: string;
  hints: string[];
}

export interface Question {
  text: string;
  answer: 'yes' | 'no' | 'maybe';
  askedBy: 'host' | 'peer';
}

export interface TwentyQuestionsState extends GameState {
  gameKey: 'twenty-questions';
  targetObject: TwentyQObject;
  questions: Question[];
  guesses: { text: string; correct: boolean }[];
  maxQuestions: number;
  answererRole: 'host' | 'peer'; // Person who knows the answer
  guesserRole: 'host' | 'peer';  // Person asking questions
  phase: 'questioning' | 'guessing' | 'finished';
  roundNumber: number;
  hostScore: number;
  peerScore: number;
  pendingQuestion: string | null;
}

export interface TwentyQuestionsAction {
  type: 'ask' | 'twenty_q_answer' | 'guess_object';
  question?: string;
  answer?: 'yes' | 'no' | 'maybe';
  guess?: string;
}

export interface TwentyQuestionsView {
  questions: Question[];
  guesses: { text: string; correct: boolean }[];
  questionsRemaining: number;
  maxQuestions: number;
  isAnswerer: boolean;
  isGuesser: boolean;
  targetObject: TwentyQObject | null; // Only visible to answerer
  phase: 'questioning' | 'guessing' | 'finished';
  pendingQuestion: string | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | null;
  myScore: number;
  opponentScore: number;
}

const MAX_QUESTIONS = 20;

// Sample objects (will be loaded from JSON)
const SAMPLE_OBJECTS: TwentyQObject[] = [
  { id: '1', name: 'Elephant', category: 'animal', hints: ['It is large', 'It has a trunk'] },
  { id: '2', name: 'Piano', category: 'instrument', hints: ['It makes music', 'It has keys'] },
  { id: '3', name: 'Pizza', category: 'food', hints: ['It is round', 'It has cheese'] },
  { id: '4', name: 'Airplane', category: 'vehicle', hints: ['It flies', 'It has wings'] },
  { id: '5', name: 'Camera', category: 'electronics', hints: ['It takes pictures', 'It has a lens'] },
];

function getRandomObject(): TwentyQObject {
  return SAMPLE_OBJECTS[Math.floor(Math.random() * SAMPLE_OBJECTS.length)];
}

// Game implementation
export const twentyQuestionsGame: Game<TwentyQuestionsState, TwentyQuestionsAction, TwentyQuestionsView> = {
  init(_seed?: string): TwentyQuestionsState {
    const targetObject = getRandomObject();
    
    return {
      gameKey: 'twenty-questions',
      status: 'playing',
      currentTurn: 'peer', // Guesser asks first
      serverSeq: 0,
      targetObject,
      questions: [],
      guesses: [],
      maxQuestions: MAX_QUESTIONS,
      answererRole: 'host', // Host knows the answer
      guesserRole: 'peer',  // Peer asks questions
      phase: 'questioning',
      roundNumber: 1,
      hostScore: 0,
      peerScore: 0,
      pendingQuestion: null,
    };
  },

  validateAction(
    state: TwentyQuestionsState,
    role: 'host' | 'peer',
    action: TwentyQuestionsAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type === 'ask') {
      if (role !== state.guesserRole) {
        return { valid: false, error: 'Only the guesser can ask questions' };
      }
      if (state.phase !== 'questioning') {
        return { valid: false, error: 'Not in questioning phase' };
      }
      if (!action.question || action.question.trim().length < 3) {
        return { valid: false, error: 'Question too short' };
      }
      if (state.questions.length >= state.maxQuestions) {
        return { valid: false, error: 'No questions remaining' };
      }
      if (state.pendingQuestion) {
        return { valid: false, error: 'Waiting for answer to previous question' };
      }
      return { valid: true };
    }

    if (action.type === 'twenty_q_answer') {
      if (role !== state.answererRole) {
        return { valid: false, error: 'Only the answerer can answer' };
      }
      if (!state.pendingQuestion) {
        return { valid: false, error: 'No question to answer' };
      }
      if (!['yes', 'no', 'maybe'].includes(action.answer || '')) {
        return { valid: false, error: 'Invalid answer' };
      }
      return { valid: true };
    }

    if (action.type === 'guess_object') {
      if (role !== state.guesserRole) {
        return { valid: false, error: 'Only the guesser can make guesses' };
      }
      if (!action.guess || action.guess.trim().length < 1) {
        return { valid: false, error: 'Guess too short' };
      }
      return { valid: true };
    }

    return { valid: false, error: 'Invalid action type' };
  },

  applyAction(
    state: TwentyQuestionsState,
    role: 'host' | 'peer',
    action: TwentyQuestionsAction
  ): TwentyQuestionsState {
    if (action.type === 'ask' && action.question) {
      return {
        ...state,
        pendingQuestion: action.question.trim(),
        currentTurn: state.answererRole,
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'twenty_q_answer' && action.answer && state.pendingQuestion) {
      const newQuestion: Question = {
        text: state.pendingQuestion,
        answer: action.answer,
        askedBy: state.guesserRole,
      };

      const newQuestions = [...state.questions, newQuestion];
      const outOfQuestions = newQuestions.length >= state.maxQuestions;

      return {
        ...state,
        questions: newQuestions,
        pendingQuestion: null,
        currentTurn: state.guesserRole,
        phase: outOfQuestions ? 'guessing' : 'questioning',
        serverSeq: state.serverSeq + 1,
      };
    }

    if (action.type === 'guess_object' && action.guess) {
      const isCorrect = action.guess.toLowerCase().trim() === 
                       state.targetObject.name.toLowerCase().trim();
      
      const newGuess = { text: action.guess.trim(), correct: isCorrect };
      const newGuesses = [...state.guesses, newGuess];

      // Update scores
      let newHostScore = state.hostScore;
      let newPeerScore = state.peerScore;
      
      if (isCorrect) {
        // Guesser wins
        if (state.guesserRole === 'host') newHostScore++;
        else newPeerScore++;
      }

      // Game ends on correct guess or if they've used their guess opportunity
      const isFinished = isCorrect || newGuesses.length >= 3; // Allow up to 3 guesses

      if (!isCorrect && !isFinished) {
        // Wrong guess, but can still try
        return {
          ...state,
          guesses: newGuesses,
          serverSeq: state.serverSeq + 1,
        };
      }

      // If wrong and out of guesses, answerer wins
      if (!isCorrect && isFinished) {
        if (state.answererRole === 'host') newHostScore++;
        else newPeerScore++;
      }

      return {
        ...state,
        guesses: newGuesses,
        hostScore: newHostScore,
        peerScore: newPeerScore,
        phase: 'finished',
        status: 'finished',
        serverSeq: state.serverSeq + 1,
      };
    }

    return state;
  },

  getView(state: TwentyQuestionsState, role: 'host' | 'peer'): TwentyQuestionsView {
    const isAnswerer = role === state.answererRole;
    const isGuesser = role === state.guesserRole;
    
    // Determine winner
    let winner: 'host' | 'peer' | null = null;
    if (state.status === 'finished') {
      const correctGuess = state.guesses.some(g => g.correct);
      if (correctGuess) {
        winner = state.guesserRole;
      } else {
        winner = state.answererRole;
      }
    }

    return {
      questions: state.questions,
      guesses: state.guesses,
      questionsRemaining: state.maxQuestions - state.questions.length,
      maxQuestions: state.maxQuestions,
      isAnswerer,
      isGuesser,
      targetObject: isAnswerer ? state.targetObject : null,
      phase: state.phase,
      pendingQuestion: state.pendingQuestion,
      status: state.status,
      winner,
      myScore: role === 'host' ? state.hostScore : state.peerScore,
      opponentScore: role === 'host' ? state.peerScore : state.hostScore,
    };
  },

  checkWinCondition(state: TwentyQuestionsState): WinResult | null {
    if (state.status !== 'finished') return null;

    const correctGuess = state.guesses.some(g => g.correct);
    if (correctGuess) {
      return { 
        winner: state.guesserRole, 
        reason: `Guessed "${state.targetObject.name}" correctly!` 
      };
    }
    return { 
      winner: state.answererRole, 
      reason: `Object was "${state.targetObject.name}"` 
    };
  },
};

// Function to load objects from JSON
export function loadTwentyQuestionsObjects(data: { objects: TwentyQObject[] }): void {
  SAMPLE_OBJECTS.length = 0;
  SAMPLE_OBJECTS.push(...data.objects);
}

export default twentyQuestionsGame;

