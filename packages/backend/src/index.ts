import { createBackend } from '@backstage/backend-defaults';
import { legacyPlugin } from '@backstage/backend-common';

const backend = createBackend();

// spa
backend.add(import('@backstage/plugin-app-backend/alpha'));

// auth and perms
// TODO: switch to new backend together with perms when ready
backend.add(legacyPlugin('auth', import('./plugins/auth')));
// TODO: switch to new catalog backend once docs for @backstage/plugin-permission-backend are available
backend.add(legacyPlugin('permission', import('./plugins/permission')));

// catalog and templates
// TODO switch to new catalog backend once @janus-idp/backstage-plugin-keycloak-backend supports transformers
backend.add(legacyPlugin('catalog', import('./plugins/catalog')));
// TODO switch to new catalog backend once @roadiehq/scaffolder-backend-module-http-request supports it
backend.add(legacyPlugin('scaffolder', import('./plugins/scaffolder')));
backend.add(import('@backstage/plugin-proxy-backend/alpha'))

// docs and search
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));
backend.add(import('@backstage/plugin-todo-backend'));

// dev
backend.add(import('@backstage/plugin-devtools-backend'));

backend.start();
