# Instagram connection setup

This beta implements Instagram API with Instagram Login. It requests only `instagram_business_basic`, which is used to read the connected professional account's profile and media. The current UI intentionally does not promise personal-account feeds or hashtag discovery.

## Configure the Meta app

1. Create/configure a Meta app with the Instagram API setup using Instagram Login.
2. In **Instagram > API setup with Instagram login > Business login settings**, retrieve the Instagram App ID and App Secret. These are the Instagram-specific credentials, not an unrelated Facebook app's credentials.
3. Register this exact valid OAuth redirect URI:

   ```text
   https://YOUR_DOMAIN/api/oauth/instagram/callback
   ```

4. Configure the app domains, privacy URL, and support details in Meta's dashboard. Register these callbacks:

   - Deauthorization: `https://YOUR_DOMAIN/api/meta/deauthorize`
   - Data deletion: `https://YOUR_DOMAIN/api/meta/delete-data`

   Both accept Meta's form-encoded `signed_request` and verify its HMAC-SHA256 signature using your Instagram app secret. Deauthorization clears connected account credentials and cached media and revokes invitations. Data deletion also removes the associated client, widgets, and invitations, then returns a confirmation URL. Test both from the Meta dashboard; signatures/IDs must match your app's setup.

5. Add your eligible Business or Creator test account and complete Meta's tester acceptance requirements.
6. Set the environment variables on the SocialCanvas server:

   ```text
   APP_URL=https://YOUR_DOMAIN
   META_APP_ID=your_instagram_app_id
   META_APP_SECRET=your_instagram_app_secret
   META_API_VERSION=v25.0
   DEMO_MODE=false
   ```

   Also set `ADMIN_PASSWORD` and `ENCRYPTION_KEY` as described in the root README. Keep secrets out of source control and frontend build variables.

7. Restart the server and check **Settings > Instagram integration**. “Credentials configured” confirms the variables exist, not that Meta has approved or validated them.
8. Generate a new client invitation and complete the connection with the approved test account. Verify username, media, publishing, and disconnection before sending invitations to clients.

## Access and review

Standard Access is for eligible accounts you own/manage and have added to the app for development/testing. External client onboarding may require Advanced Access, App Review, and Business Verification. A private invitation does not bypass those requirements. Complete the requirements shown in your own Meta dashboard before onboarding external accounts.

Meta's current overview recommends Unified Login for new integrations. Its business-portfolio requirement differs from Instagram Login. SocialCanvas uses the latter for this beta's simple direct Instagram connection flow; a Unified Login adapter is a future integration choice, not a hidden fallback.

## Connection lifecycle

- Each invitation is stored as a SHA-256 hash, expires after 72 hours, and is consumed only after successful connection. Replacement invitations revoke earlier unused links.
- OAuth state expires after 10 minutes and is tied to an HttpOnly SameSite cookie in the authorizing browser. Callback state is single-use.
- The backend exchanges the authorization code, then obtains a long-lived token and stores it using AES-256-GCM encryption.
- Token refresh is attempted when the token has fewer than 30 days remaining. Feed media is refreshed approximately hourly while the process is online.
- The latest 100 items are cached as metadata/media URLs; deleted or expired Instagram CDN URLs can stop loading before the next refresh.
- A failed refresh is visible in Connections. Reconnect through a fresh invitation when access expires or is removed.
- Disconnecting removes the local token and cached posts. It does not itself remove the app from the client's Instagram settings; clients can revoke authorization there as well.

## Acceptance checklist for the first live client

- Real Business/Creator account connects and the correct username appears.
- Photos, carousel children, and Reels/video thumbnails load; playback works where the API supplies media URLs.
- Feed publishes to a separate HTTPS website allowed by the widget's domain settings.
- New posts appear after a refresh; manual refresh and later scheduled refresh succeed.
- Saving a draft does not alter the live layout until publishing.
- Disconnecting clears public cached posts and locally stored credentials.
- Client deletion removes their widgets, account, and invitations.
- Operator-specific privacy, deletion contact, Meta review requirements, and lifecycle callbacks are complete.

## Official sources

Checked during implementation on November 2, 2026:

- [Instagram Platform overview](https://developers.facebook.com/documentation/instagram-platform/overview)
- [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)
- [Business Login authorization and token lifecycle](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)

The API version is configurable. Verify support in your Meta app before production use; mocked integration tests do not verify a provider version.
