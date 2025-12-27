/**
 * Sign in with Apple Authentication
 *
 * Flow:
 * 1. Client initiates Apple Sign-In → gets authorization code
 * 2. Server exchanges code for identity token (with PKCE verification)
 * 3. Server validates token and extracts user info (with nonce validation)
 * 4. Server creates session
 *
 * Security features:
 * - PKCE (RFC 7636) for authorization code protection
 * - Nonce validation for ID token replay prevention
 * - Short-lived client secrets (10 minutes)
 */

import { env } from '$env/dynamic/private';
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'jose';
import { randomBytes, createHash } from 'crypto';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const FETCH_TIMEOUT_MS = 15000; // 15 seconds
const CLIENT_SECRET_TTL_SECONDS = 600; // 10 minutes (was 180 days)
const ID_TOKEN_MAX_AGE_SECONDS = 600; // Reject tokens older than 10 minutes

interface AppleTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	id_token: string;
}

export interface AppleUserInfo {
	sub: string;           // Stable user ID
	email?: string;        // May be relay address
	email_verified?: boolean;
	is_private_email?: boolean;
}

// ============================================================================
// PKCE HELPERS
// ============================================================================

/**
 * Generate a cryptographically secure PKCE code verifier
 * RFC 7636 requires 43-128 characters from unreserved URI characters
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
 * Get required environment variable or throw
 */
function getRequiredEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

/**
 * Generate client_secret JWT for Apple authentication
 * Apple requires a signed JWT instead of a static secret
 */
async function generateClientSecret(): Promise<string> {
	const applePrivateKey = getRequiredEnv('APPLE_PRIVATE_KEY');
	const appleKeyId = getRequiredEnv('APPLE_KEY_ID');
	const appleTeamId = getRequiredEnv('APPLE_TEAM_ID');
	const appleClientId = getRequiredEnv('APPLE_CLIENT_ID');

	const privateKey = await importPKCS8(
		applePrivateKey.replace(/\\n/g, '\n'),
		'ES256'
	);

	const now = Math.floor(Date.now() / 1000);

	return new SignJWT({})
		.setProtectedHeader({ alg: 'ES256', kid: appleKeyId })
		.setIssuedAt(now)
		.setExpirationTime(now + CLIENT_SECRET_TTL_SECONDS) // 10 minutes - minimize exposure window
		.setAudience('https://appleid.apple.com')
		.setIssuer(appleTeamId)
		.setSubject(appleClientId)
		.sign(privateKey);
}

/**
 * Exchange authorization code for tokens
 * @param authorizationCode - The authorization code from Apple
 * @param redirectUri - The redirect URI used in the authorization request
 * @param codeVerifier - PKCE code verifier (must match the challenge sent in auth request)
 */
export async function exchangeCodeForTokens(
	authorizationCode: string,
	redirectUri: string,
	codeVerifier: string
): Promise<AppleTokenResponse> {
	const clientSecret = await generateClientSecret();

	// Add timeout to prevent hanging requests
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const appleClientId = getRequiredEnv('APPLE_CLIENT_ID');

		const response = await fetch(APPLE_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: appleClientId,
				client_secret: clientSecret,
				code: authorizationCode,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri,
				code_verifier: codeVerifier // PKCE: prove we initiated this request
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			// Don't log full error response - may contain sensitive data
			throw new Error(`Apple token exchange failed: ${response.status}`);
		}

		return response.json();
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Verify and decode Apple's identity token
 * @param idToken - The ID token from Apple
 * @param expectedNonce - The nonce we sent in the auth request (for replay protection)
 */
export async function verifyIdentityToken(
	idToken: string,
	expectedNonce: string
): Promise<AppleUserInfo> {
	const appleClientId = getRequiredEnv('APPLE_CLIENT_ID');
	const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

	const { payload } = await jwtVerify(idToken, JWKS, {
		issuer: 'https://appleid.apple.com',
		audience: appleClientId
	});

	// Validate required claims exist
	if (typeof payload.sub !== 'string' || !payload.sub) {
		throw new Error('Missing or invalid sub claim in ID token');
	}

	// Validate nonce to prevent replay attacks
	if (payload.nonce !== expectedNonce) {
		throw new Error('Nonce mismatch - possible replay attack');
	}

	// Validate token freshness (reject tokens older than 10 minutes)
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
		email_verified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
		is_private_email: typeof payload.is_private_email === 'boolean' ? payload.is_private_email : undefined
	};
}

/**
 * Full authentication flow: exchange code and verify token
 * @param authorizationCode - The authorization code from Apple
 * @param redirectUri - The redirect URI used in the authorization request
 * @param codeVerifier - PKCE code verifier
 * @param expectedNonce - The nonce we sent (for replay protection)
 */
export async function authenticateWithApple(
	authorizationCode: string,
	redirectUri: string,
	codeVerifier: string,
	expectedNonce: string
): Promise<AppleUserInfo> {
	const tokens = await exchangeCodeForTokens(authorizationCode, redirectUri, codeVerifier);
	return verifyIdentityToken(tokens.id_token, expectedNonce);
}

/**
 * Generate Apple Sign-In authorization URL with PKCE and nonce
 * @param redirectUri - Where Apple should redirect after auth
 * @param state - CSRF protection token
 * @param codeChallenge - PKCE code challenge (S256 hash of verifier)
 * @param nonce - Nonce for ID token binding
 */
export function getAppleAuthUrl(
	redirectUri: string,
	state: string,
	codeChallenge: string,
	nonce: string
): string {
	const appleClientId = getRequiredEnv('APPLE_CLIENT_ID');

	const params = new URLSearchParams({
		client_id: appleClientId,
		redirect_uri: redirectUri,
		response_type: 'code id_token', // Request ID token for nonce validation
		response_mode: 'form_post',
		scope: 'email',
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		nonce
	});

	return `https://appleid.apple.com/auth/authorize?${params}`;
}
