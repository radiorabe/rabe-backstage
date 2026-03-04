/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  techdocsPublisherExtensionPoint,
  PublisherType,
} from '@backstage/plugin-techdocs-node';
import { GithubPagesPublisher } from './GithubPagesPublisher';

/**
 * A Backstage backend module that registers a TechDocs publisher which reads
 * pre-built documentation directly from GitHub Pages.
 *
 * Activate this module by setting the following in `app-config.yaml`:
 *
 * ```yaml
 * techdocs:
 *   builder: external
 *   publisher:
 *     type: githubPages
 *     githubPages:
 *       baseUrl: https://<org>.github.io
 * ```
 *
 * @public
 */
export const techdocsModuleGithubPages = createBackendModule({
  pluginId: 'techdocs',
  moduleId: 'github-pages-publisher',
  register(reg) {
    reg.registerInit({
      deps: {
        publisher: techdocsPublisherExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ publisher, config, logger }) {
        publisher.registerPublisher(
          // 'githubPages' is a custom type not in the PublisherType union, but
          // the runtime implementation is a plain string map so this works.
          'githubPages' as unknown as PublisherType,
          GithubPagesPublisher.fromConfig(config, logger),
        );
      },
    });
  },
});
