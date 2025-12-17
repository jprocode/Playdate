// Room types

export type RoomStatus = 'open' | 'closed';

export type PlayerRole = 'host' | 'peer';

export interface RoomState {
  roomId: string;
  status: RoomStatus;
  hostConnected: boolean;
  peerConnected: boolean;
  currentGameKey: string | null;
  createdAt: string;
}

export interface RoomParticipant {
  socketId: string;
  role: PlayerRole;
  displayName: string;
  userId?: string;
  connectedAt: string;
}

export interface RoomInfo {
  roomId: string;
  inviteLink: string;
  password: string;
}

export interface JoinRoomResult {
  roomId: string;
  role: PlayerRole;
  roomState: RoomState;
  peer?: {
    displayName: string;
    connected: boolean;
  };
}

// Rate limiting
export interface RateLimitState {
  attempts: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
}

export const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  ATTEMPT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
} as const;
