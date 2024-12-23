import {
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  GroupTransformer,
  keycloakTransformerExtensionPoint,
  UserTransformer,
} from '@backstage-community/plugin-catalog-backend-module-keycloak';

// todo: move this to config if it starts growing
const GROUP_ALLOW_REGEX = /(it-reaktion|webteam)/

const userTransformer: UserTransformer = async (entity) => {
  // for data economy reasons we only keep relevant groups
  entity.spec.memberOf = entity.spec.memberOf?.filter((x: string) => x.match(GROUP_ALLOW_REGEX))
  // this lets us remove users that do not need to have a profile in backstage
  if (entity.spec.memberOf?.length === 0) return undefined
  return entity;
};

const groupTransformer: GroupTransformer = async (entity) => {
  // for data economy reasons we only create relevant groups
  if (!entity.metadata.name.match(GROUP_ALLOW_REGEX)) return undefined
  // hax: we want a nice link so we hardcode most of it :)
  entity.metadata.links = [
    {
      title: "IPA",
      // todo: un-hardcode this uwu
      url: `https://ipa-01.service.int.rabe.ch/ipa/ui/#/e/group/details/${entity.metadata.name}`,
      icon: "group"
    }
  ]
  return entity;
};

export const catalogModuleTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'transformer',
  register(reg) {
    reg.registerInit({
      deps: {
        keycloak: keycloakTransformerExtensionPoint,
      },
      async init({ keycloak }) {
        keycloak.setUserTransformer(userTransformer);
        keycloak.setGroupTransformer(groupTransformer);
      },
    });
  },
});
