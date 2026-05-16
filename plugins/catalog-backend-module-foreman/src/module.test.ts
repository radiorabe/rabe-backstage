import { catalogModuleForeman } from './module';
import { ConfigReader } from '@backstage/config';

// We'll reproduce the minimal portion of the backend-plugin-api that we
// need in order to exercise the module's registration logic.  When the
// framework invokes `register`, it provides an object with a
// `registerInit` method which accepts a callback.  We'll call that callback
// ourselves with a fake service container.

describe('catalogModuleForeman', () => {
  it('skips registration when not configured', async () => {
    const logger: any = { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() };
    const scheduler: any = { createScheduledTaskRunner: jest.fn() };
    const catalog: any = { addEntityProvider: jest.fn() };

    const rootConfig = ConfigReader.fromConfigs([]);

    // the imported module object should be defined
    expect(catalogModuleForeman).toBeDefined();

    // The backend feature object exposes a getRegistrations method which
    // runs the registration callback and returns the collected registrations.
    const regs: any[] = (catalogModuleForeman as any).getRegistrations();
    expect(Array.isArray(regs)).toBe(true);
    expect(regs).toHaveLength(1);

    const initFn = regs[0].init.func;
    expect(typeof initFn).toBe('function');

    // invoke the init function as the backend would
    await initFn({ catalog, logger, scheduler, config: rootConfig });

    // nothing should have been added, but a warning logged
    expect(catalog.addEntityProvider).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Foreman provider not configured; skipping initialization',
    );
  });
});
