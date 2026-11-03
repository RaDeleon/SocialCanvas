import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.mjs";
import { seal, unseal, hash } from "./store.mjs";
import { defaultConfig } from "./demo.mjs";
async function setup(t, options = {}) {
  const instance = createApp({
    dbPath: ":memory:",
    demo: true,
    appUrl: "http://localhost:5173",
    ...options,
  });
  const server = instance.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(
    () =>
      new Promise((r) =>
        server.close(() => {
          instance.db.close();
          r();
        }),
      ),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const request = async (path, method = "GET", body, extra = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-SocialCanvas": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "manual",
    });
    return res;
  };
  const login = async () => {
    const r = await request("/api/login", "POST", {
      password: "socialcanvas-demo",
    });
    assert.equal(r.status, 200);
    cookie = r.headers.get("set-cookie").split(";")[0];
  };
  return { ...instance, request, login, base };
}
test("admin data requires a session and mutations reject foreign origins", async (t) => {
  const { request, login } = await setup(t);
  assert.equal((await request("/api/workspace")).status, 401);
  assert.equal(
    (await request("/api/login", "POST", { password: "wrong" })).status,
    401,
  );
  await login();
  assert.equal((await request("/api/workspace")).status, 200);
  assert.equal(
    (
      await request(
        "/api/clients",
        "POST",
        { name: "Bad", website: "https://example.com" },
        { Origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  await request("/api/logout", "POST");
  assert.equal((await request("/api/workspace")).status, 401);
});
test("invitations expire, replacement revokes old links, and demo consumption is single use", async (t) => {
  const { request, login, db } = await setup(t);
  await login();
  const c = await (
    await request("/api/clients", "POST", {
      name: "Client",
      website: "https://client.example",
    })
  ).json();
  const invite = async () =>
    (
      await (await request(`/api/clients/${c.id}/invitations`, "POST")).json()
    ).url
      .split("/")
      .at(-1);
  const first = await invite(),
    second = await invite();
  assert.equal((await request(`/api/connect/${first}`)).status, 410);
  assert.equal((await request(`/api/connect/${second}`)).status, 200);
  assert.equal(
    (await request(`/api/connect/${second}/demo`, "POST")).status,
    200,
  );
  assert.equal(
    (await request(`/api/connect/${second}/demo`, "POST")).status,
    410,
  );
  const third = await invite();
  db.prepare("UPDATE invitations SET expires=0 WHERE hash=?").run(hash(third));
  assert.equal((await request(`/api/connect/${third}`)).status, 410);
});
test("drafts stay private, publishing isolates saved changes, and disconnect removes cached public media", async (t) => {
  const { request, login } = await setup(t);
  await login();
  assert.equal((await request("/api/public/widgets/demo-widget")).status, 404);
  await request("/api/widgets/demo-widget/publish", "POST");
  const before = await (
    await request("/api/public/widgets/demo-widget")
  ).json();
  assert.equal(before.posts.length, 9);
  assert.equal(before.config.layout, "grid");
  assert.equal(before.account.demo, true);
  assert.equal(JSON.stringify(before).includes("token"), false);
  await request("/api/widgets/demo-widget", "PUT", {
    name: "Updated",
    config: { ...defaultConfig, layout: "masonry", hiddenPosts: ["demo-1"] },
    domains: ["client.example"],
  });
  assert.equal(
    (await (await request("/api/public/widgets/demo-widget")).json()).config
      .layout,
    "grid",
  );
  assert.match(
    (await request("/embed/demo-widget")).headers.get(
      "content-security-policy",
    ),
    /coastal\.example/,
  );
  await request("/api/widgets/demo-widget/publish", "POST");
  const after = await (await request("/api/public/widgets/demo-widget")).json();
  assert.equal(after.config.layout, "masonry");
  assert.equal(
    after.posts.some((p) => p.id === "demo-1"),
    false,
  );
  const frame = await request("/embed/demo-widget");
  assert.match(
    frame.headers.get("content-security-policy"),
    /http:\/\/client\.example:\*/,
  );
  await request("/api/clients/demo-client/account", "DELETE");
  assert.equal(
    (await (await request("/api/public/widgets/demo-widget")).json()).posts
      .length,
    0,
  );
  await request("/api/widgets/demo-widget/unpublish", "POST");
  assert.equal((await request("/api/public/widgets/demo-widget")).status, 404);
});
test("widget configuration and domain validation reject unsafe values", async (t) => {
  const { request, login } = await setup(t);
  await login();
  for (const domains of [
    ["https://example.com/path"],
    ["bad; frame-ancestors *"],
    ["*.example.com"],
  ])
    assert.equal(
      (
        await request("/api/widgets/demo-widget", "PUT", {
          name: "Test",
          config: defaultConfig,
          domains,
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await request("/api/widgets/demo-widget", "PUT", {
        name: "Test",
        config: { ...defaultConfig, columns: 999 },
        domains: ["example.com"],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/clients", "POST", {
        name: "Invalid",
        website: "javascript:alert(1)",
      })
    ).status,
    400,
  );
});
test("OAuth binds state to the browser, encrypts the token, and rejects replay", async (t) => {
  const provider = {
    exchangeCode: async () => ({
      access_token: "private-instagram-token",
      expires_in: 5184000,
    }),
    getProfile: async () => ({
      user_id: "ig-123",
      username: "client.account",
      name: "Client",
    }),
    getMedia: async () => [],
    refreshToken: async () => ({ access_token: "new-token" }),
  };
  const { request, login, db } = await setup(t, {
    metaAppId: "123",
    metaAppSecret: "secret",
    instagram: provider,
  });
  await login();
  const inv = await (
      await request("/api/clients/demo-client/invitations", "POST")
    ).json(),
    token = inv.url.split("/").at(-1);
  const start = await request(`/api/connect/${token}/authorize`),
    url = new URL(start.headers.get("location"));
  assert.equal(url.searchParams.get("scope"), "instagram_business_basic");
  const state = url.searchParams.get("state"),
    oauthCookie = start.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await request(`/api/oauth/instagram/callback?state=${state}&code=abc`))
      .status,
    400,
  );
  const success = await request(
    `/api/oauth/instagram/callback?state=${state}&code=abc`,
    "GET",
    undefined,
    { Cookie: oauthCookie },
  );
  assert.equal(
    success.headers.get("location"),
    "/connection-result?status=success",
  );
  const a = db
    .prepare("SELECT * FROM accounts WHERE client_id=?")
    .get("demo-client");
  assert.notEqual(a.token, "private-instagram-token");
  assert.equal(unseal(a.token, "a".repeat(64)), "private-instagram-token");
  assert.equal(a.demo, 0);
  assert.equal(
    (
      await request(
        `/api/oauth/instagram/callback?state=${state}&code=abc`,
        "GET",
        undefined,
        { Cookie: oauthCookie },
      )
    ).status,
    400,
  );
  const json = JSON.stringify(await (await request("/api/workspace")).json());
  assert.equal(json.includes("private-instagram-token"), false);
});
test("revocation during OAuth exchange prevents account connection", async (t) => {
  let release;
  const waiting = new Promise((r) => {
    release = r;
  });
  let entered;
  const started = new Promise((r) => {
    entered = r;
  });
  const provider = {
    exchangeCode: async () => {
      entered();
      await waiting;
      return { access_token: "secret" };
    },
    getProfile: async () => ({ id: "x", username: "revoked" }),
    getMedia: async () => [],
  };
  const { request, login } = await setup(t, {
    metaAppId: "123",
    metaAppSecret: "secret",
    instagram: provider,
  });
  await login();
  const inv = await (
    await request("/api/clients/demo-client/invitations", "POST")
  ).json();
  const token = inv.url.split("/").at(-1);
  const start = await request(`/api/connect/${token}/authorize`),
    state = new URL(start.headers.get("location")).searchParams.get("state"),
    cookie = start.headers.get("set-cookie").split(";")[0];
  const callback = request(
    `/api/oauth/instagram/callback?state=${state}&code=abc`,
    "GET",
    undefined,
    { Cookie: cookie },
  );
  await started;
  await request(`/api/invitations/${hash(token)}`, "DELETE");
  release();
  assert.equal((await callback).status, 410);
});
test("production rejects default credentials and demo endpoints are disabled", async (t) => {
  assert.throws(
    () => createApp({ production: true, dbPath: ":memory:", demo: false }),
    /ENCRYPTION_KEY/,
  );
  const { request } = await setup(t, { demo: false });
  assert.equal(
    (await request("/api/connect/anything/demo", "POST")).status,
    404,
  );
  const encrypted = seal("secret", "a".repeat(64));
  assert.throws(() => unseal(encrypted, "b".repeat(64)));
});

test("Meta callbacks verify signatures and erase only the authorized account data", async (t) => {
  const { createHmac } = await import("node:crypto");
  const { request, login, db } = await setup(t, {
    metaAppId: "123",
    metaAppSecret: "meta-secret",
  });
  await login();
  db.prepare(
    "UPDATE accounts SET demo=0,instagram_id='12345',token=? WHERE client_id='demo-client'",
  ).run(seal("token", "a".repeat(64)));
  const sign = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return (
      createHmac("sha256", "meta-secret").update(data).digest("base64url") +
      "." +
      data
    );
  };
  assert.equal(
    (
      await request("/api/meta/delete-data", "POST", {
        signed_request: "invalid",
      })
    ).status,
    400,
  );
  assert.equal(db.prepare("SELECT count(*) as n FROM clients").get().n, 1);
  const signed = sign({ algorithm: "HMAC-SHA256", user_id: "12345" });
  const deleted = await (
    await request("/api/meta/delete-data", "POST", { signed_request: signed })
  ).json();
  assert.equal(db.prepare("SELECT count(*) as n FROM clients").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) as n FROM accounts").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) as n FROM widgets").get().n, 0);
  assert.equal(
    (await request("/api/meta/deletions/" + deleted.confirmation_code)).status,
    200,
  );
  assert.equal((await request("/api/meta/deletions/not-a-code")).status, 404);
  assert.equal(
    (await request("/api/meta/deauthorize", "POST", { signed_request: signed }))
      .status,
    200,
  );
});
