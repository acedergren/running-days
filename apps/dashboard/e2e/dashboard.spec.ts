import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * NOTE: These tests require the API to be running and return mock data.
 * For CI, you can either:
 * 1. Run a test API server with fixtures
 * 2. Use environment variables to enable test mode
 * 3. Skip these tests in CI and run only auth tests
 *
 * Currently, these tests verify behavior when unauthenticated.
 */

test.describe('Dashboard (unauthenticated)', () => {
  test('redirects to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page).toHaveTitle('Sign In - Running Days');
  });

  test('returnTo parameter preserves intended destination', async ({ page }) => {
    await page.goto('/');

    // URL should contain returnTo with the original path
    await expect(page).toHaveURL(/returnTo=%2F/);
  });

  test('returnTo preserves settings page destination', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/returnTo=%2Fsettings/);
  });

  test('returnTo preserves insights page destination', async ({ page }) => {
    await page.goto('/insights');

    await expect(page).toHaveURL(/returnTo=%2Finsights/);
  });
});

test.describe('Login page navigation', () => {
  test('can navigate to login from any protected route', async ({ page }) => {
    // Start at dashboard (redirects to login)
    await page.goto('/');

    // Verify we're on login page
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    // Try insights (also redirects)
    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    // Try settings (also redirects)
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});
