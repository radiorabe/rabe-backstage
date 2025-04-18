import { CatalogUnprocessedEntitiesPage } from '@backstage/plugin-catalog-unprocessed-entities';
import {
    ConfigContent,
    InfoContent,
} from '@backstage/plugin-devtools';
import { DevToolsLayout } from '@backstage/plugin-devtools';

export const DevToolsPage = () => {
    return (
        <DevToolsLayout>
            <DevToolsLayout.Route path="info" title="Info">
                <InfoContent />
            </DevToolsLayout.Route>
            <DevToolsLayout.Route path="config" title="Config">
                <ConfigContent />
            </DevToolsLayout.Route>
            <DevToolsLayout.Route path="catalog-unprocessed-entities" title="Unprocessed Entities">
                <CatalogUnprocessedEntitiesPage />
            </DevToolsLayout.Route>
        </DevToolsLayout>
    );
};

export const customDevToolsPage = <DevToolsPage />;
