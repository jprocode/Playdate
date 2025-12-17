// Room validation schemas

import { z } from 'zod';

// Room ID: 8-10 characters, URL-safe (NanoID)
export const roomIdSchema = z
  .string()
  .min(8, 'Room ID must be at least 8 characters')
  .max(16, 'Room ID must be at most 16 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'Room ID must be URL-safe (letters, numbers, dashes, underscores)');

// Password: 8+ chars, mixed case + numbers (strong)
export const roomPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must be at most 64 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Display name: 2-32 characters
export const displayNameSchema = z
  .string()
  .min(2, 'Display name must be at least 2 characters')
  .max(32, 'Display name must be at most 32 characters')
  .regex(/^[A-Za-z0-9 _-]+$/, 'Display name can only contain letters, numbers, spaces, dashes, and underscores');

// Room create payload
export const roomCreatePayloadSchema = z.object({
  desiredRoomId: roomIdSchema.optional(),
  desiredPassword: roomPasswordSchema.optional(),
  displayName: displayNameSchema,
});

// Room join payload
export const roomJoinPayloadSchema = z.object({
  roomId: roomIdSchema,
  password: z.string().min(1, 'Password is required'),
  displayName: displayNameSchema,
});

// Room leave/close payload
export const roomIdPayloadSchema = z.object({
  roomId: roomIdSchema,
});

// Type exports
export type RoomIdInput = z.infer<typeof roomIdSchema>;
export type RoomPasswordInput = z.infer<typeof roomPasswordSchema>;
export type DisplayNameInput = z.infer<typeof displayNameSchema>;
export type RoomCreatePayloadInput = z.infer<typeof roomCreatePayloadSchema>;
export type RoomJoinPayloadInput = z.infer<typeof roomJoinPayloadSchema>;
export type RoomIdPayloadInput = z.infer<typeof roomIdPayloadSchema>;
