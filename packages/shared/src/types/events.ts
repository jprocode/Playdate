// Socket.IO event types

import type { AppError, ErrorCode } from '../constants/errors.js';
import type { GameKey } from '../constants/games.js';
import type { GameAction, GameState } from './game.js';
import type { JoinRoomResult, PlayerRole, RoomInfo } from './room.js';

// ============================================
// Socket.IO Event Names
// ============================================

export const SocketEvents = {
  // Room events
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CLOSE: 'room:close',
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_WAITING: 'room:waiting',
  ROOM_READY: 'room:ready',
  ROOM_CLOSED: 'room:closed',
  ROOM_ERROR: 'room:error',
  ROOM_PEER_DISCONNECTED: 'room:peer_disconnected',
  ROOM_PEER_RECONNECTED: 'room:peer_reconnected',

  // Chat events
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',

  // Reaction events
  REACTION_SEND: 'reaction:send',
  REACTION: 'reaction',

  // WebRTC signaling events
  RTC_OFFER: 'rtc:offer',
  RTC_ANSWER: 'rtc:answer',
  RTC_ICE: 'rtc:ice',
  RTC_RENEGOTIATE: 'rtc:renegotiate',

  // Game events
  GAME_SELECT: 'game:select',
  GAME_READY: 'game:ready',
  GAME_START: 'game:start',
  GAME_ACTION: 'game:action',
  GAME_STATE: 'game:state',
  GAME_ERROR: 'game:error',
  GAME_ENDED: 'game:ended',
  GAME_REMATCH: 'game:rematch',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

// ============================================
// Client -> Server Event Payloads
// ============================================

export interface RoomCreatePayload {
  desiredRoomId?: string;
  desiredPassword?: string;
  displayName: string;
}

export interface RoomJoinPayload {
  roomId: string;
  password: string;
  displayName: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface RoomClosePayload {
  roomId: string;
}

export interface ChatSendPayload {
  roomId: string;
  message: string;
}

export interface ReactionSendPayload {
  roomId: string;
  emoji: string;
}

export interface RTCOfferPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface RTCAnswerPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface RTCIcePayload {
  roomId: string;
  candidate: RTCIceCandidateInit;
}

export interface GameSelectPayload {
  roomId: string;
  gameKey: GameKey;
}

export interface GameReadyPayload {
  roomId: string;
  gameKey: GameKey;
  ready: boolean;
}

export interface GameActionPayload {
  roomId: string;
  gameKey: GameKey;
  action: GameAction;
}

export interface GameRematchPayload {
  roomId: string;
  gameKey: GameKey;
}

// ============================================
// Server -> Client Event Payloads
// ============================================

export interface RoomCreatedPayload extends RoomInfo {
  role: 'host';
}

export interface RoomJoinedPayload extends JoinRoomResult {}

export interface RoomWaitingPayload {
  roomId: string;
  role: PlayerRole;
}

export interface RoomReadyPayload {
  roomId: string;
  peerDisplayName: string;
}

export interface RoomClosedPayload {
  roomId: string;
  reason: 'host_closed' | 'timeout' | 'error';
}

export interface RoomErrorPayload extends AppError {}

export interface RoomPeerDisconnectedPayload {
  roomId: string;
  peerDisplayName: string;
}

export interface RoomPeerReconnectedPayload {
  roomId: string;
  peerDisplayName: string;
}

export interface ChatMessagePayload {
  roomId: string;
  from: PlayerRole;
  displayName: string;
  message: string;
  timestamp: string;
}

export interface ReactionPayload {
  roomId: string;
  from: PlayerRole;
  displayName: string;
  emoji: string;
  timestamp: string;
}

export interface GameStartPayload {
  roomId: string;
  gameKey: GameKey;
  state: GameState;
}

export interface GameStatePayload {
  roomId: string;
  gameKey: GameKey;
  state: GameState;
  serverSeq: number;
}

export interface GameErrorPayload {
  roomId: string;
  gameKey: GameKey;
  code: ErrorCode;
  message: string;
}

export interface GameEndedPayload {
  roomId: string;
  gameKey: GameKey;
  winner: PlayerRole | 'draw';
  finalState: GameState;
}

// ============================================
// Socket.IO Type Definitions
// ============================================

export interface ClientToServerEvents {
  [SocketEvents.ROOM_CREATE]: (payload: RoomCreatePayload, callback: (response: RoomCreatedPayload | RoomErrorPayload) => void) => void;
  [SocketEvents.ROOM_JOIN]: (payload: RoomJoinPayload, callback: (response: RoomJoinedPayload | RoomWaitingPayload | RoomErrorPayload) => void) => void;
  [SocketEvents.ROOM_LEAVE]: (payload: RoomLeavePayload) => void;
  [SocketEvents.ROOM_CLOSE]: (payload: RoomClosePayload) => void;
  [SocketEvents.CHAT_SEND]: (payload: ChatSendPayload) => void;
  [SocketEvents.REACTION_SEND]: (payload: ReactionSendPayload) => void;
  [SocketEvents.RTC_OFFER]: (payload: RTCOfferPayload) => void;
  [SocketEvents.RTC_ANSWER]: (payload: RTCAnswerPayload) => void;
  [SocketEvents.RTC_ICE]: (payload: RTCIcePayload) => void;
  [SocketEvents.GAME_SELECT]: (payload: GameSelectPayload) => void;
  [SocketEvents.GAME_READY]: (payload: GameReadyPayload) => void;
  [SocketEvents.GAME_ACTION]: (payload: GameActionPayload, callback?: (response: GameStatePayload | GameErrorPayload) => void) => void;
  [SocketEvents.GAME_REMATCH]: (payload: GameRematchPayload) => void;
}

export interface ServerToClientEvents {
  [SocketEvents.ROOM_CREATED]: (payload: RoomCreatedPayload) => void;
  [SocketEvents.ROOM_JOINED]: (payload: RoomJoinedPayload) => void;
  [SocketEvents.ROOM_WAITING]: (payload: RoomWaitingPayload) => void;
  [SocketEvents.ROOM_READY]: (payload: RoomReadyPayload) => void;
  [SocketEvents.ROOM_CLOSED]: (payload: RoomClosedPayload) => void;
  [SocketEvents.ROOM_ERROR]: (payload: RoomErrorPayload) => void;
  [SocketEvents.ROOM_PEER_DISCONNECTED]: (payload: RoomPeerDisconnectedPayload) => void;
  [SocketEvents.ROOM_PEER_RECONNECTED]: (payload: RoomPeerReconnectedPayload) => void;
  [SocketEvents.CHAT_MESSAGE]: (payload: ChatMessagePayload) => void;
  [SocketEvents.REACTION]: (payload: ReactionPayload) => void;
  [SocketEvents.RTC_OFFER]: (payload: RTCOfferPayload) => void;
  [SocketEvents.RTC_ANSWER]: (payload: RTCAnswerPayload) => void;
  [SocketEvents.RTC_ICE]: (payload: RTCIcePayload) => void;
  [SocketEvents.GAME_START]: (payload: GameStartPayload) => void;
  [SocketEvents.GAME_STATE]: (payload: GameStatePayload) => void;
  [SocketEvents.GAME_ERROR]: (payload: GameErrorPayload) => void;
  [SocketEvents.GAME_ENDED]: (payload: GameEndedPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  roomId: string | null;
  role: PlayerRole | null;
  displayName: string;
  userId: string | null;
}
