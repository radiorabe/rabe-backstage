# Managing the Foreman Catalog Backend Module

This document is intended for maintainers of the `plugins/catalog-backend-module-foreman` package.  It describes the
purpose of the code, how to keep it in shape, and what to do when Backstage or Foreman changes.

---

## 🔍 Overview of the Plugin

- **Name:** `@internal/backstage-plugin-catalog-backend-module-foreman`
- **Role:** a _backend-plugin-module_ for `catalog` that provides `Resource` entities representing hosts
  created in a Foreman instance.
- **Current behaviour:** the `ForemanProvider` is scheduled via the framework's
  `SchedulerServiceTaskRunner` and executes once per minute (configurable through the
  scheduler service). It fetches `/api/hosts?per_page=all` from the configured Foreman
  instance, transforms every host into a `Resource` entity, and applies a full mutation to the catalog.

- **Key files:**
  - `src/ForemanProvider.ts` – provider implementation (includes auth logic, config parsing,
    and entity creation; supports both basic auth (`user`/`token`) and bearer token flows)
  - `src/module.ts` – module registration and wiring, reads `backendConfig.getConfig('catalog.plugins.foreman')`
  - `src/index.ts` – package entrypoint
  - `src/ForemanProvider.test.ts` – (planned) unit tests for the provider logic


Because of its small size and narrow scope the module is otherwise unopinionated and has no external
runtime dependencies beyond Backstage.

---

## 🛠 Maintenance Guidelines

### 1. Keeping the plugin up to date with Backstage

1. **Periodic dependency bump** – run the standard command from the repo root:
   ```sh
   yarn backstage-cli versions:bump
   ```
   This updates all `@backstage/*` packages across the monorepo, including the dependency in this package.

   The package now carries a `src/config.schema.json` and the schema path is
   exposed via `package.json`. When bumping Backstage versions, ensure the
   schema remains compatible (it only affects editor/CLI validation).
