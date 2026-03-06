# TechDocs – GitHub Pages Integration

All documentation sites in the RaBe Backstage catalog are served directly from
**GitHub Pages**.  Backstage does not render Markdown locally; instead it reads
the pre-built HTML produced by `techdocs-cli` and deployed by each repository's
CI pipeline.

The docs are still **indexed for search** inside Backstage because the TechDocs
search collator reads content through the same GitHub Pages publisher.

---

## How it works

```
┌──────────────────┐   techdocs-cli generate   ┌──────────────────────┐
│  Repository CI   │ ─────────────────────────► │  GitHub Pages        │
│  (GitHub Actions)│   + deploy to gh-pages     │  radiorabe.github.io │
└──────────────────┘                            └──────────┬───────────┘
                                                           │  HTTP fetch
                                                           ▼
                                                ┌──────────────────────┐
                                                │  Backstage TechDocs  │
                                                │  (GithubPagesPublisher)
                                                └──────────────────────┘
```

1. A repository's CI workflow runs `techdocs-cli generate` to produce a `./site`
   directory containing HTML, assets, and `techdocs_metadata.json`.
2. The `./site` directory is deployed to the `gh-pages` branch, making it
   available at `https://radiorabe.github.io/<repo-name>/`.
3. When a user opens a TechDocs page in Backstage the
   `GithubPagesPublisher` fetches the HTML from GitHub Pages and streams it to
   the browser.
4. The TechDocs search collator reads the same pages to build the search index.

---

## What each repository must do

### 1 – `mkdocs.yml`

Add a `mkdocs.yml` at the repository root and include the
[`techdocs-core`](https://github.com/backstage/mkdocs-techdocs-core) plugin:

```yaml
site_name: My Service
plugins:
  - techdocs-core
```

> **Note:** The `techdocs-core` plugin is what generates the
> `techdocs_metadata.json` file.  Without it Backstage cannot display the docs.

### 2 – `catalog-info.yaml` annotation

Add the annotation that tells Backstage where to find the documentation source:

```yaml
metadata:
  annotations:
    backstage.io/techdocs-ref: dir:.
```

The annotation value `dir:.` means the `mkdocs.yml` lives next to
`catalog-info.yaml` in the root of the repository.

> **Important:** The entity `metadata.name` must match the GitHub repository
> name (lower-case) so the publisher can construct the correct GitHub Pages URL:
>
> ```
> https://radiorabe.github.io/<entity-name>/
> ```

### 3 – GitHub Actions workflow

Add `.github/workflows/techdocs.yml`:

```yaml
name: Publish TechDocs to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - docs/**
      - mkdocs.yml

permissions:
  contents: write   # required to push to the gh-pages branch

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install techdocs-cli and MkDocs core
        run: |
          npm install -g @techdocs/cli
          pip install "mkdocs-techdocs-core==1.*"

      - name: Generate TechDocs site
        run: techdocs-cli generate --no-docker --verbose

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site
```

The `techdocs-cli generate` command writes the full site (including
`techdocs_metadata.json`) to `./site`.  Deploying this directory to the
`gh-pages` branch is all that is needed.

---

## Backstage configuration

The relevant section in `app-config.yaml`:

```yaml
techdocs:
  builder: external          # Backstage will NOT build docs
  publisher:
    type: githubPages
    githubPages:
      baseUrl: https://radiorabe.github.io
```

| Key | Value |
|-----|-------|
| `techdocs.builder` | `external` – no local MkDocs build |
| `techdocs.publisher.type` | `githubPages` – custom publisher from `@internal/backstage-plugin-techdocs-backend-module-ghpages` |
| `techdocs.publisher.githubPages.baseUrl` | Root GitHub Pages URL for the organisation |
