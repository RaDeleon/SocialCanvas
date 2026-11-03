# Contributing to SocialCanvas

Start with an issue describing the problem or proposed feature. For interface bugs, include the layout, viewport size, browser, steps to reproduce, and whether the feed uses demo or live content. Never include invitation tokens, Instagram access tokens, app secrets, client data, or a real `.env` file.

## Development

Use Node.js 22.13+ and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and use the demo workspace. The current beta implementation is on `codex/managed-beta` until it is merged into `main`.

## Before opening a pull request

```sh
npm run build
npm test
npm run format:check
```

For UI changes, exercise the affected interaction on desktop and mobile widths. For changes to publishing, OAuth, invitations, sync, or deletion, include focused tests that verify the resulting behavior. Keep changes scoped and explain what changed, why, and how you tested it.

Preserve the distinction between sample data and live Instagram content. Keep credentials on the server. Avoid adding analytics or advertising scripts to the embed. New Meta integrations should cite the official provider documentation and explain any extra permissions required.

## Licensing

This project uses the existing AGPL-3.0 license. Contributions are made under the same project license. Hosted operators should provide the source corresponding to their running modified version through `SOURCE_URL`.
