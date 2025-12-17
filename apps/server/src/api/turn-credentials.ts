// TURN Credentials API
// Generates short-lived TURN credentials for WebRTC connections

import type { Request, Response } from 'express';
import crypto from 'crypto';

import config from '../config/index.js';
import logger from '../utils/logger.js';

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

/**
 * Generate TURN credentials using HMAC-based authentication
 * This is compatible with Cloudflare TURN and coturn servers
 */
function generateTurnCredentials(ttlSeconds: number = 86400): TurnCredentials {
  const turnSecret = config.turn.secret;
  const turnUrls = config.turn.urls;

  // For development without TURN secret, return STUN-only config
  if (!turnSecret || turnSecret === '') {
    return {
      urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
      username: '',
      credential: '',
      ttl: 86400,
    };
  }

  // Generate timestamp-based username (for time-limited credentials)
  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${timestamp}:playdate`;

  // Generate HMAC-SHA1 credential
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  return {
    urls: turnUrls,
    username,
    credential,
    ttl: ttlSeconds,
  };
}

/**
 * Express handler for TURN credentials endpoint
 */
export function turnCredentialsHandler(_req: Request, res: Response): void {
  try {
    const credentials = generateTurnCredentials();
    
    // Don't log the actual credentials in production
    logger.debug('TURN credentials generated');

    res.json(credentials);
  } catch (error) {
    logger.error({ error }, 'Failed to generate TURN credentials');
    res.status(500).json({
      error: 'Failed to generate TURN credentials',
    });
  }
}

export { generateTurnCredentials };

