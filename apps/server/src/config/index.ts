// Server configuration

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // Cloudflare TURN
  cloudflare: {
    turnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID || '',
    turnApiToken: process.env.CLOUDFLARE_TURN_API_TOKEN || '',
  },

  // TURN Server Configuration
  turn: {
    secret: process.env.TURN_SECRET || '',
    urls: (process.env.TURN_URLS || 'stun:stun.cloudflare.com:3478').split(','),
  },

  // Room settings
  room: {
    idLength: 10,
    passwordLength: 12,
    maxParticipants: 2,
    cleanupIntervalMs: 60 * 1000, // 1 minute
    inactiveTimeoutMs: 30 * 60 * 1000, // 30 minutes
  },

  // Socket.IO
  socket: {
    pingTimeout: 20000,
    pingInterval: 25000,
  },
} as const;

export default config;

