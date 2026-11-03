# Development and self-hosting

An open-source Instagram widget app for managed client websites. Connect a client's Instagram professional account, design a feed, and install it with a small embed snippet. Licensed under AGPL-3.0; the same application can be self-hosted or operated as a paid managed service.

## Run locally

Requires Node.js 22.13+ (Node's built-in SQLite is currently experimental).

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** and select **Open demo workspace**. The local demo password is `socialcanvas-demo`. Development binds to loopback. Sample photography is clearly labeled and never represents a live Instagram connection. Data persists in `data/socialcanvas.sqlite` and is excluded from git.

Do not copy `.env.example` unchanged: blank password/key values override development defaults. For a custom configuration, copy it to `.env` and fill in both values.

## Managed client workflow

1. Add a client and their website.
2. Generate a private connection link. Invitations expire after 72 hours, are single-use, and can be revoked. Creating a replacement revokes previous unused invitations.
3. Send the link to the client yourself. The app does not send email.
4. The client authorizes Instagram through Meta. No SocialCanvas account or shared Instagram password is needed.
5. Create a widget, choose its layout, and style the feed. Save draft changes privately.
6. Add allowed website hostnames in **Content** (include `www` separately if needed), then publish.
7. Paste the generated snippet into the website's HTML/embed block.

```html
<div data-socialcanvas="YOUR_WIDGET_ID"></div>
<script src="https://your-socialcanvas-domain.example/embed.js" async></script>
```

Client invitations, the editor, and embeds all work with sample content in development. The invite page explicitly distinguishes the demo connection action from the live Instagram login.

## Included

- Protected admin workspace with client, account, invitation, and widget management
- Grid, masonry, collage, horizontal slider, single-post slideshow, and vertical layouts
- Desktop/mobile columns, spacing, rounded corners, light/dark themes, accent colors, and classic cards
- Profile header, captions, media-type filtering, individual post hiding, and lightbox/Instagram click actions
- Video and carousel media in the lightbox when the connected account supplies them
- Draft/published settings, unpublish, embed snippets, domain restrictions, and iframe resizing
- SQLite persistence, encrypted access tokens, session expiry, request origin verification, and rate limits
- Background refresh of connected feeds approximately hourly while the process is running; token renewal before expiry
- Client disconnection and deletion of locally cached media and credentials
- Docker packaging and a persistent data volume

## Connect real Instagram accounts

See [Instagram setup](instagram-setup.md). The current connector implements **Instagram API with Instagram Login**, using the read-only `instagram_business_basic` permission. It serves Business/Creator accounts and does not require a linked Facebook Page.

Meta also offers Unified Login for new integrations, with different onboarding and business-portfolio requirements. That connector is not implemented in this beta. Hashtag discovery, arbitrary public-account feeds, personal-account feeds, Stories, and live streams are not included.

Live OAuth, actual media retrieval, video playback, and token renewal must be validated with your own configured Meta app and an eligible account. The included automated OAuth tests use a fake provider; they do not establish Meta approval or live compatibility.

## Production

1. Build with `npm run build`.
2. Set `NODE_ENV=production`, a public HTTPS `APP_URL`, a strong `ADMIN_PASSWORD` (12+ characters), and a 64-character hex `ENCRYPTION_KEY`.
3. Set `DEMO_MODE=false`; configure the Meta credentials.
4. Run `npm start` behind an HTTPS reverse proxy, or use `docker compose up --build -d` with the provided Compose file. Set `HOST=0.0.0.0` when the server needs to accept container traffic.
5. Back up the persistent database and encryption key together. Do not rotate the key without migrating encrypted tokens. Restore backups only to trusted hosts.

Generate an encryption key:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a process manager/container restart policy so synchronization keeps running. The beta is a single-process, single-admin deployment. Keep the SQLite volume local to that process; it is not designed for horizontally scaled replicas. Use HTTPS in front of the application. Set `TRUST_PROXY=1` only behind exactly one trusted reverse proxy, and block direct access to the origin port.

Published iframe responses use a `frame-ancestors` policy derived from the allowed domains. These domains control website framing, not secrecy: published feeds are public resources. Install guides are provided in the embed dialog; native WordPress/Shopify plugins are not included.

The built-in privacy page is a description of application behavior. Before external client onboarding, add your organization identity, support/deletion contact, retention policy, and confirm Meta-required callback URLs in your app dashboard. Signed deauthorization and data-deletion callbacks are included. Never log OAuth callback query strings or Meta token-exchange URLs in application or reverse-proxy logs.

## Checks

```sh
npm run build
npm test
npm run format:check
```

Tests cover authentication, origin checks, invitation expiry/revocation, OAuth browser binding and replay prevention, token encryption, publish isolation, domain validation, and cached-media deletion. Browser QA uses BrowserOS Neo.

## Project structure

```text
src/components/    Builder, shared feed renderer, clients, invitations
src/App.tsx        Workspace shell, login, embed and privacy routes
server/app.mjs     Admin/public APIs, OAuth callback and synchronization
server/instagram.mjs  Meta API adapter
server/store.mjs   SQLite schema and authenticated encryption
server/*.test.mjs  Backend integration tests
```

## Beta boundaries

- Latest 100 media items per account; no historical pagination
- No live like/comment counts or comment ingestion
- No payment checkout, hosted plan metering, or customer self-service signup yet
- No email delivery; copy and send invitation links through your own workflow
- No public deployment or live Meta approval is implied by a successful local build
- Demo images use Unsplash; live media loads directly from Instagram's CDN. The host website must handle any applicable visitor-consent requirements.

## Source and licensing

The repository's existing AGPL-3.0 license is preserved. `SOURCE_URL` controls the source link; hosts of modified versions should point it at the corresponding source for the running version. Hosted customers pay for operation and service; they can also self-host the open-source app. No license change or proprietary edition is introduced by this beta.
