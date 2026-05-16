import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { ForemanProvider } from './ForemanProvider';

export const catalogModuleForeman = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'foreman',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, scheduler, config }) {
        // If the operator hasn't configured a Foreman endpoint at all we
        // simply log a warning and do nothing.  This allows teams to deploy
        // the backend without having to provide dummy values in every
        // environment.
        if (!config.has('catalog.providers.foreman')) {
          logger.warn('Foreman provider not configured; skipping initialization');
          return;
        }

        // Read configuration from the `catalog.providers.foreman` subtree.
        const foremanConfig = config.getConfig('catalog.providers.foreman');

        // scheduler configuration may live under a `schedule` subtree
        // or fall back to sensible defaults otherwise.
        const scheduleCfg =
          foremanConfig.getOptionalConfig('schedule');
        // configuration API is loose with JSON values, but the scheduler
        // types are strict.  Cast to `any` here so that TypeScript will
        // accept whatever the user happened to put in the config, with a
        // fallback to our sane defaults.
        const frequency: any =
          scheduleCfg?.getOptional('frequency') ?? { minutes: 30 };
        const timeout: any =
          scheduleCfg?.getOptional('timeout') ?? { minutes: 1 };
        const initialDelay: any = scheduleCfg?.getOptional('initialDelay');
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency,
          timeout,
          initialDelay,
        });

        const foreman = new ForemanProvider(foremanConfig, logger, taskRunner);
        catalog.addEntityProvider(foreman);
        logger.info('registered Foreman entity provider');
      },
    });
  },
});
