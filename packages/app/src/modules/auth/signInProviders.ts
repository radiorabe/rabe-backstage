/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-FileCopyrightText: 2026 Radio Bern RaBe <https://rabe.ch>
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { oidcAuthApiRef } from './oidcAuthApiRef';

export type SignInProvider =
  | 'guest'
  | {
      id: string;
      title: string;
      message: string;
      apiRef: typeof oidcAuthApiRef;
    };

export function getSignInProviders(authEnvironment?: string): SignInProvider[] {
  const isDev = authEnvironment !== 'production';

  return [
    {
      id: 'oidc-auth-provider',
      title: 'RaBe SSO',
      message: 'Sign in with your RaBe Keycloak account',
      apiRef: oidcAuthApiRef,
    },
    ...(isDev ? (['guest'] as const) : []),
  ];
}
