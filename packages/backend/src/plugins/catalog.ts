import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { UnprocessedEntitesModule } from '@backstage/plugin-catalog-backend-module-unprocessed';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

import { GithubEntityProvider } from '@backstage/plugin-catalog-backend-module-github';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  // Import decentrally defined catalog items from our GitHub repos
  builder.addEntityProvider(
    GithubEntityProvider.fromConfig(env.config, {
      logger: env.logger,
      scheduler: env.scheduler,
    }),
  );
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  const { processingEngine, router } = await builder.build();
  const unprocessed = new UnprocessedEntitesModule(
    await env.database.getClient(),
    router,
  );
  unprocessed.registerRoutes();
  await processingEngine.start();
  return router;
}
