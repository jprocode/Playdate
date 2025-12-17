// Chess Game Implementation
// Uses chess.js for move validation

import { Chess } from 'chess.js';
import type { Game, GameState, ValidationResult, WinResult } from './base.js';

// Types
export interface ChessState extends GameState {
  gameKey: 'chess';
  fen: string; // FEN notation for board state
  pgn: string; // PGN notation for move history
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export interface ChessAction {
  type: 'move';
  from: string; // e.g., "e2"
  to: string;   // e.g., "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface ChessView {
  fen: string;
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
  isMyTurn: boolean;
  myColor: 'white' | 'black';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  legalMoves: { from: string; to: string }[];
}

// Game implementation
export const chessGame: Game<ChessState, ChessAction, ChessView> = {
  init(_seed?: string): ChessState {
    const chess = new Chess();
    
    return {
      gameKey: 'chess',
      status: 'playing',
      currentTurn: 'host', // Host plays white
      serverSeq: 0,
      fen: chess.fen(),
      pgn: chess.pgn(),
      moveHistory: [],
      lastMove: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
    };
  },

  validateAction(
    state: ChessState,
    role: 'host' | 'peer',
    action: ChessAction
  ): ValidationResult {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }

    if (state.currentTurn !== role) {
      return { valid: false, error: 'Not your turn' };
    }

    if (action.type !== 'move') {
      return { valid: false, error: 'Invalid action type' };
    }

    // Validate move using chess.js
    const chess = new Chess(state.fen);
    
    try {
      const move = chess.move({
        from: action.from,
        to: action.to,
        promotion: action.promotion,
      });
      
      if (!move) {
        return { valid: false, error: 'Invalid move' };
      }
      
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid move' };
    }
  },

  applyAction(
    state: ChessState,
    role: 'host' | 'peer',
    action: ChessAction
  ): ChessState {
    const chess = new Chess(state.fen);
    
    const move = chess.move({
      from: action.from,
      to: action.to,
      promotion: action.promotion,
    });

    if (!move) {
      return state; // Invalid move, return unchanged
    }

    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();
    const isGameOver = isCheckmate || isStalemate || isDraw;

    return {
      ...state,
      fen: chess.fen(),
      pgn: chess.pgn(),
      moveHistory: [...state.moveHistory, move.san],
      lastMove: { from: action.from, to: action.to },
      currentTurn: role === 'host' ? 'peer' : 'host',
      isCheck: chess.isCheck(),
      isCheckmate,
      isStalemate,
      isDraw,
      status: isGameOver ? 'finished' : 'playing',
      serverSeq: state.serverSeq + 1,
    };
  },

  getView(state: ChessState, role: 'host' | 'peer'): ChessView {
    const chess = new Chess(state.fen);
    const myColor = role === 'host' ? 'white' : 'black';
    
    // Get legal moves for the current player
    const moves = chess.moves({ verbose: true });
    const legalMoves = moves.map(m => ({ from: m.from, to: m.to }));

    let winner: 'host' | 'peer' | 'draw' | null = null;
    if (state.isCheckmate) {
      // The player who can't move loses
      winner = state.currentTurn === 'host' ? 'peer' : 'host';
    } else if (state.isDraw || state.isStalemate) {
      winner = 'draw';
    }

    return {
      fen: state.fen,
      moveHistory: state.moveHistory,
      lastMove: state.lastMove,
      isMyTurn: state.currentTurn === role && state.status === 'playing',
      myColor,
      isCheck: state.isCheck,
      isCheckmate: state.isCheckmate,
      isStalemate: state.isStalemate,
      isDraw: state.isDraw,
      status: state.status,
      winner,
      legalMoves: state.currentTurn === role ? legalMoves : [],
    };
  },

  checkWinCondition(state: ChessState): WinResult | null {
    if (state.isCheckmate) {
      const winner = state.currentTurn === 'host' ? 'peer' : 'host';
      return { winner, reason: 'Checkmate' };
    }
    if (state.isStalemate) {
      return { winner: 'draw', reason: 'Stalemate' };
    }
    if (state.isDraw) {
      return { winner: 'draw', reason: 'Draw' };
    }
    return null;
  },
};

export default chessGame;

