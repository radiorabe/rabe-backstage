import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'))
backend.add(import('@backstage/plugin-techdocs-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(
  import('@roadiehq/scaffolder-backend-module-http-request/new-backend'),
);

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
backend.add(
  import('@backstage-community/plugin-catalog-backend-module-keycloak'),
);
backend.add(import('@internal/backstage-plugin-catalog-backend-module-transformer'))

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@internal/backstage-plugin-permission-backend-module-rabe'));

// search plugin
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// todo plugin
backend.add(import('@backstage-community/plugin-todo-backend'));

// dev plugin
backend.add(import('@backstage/plugin-devtools-backend'));

backend.start();
