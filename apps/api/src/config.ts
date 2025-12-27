/**
 * API Configuration
 */

export interface Config {
  // Server
  port: number;
  host: string;
  isDev: boolean;

  // Database
  databasePath: string;

  // JWT
  jwtSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiryDays: number;

  // Cookies
  cookieDomain?: string;
  cookieSecure: boolean;

  // Rate limiting
  rateLimitMax: number;
  rateLimitWindow: string;

  // Apple Sign-In OAuth
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
  applePrivateKey: string;
  appleRedirectUri: string;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    // Server
    port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
    host: getEnvOrDefault('HOST', '0.0.0.0'),
    isDev,

    // Database
    databasePath: getEnvOrDefault(
      'DATABASE_PATH',
      isDev ? '../../data/running-days.db' : '/data/running-days.db'
    ),

    // JWT - in dev, use a default secret; in prod, require it
    jwtSecret: isDev
      ? getEnvOrDefault('JWT_SECRET', 'dev-secret-do-not-use-in-production-min-32-chars')
      : getEnvOrThrow('JWT_SECRET'),
    accessTokenExpiry: getEnvOrDefault('ACCESS_TOKEN_EXPIRY', '15m'),
    refreshTokenExpiryDays: parseInt(getEnvOrDefault('REFRESH_TOKEN_EXPIRY_DAYS', '7'), 10),

    // Cookies
    cookieDomain: process.env.COOKIE_DOMAIN,
    cookieSecure: !isDev,

    // Rate limiting
    rateLimitMax: parseInt(getEnvOrDefault('RATE_LIMIT_MAX', '100'), 10),
    rateLimitWindow: getEnvOrDefault('RATE_LIMIT_WINDOW', '1 minute'),

    // Apple Sign-In OAuth - required in production
    appleClientId: isDev
      ? getEnvOrDefault('APPLE_CLIENT_ID', '')
      : getEnvOrThrow('APPLE_CLIENT_ID'),
    appleTeamId: isDev
      ? getEnvOrDefault('APPLE_TEAM_ID', '')
      : getEnvOrThrow('APPLE_TEAM_ID'),
    appleKeyId: isDev
      ? getEnvOrDefault('APPLE_KEY_ID', '')
      : getEnvOrThrow('APPLE_KEY_ID'),
    applePrivateKey: isDev
      ? getEnvOrDefault('APPLE_PRIVATE_KEY', '')
      : getEnvOrThrow('APPLE_PRIVATE_KEY'),
    appleRedirectUri: isDev
      ? getEnvOrDefault('APPLE_REDIRECT_URI', 'http://localhost:5173/auth/apple/callback')
      : getEnvOrThrow('APPLE_REDIRECT_URI')
  };
}

export const config = loadConfig();
