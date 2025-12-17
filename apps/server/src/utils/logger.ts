// Pino logger configuration

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash'],
    censor: '[REDACTED]',
  },
});

// Create child loggers for different components
export const socketLogger = logger.child({ component: 'socket' });
export const roomLogger = logger.child({ component: 'room' });
export const gameLogger = logger.child({ component: 'game' });
export const dbLogger = logger.child({ component: 'database' });
export const rtcLogger = logger.child({ component: 'webrtc' });

export default logger;

