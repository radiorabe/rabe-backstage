import {
    createRouter,
    buildTechInsightsContext,
    createFactRetrieverRegistration,
    entityMetadataFactRetriever,
    entityOwnershipFactRetriever,
    techdocsFactRetriever,
} from '@backstage/plugin-tech-insights-backend';
import {
    JsonRulesEngineFactCheckerFactory,
    JSON_RULE_ENGINE_CHECK_TYPE,
} from '@backstage/plugin-tech-insights-backend-module-jsonfc';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

const ttlTwoWeeks = { timeToLive: { weeks: 2 } };


export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {
    const builder = buildTechInsightsContext({
        logger: env.logger,
        config: env.config,
        database: env.database,
        discovery: env.discovery,
        scheduler: env.scheduler,
        tokenManager: env.tokenManager,
        factRetrievers: [
            createFactRetrieverRegistration({
                cadence: '*/5 * * * *', // Run every 5 minutes - https://crontab.guru/#0_*/6_*_*_*
                factRetriever: entityOwnershipFactRetriever,
                lifecycle: ttlTwoWeeks,
            }),
            createFactRetrieverRegistration({
                cadence: '*/5 * * * *',
                factRetriever: entityMetadataFactRetriever,
                lifecycle: ttlTwoWeeks,
            }),
            createFactRetrieverRegistration({
                cadence: '*/5 * * * *',
                factRetriever: techdocsFactRetriever,
                lifecycle: ttlTwoWeeks,
            }),
        ],
        factCheckerFactory: new JsonRulesEngineFactCheckerFactory({
            logger: env.logger,
            checks: [
                {
                    id: 'groupOwnerCheck',
                    type: JSON_RULE_ENGINE_CHECK_TYPE,
                    name: 'Group Owner Check',
                    description:
                        'Verifies that a Group has been set as the owner for this entity',
                    factIds: ['entityOwnershipFactRetriever'],
                    rule: {
                        conditions: {
                            all: [
                                {
                                    fact: 'hasGroupOwner',
                                    operator: 'equal',
                                    value: true,
                                },
                            ],
                        },
                    },
                },
                {
                    id: 'titleCheck',
                    type: JSON_RULE_ENGINE_CHECK_TYPE,
                    name: 'Title Check',
                    description:
                        'Verifies that a Title, used to improve readability, has been set for this entity',
                    factIds: ['entityMetadataFactRetriever'],
                    rule: {
                        conditions: {
                            all: [
                                {
                                    fact: 'hasTitle',
                                    operator: 'equal',
                                    value: true,
                                },
                            ],
                        },
                    },
                },
                {
                    id: 'descriptionCheck',
                    type: JSON_RULE_ENGINE_CHECK_TYPE,
                    name: 'Description Check',
                    description:
                        'Verifies that a Description, used to explain context, has been set for this entity',
                    factIds: ['entityMetadataFactRetriever'],
                    rule: {
                        conditions: {
                            all: [
                                {
                                    fact: 'hasDescription',
                                    operator: 'equal',
                                    value: true,
                                },
                            ],
                        },
                    },
                },
                {
                    id: 'techDocsCheck',
                    type: JSON_RULE_ENGINE_CHECK_TYPE,
                    name: 'TechDocs Check',
                    description:
                        'Verifies that TechDocs has been enabled for this entity',
                    factIds: ['techdocsFactRetriever'],
                    rule: {
                        conditions: {
                            all: [
                                {
                                    fact: 'hasAnnotationBackstageIoTechdocsRef',
                                    operator: 'equal',
                                    value: true,
                                },
                            ],
                        },
                    },
                },
            ],
        }),
    });

    return await createRouter({
        ...(await builder),
        logger: env.logger,
        config: env.config,
    });
}
