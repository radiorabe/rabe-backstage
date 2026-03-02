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
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: scheduleCfg?.get('frequency') ?? { minutes: 30 },
          timeout: scheduleCfg?.get('timeout') ?? { minutes: 1 },
        });

        const foreman = new ForemanProvider(foremanConfig, logger, taskRunner);
        catalog.addEntityProvider(foreman);
        logger.info('registered Foreman entity provider');
      },
    });
  },
});
