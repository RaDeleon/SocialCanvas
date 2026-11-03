import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createStore, hash, secret, seal, unseal } from "./store.mjs";
import { defaultConfig, demoPosts } from "./demo.mjs";
import { clientSchema, widgetSchema } from "./validation.mjs";
import * as instagram from "./instagram.mjs";
import { verifySignedRequest } from "./meta-signature.mjs";
const hours = (n) => n * 3600000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const parse = (schema, body) => {
  const r = schema.safeParse(body);
  if (!r.success) throw fail(400, r.error.issues[0].message);
  return r.data;
};
export function createApp(options = {}) {
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  const demo =
    options.demo ??
    (process.env.DEMO_MODE ? process.env.DEMO_MODE === "true" : !production);
  const env = {
    production,
    demo,
    appUrl: options.appUrl ?? process.env.APP_URL ?? "http://localhost:5173",
    password:
      options.password ??
      process.env.ADMIN_PASSWORD ??
      (production ? "" : "socialcanvas-demo"),
    encryptionKey:
      options.encryptionKey ??
      process.env.ENCRYPTION_KEY ??
      (!production ? "a".repeat(64) : ""),
    metaAppId: options.metaAppId ?? process.env.META_APP_ID,
    metaAppSecret: options.metaAppSecret ?? process.env.META_APP_SECRET,
    version: process.env.META_API_VERSION ?? "v25.0",
    sourceUrl:
      process.env.SOURCE_URL ?? "https://github.com/RaDeleon/SocialCanvas",
  };
  env.appUrl = env.appUrl.replace(/\/$/, "");
  if (new URL(env.appUrl).origin !== env.appUrl)
    throw Error("APP_URL must be a complete origin without a path.");
  if (
    production &&
    (env.password === "socialcanvas-demo" ||
      env.encryptionKey === "a".repeat(64))
  )
    throw Error("Replace development credentials before production use.");
  env.redirectUri = `${env.appUrl}/api/oauth/instagram/callback`;
  if (!/^[a-fA-F0-9]{64}$/.test(env.encryptionKey))
    throw Error("Set ENCRYPTION_KEY to a 32-byte hex key.");
  if (env.password.length < 12)
    throw Error("Set ADMIN_PASSWORD to at least 12 characters.");
  if (production && !env.appUrl.startsWith("https://"))
    throw Error("Production APP_URL must use HTTPS.");
  if (!/^v\d+\.\d+$/.test(env.version))
    throw Error("Invalid META_API_VERSION.");
  const configured = Boolean(env.metaAppId && env.metaAppSecret);
  const db = createStore(
    options.dbPath ?? process.env.DATABASE_PATH ?? "data/socialcanvas.sqlite",
    demo,
  );
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      referrerPolicy: { policy: "no-referrer" },
      frameguard: false,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/meta", express.urlencoded({ extended: false, limit: "25kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, _res, next) => {
    if (req.path === "/meta/deauthorize" || req.path === "/meta/delete-data")
      return next();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-SocialCanvas") !== "1")
        return next(fail(403, "Request verification failed."));
      if (req.get("Origin") && req.get("Origin") !== new URL(env.appUrl).origin)
        return next(fail(403, "Origin not allowed."));
    }
    next();
  });
  const getSession = (req) => {
    const raw = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("sc_session="))
      ?.slice(11);
    return (
      raw &&
      db
        .prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?")
        .get(hash(raw), Date.now())
    );
  };
  const auth = (req, _res, next) =>
    getSession(req) ? next() : next(fail(401, "Sign in to your workspace."));
  const getClient = (id) => {
    const c = db.prepare("SELECT * FROM clients WHERE id=?").get(id);
    if (!c) throw fail(404, "Client not found.");
    return c;
  };
  const getWidget = (id) => {
    const w = db.prepare("SELECT * FROM widgets WHERE id=?").get(id);
    if (!w) throw fail(404, "Widget not found.");
    return w;
  };
  const inviteFor = (token) => {
    const inv = db
      .prepare("SELECT * FROM invitations WHERE hash=?")
      .get(hash(token));
    if (!inv || inv.revoked || inv.used || inv.expires < Date.now())
      throw fail(
        410,
        "This connection link has expired or has already been used. Ask for a new link.",
      );
    return inv;
  };
  const publicAccount = (a) =>
    a
      ? {
          id: a.id,
          clientId: a.client_id,
          username: a.username,
          name: a.name,
          avatar: a.avatar,
          demo: Boolean(a.demo),
          lastSync: a.last_sync,
          error: a.error,
          expires: a.expires,
          posts: JSON.parse(a.posts),
        }
      : null;
  const widgetView = (w) => ({
    id: w.id,
    clientId: w.client_id,
    name: w.name,
    config: JSON.parse(w.draft),
    published: w.published ? JSON.parse(w.published) : null,
    domains: JSON.parse(w.domains),
    updated: w.updated,
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.get("/api/status", (req, res) =>
    res.json({
      authenticated: Boolean(getSession(req)),
      demo,
      configured,
      appUrl: env.appUrl,
      sourceUrl: env.sourceUrl,
    }),
  );
  const passwordHash = scryptSync(env.password, "socialcanvas-admin-v1", 64);
  app.post("/api/login", loginLimiter, (req, res) => {
    const supplied = String(req.body?.password ?? "");
    if (supplied.length > 256) throw fail(400, "Password is too long.");
    if (
      !timingSafeEqual(
        passwordHash,
        scryptSync(supplied, "socialcanvas-admin-v1", 64),
      )
    )
      throw fail(401, "Incorrect workspace password.");
    const token = secret();
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES(?,?)").run(
      hash(token),
      Date.now() + hours(12),
    );
    res
      .cookie("sc_session", token, {
        httpOnly: true,
        secure: production,
        sameSite: "lax",
        maxAge: hours(12),
        path: "/",
      })
      .json({ ok: true });
  });
  app.post("/api/logout", auth, (req, res) => {
    const raw = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("sc_session="))
      ?.slice(11);
    if (raw) db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(raw));
    res.clearCookie("sc_session", { path: "/" }).json({ ok: true });
  });
  app.get("/api/workspace", auth, (_req, res) =>
    res.json({
      clients: db.prepare("SELECT * FROM clients ORDER BY created DESC").all(),
      accounts: db.prepare("SELECT * FROM accounts").all().map(publicAccount),
      widgets: db
        .prepare("SELECT * FROM widgets ORDER BY updated DESC")
        .all()
        .map(widgetView),
      invitations: db
        .prepare(
          "SELECT hash,client_id as clientId,expires,used,revoked,created FROM invitations ORDER BY created DESC",
        )
        .all(),
    }),
  );
  app.post("/api/clients", auth, (req, res) => {
    const c = parse(clientSchema, req.body),
      id = randomUUID();
    db.prepare("INSERT INTO clients VALUES(?,?,?,?,?)").run(
      id,
      c.name,
      c.website,
      c.email,
      new Date().toISOString(),
    );
    res.status(201).json(getClient(id));
  });
  app.delete("/api/clients/:id", auth, (req, res) => {
    getClient(req.params.id);
    db.prepare(
      "DELETE FROM oauth_states WHERE invite_hash IN (SELECT hash FROM invitations WHERE client_id=?)",
    ).run(req.params.id);
    db.prepare("DELETE FROM clients WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  });
  app.post("/api/clients/:id/invitations", auth, (req, res) => {
    getClient(req.params.id);
    const token = secret(),
      expires = Date.now() + hours(72);
    db.prepare(
      "UPDATE invitations SET revoked=1 WHERE client_id=? AND used=0",
    ).run(req.params.id);
    db.prepare("INSERT INTO invitations VALUES(?,?,?,0,0,?)").run(
      hash(token),
      req.params.id,
      expires,
      new Date().toISOString(),
    );
    res.status(201).json({ url: `${env.appUrl}/connect/${token}`, expires });
  });
  app.delete("/api/invitations/:hash", auth, (req, res) => {
    db.prepare("UPDATE invitations SET revoked=1 WHERE hash=?").run(
      req.params.hash,
    );
    res.json({ ok: true });
  });
  app.get("/api/connect/:token", (req, res) => {
    const inv = inviteFor(req.params.token),
      c = getClient(inv.client_id);
    res.json({
      name: c.name,
      website: c.website,
      expires: inv.expires,
      demo,
      configured,
    });
  });
  app.post("/api/connect/:token/demo", (req, res) => {
    if (!demo) throw fail(404, "Demo mode is disabled.");
    const inv = inviteFor(req.params.token);
    const existing = db
      .prepare("SELECT demo FROM accounts WHERE client_id=?")
      .get(inv.client_id);
    if (existing && !existing.demo)
      throw fail(
        409,
        "Disconnect the live account before attaching demo content.",
      );
    db.prepare(
      "INSERT INTO accounts(id,client_id,username,name,posts,last_sync,demo) VALUES(?,?,?,?,?,?,1) ON CONFLICT(client_id) DO UPDATE SET id=excluded.id,username=excluded.username,name=excluded.name,token=NULL,expires=NULL,posts=excluded.posts,last_sync=excluded.last_sync,error=NULL,demo=1",
    ).run(
      randomUUID(),
      inv.client_id,
      "coastal.studio",
      "Coastal Studio",
      JSON.stringify(demoPosts()),
      new Date().toISOString(),
    );
    db.prepare("UPDATE invitations SET used=1 WHERE hash=?").run(inv.hash);
    res.json({ ok: true, demo: true });
  });
  app.get("/api/connect/:token/authorize", (req, res) => {
    const inv = inviteFor(req.params.token);
    if (!configured)
      throw fail(503, "Instagram connection is not configured yet.");
    const state = secret();
    db.prepare("DELETE FROM oauth_states WHERE expires<?").run(Date.now());
    db.prepare("INSERT INTO oauth_states VALUES(?,?,?)").run(
      hash(state),
      inv.hash,
      Date.now() + 600000,
    );
    res.cookie("sc_oauth", state, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      maxAge: 600000,
      path: "/api/oauth/instagram/callback",
    });
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.search = new URLSearchParams({
      enable_fb_login: "0",
      force_reauth: "true",
      client_id: env.metaAppId,
      redirect_uri: env.redirectUri,
      response_type: "code",
      scope: "instagram_business_basic",
      state,
    }).toString();
    res.redirect(url.href);
  });
  app.get("/api/oauth/instagram/callback", async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookie = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("sc_oauth="))
      ?.slice(9);
    const saved = db
      .prepare("SELECT * FROM oauth_states WHERE hash=? AND expires>?")
      .get(hash(state), Date.now());
    if (!cookie || !state || hash(cookie) !== hash(state) || !saved)
      throw fail(
        400,
        "Instagram authorization could not be verified. Open your invitation and try again.",
      );
    db.prepare("DELETE FROM oauth_states WHERE hash=?").run(hash(state));
    res.clearCookie("sc_oauth", { path: "/api/oauth/instagram/callback" });
    const inv = db
      .prepare(
        "SELECT * FROM invitations WHERE hash=? AND used=0 AND revoked=0 AND expires>?",
      )
      .get(saved.invite_hash, Date.now());
    if (!inv) throw fail(410, "Your invitation is no longer valid.");
    if (req.query.error)
      return res.redirect("/connection-result?status=cancelled");
    if (typeof req.query.code !== "string")
      throw fail(400, "Instagram did not return an authorization code.");
    try {
      const result = await (options.instagram ?? instagram).exchangeCode(
        req.query.code,
        env,
      );
      const provider = options.instagram ?? instagram;
      const [profile, posts] = await Promise.all([
        provider.getProfile(result.access_token, env.version),
        provider.getMedia(result.access_token, env.version),
      ]);
      // Recheck after network I/O: a revoked invitation must not connect an account.
      const valid = db
        .prepare(
          "SELECT hash FROM invitations WHERE hash=? AND used=0 AND revoked=0 AND expires>?",
        )
        .get(inv.hash, Date.now());
      if (!valid) throw fail(410, "Your invitation is no longer valid.");
      db.prepare(
        "INSERT INTO accounts(id,client_id,username,name,avatar,token,expires,posts,last_sync,demo,instagram_id) VALUES(?,?,?,?,?,?,?,?,?,0,?) ON CONFLICT(client_id) DO UPDATE SET id=excluded.id,username=excluded.username,name=excluded.name,avatar=excluded.avatar,token=excluded.token,expires=excluded.expires,posts=excluded.posts,last_sync=excluded.last_sync,error=NULL,demo=0,instagram_id=excluded.instagram_id",
      ).run(
        randomUUID(),
        inv.client_id,
        profile.username,
        profile.name ?? profile.username,
        profile.profile_picture_url ?? null,
        seal(result.access_token, env.encryptionKey),
        Date.now() + (result.expires_in ?? 5184000) * 1000,
        JSON.stringify(posts),
        new Date().toISOString(),
        String(profile.user_id ?? profile.id),
      );
      db.prepare("UPDATE invitations SET used=1 WHERE hash=?").run(inv.hash);
      res.redirect("/connection-result?status=success");
    } catch (error) {
      if (error.status) throw error;
      res.redirect("/connection-result?status=failed");
    }
  });
  function verifiedMetaUser(req) {
    try {
      return verifySignedRequest(req.body?.signed_request, env.metaAppSecret);
    } catch {
      throw fail(400, "Invalid signed request.");
    }
  }
  function removeInstagramData(userId, deleteClient = false) {
    const accounts = db
      .prepare("SELECT client_id FROM accounts WHERE instagram_id=? AND demo=0")
      .all(userId);
    db.exec("BEGIN");
    try {
      for (const a of accounts) {
        db.prepare(
          "DELETE FROM oauth_states WHERE invite_hash IN (SELECT hash FROM invitations WHERE client_id=?)",
        ).run(a.client_id);
        if (deleteClient)
          db.prepare("DELETE FROM clients WHERE id=?").run(a.client_id);
        else {
          db.prepare("DELETE FROM accounts WHERE client_id=?").run(a.client_id);
          db.prepare("UPDATE invitations SET revoked=1 WHERE client_id=?").run(
            a.client_id,
          );
        }
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  app.post("/api/meta/deauthorize", (req, res) => {
    removeInstagramData(verifiedMetaUser(req));
    res.json({ ok: true });
  });
  app.post("/api/meta/delete-data", (req, res) => {
    removeInstagramData(verifiedMetaUser(req), true);
    const code = secret();
    db.prepare("INSERT INTO deletion_receipts VALUES(?,?)").run(
      hash(code),
      new Date().toISOString(),
    );
    res.json({
      url: `${env.appUrl}/data-deletion/${code}`,
      confirmation_code: code,
    });
  });
  app.get("/api/meta/deletions/:code", (req, res) => {
    const receipt = db
      .prepare("SELECT created FROM deletion_receipts WHERE hash=?")
      .get(hash(req.params.code));
    if (!receipt) throw fail(404, "Deletion confirmation not found.");
    res.json({ status: "complete", completed: receipt.created });
  });
  const syncing = new Set();
  async function syncAccount(a) {
    if (syncing.has(a.client_id))
      throw fail(409, "A refresh is already in progress.");
    syncing.add(a.client_id);
    try {
      if (a.demo) {
        db.prepare(
          "UPDATE accounts SET last_sync=?,error=NULL WHERE client_id=?",
        ).run(new Date().toISOString(), a.client_id);
        return;
      }
      let token = unseal(a.token, env.encryptionKey);
      const provider = options.instagram ?? instagram;
      if (a.expires && a.expires < Date.now() + hours(24 * 30)) {
        const renewed = await provider.refreshToken(token);
        token = renewed.access_token;
        db.prepare(
          "UPDATE accounts SET token=?,expires=? WHERE client_id=? AND token=?",
        ).run(
          seal(token, env.encryptionKey),
          Date.now() + (renewed.expires_in ?? 5184000) * 1000,
          a.client_id,
          a.token,
        );
      }
      const posts = await provider.getMedia(token, env.version);
      // Never resurrect an account that was disconnected during a refresh.
      db.prepare(
        "UPDATE accounts SET posts=?,last_sync=?,error=NULL WHERE id=? AND client_id=?",
      ).run(JSON.stringify(posts), new Date().toISOString(), a.id, a.client_id);
    } catch (error) {
      db.prepare("UPDATE accounts SET error=? WHERE id=?").run(
        "Refresh failed. Try again or reconnect Instagram.",
        a.id,
      );
      throw fail(502, "Refresh failed. Try again or reconnect Instagram.");
    } finally {
      syncing.delete(a.client_id);
    }
  }
  app.post("/api/clients/:id/sync", auth, async (req, res) => {
    getClient(req.params.id);
    const a = db
      .prepare("SELECT * FROM accounts WHERE client_id=?")
      .get(req.params.id);
    if (!a) throw fail(404, "Connect Instagram first.");
    await syncAccount(a);
    res.json({ ok: true });
  });
  app.delete("/api/clients/:id/account", auth, (req, res) => {
    getClient(req.params.id);
    db.prepare("DELETE FROM accounts WHERE client_id=?").run(req.params.id);
    db.prepare("UPDATE invitations SET revoked=1 WHERE client_id=?").run(
      req.params.id,
    );
    res.json({ ok: true });
  });
  app.post("/api/widgets", auth, (req, res) => {
    const c = getClient(req.body?.clientId);
    const id = randomUUID(),
      name =
        String(req.body?.name ?? "Untitled widget")
          .trim()
          .slice(0, 100) || "Untitled widget";
    const domain = new URL(c.website).hostname;
    db.prepare(
      "INSERT INTO widgets(id,client_id,name,draft,published,domains,updated) VALUES(?,?,?,?,NULL,?,?)",
    ).run(
      id,
      c.id,
      name,
      JSON.stringify(defaultConfig),
      JSON.stringify([domain]),
      new Date().toISOString(),
    );
    res.status(201).json(widgetView(getWidget(id)));
  });
  app.put("/api/widgets/:id", auth, (req, res) => {
    getWidget(req.params.id);
    const w = parse(widgetSchema, req.body);
    db.prepare(
      "UPDATE widgets SET name=?,draft=?,domains=?,updated=? WHERE id=?",
    ).run(
      w.name,
      JSON.stringify(w.config),
      JSON.stringify(w.domains),
      new Date().toISOString(),
      req.params.id,
    );
    res.json(widgetView(getWidget(req.params.id)));
  });
  app.post("/api/widgets/:id/publish", auth, (req, res) => {
    const w = getWidget(req.params.id);
    if (!JSON.parse(w.domains).length)
      throw fail(
        400,
        "Add at least one allowed website domain before publishing.",
      );
    if (
      !db.prepare("SELECT id FROM accounts WHERE client_id=?").get(w.client_id)
    )
      throw fail(400, "Connect Instagram before publishing.");
    db.prepare(
      "UPDATE widgets SET published=draft,published_domains=domains,updated=? WHERE id=?",
    ).run(new Date().toISOString(), w.id);
    res.json(widgetView(getWidget(w.id)));
  });
  app.post("/api/widgets/:id/unpublish", auth, (req, res) => {
    getWidget(req.params.id);
    db.prepare(
      "UPDATE widgets SET published=NULL,published_domains=NULL WHERE id=?",
    ).run(req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/widgets/:id", auth, (req, res) => {
    getWidget(req.params.id);
    db.prepare("DELETE FROM widgets WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/public/widgets/:id", (req, res) => {
    const w = getWidget(req.params.id);
    if (!w.published) throw fail(404, "This widget is not published.");
    const config = JSON.parse(w.published),
      a = publicAccount(
        db.prepare("SELECT * FROM accounts WHERE client_id=?").get(w.client_id),
      );
    const posts = (a?.posts ?? [])
      .filter(
        (p) =>
          !config.hiddenPosts.includes(p.id) &&
          (config.mediaFilter === "all" || p.type === config.mediaFilter),
      )
      .slice(0, config.limit);
    res.json({
      id: w.id,
      name: w.name,
      config,
      account: a
        ? { username: a.username, name: a.name, avatar: a.avatar, demo: a.demo }
        : null,
      posts,
    });
  });
  app.get("/embed.js", (_req, res) => {
    res
      .type("application/javascript")
      .set("Cache-Control", "public,max-age=300")
      .send(
        `(()=>{const script=document.currentScript;if(!script)return;const origin=new URL(script.src).origin;document.querySelectorAll('[data-socialcanvas]').forEach(el=>{if(el.dataset.scReady)return;const id=el.getAttribute('data-socialcanvas');if(!/^[a-zA-Z0-9-]{1,100}$/.test(id||''))return;el.dataset.scReady='1';const f=document.createElement('iframe');f.src=origin+'/embed/'+encodeURIComponent(id);f.title='Instagram feed';f.loading='lazy';f.style.cssText='display:block;width:100%;border:0;min-height:180px;';f.setAttribute('referrerpolicy','no-referrer');el.appendChild(f);window.addEventListener('message',e=>{if(e.origin===origin&&e.source===f.contentWindow&&e.data?.type==='socialcanvas:resize'&&Number.isFinite(e.data.height)){f.style.height=Math.min(20000,Math.max(100,e.data.height))+'px';}});});})();`,
      );
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  const dist = resolve("dist");
  app.use(express.static(dist, { index: false }));
  app.get("/embed/:id", (req, res, next) => {
    try {
      const w = getWidget(req.params.id);
      if (!w.published) throw fail(404, "This widget is not published.");
      const domains = JSON.parse(w.published_domains ?? w.domains);
      const sources = domains.flatMap((d) =>
        env.production ? [`https://${d}`] : [`http://${d}:*`, `https://${d}`],
      );
      res.set(
        "Content-Security-Policy",
        `frame-ancestors 'self' ${sources.join(" ")};`,
      );
      if (existsSync(`${dist}/index.html`)) res.sendFile(`${dist}/index.html`);
      else next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next(fail(404, "Not found."));
    if (!res.get("Content-Security-Policy"))
      res.set("Content-Security-Policy", "frame-ancestors 'none';");
    if (existsSync(`${dist}/index.html`)) res.sendFile(`${dist}/index.html`);
    else
      res
        .status(404)
        .json({ error: "Frontend runs on port 5173 during development." });
  });
  app.use((error, _req, res, _next) =>
    res.status(error.status ?? 500).json({
      error: error.status
        ? error.message
        : "Something went wrong. Please try again.",
    }),
  );
  async function syncDue() {
    const due = db
      .prepare(
        "SELECT * FROM accounts WHERE demo=0 AND (last_sync IS NULL OR last_sync<?)",
      )
      .all(new Date(Date.now() - hours(1)).toISOString());
    for (const a of due) {
      try {
        await syncAccount(a);
      } catch {
        /* Account status records failure; no credentials logged. */
      }
    }
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    db.prepare("DELETE FROM oauth_states WHERE expires<?").run(Date.now());
  }
  return { app, db, env, syncDue };
}
