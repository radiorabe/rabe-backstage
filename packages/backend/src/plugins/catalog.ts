import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
import { UnprocessedEntitiesModule } from '@backstage/plugin-catalog-backend-module-unprocessed';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

import { GithubEntityProvider } from '@backstage/plugin-catalog-backend-module-github';
// @ts-ignore
import { GroupTransformer, UserTransformer, KeycloakOrgEntityProvider } from '@janus-idp/backstage-plugin-keycloak-backend';

// todo: move this to config if it starts growing
const GROUP_ALLOW_REGEX = /(it-reaktion|webteam)/

const userTransformer: UserTransformer = async (
  entity: any,
) => {
  // for data economy reasons we only keep relevant groups
  entity.spec.memberOf = entity.spec.memberOf.filter((x: string) => x.match(GROUP_ALLOW_REGEX))
  // this lets us remove users that do not need to have a profile in backstage
  if (entity.spec.memberOf.length == 0) return null
  return entity;
};

const groupTransformer: GroupTransformer = async (
  entity: any,
) => {
  // for data economy reasons we only create relevant groups
  if (!entity.metadata.name.match(GROUP_ALLOW_REGEX)) return null
  // hax: we want a nice link so we hardcode most of it :)
  entity.metadata.links =  [
    {
      title: "IPA",
      // todo: un-hardcode this uwu
      url: `https://ipa-01.service.int.rabe.ch/ipa/ui/#/e/group/details/${entity.metadata.name}`,
      icon: "group"
    }
  ]
  return entity;
};

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
  // Import group and user entities from our Keycloak federation
  builder.addEntityProvider(
    KeycloakOrgEntityProvider.fromConfig(env.config, {
      id: 'production',
      logger: env.logger,
      scheduler: env.scheduler,
      userTransformer,
      groupTransformer,
    }),
  );
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  const { processingEngine, router } = await builder.build();
  const unprocessed = new UnprocessedEntitiesModule(
    await env.database.getClient(),
    router,
  );
  unprocessed.registerRoutes();
  await processingEngine.start();
  return router;
}
