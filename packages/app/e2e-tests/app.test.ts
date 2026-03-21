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

test('App should render the sign-in screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RaBe Backstage/);

  const enterButton = page.getByRole('button', { name: 'Enter' });
  await expect(enterButton).toBeVisible();

  await expect(page).toHaveScreenshot('login-page.png');
});

test('Guest sign-in should navigate to the main application', async ({ page }) => {
  // Accept any browser confirm dialogs (e.g. fallback to legacy guest token when the auth backend is unavailable)
  page.on('dialog', dialog => dialog.accept());

  await page.goto('/');

  const enterButton = page.getByRole('button', { name: 'Enter' });
  await expect(enterButton).toBeVisible();

  await enterButton.click();

  // After sign-in, the catalog heading should be visible
  await expect(page.getByRole('heading', { name: 'Radio Bern RaBe Catalog' })).toBeVisible();
});
