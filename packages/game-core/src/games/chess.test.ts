// Chess Game Tests

import { describe, it, expect } from 'vitest';

import { chessGame, type ChessAction } from './chess.js';

describe('Chess Game', () => {
  describe('init', () => {
    it('should initialize with standard starting position', () => {
      const state = chessGame.init();
      
      expect(state.fen).toContain('rnbqkbnr/pppppppp');
      expect(state.currentTurn).toBe('host'); // Host is white
      expect(state.status).toBe('playing');
      expect(state.moveHistory).toEqual([]);
    });
  });

  describe('validateAction', () => {
    it('should allow valid pawn move', () => {
      const state = chessGame.init();
      const action: ChessAction = { type: 'move', from: 'e2', to: 'e4' };
      
      const result = chessGame.validateAction(state, 'host', action);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid move', () => {
      const state = chessGame.init();
      const action: ChessAction = { type: 'move', from: 'e2', to: 'e5' }; // Can't move pawn 3 squares
      
      const result = chessGame.validateAction(state, 'host', action);
      
      expect(result.valid).toBe(false);
    });

    it('should reject move when not your turn', () => {
      const state = chessGame.init();
      const action: ChessAction = { type: 'move', from: 'e7', to: 'e5' }; // Black pawn
      
      const result = chessGame.validateAction(state, 'peer', action);
      
      // It's white's turn, but this is a black pawn - invalid
      expect(result.valid).toBe(false);
    });
  });

  describe('applyAction', () => {
    it('should apply a valid move', () => {
      const state = chessGame.init();
      const newState = chessGame.applyAction(state, 'host', { type: 'move', from: 'e2', to: 'e4' });
      
      expect(newState.moveHistory).toContain('e4');
      expect(newState.lastMove).toEqual({ from: 'e2', to: 'e4' });
      expect(newState.currentTurn).toBe('peer');
    });

    it('should track multiple moves', () => {
      let state = chessGame.init();
      
      state = chessGame.applyAction(state, 'host', { type: 'move', from: 'e2', to: 'e4' });
      state = chessGame.applyAction(state, 'peer', { type: 'move', from: 'e7', to: 'e5' });
      state = chessGame.applyAction(state, 'host', { type: 'move', from: 'g1', to: 'f3' });
      
      expect(state.moveHistory.length).toBe(3);
    });
  });

  describe('getView', () => {
    it('should show correct color for host', () => {
      const state = chessGame.init();
      const view = chessGame.getView(state, 'host');
      
      expect(view.myColor).toBe('white');
      expect(view.isMyTurn).toBe(true);
    });

    it('should show correct color for peer', () => {
      const state = chessGame.init();
      const view = chessGame.getView(state, 'peer');
      
      expect(view.myColor).toBe('black');
      expect(view.isMyTurn).toBe(false);
    });

    it('should include legal moves for current player', () => {
      const state = chessGame.init();
      const view = chessGame.getView(state, 'host');
      
      expect(view.legalMoves.length).toBeGreaterThan(0);
      expect(view.legalMoves.some(m => m.from === 'e2' && m.to === 'e4')).toBe(true);
    });
  });

  describe('checkWinCondition', () => {
    it('should return null for normal game', () => {
      const state = chessGame.init();
      
      const result = chessGame.checkWinCondition(state);
      
      expect(result).toBeNull();
    });

    it('should detect checkmate', () => {
      let state = chessGame.init();
      
      // Fool's mate
      state = chessGame.applyAction(state, 'host', { type: 'move', from: 'f2', to: 'f3' });
      state = chessGame.applyAction(state, 'peer', { type: 'move', from: 'e7', to: 'e5' });
      state = chessGame.applyAction(state, 'host', { type: 'move', from: 'g2', to: 'g4' });
      state = chessGame.applyAction(state, 'peer', { type: 'move', from: 'd8', to: 'h4' });
      
      const result = chessGame.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('peer'); // Black wins
      expect(state.isCheckmate).toBe(true);
    });
  });
});

