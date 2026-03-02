import { Entity, ResourceEntity } from '@backstage/catalog-model';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  SchedulerServiceTaskRunner,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import axios from 'axios';


/**
 * Provides entities from Foreman.
 */
export class ForemanProvider implements EntityProvider {
  private readonly baseUrl: string;
  private readonly foremanUser: string;
  private readonly foremanToken: string;
  private readonly logger: LoggerService;
  private connection?: EntityProviderConnection;
  private taskRunner: SchedulerServiceTaskRunner;
  private readonly namespace: string;
  private readonly owner: string;

  /**
   * Create a provider from a Backstage config object.
   *
   * The caller is expected to provide the contents of the
   * `catalog.providers.foreman` config block (the module wrapper handles
   * picking that subtree).  Required keys are `url` and `token`; a
   * `user`/`accessId` value may be supplied for basic auth, otherwise a
   * bearer token flow is assumed.  Optional metadata overrides such as
   * `namespace` and `owner` are also read here.
   */
  constructor(
    config: Config,
    logger: LoggerService,
    taskRunner: SchedulerServiceTaskRunner,
  ) {
    this.baseUrl = config.getString('url');
    // allow either `user`/`token` or `accessId`/`accessToken` pairs
    this.foremanUser =
      config.getOptionalString('user') ?? config.getOptionalString('accessId') ?? '';
    this.foremanToken =
      config.getOptionalString('token') ?? config.getOptionalString('accessToken')!;
    if (!this.foremanToken) {
      throw new Error('Foreman provider requires a token');
    }

    // metadata defaults can be overridden via configuration
    this.namespace = config.getOptionalString('namespace') ?? 'default';
    this.owner = config.getOptionalString('owner') ?? 'it-reaktion';

    this.logger = logger;
    this.taskRunner = taskRunner;
  }

  getProviderName(): string {
    // use the base URL as part of the name to differentiate multiple instances
    return `foreman-${this.baseUrl}`;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
  }

  async run(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not initialized');
    }
    this.logger.info(`Reading hosts from Foreman at ${this.baseUrl}`);

    // ensure there is a scheme, and no trailing slash
    let apiBase = this.baseUrl;
    if (!/^https?:\/\//i.test(apiBase)) {
      apiBase = `https://${apiBase}`;
    }
    apiBase = apiBase.replace(/\/$/, '');

    const axiosConfig: any = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (this.foremanUser) {
      axiosConfig.auth = {
        username: this.foremanUser,
        password: this.foremanToken,
      };
    } else {
      // no user supplied; assume bearer token
      axiosConfig.headers.Authorization = `Bearer ${this.foremanToken}`;
    }

    let data: any;
    try {
      const response = await axios.get(
        `${apiBase}/api/hosts?per_page=all`,
        axiosConfig,
      );
      data = response.data;
    } catch (err) {
      this.logger.error(`Failed to fetch hosts from Foreman: ${err}`);
      throw err;
    }

    const resourceEntities: Entity[] = [];
    for (const item of data.results) {
        const base = apiBase; // computed above
        const links = [
            {
                url: `${base}/new/hosts/${item.name}`,
                title: 'Foreman',
                icon: 'foreman',
            }
        ];
        if (item.cockpit_url) {
            links.push({
                url: `${base}${item.cockpit_url}`,
                title: 'Cockpit',
                icon: 'cockpit',
            });
        }
        const entity: ResourceEntity = {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Resource',
            metadata: {
                name: item.name,
                namespace: this.namespace,
                title: item.name.split('.')[0],
                description: item.comment || `Host ${item.name} managed in Foreman`,
                annotations: {
                    'foreman-id': item.id.toString(),
                    'backstage.io/managed-by-location': `foreman-provider:${this.baseUrl}`,
                    'backstage.io/managed-by-origin-location': `foreman-provider:${this.baseUrl}`,
                },
                links: links
            },
            spec: {
                type: 'host',
                owner: this.owner,
            },
        };
        resourceEntities.push(entity);
    }

    try {
      await this.connection.applyMutation({
        type: 'full',
        entities: resourceEntities.map(entity => ({
          entity,
        })),
      });

      this.logger.info(`Found ${data.results.length} hosts in Foreman, added ${resourceEntities.length} Resources to catalog.`);
    } catch (err) {
      this.logger.error(`Error applying catalog mutation: ${err}`);
      throw err;
    }
  }
}
