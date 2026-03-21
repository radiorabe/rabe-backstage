# RaBe Backstage

This is the [Backstage](https://backstage.io/) instance for Radio Bern RaBe.
It contains catalog, TechDocs, and RaBe SSO integration via Keycloak OIDC.

## Repository Structure

- `packages/app/` – React frontend (Backstage app)
- `packages/backend/` – Node.js backend
- `plugins/` – Custom Backstage plugins (e.g. `permission-backend-module-rabe`, `catalog-backend-module-transformer`)
- `docs/` – MkDocs-based documentation
- `app-config.yaml` – Main Backstage config
- `app-config.production.yaml` – Production overrides

## Development Flow

Install dependencies:

```sh
yarn install
```

Start the app (frontend + backend):

```sh
yarn start
```

## Build, Test & Validate

```sh
# TypeScript type-check
yarn tsc

# Run unit tests
yarn test

# Run all unit tests with coverage
yarn test:all

# Lint changed files (since origin/main)
yarn lint

# Lint all files
yarn lint:all

# Build backend
yarn build:backend

# Build everything
yarn build:all

# Run Playwright e2e tests (requires Chromium)
npx playwright install --with-deps chromium
npx playwright test
```

## Authentication

Sign-in is handled by `packages/app/src/modules/auth/`. The module registers:

- An OIDC (`OAuth2`) API pointing at the Keycloak backend provider — always present in all environments.
- A custom `SignInPage` (via `SignInPageBlueprint`) that shows the **RaBe SSO** card and, conditionally, a **Guest** card.

Guest access is controlled by the existing `auth.environment` config key (no extra keys needed):

| Config file | `auth.environment` | Guest shown? |
|---|---|---|
| `app-config.yaml` | `development` | ✓ (dev & CI) |
| `app-config.production.yaml` | `production` | ✗ |

## Playwright e2e tests

Tests run against a frontend-only server (`yarn start app`, port 3000) — no backend is started. Four tests with named snapshots in `packages/app/e2e-tests/app.test.ts-snapshots/`:

| Test | What it checks | Snapshot |
|---|---|---|
| Sign-in screen | OIDC "Sign In" + Guest "Enter" visible | `login-page.png` |
| OIDC auth error | popup closed → "Login failed, popup was closed" | `login-auth-error.png` |
| Guest → catalog | catalog heading visible after guest sign-in | `catalog-page.png` |
| Guest → settings | settings page accessible after sign-in | `settings-page.png` |

Because no backend runs during Playwright tests, catalog entity/kind fetch errors appear as inline `[role="alert"]` banners. These are masked in the `catalog-page.png` snapshot and dismissed (where they appear as `alertdialog`) before screenshotting.

## Code Standards

- **Language**: TypeScript throughout; follow existing patterns in each package
- **License**: GNU AGPL-3.0-only — include the SPDX identifier in new files where applicable
- **Formatting**: [Prettier](https://prettier.io/) (see <https://prettier.io/llms.txt>; config from `@backstage/cli/config/prettier`); run `prettier --write .` or let `lint-staged` handle it
- **Linting**: ESLint with Backstage's default config (`.eslintrc.js`)
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - `fix:` → PATCH release
  - `feat:` → MINOR release
  - `BREAKING CHANGE:` footer → MAJOR release
  - Other types (e.g. `chore:`, `docs:`, `refactor:`) do not trigger a release
  - Releases are automated via [go-semantic-release](https://go-semantic-release.xyz/) (see <https://go-semantic-release.xyz/llms.txt>)

## Key Guidelines

1. Keep changes minimal and surgical — avoid unrelated modifications
2. Write unit tests for new functionality; place them alongside the source file as `*.test.ts` / `*.test.tsx`
3. Playwright e2e tests live in `packages/app/e2e-tests/`
4. Use `yarn backstage-cli versions:bump` to update Backstage dependencies
5. New plugins go in `plugins/` and must be added to the relevant workspace package
6. Container image is published from `Dockerfile` via CI; do not break the Docker build
