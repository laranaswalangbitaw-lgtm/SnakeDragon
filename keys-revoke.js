// netlify/functions/keys-revoke.js
// POST /api/keys-revoke  { key }
// Auth: X-Admin-Token header

import { keysGet, keysSet } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST")
    return json({ ok: false, error: "Method not allowed" }, 405);

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return json({ ok: false, error: "Server misconfigured" }, 500);

  if (req.headers.get("X-Admin-Token") !== adminToken)
    return json({ ok: false, error: "Forbidden" }, 403);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const key = (body.key || "").trim().toUpperCase();
  if (!key) return json({ ok: false, error: "Missing key" }, 400);

  const keys  = await keysGet();
  const entry = keys[key];
  if (!entry) return json({ ok: false, error: "Key not found" }, 404);

  keys[key].active = false;
  await keysSet(keys);

  return json({ ok: true, key });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const config = { path: "/api/keys-revoke" };
