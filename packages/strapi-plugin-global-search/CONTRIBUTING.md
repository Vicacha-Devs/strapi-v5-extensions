# Contributing

## Local development

This package ships TypeScript sources. Strapi loads the admin and server entrypoints directly — there is no package-level build step.

```bash
# in this repo
npm install
npm test

# in your Strapi app
npm install /absolute/path/to/strapi-global-search
```

Enable the plugin in `config/plugins.js` / `config/plugins.ts` if needed, then start the app.

## Tests

```bash
npm test
npm run typecheck
```

Tests run with `tsx` against the TypeScript sources (`tests/services.test.ts`). They do not boot Strapi or a database.

## Release

Publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/) from GitHub Actions. Do not use a 2FA-bypass npm token.

1. Bump `"version"` in `package.json` (and add a `CHANGELOG.md` entry).
2. Commit, merge to the default branch.
3. Tag and push:

   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```

4. The `publish.yml` workflow runs `npm test` then `npm publish --access public`.

One-time setup (maintainers):

npm only shows **Trusted Publisher** on a package that already exists. It is not under your account settings.

1. Enable 2FA on the npm account (authenticator app, not a 2FA-bypass token).
2. Log in and publish the first version from your machine (interactive 2FA):

   ```bash
   npm login
   npm publish --access public
   ```

3. Open the package **Access** page (not Profile → Settings):
   [https://www.npmjs.com/package/strapi-global-search/access](https://www.npmjs.com/package/strapi-global-search/access)
4. In **Trusted Publisher**, choose **GitHub Actions** and fill in:
   - Organization or user: `sagarmauryaa`
   - Repository: `strapi-global-search`
   - Workflow filename: `publish.yml` (filename only, including `.yml`)
   - Environment name: `npm`
   - Allowed actions: `npm publish`
5. In GitHub, create an environment named `npm`.
6. Later releases: bump the version, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
