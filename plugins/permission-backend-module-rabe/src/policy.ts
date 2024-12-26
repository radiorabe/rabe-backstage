import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import {
    AuthorizeResult,
    PolicyDecision,
    isPermission,
} from '@backstage/plugin-permission-common';
import {
    PermissionPolicy,
    PolicyQuery,
} from '@backstage/plugin-permission-node';

import {
    devToolsPermissions,
} from '@backstage/plugin-devtools-common';


const BACKSTAGE_ADMINS_GROUP = 'group:default/it-reaktion';

export class RaBePermissionPolicy implements PermissionPolicy {
    async handle(request: PolicyQuery, user?: BackstageIdentityResponse): Promise<PolicyDecision> {

        for (const [_, devToolsPermission] of Object.entries(devToolsPermissions)) {
            if (isPermission(request.permission, devToolsPermission)) {
                if (
                    user?.identity.ownershipEntityRefs.includes(
                        BACKSTAGE_ADMINS_GROUP,
                    )
                ) {
                    return { result: AuthorizeResult.ALLOW };
                }
                return { result: AuthorizeResult.DENY };
            }
        }
        return { result: AuthorizeResult.ALLOW };
    }
}
