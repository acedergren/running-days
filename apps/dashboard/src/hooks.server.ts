/**
 * Server Hooks for Authentication
 * Validates JWT tokens and populates user in locals
 */

import type { Handle } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createApiClient, ApiError } from '$lib/api-client';

/**
 * Cookies we accept from API responses.
 * Prevents the API from setting arbitrary cookies on the user's browser.
 */
const ALLOWED_SET_COOKIES = ['rd_access_token', 'rd_refresh_token'];

/**
 * Parse and validate Set-Cookie headers from API response.
 * Only sets cookies that are in the allowlist.
 */
function forwardApiCookies(response: Response, cookies: Cookies): void {
  // getSetCookie() returns all Set-Cookie headers as an array
  const setCookieHeaders = response.headers.getSetCookie?.() || [];

  for (const setCookieHeader of setCookieHeaders) {
    // Parse cookie name and value (format: "name=value; attributes...")
    const [nameValue] = setCookieHeader.split(';');
    if (!nameValue) continue;

    const equalsIndex = nameValue.indexOf('=');
    if (equalsIndex === -1) continue;

    const name = nameValue.slice(0, equalsIndex).trim();
    const value = nameValue.slice(equalsIndex + 1);

    // Only set allowed cookies (security: prevent arbitrary cookie injection)
    if (!ALLOWED_SET_COOKIES.includes(name)) {
      console.warn(`Ignoring unexpected cookie from API: ${name}`);
      continue;
    }

    // Set the cookie with secure defaults
    cookies.set(name, value, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
  }
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/apple',           // Apple Sign-In initiation
  '/auth/apple/callback',  // Apple Sign-In callback
  '/api'                   // API routes handled separately
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export const handle: Handle = async ({ event, resolve }) => {
  const { cookies, url } = event;

  // Get cookies to forward to API
  const cookieHeader = cookies.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  // Create API client with cookies
  const api = createApiClient(cookieHeader);
  event.locals.api = api;
  event.locals.user = null;

  // Try to get current user from API
  try {
    const user = await api.getCurrentUser();
    event.locals.user = user;
  } catch (error) {
    // If unauthorized and not on public route, try to refresh
    if (error instanceof ApiError && error.isUnauthorized) {
      // Try to refresh the token
      try {
        const { response } = await api.refreshToken();

        // Forward validated cookies from the refresh response
        forwardApiCookies(response, cookies);

        // Retry getting the user with the new cookies
        const newCookieHeader = cookies.getAll()
          .map(c => `${c.name}=${c.value}`)
          .join('; ');
        const newApi = createApiClient(newCookieHeader);
        event.locals.api = newApi;
        event.locals.user = await newApi.getCurrentUser();
      } catch {
        // Refresh failed, user is not authenticated
        event.locals.user = null;
      }
    }
  }

  // Protect non-public routes
  if (!isPublicRoute(url.pathname) && !event.locals.user) {
    const returnTo = url.pathname + url.search;
    throw redirect(303, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return resolve(event);
};
