/**
 * Apple Sign-In Authentication
 *
 * Implements OAuth 2.0 + OIDC flow with:
 * - PKCE (RFC 7636) for authorization code protection
 * - Nonce validation for ID token replay prevention
 * - Short-lived client secrets (10 minutes)
 */

import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { config } from '../config.js';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const CLIENT_SECRET_TTL_SECONDS = 600; // 10 minutes
const ID_TOKEN_MAX_AGE_SECONDS = 600; // Reject tokens older than 10 minutes
const FETCH_TIMEOUT_MS = 15000;

export interface AppleUserInfo {
  sub: string;           // Stable user ID
  email?: string;        // May be relay address
  emailVerified?: boolean;
  isPrivateEmail?: boolean;
}

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

// ============================================================================
// PKCE HELPERS
// ============================================================================

/**
 * Generate a cryptographically secure PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier using S256 method
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a cryptographically secure nonce for ID token binding
 */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a CSRF state token
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

// ============================================================================
// APPLE AUTH FUNCTIONS
// ============================================================================

/**
 * Generate client_secret JWT for Apple authentication
 */
async function generateClientSecret(): Promise<string> {
  if (!config.applePrivateKey || !config.appleKeyId || !config.appleTeamId || !config.appleClientId) {
    throw new Error('Apple Sign-In is not configured');
  }

  const privateKey = await importPKCS8(
    config.applePrivateKey.replace(/\\n/g, '\n'),
    'ES256'
  );

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.appleKeyId })
    .setIssuedAt(now)
    .setExpirationTime(now + CLIENT_SECRET_TTL_SECONDS)
    .setAudience('https://appleid.apple.com')
    .setIssuer(config.appleTeamId)
    .setSubject(config.appleClientId)
    .sign(privateKey);
}

/**
 * Generate Apple Sign-In authorization URL
 */
export function getAppleAuthUrl(
  state: string,
  codeChallenge: string,
  nonce: string
): string {
  if (!config.appleClientId) {
    throw new Error('Apple Sign-In is not configured');
  }

  const params = new URLSearchParams({
    client_id: config.appleClientId,
    redirect_uri: config.appleRedirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    nonce
  });

  return `${APPLE_AUTH_URL}?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  authorizationCode: string,
  codeVerifier: string
): Promise<AppleTokenResponse> {
  const clientSecret = await generateClientSecret();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.appleClientId,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: config.appleRedirectUri,
        code_verifier: codeVerifier
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Apple token exchange failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify and decode Apple's identity token
 */
async function verifyIdentityToken(
  idToken: string,
  expectedNonce: string
): Promise<AppleUserInfo> {
  const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: config.appleClientId
  });

  // Validate required claims
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Missing or invalid sub claim in ID token');
  }

  // Validate nonce
  if (payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch - possible replay attack');
  }

  // Validate token freshness
  const iat = payload.iat;
  if (typeof iat !== 'number') {
    throw new Error('Missing iat claim in ID token');
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - iat > ID_TOKEN_MAX_AGE_SECONDS) {
    throw new Error('ID token too old - possible replay attack');
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    emailVerified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    isPrivateEmail: typeof payload.is_private_email === 'boolean' ? payload.is_private_email : undefined
  };
}

/**
 * Full authentication flow: exchange code and verify token
 */
export async function authenticateWithApple(
  authorizationCode: string,
  codeVerifier: string,
  expectedNonce: string
): Promise<AppleUserInfo> {
  const tokens = await exchangeCodeForTokens(authorizationCode, codeVerifier);
  return verifyIdentityToken(tokens.id_token, expectedNonce);
}
