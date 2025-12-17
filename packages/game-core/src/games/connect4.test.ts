// Connect 4 Game Tests

import { describe, it, expect } from 'vitest';

import { connect4Game, type Connect4Action } from './connect4.js';

describe('Connect 4 Game', () => {
  describe('init', () => {
    it('should initialize an empty 6x7 board', () => {
      const state = connect4Game.init();
      
      expect(state.board.length).toBe(6);
      expect(state.board[0].length).toBe(7);
      expect(state.board.flat().every(cell => cell === null)).toBe(true);
      expect(state.currentTurn).toBe('host');
      expect(state.status).toBe('playing');
    });
  });

  describe('validateAction', () => {
    it('should allow valid drop', () => {
      const state = connect4Game.init();
      const action: Connect4Action = { type: 'drop', column: 3 };
      
      const result = connect4Game.validateAction(state, 'host', action);
      
      expect(result.valid).toBe(true);
    });

    it('should reject drop in full column', () => {
      let state = connect4Game.init();
      
      // Fill column 0
      for (let i = 0; i < 6; i++) {
        const player: 'host' | 'peer' = i % 2 === 0 ? 'host' : 'peer';
        state = connect4Game.applyAction(state, player, { type: 'drop', column: 0 });
      }
      
      const result = connect4Game.validateAction(state, 'host', { type: 'drop', column: 0 });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Column is full');
    });

    it('should reject invalid column', () => {
      const state = connect4Game.init();
      
      expect(connect4Game.validateAction(state, 'host', { type: 'drop', column: -1 }).valid).toBe(false);
      expect(connect4Game.validateAction(state, 'host', { type: 'drop', column: 7 }).valid).toBe(false);
    });
  });

  describe('applyAction', () => {
    it('should drop piece to bottom of column', () => {
      const state = connect4Game.init();
      const newState = connect4Game.applyAction(state, 'host', { type: 'drop', column: 3 });
      
      expect(newState.board[0][3]).toBe('red'); // Bottom row
      expect(newState.lastMove).toEqual({ row: 0, col: 3 });
      expect(newState.currentTurn).toBe('peer');
    });

    it('should stack pieces', () => {
      let state = connect4Game.init();
      
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 3 });
      state = connect4Game.applyAction(state, 'peer', { type: 'drop', column: 3 });
      
      expect(state.board[0][3]).toBe('red');    // First piece at bottom
      expect(state.board[1][3]).toBe('yellow'); // Second piece stacked
    });
  });

  describe('checkWinCondition', () => {
    it('should detect horizontal win', () => {
      let state = connect4Game.init();
      
      // Red (host) wins horizontally at row 0
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 0 });
      state = connect4Game.applyAction(state, 'peer', { type: 'drop', column: 0 });
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 1 });
      state = connect4Game.applyAction(state, 'peer', { type: 'drop', column: 1 });
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 2 });
      state = connect4Game.applyAction(state, 'peer', { type: 'drop', column: 2 });
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 3 });
      
      const result = connect4Game.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('host');
    });

    it('should detect vertical win', () => {
      let state = connect4Game.init();
      
      // Build vertical win
      for (let i = 0; i < 4; i++) {
        state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 0 });
        if (i < 3) {
          state = connect4Game.applyAction(state, 'peer', { type: 'drop', column: 1 });
        }
      }
      
      const result = connect4Game.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('host');
    });

    it('should return null for ongoing game', () => {
      let state = connect4Game.init();
      state = connect4Game.applyAction(state, 'host', { type: 'drop', column: 3 });
      
      const result = connect4Game.checkWinCondition(state);
      
      expect(result).toBeNull();
    });
  });

  describe('getView', () => {
    it('should show correct color for host', () => {
      const state = connect4Game.init();
      const view = connect4Game.getView(state, 'host');
      
      expect(view.myColor).toBe('red');
      expect(view.isMyTurn).toBe(true);
    });

    it('should show correct color for peer', () => {
      const state = connect4Game.init();
      const view = connect4Game.getView(state, 'peer');
      
      expect(view.myColor).toBe('yellow');
      expect(view.isMyTurn).toBe(false);
    });
  });
});

