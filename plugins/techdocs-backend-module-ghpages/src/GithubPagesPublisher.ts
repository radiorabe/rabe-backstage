/*
 * Copyright Radio Bern RaBe
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { Entity, CompoundEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { ForwardedError, NotFoundError } from '@backstage/errors';
import {
  PublisherBase,
  PublishRequest,
  PublishResponse,
  ReadinessResponse,
  TechDocsMetadata,
} from '@backstage/plugin-techdocs-node';
import { Readable } from 'node:stream';
import express from 'express';

/**
 * Implements a TechDocs publisher that reads pre-built documentation from
 * GitHub Pages. No local building takes place; docs must be built and deployed
 * to GitHub Pages externally (e.g. via a GitHub Actions workflow using
 * `techdocs-cli generate`).
 *
 * The entity name is mapped to the repository name under the GitHub Pages
 * base URL. For example, for `baseUrl: 'https://radiorabe.github.io'` and
 * entity name `my-service`, docs are fetched from
 * `https://radiorabe.github.io/my-service/`.
 *
 * @public
 */
export class GithubPagesPublisher implements PublisherBase {
  private readonly baseUrl: string;
  private readonly logger: LoggerService;

  constructor(options: { baseUrl: string; logger: LoggerService }) {
    // Strip trailing slash so we can always concatenate with a leading '/'
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.logger = options.logger;
  }

  static fromConfig(
    config: Config,
    logger: LoggerService,
  ): GithubPagesPublisher {
    const baseUrl = config.getString(
      'techdocs.publisher.githubPages.baseUrl',
    );
    return new GithubPagesPublisher({ baseUrl, logger });
  }

  async getReadiness(): Promise<ReadinessResponse> {
    try {
      const response = await fetch(this.baseUrl, { method: 'HEAD' });
      // GitHub Pages responds 200 or 404 for the root; both indicate the host
      // is reachable.
      if (response.ok || response.status === 404) {
        return { isAvailable: true };
      }
      this.logger.warn(
        `GitHub Pages base URL ${this.baseUrl} returned HTTP ${response.status}`,
      );
      return { isAvailable: false };
    } catch (err) {
      this.logger.warn(
        `GitHub Pages publisher readiness check failed: ${err}`,
      );
      return { isAvailable: false };
    }
  }

  /**
   * No-op: docs are built and published to GitHub Pages externally.
   */
  async publish(_request: PublishRequest): Promise<PublishResponse> {
    this.logger.debug(
      'GitHub Pages publisher: skipping publish – docs are deployed externally.',
    );
    return {};
  }

  async fetchTechDocsMetadata(
    entityName: CompoundEntityRef,
  ): Promise<TechDocsMetadata> {
    const name = entityName.name.toLowerCase();
    const url = `${this.baseUrl}/${name}/techdocs_metadata.json`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new ForwardedError(
        `GitHub Pages publisher: network error fetching TechDocs metadata from ${url}`,
        err as Error,
      );
    }
    if (!response.ok) {
      throw new NotFoundError(
        `GitHub Pages publisher: failed to fetch TechDocs metadata for ${stringifyEntityRef(entityName)} from ${url}: HTTP ${response.status}`,
      );
    }
    return response.json() as Promise<TechDocsMetadata>;
  }

  docsRouter(): express.Handler {
    const router = express.Router();

    router.get('*', async (req, res) => {
      // req.path arrives as "/<namespace>/<kind>/<name>/<rest...>"
      const segments = req.path.split('/').filter(Boolean);
      if (segments.length < 3) {
        res.status(404).send('Not Found');
        return;
      }

      // Drop namespace and kind; keep name + rest as the GitHub Pages path.
      const [, , name, ...rest] = segments;
      const docPath = rest.length ? rest.join('/') : 'index.html';
      const url = `${this.baseUrl}/${name.toLowerCase()}/${docPath}`;

      let response: Response;
      try {
        response = await fetch(url);
      } catch (err) {
        this.logger.error(
          `GitHub Pages publisher: network error fetching ${url}: ${err}`,
        );
        res.status(502).send('Bad Gateway');
        return;
      }

      if (!response.ok) {
        res.status(response.status).send(response.statusText);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      // Pipe the Web ReadableStream into the Node.js response stream.
      Readable.fromWeb(response.body as import('stream/web').ReadableStream)
        .on('error', err => {
          this.logger.error(
            `GitHub Pages publisher: stream error for ${url}: ${err}`,
          );
          if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
          }
        })
        .pipe(res);
    });

    return router;
  }

  async hasDocsBeenGenerated(entity: Entity): Promise<boolean> {
    const name = (entity.metadata.name ?? '').toLowerCase();
    const url = `${this.baseUrl}/${name}/index.html`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
