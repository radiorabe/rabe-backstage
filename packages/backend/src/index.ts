import { createBackend } from '@backstage/backend-defaults';
import { legacyPlugin } from '@backstage/backend-common';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend/alpha'));
backend.add(import('@backstage/plugin-proxy-backend/alpha'))
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));
// TODO switch to new catalog backend once @roadiehq/scaffolder-backend-module-http-request supports it
// https://github.com/RoadieHQ/roadie-backstage-plugins/issues/1294
backend.add(legacyPlugin('scaffolder', import('./plugins/scaffolder')));

// auth plugin
// TODO: switch to new backend together with perms when ready
backend.add(legacyPlugin('auth', import('./plugins/auth')));

// catalog plugin
// TODO switch to new catalog backend once @janus-idp/backstage-plugin-keycloak-backend supports transformers
backend.add(legacyPlugin('catalog', import('./plugins/catalog')));

// permission plugin
// TODO: switch to new catalog backend once docs for @backstage/plugin-permission-backend are available
backend.add(legacyPlugin('permission', import('./plugins/permission')));

// search plugin
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));

// todo plugin
backend.add(import('@backstage/plugin-todo-backend'));

// dev plugin
backend.add(import('@backstage/plugin-devtools-backend'));

backend.start();
