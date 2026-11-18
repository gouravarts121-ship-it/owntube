import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config.mjs";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(value) {
  return createHmac("sha256", config.secret).update(value).digest("base64url");
}

export function sign(value) {
  return `${b64url(value)}.${hmac(value)}`;
}

export function verify(signed) {
  if (typeof signed !== "string" || !signed.includes(".")) return null;
  const value = Buffer.from(signed.slice(0, signed.lastIndexOf(".")), "base64url").toString();
  const expected = hmac(value);
  const actual = signed.slice(signed.lastIndexOf(".") + 1);
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export function newUserId() {
  return randomBytes(9).toString("base64url");
}

export function issueUserToken(userId) {
  return sign(`user:${userId}`);
}

export function userFromToken(token) {
  const value = verify(token);
  if (!value || !value.startsWith("user:")) return null;
  return value.slice(5);
}

export function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return userFromToken(token);
}

export function requireAdmin(req) {
  const header = req.headers["x-admin-token"];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return false;
  const a = Buffer.from(String(value));
  const b = Buffer.from(config.adminToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signDownload(videoId, userId, expiresAt) {
  return sign(`dl:${videoId}:${userId}:${expiresAt}`);
}

export function verifyDownload(signed, videoId, userId, expiresAt) {
  const value = verify(signed);
  return value === `dl:${videoId}:${userId}:${expiresAt}`;
}
