// Chat and Reactions Socket Handlers
// Handles in-room chat messages and emoji reactions

import {
  SocketEvents,
  type ChatSendPayload,
  type ReactionSendPayload,
} from '@playdate/shared';

import type { TypedSocket, TypedServer } from '../index.js';
import { socketLogger } from '../../utils/logger.js';
import { getRoom } from './room.js';

// Chat rate limiting
const chatRateLimits = new Map<string, { count: number; resetAt: number }>();
const CHAT_RATE_LIMIT = 10; // messages per window
const CHAT_RATE_WINDOW_MS = 10000; // 10 seconds

// Reaction rate limiting
const reactionRateLimits = new Map<string, { count: number; resetAt: number }>();
const REACTION_RATE_LIMIT = 20; // reactions per window
const REACTION_RATE_WINDOW_MS = 10000; // 10 seconds

function checkRateLimit(
  limits: Map<string, { count: number; resetAt: number }>,
  key: string,
  maxCount: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const state = limits.get(key);

  if (!state || now > state.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (state.count >= maxCount) {
    return false;
  }

  state.count++;
  return true;
}

// Valid emojis for reactions
const VALID_EMOJIS = new Set(['👍', '❤️', '😂', '🎉', '🔥', '👏', '😮', '😢', '🤔', '💯']);

export function registerChatHandlers(io: TypedServer, socket: TypedSocket): void {
  // Handle chat messages
  socket.on(SocketEvents.CHAT_SEND, (payload: ChatSendPayload) => {
    const { roomId, message } = payload;

    // Validate socket is in the room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Chat from socket not in room');
      return;
    }

    // Get room
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for chat');
      return;
    }

    // Validate message
    if (!message || typeof message !== 'string') {
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || trimmedMessage.length > 500) {
      return;
    }

    // Check rate limit
    if (!checkRateLimit(chatRateLimits, socket.id, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS)) {
      socketLogger.debug({ socketId: socket.id, roomId }, 'Chat rate limited');
      return;
    }

    // Broadcast chat message to room
    io.to(roomId).emit(SocketEvents.CHAT_MESSAGE, {
      roomId,
      from: socket.data.role!,
      displayName: socket.data.displayName,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    });

    socketLogger.debug(
      { socketId: socket.id, roomId, messageLength: trimmedMessage.length },
      'Chat message sent'
    );
  });

  // Handle reactions
  socket.on(SocketEvents.REACTION_SEND, (payload: ReactionSendPayload) => {
    const { roomId, emoji } = payload;

    // Validate socket is in the room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Reaction from socket not in room');
      return;
    }

    // Get room
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for reaction');
      return;
    }

    // Validate emoji
    if (!emoji || !VALID_EMOJIS.has(emoji)) {
      return;
    }

    // Check rate limit
    if (!checkRateLimit(reactionRateLimits, socket.id, REACTION_RATE_LIMIT, REACTION_RATE_WINDOW_MS)) {
      socketLogger.debug({ socketId: socket.id, roomId }, 'Reaction rate limited');
      return;
    }

    // Broadcast reaction to room
    io.to(roomId).emit(SocketEvents.REACTION, {
      roomId,
      from: socket.data.role!,
      displayName: socket.data.displayName,
      emoji,
      timestamp: new Date().toISOString(),
    });

    socketLogger.debug(
      { socketId: socket.id, roomId, emoji },
      'Reaction sent'
    );
  });
}

// Clean up rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  
  for (const [key, state] of chatRateLimits.entries()) {
    if (now > state.resetAt) {
      chatRateLimits.delete(key);
    }
  }
  
  for (const [key, state] of reactionRateLimits.entries()) {
    if (now > state.resetAt) {
      reactionRateLimits.delete(key);
    }
  }
}, 60000); // Clean up every minute

