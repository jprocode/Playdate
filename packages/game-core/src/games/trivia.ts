// Trivia Game Implementation
// Race to 10 correct answers

import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export interface TriviaState extends GameState {
  gameKey: 'trivia';
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  hostScore: number;
  peerScore: number;
  currentQuestion: TriviaQuestion | null;
  answeredBy: 'host' | 'peer' | null;
  questionStartTime: number;
  winningScore: number;
}

export interface TriviaAction {
  type: 'answer';
  choiceIndex: number;
}

export interface TriviaView {
  currentQuestion: {
    question: string;
    options: string[];
    category: string;
  } | null;
  questionNumber: number;
  myScore: number;
  opponentScore: number;
  isMyTurn: boolean; // In trivia, both can answer
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | null;
  lastCorrect: boolean | null;
  answeredBy: 'host' | 'peer' | null;
}

// Sample questions (will be loaded from JSON in production)
const SAMPLE_QUESTIONS: TriviaQuestion[] = [
  {
    id: '1',
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    category: 'Geography',
  },
  {
    id: '2',
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    category: 'Science',
  },
  // Add more questions...
];

const WINNING_SCORE = 10;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Game implementation
export const triviaGame: Game<TriviaState, TriviaAction, TriviaView> = {
  init(seed?: string): TriviaState {
    // Shuffle and select questions
    const shuffledQuestions = shuffleArray(SAMPLE_QUESTIONS);
    const firstQuestion = shuffledQuestions[0] || null;

    return {
      gameKey: 'trivia',
      status: 'playing',
      currentTurn: 'host', // Both can answer, this tracks who answered last
      serverSeq: 0,
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      hostScore: 0,
      peerScore: 0,
      currentQuestion: firstQuestion,
      answeredBy: null,
      questionStartTime: Date.now(),
      winningScore: WINNING_SCORE,
    };
  },

  validateAction(
    state: TriviaState,
    role: 'host' | 'peer',
    action: TriviaAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (action.type !== 'answer') {
      return { valid: false, error: 'Invalid action type' };
    }

    if (!state.currentQuestion) {
      return { valid: false, error: 'No current question' };
    }

    // Check if someone already answered this question
    if (state.answeredBy !== null) {
      return { valid: false, error: 'Question already answered' };
    }

    if (action.choiceIndex < 0 || action.choiceIndex >= state.currentQuestion.options.length) {
      return { valid: false, error: 'Invalid choice' };
    }

    return { valid: true };
  },

  applyAction(
    state: TriviaState,
    role: 'host' | 'peer',
    action: TriviaAction
  ): TriviaState {
    if (!state.currentQuestion) {
      return state;
    }

    const isCorrect = action.choiceIndex === state.currentQuestion.correctIndex;
    const newHostScore = role === 'host' && isCorrect ? state.hostScore + 1 : state.hostScore;
    const newPeerScore = role === 'peer' && isCorrect ? state.peerScore + 1 : state.peerScore;

    // Check for winner
    const hostWon = newHostScore >= state.winningScore;
    const peerWon = newPeerScore >= state.winningScore;
    const isFinished = hostWon || peerWon;

    // Move to next question if not finished
    const nextIndex = state.currentQuestionIndex + 1;
    const nextQuestion = isFinished ? null : (state.questions[nextIndex] || null);

    return {
      ...state,
      hostScore: newHostScore,
      peerScore: newPeerScore,
      answeredBy: role,
      currentTurn: role, // Track who answered
      currentQuestionIndex: isFinished ? state.currentQuestionIndex : nextIndex,
      currentQuestion: isFinished ? state.currentQuestion : nextQuestion,
      questionStartTime: Date.now(),
      status: isFinished ? 'finished' : 'playing',
      serverSeq: state.serverSeq + 1,
    };
  },

  getView(state: TriviaState, role: 'host' | 'peer'): TriviaView {
    const myScore = role === 'host' ? state.hostScore : state.peerScore;
    const opponentScore = role === 'host' ? state.peerScore : state.hostScore;

    let winner: 'host' | 'peer' | null = null;
    if (state.hostScore >= state.winningScore) {
      winner = 'host';
    } else if (state.peerScore >= state.winningScore) {
      winner = 'peer';
    }

    return {
      currentQuestion: state.currentQuestion
        ? {
            question: state.currentQuestion.question,
            options: state.currentQuestion.options,
            category: state.currentQuestion.category,
          }
        : null,
      questionNumber: state.currentQuestionIndex + 1,
      myScore,
      opponentScore,
      isMyTurn: state.answeredBy === null, // Both can answer
      status: state.status,
      winner,
      lastCorrect: state.answeredBy === role ? 
        (state.currentQuestion ? state.answeredBy !== null : null) : null,
      answeredBy: state.answeredBy,
    };
  },

  checkWinCondition(state: TriviaState): WinResult | null {
    if (state.hostScore >= state.winningScore) {
      return { winner: 'host', reason: `Reached ${state.winningScore} points` };
    }
    if (state.peerScore >= state.winningScore) {
      return { winner: 'peer', reason: `Reached ${state.winningScore} points` };
    }
    return null;
  },
};

// Function to load questions from JSON data
export function loadTriviaQuestions(data: { questions: TriviaQuestion[] }): void {
  SAMPLE_QUESTIONS.length = 0;
  SAMPLE_QUESTIONS.push(...data.questions);
}

export default triviaGame;

