import { test } from "node:test";
import assert from "node:assert/strict";
import { exchangeCode, getMedia } from "./instagram.mjs";
test("token exchange accepts Meta nested response and uses server-side credentials", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json(
      calls.length === 1
        ? { data: [{ access_token: "short-token" }] }
        : { access_token: "long-token", expires_in: 5184000 },
    );
  };
  const token = await exchangeCode("authorization-code", {
    metaAppId: "app-id",
    metaAppSecret: "app-secret",
    redirectUri: "https://example.com/callback",
  });
  assert.equal(token.access_token, "long-token");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body.get("code"), "authorization-code");
  assert.equal(calls[1].url.searchParams.get("access_token"), "short-token");
});
test("media adapter normalizes carousel children and sends the bearer token in a header", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url: new URL(url), options };
    return Response.json({
      data: [
        {
          id: "p",
          media_type: "CAROUSEL_ALBUM",
          media_url: "https://cdn.example/cover.jpg",
          caption: "A post",
          permalink: "https://www.instagram.com/p/test",
          timestamp: "2026-11-02T00:00:00Z",
          children: {
            data: [
              {
                id: "c",
                media_type: "VIDEO",
                media_url: "https://cdn.example/video.mp4",
                thumbnail_url: "https://cdn.example/thumb.jpg",
              },
            ],
          },
        },
      ],
    });
  };
  const posts = await getMedia("private-token", "v25.0");
  assert.equal(call.options.headers.Authorization, "Bearer private-token");
  assert.equal(call.url.searchParams.has("access_token"), false);
  assert.equal(posts[0].children[0].type, "VIDEO");
  assert.equal(posts[0].children[0].thumbnail, "https://cdn.example/thumb.jpg");
});
