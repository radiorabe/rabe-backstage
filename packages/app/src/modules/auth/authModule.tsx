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
import { getSignInProviders } from './signInProviders';
import type { SignInPageProps } from '@backstage/core-plugin-api';

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
        const providers = getSignInProviders(
          configApi.getOptionalString('auth.environment'),
        );
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
