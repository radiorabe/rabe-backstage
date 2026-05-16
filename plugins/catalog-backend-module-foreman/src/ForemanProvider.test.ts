import { ForemanProvider } from './ForemanProvider';
import axios from 'axios';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { ConfigReader } from '@backstage/config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// a tiny fake task runner that just executes the provided function immediately
const makeTaskRunner = (): SchedulerServiceTaskRunner => ({
  run: jest.fn().mockImplementation(async ({ fn }) => fn()),
} as unknown as SchedulerServiceTaskRunner);

const makeLogger = (): LoggerService => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as LoggerService);

describe('ForemanProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('fetches hosts and applies a full mutation', async () => {
    const sampleHosts = {
      results: [
        { id: 123, name: 'foo.example.com', comment: 'nice host' },
      ],
    };
    mockedAxios.get.mockResolvedValue({ data: sampleHosts });

    const cfg = new ConfigReader({
      url: 'some-env',
      user: 'user',
      token: 'token',
    });
    const provider = new ForemanProvider(
      cfg,
      makeLogger(),
      makeTaskRunner(),
    );

    const connection: any = { applyMutation: jest.fn().mockResolvedValue(undefined) };

    // connect() will register the fake connection and immediately run the task via our stubbed runner
    await provider.connect(connection);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://some-env/api/hosts?per_page=all',
      expect.objectContaining({
        auth: { username: 'user', password: 'token' },
      }),
    );

    expect(connection.applyMutation).toHaveBeenCalledTimes(1);
    const mutation = connection.applyMutation.mock.calls[0][0];
    expect(mutation.type).toBe('full');
    expect(mutation.entities).toHaveLength(1);

    const entity = mutation.entities[0].entity;
    expect(entity.kind).toBe('Resource');
    expect(entity.metadata.name).toBe('foo.example.com');
    expect(entity.metadata.annotations['foreman-id']).toBe('123');
  });

  it('includes cockpit link when cockpit_url is supplied', async () => {
    const sampleHosts = {
      results: [
        {
          id: 456,
          name: 'bar.example.com',
          comment: '',
          cockpit_url: '/cockpit/foo',
        },
      ],
    };
    mockedAxios.get.mockResolvedValue({ data: sampleHosts });

    const cfg = new ConfigReader({
      url: 'env',
      user: 'u',
      token: 't',
      namespace: 'custom-ns',
      owner: 'the-team',
    });
    const provider = new ForemanProvider(
      cfg,
      makeLogger(),
      makeTaskRunner(),
    );

    const connection: any = { applyMutation: jest.fn().mockResolvedValue(undefined) };
    await provider.connect(connection);

    const links = connection.applyMutation.mock.calls[0][0].entities[0].entity.metadata.links;
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Cockpit' }),
      ]),
    );

    // verify metadata overrides
    const entity = connection.applyMutation.mock.calls[0][0].entities[0].entity;
    expect(entity.metadata.namespace).toBe('custom-ns');
    expect(entity.spec.owner).toBe('the-team');
  });

  it('uses bearer auth when no user is provided', async () => {
    const sampleHosts = { results: [] };
    mockedAxios.get.mockResolvedValue({ data: sampleHosts });

    const cfg = new ConfigReader({
      url: 'only-token',
      token: 'secret',
    });
    const provider = new ForemanProvider(
      cfg,
      makeLogger(),
      makeTaskRunner(),
    );

    const connection: any = { applyMutation: jest.fn().mockResolvedValue(undefined) };
    await provider.connect(connection);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://only-token/api/hosts?per_page=all',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
        }),
      }),
    );
  });
});
