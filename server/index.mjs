import "node:process";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const { createApp } = await import("./app.mjs");
const { app, db, syncDue } = createApp();
const port = Number(process.env.PORT ?? 3001),
  host = process.env.HOST ?? "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(`SocialCanvas server: http://${host}:${port}`),
);
const timer = setInterval(() => void syncDue(), 60000);
timer.unref();
void syncDue();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(timer);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
