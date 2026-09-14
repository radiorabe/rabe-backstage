# @internal/backstage-plugin-catalog-backend-module-foreman

The foreman backend module for the catalog plugin.

A JSON Schema (`src/config.schema.json`) is provided and referenced from
`package.json`; editors that understand Backstage configuration will offer
validation and autocomplete for the `catalog.providers.foreman` block.

This package includes a small suite of tests validating the provider's
integration with the Foreman API.  A Jest file (`ForemanProvider.test.ts`)
mocks the HTTP interaction and ensures that hosts are translated into
`Resource` entities correctly.

## Configuration

Credentials and the endpoint are read from the Backstage config tree.
Put the following snippet somewhere in your `app-config*.yaml` or supply
via environment variables:

```yaml
catalog:
  providers:
    foreman:
      url: https://foreman.example.com
      # either provide a user/password pair or an access key pair:
      user: backstage                # optional
      token: ${BACKSTAGE_FOREMAN_TOKEN}   # or personal API token
      # accessId: abc123             # alternative to `user`
      # accessToken: ${...}         # alternative to `token`

      # optional metadata overrides for generated resources
      namespace: default            # default 'default'
      owner: team-operations        # default 'it-reaktion'

      # scheduling configuration lives in a `schedule` sub-tree.  The task
      # runner defaults to every 30 minutes with a 1‑minute timeout,
      # but you can change it here or via the global `scheduler` config.
      schedule:
        frequency: { minutes: 30 }
        timeout: { minutes: 1 }
```

Use environment variable interpolation (`${...}`) or Backstage's
[secrets][].

[secrets]: https://backstage.io/docs/concepts/secrets

The token field may hold either an API password (used with a username)
or a personal access token.  If you are supplying only a token (no user),
Bearer authentication will be used automatically.

The example above also demonstrates the two small customisation hooks
that are currently baked into the provider: the `namespace` and `owner`
fields become the corresponding metadata values on every `Resource`.
If you don't supply them, the defaults (`default` / `it-reaktion`) are
audited in the tests, but in a public plugin you will certainly want to
override them.

It is recommended to store the secret in a vault and reference it with the
`${...}` syntax rather than checking it in.

### Creating a usable API key in Foreman

1. Log in to your Foreman instance as an administrator.
2. Go to **Admin → Users** and select or create a service account.  Using a
   dedicated account with read‑only privileges is best practice.
3. Open the **API** tab on the user page and click **Generate API key**.  Copy
   the generated token.
4. Give the account only the roles/permissions necessary to list hosts; the
   `Viewer` or `Read Only` role is sufficient.
5. Configure Backstage as shown above, using the username and token you just
   created.  The provider uses HTTP basic auth by default, so both fields are
   required.

Once configured, the backend module will periodically poll
`/api/hosts` using the schedule configured above and import hosts as
`Resource` entities.  Errors from the HTTP request or catalog mutation are
logged to the backend logger and will not crash the entire host process;
see the source for details.

_This plugin was created through the Backstage CLI_
