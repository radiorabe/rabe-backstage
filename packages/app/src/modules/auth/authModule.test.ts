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

  it('includes guest provider when auth.environment is undefined', () => {
    const providers = getSignInProviders(undefined);

    expect(providers).toContain('guest');
  });

  it('always includes the OIDC provider as first entry', () => {
    const providers = getSignInProviders('production');
    const oidcProvider = providers[0];

    expect(typeof oidcProvider).toBe('object');
    expect(oidcProvider).toMatchObject({
      id: 'oidc-auth-provider',
      title: 'RaBe SSO',
      message: 'Sign in with your RaBe Keycloak account',
    });
  });
});
