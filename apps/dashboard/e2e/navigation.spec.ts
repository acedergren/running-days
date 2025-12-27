import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 *
 * Tests navigation patterns when unauthenticated.
 * For authenticated navigation tests, run with a test API server.
 */

test.describe('Navigation (unauthenticated)', () => {
  test('all protected routes redirect to login', async ({ page }) => {
    const protectedRoutes = ['/', '/insights', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });

  test('login page is accessible directly', async ({ page }) => {
    await page.goto('/auth/login');

    // Should stay on login page, not redirect
    await expect(page).toHaveURL('/auth/login');
    await expect(page).toHaveTitle('Sign In - Running Days');
  });

  test('browser back button works on login page', async ({ page }) => {
    // Navigate through redirects
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);

    // Go to login directly
    await page.goto('/auth/login');

    // Navigate somewhere that redirects
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/auth\/login/);

    // Back should still work
    await page.goBack();
  });
});

test.describe('Login page links and elements', () => {
  test('login page has proper structure', async ({ page }) => {
    await page.goto('/auth/login');

    // Main content area exists
    await expect(page.locator('main, [role="main"], .min-h-screen').first()).toBeVisible();

    // Logo/icon area exists
    await expect(page.locator('[class*="rounded-xl"]').first()).toBeVisible();

    // Form/card area exists
    await expect(page.locator('[class*="rounded-2xl"]').first()).toBeVisible();
  });

  test('login page is responsive', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/login');

    await expect(page.getByRole('button', { name: /Sign in with Apple/i })).toBeVisible();

    // Test on tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('button', { name: /Sign in with Apple/i })).toBeVisible();

    // Test on desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: /Sign in with Apple/i })).toBeVisible();
  });
});
