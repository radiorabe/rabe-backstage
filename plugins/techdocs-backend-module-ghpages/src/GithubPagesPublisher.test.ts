/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GithubPagesPublisher } from './GithubPagesPublisher';
import { mockServices } from '@backstage/backend-test-utils';

const mockConfig = mockServices.rootConfig({
  data: {
    techdocs: {
      publisher: {
        githubPages: {
          baseUrl: 'https://radiorabe.github.io',
        },
      },
    },
  },
});

const mockLogger = mockServices.logger.mock();

describe('GithubPagesPublisher', () => {
  let publisher: GithubPagesPublisher;

  beforeEach(() => {
    publisher = GithubPagesPublisher.fromConfig(mockConfig, mockLogger);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getReadiness', () => {
    it('returns available when GitHub Pages responds with 200', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await publisher.getReadiness();
      expect(result).toEqual({ isAvailable: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://radiorabe.github.io',
        { method: 'HEAD' },
      );
    });

    it('returns available when GitHub Pages responds with 404 (host reachable)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });
      const result = await publisher.getReadiness();
      expect(result).toEqual({ isAvailable: true });
    });

    it('returns unavailable when fetch throws a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('network failure'),
      );
      const result = await publisher.getReadiness();
      expect(result).toEqual({ isAvailable: false });
    });
  });

  describe('publish', () => {
    it('is a no-op and returns empty response', async () => {
      const result = await publisher.publish({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'my-service', namespace: 'default' },
          spec: {},
        },
        directory: '/tmp/site',
      });
      expect(result).toEqual({});
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchTechDocsMetadata', () => {
    it('fetches metadata JSON from GitHub Pages', async () => {
      const metadata = { site_name: 'My Service', build_timestamp: 1234567890 };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(metadata),
      });
      const result = await publisher.fetchTechDocsMetadata({
        namespace: 'default',
        kind: 'Component',
        name: 'my-service',
      });
      expect(result).toEqual(metadata);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://radiorabe.github.io/my-service/techdocs_metadata.json',
      );
    });

    it('lowercases the entity name in the URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      await publisher.fetchTechDocsMetadata({
        namespace: 'default',
        kind: 'Component',
        name: 'My-Service',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://radiorabe.github.io/my-service/techdocs_metadata.json',
      );
    });

    it('throws NotFoundError when GitHub Pages returns non-OK status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });
      await expect(
        publisher.fetchTechDocsMetadata({
          namespace: 'default',
          kind: 'Component',
          name: 'missing-repo',
        }),
      ).rejects.toThrow(/404/);
    });
  });

  describe('hasDocsBeenGenerated', () => {
    it('returns true when index.html is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const result = await publisher.hasDocsBeenGenerated({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'my-service', namespace: 'default' },
        spec: {},
      });
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://radiorabe.github.io/my-service/index.html',
        { method: 'HEAD' },
      );
    });

    it('returns false when index.html is not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const result = await publisher.hasDocsBeenGenerated({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'no-docs', namespace: 'default' },
        spec: {},
      });
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
      const result = await publisher.hasDocsBeenGenerated({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'broken', namespace: 'default' },
        spec: {},
      });
      expect(result).toBe(false);
    });
  });

  describe('docsRouter', () => {
    it('returns an Express handler', () => {
      const handler = publisher.docsRouter();
      expect(typeof handler).toBe('function');
    });
  });
});

