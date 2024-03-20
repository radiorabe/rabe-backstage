import {
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { RaBePermissionPolicy } from './policy';


export const permissionModuleRabe = createBackendModule({
  pluginId: 'permission',
  moduleId: 'rabe',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new RaBePermissionPolicy());
      },
    });
  },
});
