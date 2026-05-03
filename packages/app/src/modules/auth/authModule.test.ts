/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-FileCopyrightText: 2026 Radio Bern RaBe <https://rabe.ch>
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getSignInProviders } from './signInProviders';

describe('getSignInProviders', () => {
  it('includes guest provider in development', () => {
    const providers = getSignInProviders('development');

    expect(providers).toContain('guest');
  });

  it('does not include guest provider in production', () => {
    const providers = getSignInProviders('production');

    expect(providers).not.toContain('guest');
  });
});
