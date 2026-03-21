/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { test, expect, type Page } from '@playwright/test';

// Extra time for Backstage to poll popup.closed and update React state.
const AUTH_ERROR_TIMEOUT_MS = 15_000;
// Tolerance for the ~214-pixel layout shift caused by the error text
// inserting into the card and nudging the Sign In button by ~1 px.
const AUTH_ERROR_MAX_DIFF_PIXELS = 300;

/** Sign in as a Guest (accepts the backend-unavailable fallback dialog). */
async function signInAsGuest(page: Page) {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter' }).click();
}

/** Dismiss any visible error alert dialogs (e.g. backend-unavailable notices). */
async function dismissAlerts(page: Page) {
  for (const alert of await page.getByRole('alertdialog').all()) {
    const closeButton = alert.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}

test('App should render the sign-in screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RaBe Backstage/);

  // OIDC sign-in button is always visible.
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  // Guest sign-in button is visible in dev / CI (auth.environment = development).
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible();

  await expect(page).toHaveScreenshot('login-page.png');
});

test('Sign-in should show an auth error when no IdP is available', async ({
  page,
  context,
}) => {
  // Register handler before navigating so auto sign-in popups are also closed.
  context.on('page', async popup => {
    await popup.close();
  });

  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign In' });
  await expect(signInButton).toBeVisible();

  // Wait for the initial auto sign-in attempt to settle before clicking.
  await page.waitForLoadState('networkidle');

  await signInButton.click();

  // Backstage polls popup.closed on an interval, so allow extra time.
  await expect(page.getByText('Login failed, popup was closed')).toBeVisible({
    timeout: AUTH_ERROR_TIMEOUT_MS,
  });

  // Wait for the layout to settle after the error text causes a reflow.
  await expect(signInButton).toBeVisible();

  await expect(page).toHaveScreenshot('login-auth-error.png', {
    maxDiffPixels: AUTH_ERROR_MAX_DIFF_PIXELS,
  });
});

test('Guest sign-in should load the catalog page', async ({ page }) => {
  await signInAsGuest(page);

  await expect(
    page.getByRole('heading', { name: 'Radio Bern RaBe Catalog' }),
  ).toBeVisible();

  await dismissAlerts(page);

  // Mask inline alert banners – catalog entity/kind fetches fail in CI because
  // the backend is not running during frontend-only Playwright tests.
  await expect(page).toHaveScreenshot('catalog-page.png', {
    mask: [page.getByRole('alert')],
  });
});

test('Settings page should be accessible after sign-in', async ({ page }) => {
  await signInAsGuest(page);

  await page.getByRole('link', { name: 'Settings' }).click();

  await expect(
    page.getByRole('heading', { name: 'Settings' }),
  ).toBeVisible();

  await expect(page).toHaveScreenshot('settings-page.png');
});
