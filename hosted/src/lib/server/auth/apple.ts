/**
 * Sign in with Apple Authentication
 *
 * Flow:
 * 1. Client initiates Apple Sign-In → gets authorization code
 * 2. Server exchanges code for identity token
 * 3. Server validates token and extracts user info
 * 4. Server creates session
 */

import { env } from '$env/dynamic/private';
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'jose';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const FETCH_TIMEOUT_MS = 15000; // 15 seconds

interface AppleTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	id_token: string;
}

interface AppleUserInfo {
	sub: string;           // Stable user ID
	email?: string;        // May be relay address
	email_verified?: boolean;
	is_private_email?: boolean;
}

/**
 * Generate client_secret JWT for Apple authentication
 * Apple requires a signed JWT instead of a static secret
 */
async function generateClientSecret(): Promise<string> {
	const privateKey = await importPKCS8(
		env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
		'ES256'
	);

	const now = Math.floor(Date.now() / 1000);

	return new SignJWT({})
		.setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
		.setIssuedAt(now)
		.setExpirationTime(now + 86400 * 180) // 180 days max
		.setAudience('https://appleid.apple.com')
		.setIssuer(env.APPLE_TEAM_ID)
		.setSubject(env.APPLE_CLIENT_ID)
		.sign(privateKey);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
	authorizationCode: string,
	redirectUri: string
): Promise<AppleTokenResponse> {
	const clientSecret = await generateClientSecret();

	// Add timeout to prevent hanging requests
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(APPLE_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: env.APPLE_CLIENT_ID,
				client_secret: clientSecret,
				code: authorizationCode,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Apple token exchange failed: ${error}`);
		}

		return response.json();
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Verify and decode Apple's identity token
 */
export async function verifyIdentityToken(idToken: string): Promise<AppleUserInfo> {
	const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

	const { payload } = await jwtVerify(idToken, JWKS, {
		issuer: 'https://appleid.apple.com',
		audience: env.APPLE_CLIENT_ID
	});

	return {
		sub: payload.sub as string,
		email: payload.email as string | undefined,
		email_verified: payload.email_verified as boolean | undefined,
		is_private_email: payload.is_private_email as boolean | undefined
	};
}

/**
 * Full authentication flow: exchange code and verify token
 */
export async function authenticateWithApple(
	authorizationCode: string,
	redirectUri: string
): Promise<AppleUserInfo> {
	const tokens = await exchangeCodeForTokens(authorizationCode, redirectUri);
	return verifyIdentityToken(tokens.id_token);
}

/**
 * Generate Apple Sign-In authorization URL
 */
export function getAppleAuthUrl(redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: env.APPLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'email',
		response_mode: 'form_post',
		state
	});

	return `https://appleid.apple.com/auth/authorize?${params}`;
}
