import { createHmac, timingSafeEqual } from "node:crypto";
export function verifySignedRequest(value, appSecret) {
  if (!appSecret || typeof value !== "string" || value.length > 20000)
    throw new Error("Invalid signed request.");
  const parts = value.split(".");
  if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)))
    throw new Error("Invalid signed request.");
  const signature = Buffer.from(parts[0], "base64url"),
    expected = createHmac("sha256", appSecret).update(parts[1]).digest();
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  )
    throw new Error("Invalid signed request.");
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  );
  if (
    payload.algorithm !== "HMAC-SHA256" ||
    !["string", "number"].includes(typeof payload.user_id) ||
    !String(payload.user_id).match(/^\d{1,100}$/)
  )
    throw new Error("Invalid signed request.");
  return String(payload.user_id);
}
