import { createBackend } from '@backstage/backend-defaults';
import { legacyPlugin } from '@backstage/backend-common';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend/alpha'));
backend.add(import('@backstage/plugin-proxy-backend/alpha'))
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));
backend.add(
  import('@roadiehq/scaffolder-backend-module-http-request/new-backend'),
);

// auth plugin
// TODO: switch to new backend together with perms when ready
backend.add(legacyPlugin('auth', import('./plugins/auth')));

// catalog plugin
// TODO switch to new catalog backend once @janus-idp/backstage-plugin-keycloak-backend supports transformers
backend.add(legacyPlugin('catalog', import('./plugins/catalog')));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend/alpha'));
backend.add(import('@internal/backstage-plugin-permission-backend-module-rabe'));

// search plugin
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));

// todo plugin
backend.add(import('@backstage-community/plugin-todo-backend'));

// dev plugin
backend.add(import('@backstage/plugin-devtools-backend'));

backend.start();
