import { createRouter } from '@backstage/plugin-permission-backend';
import {
    AuthorizeResult,
    PolicyDecision,
    isPermission,
} from '@backstage/plugin-permission-common';
import { PermissionPolicy, PolicyQuery } from "@backstage/plugin-permission-node";
import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import {
    devToolsAdministerPermission,
    devToolsConfigReadPermission,
    devToolsExternalDependenciesReadPermission,
    devToolsInfoReadPermission,
} from '@backstage/plugin-devtools-common';
import { Router } from "express-serve-static-core";
import { PluginEnvironment } from "../types";


const BACKSTAGE_ADMINS_GROUP = 'group:default/backstage-admins';

class CustomPermissionPolicy implements PermissionPolicy {
    async handle(request: PolicyQuery, user?: BackstageIdentityResponse): Promise<PolicyDecision> {

        if (isPermission(request.permission, devToolsAdministerPermission)) {
            if (
                user?.identity.ownershipEntityRefs.includes(
                    BACKSTAGE_ADMINS_GROUP,
                )
            ) {
                return { result: AuthorizeResult.ALLOW };
            }
            return { result: AuthorizeResult.DENY };
        }

        if (isPermission(request.permission, devToolsInfoReadPermission)) {
            if (
                user?.identity.ownershipEntityRefs.includes(
                    BACKSTAGE_ADMINS_GROUP,
                )
            ) {
                return { result: AuthorizeResult.ALLOW };
            }
            return { result: AuthorizeResult.DENY };
        }

        if (isPermission(request.permission, devToolsConfigReadPermission)) {
            if (
                user?.identity.ownershipEntityRefs.includes(
                    BACKSTAGE_ADMINS_GROUP,
                )
            ) {
                return { result: AuthorizeResult.ALLOW };
            }
            return { result: AuthorizeResult.DENY };
        }

        if (
            isPermission(
                request.permission,
                devToolsExternalDependenciesReadPermission,
            )
        ) {
            if (
                user?.identity.ownershipEntityRefs.includes(
                    BACKSTAGE_ADMINS_GROUP,
                )
            ) {
                return { result: AuthorizeResult.ALLOW };
            }
            return { result: AuthorizeResult.DENY };
        }

        return { result: AuthorizeResult.ALLOW };
    }
}

export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {
    return await createRouter({
        config: env.config,
        logger: env.logger,
        discovery: env.discovery,
        policy: new CustomPermissionPolicy(),
        identity: env.identity,
    });
}