2. **Check for API changes** – review the release notes for Backstage (https://github.com/backstage/backstage/releases)
   for breaking changes to the backend plugin API or catalog extension points. Adjust imports or method
   signatures in `ForemanProvider`/`module.ts` as required.
3. **Test the whole repo** – after any bump execute `yarn build:all && yarn test:all && npx playwright test` (the foreman package now pulls in `axios`, make sure there are no missing dependency errors).
   to confirm nothing regresses. Add a specific unit test if the bump causes provider-related failures.
4. **Lint/format** – run `yarn lint` and `prettier --write` before committing; the existing `.eslintrc.js`
   should already include the package.
5. **Versioning & releases** – the package is marked `private`, so it’s not published independently. Keep
   `version` in `package.json` in sync with overall repo version if you ever choose to publish.

### 2. Configuration & secret management

The provider reads its settings from a `Config` object (see `src/ForemanProvider.ts`).  Typical keys
are `url`, `user`/`accessId`, and `token`/`accessToken`.  Configuration examples and the `config` package
behaviour are described in `llms.txt` (the repo’s standardized guide to handling configuration and
secrets).

Read from `app-config*.yaml` and wire the config through `module.ts` as shown in the source.  Avoid
hard‑coding credentials; rely on environment variables or Backstage’s `secrets` mechanism so that tokens
never land in git history.

- Replace hard‑coded values in `module.ts` with configuration reads.  The
  `ForemanProvider` now accepts a `Config` instance and extracts its own
  settings, so you simply grab the `catalog.providers.foreman` subtree and pass it along:

  ```ts
  const config = backendConfig.getConfig('catalog.providers.foreman');
  const foreman = new ForemanProvider(config, logger, taskRunner);
  ```
- Document the necessary `app-config*.yaml` keys in the plugin README or in the main config:
  ```yaml
  catalog:
    providers:
      foreman:
        url: https://foreman.example
        user: backstage
        token: ${BACKSTAGE_FOREMAN_TOKEN}
        # optional metadata
        namespace: default
        owner: team-ops
        # scheduler config as shown earlier
  ```
- Use `process.env` or Backstage’s `secrets` provider to avoid committing tokens.

### 3. Testing

Tests for this package live next to their implementation files (`src/ForemanProvider.test.ts`).  Use
`@backstage/backend-test-utils` to create fake catalog connections and jest mocks for external libraries
such as `axios` (see `llms.txt` for general advice on writing Jest tests in the monorepo).

At a minimum, cover:

1. successful polling with a mocked axios response,
2. correct behaviour when only a bearer token is provided (no user),
3. namespace/owner defaults and overrides,
2. error handling when the API request fails,
3. proper connection/mutation behaviour including the `full` mutation output.

Run `yarn test` from the repo root; CI agents should use `--ci` to prevent the interactive watch mode.
Coverage reports are aggregated across packages and accessed via `coverage/lcov-report/index.html`.

> **Agent note:** when you are a CI agent that cannot spawn an interactive
> watcher (because it has no attached TTY or background tasks aren’t allowed),
> run the package tests in non‑watch mode with `--ci`:
>
> ```sh
> yarn test --ci
> ```
>
> This prevents the `q` prompt and ensures the process exits after a single run.

### 4. Code quality & style

- Follow TypeScript strictness and Backstage patterns (see other plugins in the repo and the
  `llms.txt` references on coding standards).
- The provider is intentionally written as a pure class with no global side effects; this makes mocking
  the `axios` client and scheduler easier.
- When you add or update code, run `yarn lint` and `prettier --write` (Prettier config is pulled from
  `@backstage/cli/config/prettier` – see `https://prettier.io/llms.txt`).
- Add JSDoc comments to exported types and functions.
- If new ESLint rules are added upstream, mirror them in this package via `.eslintrc.js` and refer to
  `llms.txt` for examples of rule customisations.
- Use the `yarn backstage-cli plugin:scaffold` command if you ever create additional backend modules; it
  produces the correct boilerplate used by this package.



### 5. Documentation

- Improve the plugin `README.md` with instructions on configuration, how to run locally,
  and an example of the entity schema produced (pull the sample structure from the
  `ForemanProvider.run()` loop).
- The `AGENTS.md` file you’re editing should remain focused on maintainers. Users of Backstage
  do not need to read it, but linking to it from other docs is fine.
- Consider adding TechDocs pages under `docs/` if external teams will rely on the Foreman
  integration; keep an eye on the `llms.txt` guidelines for writing TechDocs.

### 6. Security & secrets

- Do not log sensitive data. The current `logger.info` calls are safe.
- Review the Foreman URL/credentials whenever an environment rotates.
- If you convert this to a published plugin, make sure no secrets slip into the `dist` bundle.

### 7. Deployment

- Since this is a backend-only module, no Frontend bundle is generated.
- The plugin is automatically included when you run `yarn start` from the workspace root.
- If you introduce a new configuration key, add it to `app-config.local.yaml` and any k8s
  manifests used in deployment.

---

## 🔄 Keeping the Plugin Compatible with Foreman

- The provider assumes a v2 API endpoint at `/api/hosts?per_page=all`. When Foreman is upgraded,
  verify that the response shape still contains `results`, `name`, `id`, `comment`, and possibly
  `cockpit_url`.
- If Foreman introduces authentication changes (e.g., API tokens vs. basic auth), update
  the Axios call accordingly.
- Monitor the Foreman release notes and run the provider manually (`yarn start` and watch logs)
  after any external change.

---

## 🧹 Cleaning up and Future Work

- Add a `clean` script if you generate build artifacts outside of the normal Backstage CLI; see
  `llms.txt` for examples of handy npm scripts used elsewhere in the repo.
- Consider converting this to a generic `foreman` backend plugin if other projects could reuse it.
  The `@backstage/plugin-catalog-node` APIs and scheduling helpers are documented in the backend
  `llms.txt` guidelines.
- If your inventory grows, implement incremental sync instead of full replacements to improve
  performance (use `connection.applyMutation` with `delta`).
- Investigate adding a small CLI command or Jest test helper that lets you run `ForemanProvider.run()`
  in isolation; see existing tooling in `@backstage/backend-test-utils` for inspiration.

---

By following the guidelines above, maintainers can keep the Foreman backend module in a healthy
and up-to-date state, and minimise the risk of surprises during Backstage upgrades or infrastructure changes.

---

### 📎 Useful links

- Backstage plugin authoring: https://backstage.io/docs/plugins/create-plugin
- Configuration & secrets (llms.txt): https://prettier.io/llms.txt
- Prettier formatting guidelines: https://prettier.io/llms.txt
- Semantic-release conventions: https://go-semantic-release.xyz/llms.txt
- Jest testing patterns: see `llms.txt` section on unit tests in monorepo
- Backend API & scheduler docs: search for `SchedulerServiceTaskRunner` in repo or consult `llms.txt`

🌟 *Happy hacking!*
