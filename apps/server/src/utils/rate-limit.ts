// In-memory rate limiting for password attempts

import { RATE_LIMIT_CONFIG, type RateLimitState } from '@playdate/shared';

// In-memory storage for rate limiting (per room)
const rateLimitStore = new Map<string, RateLimitState>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function getRateLimitState(roomId: string): RateLimitState | null {
  return rateLimitStore.get(roomId) ?? null;
}

export function isRateLimited(roomId: string): { limited: boolean; lockoutRemaining?: number } {
  const state = rateLimitStore.get(roomId);
  
  if (!state) {
    return { limited: false };
  }

  // Check if locked
  if (state.lockedUntil && state.lockedUntil > new Date()) {
    const remaining = state.lockedUntil.getTime() - Date.now();
    return { limited: true, lockoutRemaining: remaining };
  }

  // Clear lockout if expired
  if (state.lockedUntil && state.lockedUntil <= new Date()) {
    state.lockedUntil = null;
    state.attempts = 0;
  }

  return { limited: false };
}

export function recordFailedAttempt(roomId: string): { locked: boolean; attemptsRemaining: number } {
  let state = rateLimitStore.get(roomId);

  if (!state) {
    state = {
      attempts: 0,
      lockedUntil: null,
      lastAttemptAt: new Date(),
    };
    rateLimitStore.set(roomId, state);
  }

  // Check if we should reset attempts (outside the window)
  const windowExpired =
    state.lastAttemptAt &&
    Date.now() - state.lastAttemptAt.getTime() > RATE_LIMIT_CONFIG.ATTEMPT_WINDOW_MS;

  if (windowExpired) {
    state.attempts = 0;
    state.lockedUntil = null;
  }

  // Increment attempts
  state.attempts += 1;
  state.lastAttemptAt = new Date();

  // Check if we should lock
  if (state.attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
    state.lockedUntil = new Date(Date.now() + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS);
    return { locked: true, attemptsRemaining: 0 };
  }

  return {
    locked: false,
    attemptsRemaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - state.attempts,
  };
}

export function clearRateLimit(roomId: string): void {
  rateLimitStore.delete(roomId);
}

export function resetAttempts(roomId: string): void {
  const state = rateLimitStore.get(roomId);
  if (state) {
    state.attempts = 0;
    state.lockedUntil = null;
  }
}

// Cleanup expired entries periodically
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [roomId, state] of rateLimitStore.entries()) {
    // Remove entries that are:
    // 1. Not locked and haven't had an attempt in the last window
    // 2. Were locked but the lockout has expired
    const shouldRemove =
      (!state.lockedUntil &&
        state.lastAttemptAt &&
        now - state.lastAttemptAt.getTime() > RATE_LIMIT_CONFIG.ATTEMPT_WINDOW_MS) ||
      (state.lockedUntil && state.lockedUntil.getTime() < now - RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS);

    if (shouldRemove) {
      rateLimitStore.delete(roomId);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

// Export store for testing
export const _rateLimitStore = rateLimitStore;

