// PlayDate Server Entry Point
// Express + Socket.IO server with WebRTC signaling and game state management

import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@playdate/shared';

import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { registerSocketHandlers } from './socket/index.js';
import logger from './utils/logger.js';

// Create Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server with typed events
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: config.cors,
  pingTimeout: config.socket.pingTimeout,
  pingInterval: config.socket.pingInterval,
});

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes (will be expanded in room-management task)
app.get('/api', (_req, res) => {
  res.json({
    name: 'PlayDate API',
    version: '0.0.1',
  });
});

// TURN credentials endpoint
import { turnCredentialsHandler } from './api/turn-credentials.js';
app.get('/api/turn-credentials', turnCredentialsHandler);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Register Socket.IO handlers
registerSocketHandlers(io);

// Start server
httpServer.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
    },
    'PlayDate server started'
  );
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.IO
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  // Give connections time to close
  setTimeout(() => {
    logger.info('Forcing shutdown');
    process.exit(0);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, io, httpServer };
