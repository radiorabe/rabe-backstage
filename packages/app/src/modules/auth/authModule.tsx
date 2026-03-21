/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-FileCopyrightText: 2024 Radio Bern RaBe <https://rabe.ch>
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  createFrontendModule,
  ApiBlueprint,
  configApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
  useApi,
} from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { OAuth2 } from '@backstage/core-app-api';
import { oidcAuthApiRef } from './oidcAuthApiRef';
import type { SignInPageProps } from '@backstage/core-plugin-api';

type SignInProvider =
  | 'guest'
  | { id: string; title: string; message: string; apiRef: typeof oidcAuthApiRef };

const oidcApiExtension = ApiBlueprint.make({
  name: 'oidc',
  params: defineParams =>
    defineParams({
      api: oidcAuthApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
        OAuth2.create({
          discoveryApi,
          oauthRequestApi,
          configApi,
          provider: {
            id: 'oidc',
            title: 'RaBe SSO',
            icon: () => null,
          },
          defaultScopes: ['openid', 'profile', 'email', 'offline_access'],
        }),
    }),
});

const rabeSignInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => {
      const RabeSignInPage = (props: SignInPageProps) => {
        const configApi = useApi(configApiRef);
        // Show Guest only in non-production environments (dev, CI).
        // auth.environment is set to 'development' in app-config.yaml and
        // overridden to 'production' in app-config.production.yaml.
        const isDev =
          configApi.getOptionalString('auth.environment') !== 'production';
        const providers: SignInProvider[] = [
          {
            id: 'oidc-auth-provider',
            title: 'RaBe SSO',
            message: 'Sign in with your RaBe Keycloak account',
            apiRef: oidcAuthApiRef,
          },
          ...(isDev ? (['guest'] as const) : []),
        ];
        return <SignInPage {...props} providers={providers} />;
      };
      return RabeSignInPage;
    },
  },
});

export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [oidcApiExtension, rabeSignInPage],
});
