<div align="center">

<img src="docs/assets/socialcanvas-banner.png" alt="SocialCanvas — Your Instagram. Your website. Your canvas." width="100%" />

# SocialCanvas

### Instagram belongs on your website.

**Beautiful feeds. Private client connections. One small embed.**

SocialCanvas is an open-source Instagram widget builder for freelancers, agencies, and the clients they build for. Send a connection link, design the feed, and make it part of the website.

[![CI](https://github.com/RaDeleon/SocialCanvas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RaDeleon/SocialCanvas/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/RaDeleon/SocialCanvas?style=flat-square&color=235d48)](LICENSE)
[![Stars](https://img.shields.io/github/stars/RaDeleon/SocialCanvas?style=flat-square&color=e1ae47)](https://github.com/RaDeleon/SocialCanvas/stargazers)
[![Forks](https://img.shields.io/github/forks/RaDeleon/SocialCanvas?style=flat-square&color=235d48)](https://github.com/RaDeleon/SocialCanvas/forks)
[![Issues](https://img.shields.io/github/issues/RaDeleon/SocialCanvas?style=flat-square&color=235d48)](https://github.com/RaDeleon/SocialCanvas/issues)

[![Node](https://img.shields.io/badge/Node.js-22.13%2B-417e38?style=flat-square&logo=nodedotjs&logoColor=white)](package.json)
[![Layouts](https://img.shields.io/badge/layouts-6-235d48?style=flat-square)](#six-layouts-one-canvas)
[![Status](https://img.shields.io/badge/status-managed_beta-f1c463?style=flat-square&labelColor=333b35)](#where-the-beta-stands)
[![Last commit](https://img.shields.io/github/last-commit/RaDeleon/SocialCanvas/main?style=flat-square&color=235d48)](https://github.com/RaDeleon/SocialCanvas/commits/main)

[![Get source](https://img.shields.io/badge/Get_the_source-main_ZIP-e1ae47?style=for-the-badge&logo=github&logoColor=163c30)](https://github.com/RaDeleon/SocialCanvas/archive/refs/heads/main.zip)

[Get started](#quick-start) · [Why I built it](#why-i-built-it) · [Validation](#validation-and-current-limits) · [See the app](#meet-your-new-workspace) · [Instagram setup](docs/instagram-setup.md) · [Self-host](docs/self-hosting.md#production) · [Contribute](CONTRIBUTING.md)

<img src="https://skillicons.dev/icons?i=react,typescript,vite,nodejs,express,sqlite,docker,githubactions&theme=light" alt="React, TypeScript, Vite, Node.js, Express, SQLite, Docker, and GitHub Actions" />

</div>

> [!IMPORTANT]
> **Managed beta.** The local demo works without Instagram credentials. Real connections require a configured Meta app, an eligible Business or Creator account, and the access approval appropriate to your use. Hosted billing and public self-service signup are planned, not shipped.

## Why I built it

I wanted more control over the Instagram feeds I put on client websites: the account connection, the layout, the code behind the embed, and how the service is operated. A feed should feel like part of the site, with a workflow that makes sense for the person managing it.

SocialCanvas brings those pieces together in one open-source application. The client gets a private connection link; the website manager designs and publishes the widget. The same foundation can be self-hosted or used to operate a managed service, with hosted billing and public signup still ahead.

The banner is original product artwork with a creative red panda and conceptual feed layouts. The application screenshot below shows the actual builder with sample photography; the illustration is not a claim about a new runtime feature.

## Meet your new workspace

A visual builder where your preview and published embed use the same feed renderer. Change the layout, set the spacing, hide a post, and publish when it feels right.

![SocialCanvas widget builder with layout controls, desktop/mobile preview, and a sample Instagram feed](docs/assets/socialcanvas-dashboard.jpg)

_Actual application screenshot with clearly labeled sample photography. No live Instagram account is represented._

## Built for the person managing the website

Your client should connect their account. You should get on with building their website.

| For your client                         | For you                                              |
| :-------------------------------------- | :--------------------------------------------------- |
| A private invitation link               | One workspace for clients, connections, and widgets  |
| Instagram authorization through Meta    | A visual editor with desktop and mobile controls     |
| No SocialCanvas account to create       | Drafts you can refine before publishing              |
| No Instagram password to share          | An embed snippet you can install yourself            |
| Account removal and data deletion paths | Refresh status, reconnect links, and domain controls |

```text
Add client → Send private link → Client connects Instagram
                                      ↓
                          Design → Publish → Embed
```

### Six layouts. One canvas.

| Layout          | Make it work for                                            |
| :-------------- | :---------------------------------------------------------- |
| **Grid**        | Clean galleries, homepage feeds, and consistent photo tiles |
| **Masonry**     | Images in their natural proportions, arranged in columns    |
| **Collage**     | A featured moment surrounded by smaller tiles               |
| **Slider**      | Horizontal galleries with touch scrolling and navigation    |
| **Single post** | A compact spotlight with previous/next navigation           |
| **Vertical**    | Stacked feeds for sidebars and editorial pages              |

Fine-tune columns, mobile columns, spacing, rounded corners, accent colors, light/dark themes, and photo tiles or classic cards. Add a profile header and captions, filter by media type, and choose which posts appear. Open posts in a lightbox or on Instagram; play videos and browse carousel media when the connected account supplies them.

### Small embed. Real control.

```html
<div data-socialcanvas="YOUR_WIDGET_ID"></div>
<script src="https://YOUR_SOCIALCANVAS_DOMAIN/embed.js" async></script>
```

- **Publish deliberately.** Saved drafts stay separate from published layout and domain settings.
- **Fit the page.** The script creates an iframe and adjusts its height as content changes.
- **Choose the websites.** Published iframe responses restrict framing to configured domains.
- **Keep content fresh.** Live accounts refresh approximately hourly while the server is running.
- **Keep the feed focused.** No analytics or advertising scripts are bundled into the embed.

Paste it into an HTML block on your website. WordPress, Webflow, Squarespace, Shopify, and other builders can use the snippet where their plan, security settings, and theme allow scripts and iframes. Native platform plugins are not included.

## Quick start

Requires **Node.js 22.13+** and npm.

```sh
git clone https://github.com/RaDeleon/SocialCanvas.git
cd SocialCanvas
npm ci
npm run dev
```

Open **[localhost:5173](http://localhost:5173)** and choose **Open demo workspace**. Explore the layouts, create a client invitation, connect a demo account, and publish a sample feed. The local demo password is `socialcanvas-demo`.

<details>
<summary><strong>What the demo does—and where your data goes</strong></summary>

The demo uses sample photography, not a live Instagram account. Its connection page clearly separates the demo action from Instagram authorization. Data persists in `data/socialcanvas.sqlite`; the database, dependencies, build output, and local secrets are ignored by git.

Development binds to loopback. `.env` is optional for the default local demo. If you copy `.env.example`, fill in the password and encryption key: blank values override the development defaults.

Node's built-in SQLite is currently experimental. It keeps this beta's persistence small and avoids a separate database service.

</details>

## From first invitation to client website

1. **Add the client.** Enter their name and website.
2. **Generate a connection link.** Invitations expire after 72 hours and work once. Replacement links revoke previous unused invitations.
3. **Send it yourself.** Use your normal client communication channel; email delivery is not built in.
4. **Let the client authorize.** They connect an eligible Instagram account through Meta.
5. **Create the widget.** Choose a layout, style the feed, and save your draft.
6. **Set the allowed domains.** Include `www` separately if the website uses it.
7. **Publish and install.** Copy the embed code into the client website.

**Ready for a real account?** Follow the [Instagram setup guide](docs/instagram-setup.md), then validate the entire flow with an approved test account before inviting clients.

## Open source. Your infrastructure or a managed service.

SocialCanvas is designed for both self-hosting and a paid hosted service using the same codebase. This release delivers the managed-client workflow; it does not include subscriptions, plan metering, or customer signup.

| Self-host                                  | Operate a managed service                                    |
| :----------------------------------------- | :----------------------------------------------------------- |
| Run the app on your own infrastructure     | Host and maintain the app for your clients                   |
| Bring your own Meta app and credentials    | Handle client setup, styling, and installation               |
| Own the persistent data volume and backups | Charge for hosting and service through your existing process |

A [Dockerfile](Dockerfile), [Compose configuration](compose.yaml), and [environment reference](.env.example) are included. Production requires HTTPS, a strong admin password, a unique encryption key, and the correct Meta configuration.

**[Read the deployment guide →](docs/self-hosting.md#production)**

## Inside SocialCanvas

```mermaid
flowchart LR
    Admin[Website manager] --> Workspace[React workspace]
    Client[Client invitation] --> OAuth[Instagram authorization]
    Workspace --> API[Express API]
    OAuth --> API
    Meta[Instagram API] <--> API
    API --> DB[(SQLite + encrypted tokens)]
    Sync[Scheduled refresh] --> API
    Site[Client website] --> Script[embed.js]
    Script --> Frame[Isolated feed iframe]
    Frame --> Public[Published feed API]
    Public --> DB
```

| Layer                       | Stack                                                        |
| :-------------------------- | :----------------------------------------------------------- |
| **Builder & feed renderer** | React 19, TypeScript, Vite, Lucide                           |
| **Backend**                 | Node.js 22, Express 5, Zod                                   |
| **Storage**                 | SQLite with AES-256-GCM encryption for access credentials    |
| **Distribution**            | JavaScript loader + iframe, Docker, Compose                  |
| **Verification**            | Node test runner, TypeScript build, Prettier, GitHub Actions |

### Source map

| Path                                           | Responsibility                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/components/Editor.tsx`                    | Layout, content, appearance and publish controls.                                |
| `src/components/Feed.tsx`                      | Shared preview/embed renderer, media tiles, slider and lightbox.                 |
| `src/components/Clients.tsx` and `Connect.tsx` | Managed client invitations and connection screens.                               |
| `src/App.tsx` and `src/api.ts`                 | Workspace routes, authentication screens and API requests.                       |
| `server/app.mjs`                               | Admin/public endpoints, invitations, OAuth lifecycle, sync and published embeds. |
| `server/instagram.mjs`                         | Instagram token exchange, profile/media retrieval and renewal adapter.           |
| `server/store.mjs`                             | SQLite schema and credential encryption.                                         |
| `server/index.mjs`                             | Server startup and periodic refresh scheduling.                                  |
| `server/*.test.mjs`                            | Backend integration and mocked Instagram adapter tests.                          |
| `docs/`                                        | Instagram setup, self-hosting and contribution-facing documentation.             |

<details>
<summary><strong>Security and connection lifecycle</strong></summary>

- Admin sessions use HttpOnly cookies and expire after 12 hours.
- State-changing application requests use an origin check and request-verification header.
- Invitation tokens are stored as SHA-256 hashes and can be revoked.
- OAuth state is short-lived, browser-bound, and single-use.
- Instagram credentials are encrypted on the server and excluded from public feed responses.
- Live tokens are renewed before expiry; refresh errors are visible in Connections.
- Disconnecting removes the local credential and cached media.
- Signed Meta deauthorization and data-deletion callbacks verify HMAC-SHA256 signatures.
- Data deletion removes the associated client records, widgets, invitations, and account, then returns a confirmation URL.

The beta targets a single-process, single-admin deployment. Published feeds are public resources: domain controls restrict framing, not access to secret content. Media requests go to Instagram's CDN; sample photography goes to Unsplash. The website operator owns their privacy notice and any consent requirements.

</details>

<details>
<summary><strong>Project map and local commands</strong></summary>

```text
src/components/       Widget builder, shared feed, clients, invitations
src/App.tsx           Workspace, login, embed, and privacy routes
server/app.mjs        Admin/public APIs, OAuth, sync, and deletion callbacks
server/instagram.mjs  Meta API adapter
server/store.mjs      SQLite schema and credential encryption
server/*.test.mjs     Backend and adapter tests
.github/workflows/    Build, test, and formatting checks
```

```sh
npm run dev           # Local API + frontend
npm run build         # Typecheck and create production frontend
npm test              # Backend integration and Meta adapter tests
npm run format:check  # Check source formatting
npm start             # Production server; requires environment configuration
```

</details>

## Repository pulse

<div align="center">

[![Repo size](https://img.shields.io/github/repo-size/RaDeleon/SocialCanvas?style=for-the-badge&color=235d48)](https://github.com/RaDeleon/SocialCanvas)
[![Top language](https://img.shields.io/github/languages/top/RaDeleon/SocialCanvas?style=for-the-badge&color=235d48)](https://github.com/RaDeleon/SocialCanvas)
[![Contributors](https://img.shields.io/github/contributors/RaDeleon/SocialCanvas?style=for-the-badge&color=235d48)](https://github.com/RaDeleon/SocialCanvas/graphs/contributors)
[![Open PRs](https://img.shields.io/github/issues-pr/RaDeleon/SocialCanvas?style=for-the-badge&color=235d48)](https://github.com/RaDeleon/SocialCanvas/pulls)

[![SocialCanvas repository card](https://opengraph.githubassets.com/socialcanvas-showcase/RaDeleon/SocialCanvas)](https://github.com/RaDeleon/SocialCanvas)

</div>

GitHub badges track repository activity. The source ZIP button downloads GitHub’s automatic `main` archive; those downloads are not reported as release-asset download counts. The CI and last-commit badges above track `main`. The repository card is provided by GitHub. External badge providers can occasionally be unavailable.

## Validation and current limits

| Check                    | What it establishes                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `npm run build`          | TypeScript checks and production frontend compilation.                                                    |
| `npm test`               | Backend and Instagram adapter behavior against fixtures/fake providers.                                   |
| `npm run format:check`   | Formatting across source, docs and workflow files.                                                        |
| GitHub Actions on `main` | Repeatable build, backend tests and formatting checks; inspect the live badge/run for the current result. |
| Demo workspace           | A way to explore the editor and published embed with sample content, without Instagram credentials.       |

Passing these checks does not establish live Meta approval, live account compatibility, or production load capacity. Validate OAuth, media retrieval, reconnect, token renewal and deletion with an eligible account and the configured Meta app before onboarding real clients. This documentation/artwork refresh does not change the connector, security model or application version.

<details>
<summary><strong>Common setup questions</strong></summary>

**The local page cannot sign in or save.** Use `http://localhost:5173` exactly with the default configuration. `APP_URL` is an origin, so switching between `localhost` and `127.0.0.1` can fail request checks. If you create `.env`, fill its required values; empty fields override local development defaults.

**The live connection fails.** First distinguish the demo from a real Instagram connection. Check the Meta app setup, the eligible account, redirect URLs and access approval in the [setup guide](docs/instagram-setup.md). Do not paste tokens or account secrets into bug reports.

**A feed is not appearing on a client site.** Confirm the widget is published, the exact website hostname is allowed, and the site builder permits the loader script and iframe. `www` and the bare hostname are separate entries. Draft edits do not change a published feed until republished.

**Can clients log into the dashboard or buy a subscription?** This beta is operator-managed. Clients use invitation links; public signup, billing and plan metering are not implemented.

**Is there an installer or hosted service to download?** Distribution is source plus Docker packaging. Use the source ZIP or clone, then follow the setup guide. No desktop installer or public hosted-service launch is claimed.

</details>

## Where the beta stands

| Available now                                           | Still ahead                                                  |
| :------------------------------------------------------ | :----------------------------------------------------------- |
| Client invitations and direct Instagram Login connector | Live-account acceptance testing and required Meta approval   |
| Six layouts and a shared preview/embed renderer         | More templates and platform-specific install tooling         |
| Drafts, publishing, moderation, and domain controls     | Self-service signup, checkout, and plan metering             |
| Approximately hourly sync and latest 100 media items    | Historical pagination and additional content-source adapters |
| Local demo, Docker packaging, and automated tests       | Public hosted service launch                                 |

Personal-account feeds, arbitrary public usernames, hashtag discovery, Stories, live streams, and live like/comment counts are outside this beta. The current connector uses Instagram Login, not Unified Login. A passing build and mocked API tests do not establish live Meta compatibility or approval.

## Build with us

Found a broken layout? Have a website builder we should support better? [Open an issue](https://github.com/RaDeleon/SocialCanvas/issues) with a reproducible example, or read the [contributing guide](CONTRIBUTING.md) and send a focused pull request.

If SocialCanvas fits your workflow, **[give it a star](https://github.com/RaDeleon/SocialCanvas/stargazers)** so more website builders can find it.

---

<div align="center">

**Your content. Your clients. Your canvas.**

[AGPL-3.0](LICENSE) · [Source code](https://github.com/RaDeleon/SocialCanvas) · [Report a bug](https://github.com/RaDeleon/SocialCanvas/issues) · [Instagram setup](docs/instagram-setup.md)

</div>

The existing AGPL-3.0 license is preserved. Set `SOURCE_URL` to the corresponding source for your running version when hosting a modified build.
