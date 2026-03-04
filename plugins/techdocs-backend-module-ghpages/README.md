# @internal/backstage-plugin-techdocs-backend-module-ghpages

A TechDocs publisher backend module that serves pre-built documentation
directly from GitHub Pages instead of building docs locally in Backstage.

## Overview

This module implements the `PublisherBase` interface from
`@backstage/plugin-techdocs-node`. When Backstage requests a TechDocs page,
the publisher fetches the pre-rendered HTML and assets from the configured
GitHub Pages base URL and streams them back to the reader.

Documentation is still indexed for Backstage search because the TechDocs
collator reads content via the same publisher.

## Configuration

```yaml
techdocs:
  builder: external
  publisher:
    type: githubPages
    githubPages:
      baseUrl: https://radiorabe.github.io
```

| Key                                        | Required | Description                                          |
| ------------------------------------------ | -------- | ---------------------------------------------------- |
| `techdocs.builder`                         | yes      | Must be `external` – Backstage will not build docs.  |
| `techdocs.publisher.type`                  | yes      | Must be `githubPages` to select this publisher.      |
| `techdocs.publisher.githubPages.baseUrl`   | yes      | Root GitHub Pages URL for the organisation.          |

The publisher maps each catalog entity to a documentation site using the
**entity name** as the repository path segment:

```
<baseUrl>/<entity-name>/
```

For example, with `baseUrl: https://radiorabe.github.io` and an entity named
`my-service`, the docs are fetched from
`https://radiorabe.github.io/my-service/`.

> **Note:** The entity name in `catalog-info.yaml` must match the GitHub
> repository name (lower-case) so that the URL resolves correctly.

## What repositories need to do

Every repository that wants its docs to appear in Backstage must:

1. **Add a `mkdocs.yml`** at the repository root and use
   [`mkdocs-techdocs-core`](https://github.com/backstage/mkdocs-techdocs-core)
   as a plugin.  A minimal configuration looks like:

   ```yaml
   site_name: My Service
   plugins:
     - techdocs-core
   ```

2. **Add a `backstage.io/techdocs-ref` annotation** to the entity in
   `catalog-info.yaml`:

   ```yaml
   metadata:
     annotations:
       backstage.io/techdocs-ref: dir:.
   ```

3. **Add a GitHub Actions workflow** that builds the docs with `techdocs-cli`
   and deploys them to GitHub Pages.  A complete example:

   ```yaml
   # .github/workflows/techdocs.yml
   name: Publish TechDocs to GitHub Pages

   on:
     push:
       branches: [main]
       paths:
         - docs/**
         - mkdocs.yml

   permissions:
     contents: write   # needed for gh-pages branch push

   jobs:
     publish:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Setup Python
           uses: actions/setup-python@v5
           with:
             python-version: '3.11'

         - name: Install techdocs-cli and MkDocs dependencies
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

   The `techdocs-cli generate` command creates a `./site` directory that
   contains all HTML, assets, **and** the `techdocs_metadata.json` file
   required by Backstage. Deploying this directory to the `gh-pages` branch
   makes everything (including the metadata) available at:

   ```
   https://radiorabe.github.io/<repo-name>/
   ```

   > **Important:** deploy the **entire** `./site` output directory so that
   > `techdocs_metadata.json` is present at the root of the GitHub Pages site.
   > Without this file Backstage cannot display the docs.
