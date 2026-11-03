import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { defaultConfig, demoPosts } from "./demo.mjs";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export function seal(value, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    data.toString("hex"),
  ].join(".");
}
export function unseal(value, key) {
  const [iv, tag, data] = value.split(".");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex"),
  );
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    cipher.update(Buffer.from(data, "hex")),
    cipher.final(),
  ]).toString("utf8");
}
export function createStore(path, demo) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,name TEXT NOT NULL,website TEXT NOT NULL,email TEXT,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,client_id TEXT UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,username TEXT,name TEXT,avatar TEXT,token TEXT,expires INTEGER,posts TEXT NOT NULL DEFAULT '[]',last_sync TEXT,error TEXT,demo INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS widgets(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,name TEXT NOT NULL,draft TEXT NOT NULL,published TEXT,domains TEXT NOT NULL DEFAULT '[]',updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS invitations(hash TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,revoked INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_states(hash TEXT PRIMARY KEY,invite_hash TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS deletion_receipts(hash TEXT PRIMARY KEY,created TEXT NOT NULL);
  `);
  if (
    !db
      .prepare("PRAGMA table_info(accounts)")
      .all()
      .some((c) => c.name === "instagram_id")
  )
    db.exec("ALTER TABLE accounts ADD COLUMN instagram_id TEXT");
  if (
    !db
      .prepare("PRAGMA table_info(widgets)")
      .all()
      .some((c) => c.name === "published_domains")
  )
    db.exec("ALTER TABLE widgets ADD COLUMN published_domains TEXT");
  if (demo && !db.prepare("SELECT id FROM clients LIMIT 1").get()) {
    db.prepare("INSERT INTO clients VALUES(?,?,?,?,?)").run(
      "demo-client",
      "Coastal Studio",
      "https://coastal.example",
      "",
      new Date().toISOString(),
    );
    db.prepare(
      "INSERT INTO accounts(id,client_id,username,name,posts,last_sync,demo) VALUES(?,?,?,?,?,?,1)",
    ).run(
      "demo-account",
      "demo-client",
      "coastal.studio",
      "Coastal Studio",
      JSON.stringify(demoPosts()),
      new Date().toISOString(),
    );
    db.prepare(
      "INSERT INTO widgets(id,client_id,name,draft,published,domains,updated) VALUES(?,?,?,?,?,?,?)",
    ).run(
      "demo-widget",
      "demo-client",
      "Coastal journal",
      JSON.stringify(defaultConfig),
      null,
      JSON.stringify(["coastal.example", "localhost", "127.0.0.1"]),
      new Date().toISOString(),
    );
  }
  return db;
}
