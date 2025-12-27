import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');

    // Check page title
    await expect(page).toHaveTitle('Sign In - Running Days');

    // Check main elements are visible
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Apple/i })).toBeVisible();

    // Check branding (use first() since there are multiple matches)
    await expect(page.getByRole('heading', { name: 'Running Days' })).toBeVisible();
    await expect(page.getByText('Track your running year')).toBeVisible();
  });

  test('login page shows error message when auth_failed', async ({ page }) => {
    await page.goto('/auth/login?error=auth_failed');

    await expect(page.getByText('Authentication failed. Please try again.')).toBeVisible();
  });

  test('login page shows custom error message', async ({ page }) => {
    await page.goto('/auth/login?error=custom_error_message');

    await expect(page.getByText('custom_error_message')).toBeVisible();
  });

  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    // Without auth cookies, accessing dashboard should redirect to login
    await page.goto('/');

    // Should redirect to login with returnTo parameter
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated user is redirected from insights page', async ({ page }) => {
    await page.goto('/insights');

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated user is redirected from settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('login page has accessible button', async ({ page }) => {
    await page.goto('/auth/login');

    const button = page.getByRole('button', { name: /Sign in with Apple/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('login page shows Apple logo', async ({ page }) => {
    await page.goto('/auth/login');

    // The Apple logo is an SVG inside the button
    const button = page.getByRole('button', { name: /Sign in with Apple/i });
    const svg = button.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('login page footer text is visible', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByText('Track your running days, not streaks.')).toBeVisible();
  });

  test('login page security text is visible', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByText(/Your Apple ID is used securely/)).toBeVisible();
    await expect(page.getByText(/We never see your Apple password/)).toBeVisible();
  });
});
