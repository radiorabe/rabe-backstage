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
import { test, expect } from '@playwright/test';

// Extra time for Backstage to poll popup.closed and update React state.
const AUTH_ERROR_TIMEOUT_MS = 15_000;
// Tolerance for the ~214-pixel layout shift caused by the error text
// inserting into the card and nudging the Sign In button by ~1 px.
const AUTH_ERROR_MAX_DIFF_PIXELS = 300;

test('App should render the sign-in screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RaBe Backstage/);

  const signInButton = page.getByRole('button', { name: 'Sign In' });
  await expect(signInButton).toBeVisible();

  await expect(page).toHaveScreenshot('login-page.png');
});

test('Sign-in should show an auth error when no IdP is available', async ({ page, context }) => {
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

  await expect(page).toHaveScreenshot('login-auth-error.png', { maxDiffPixels: AUTH_ERROR_MAX_DIFF_PIXELS });
});
