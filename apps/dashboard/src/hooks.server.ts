/**
 * Server Hooks for Authentication
 * Validates JWT tokens and populates user in locals
 */

import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createApiClient, ApiError } from '$lib/api-client';

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

        // Forward the new cookies from the refresh response
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          // Parse and set the new cookies
          const cookieParts = setCookieHeader.split(';')[0].split('=');
          if (cookieParts.length >= 2) {
            cookies.set(cookieParts[0], cookieParts.slice(1).join('='), {
              path: '/',
              httpOnly: true,
              secure: true,
              sameSite: 'lax'
            });
          }
        }

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
