// netlify/functions/keys-create.js
// POST /api/keys-create  { uses }
// Auth: X-Admin-Token header (never in request body)

import { keysGet, keysSet } from "./_store.js";
import { randomUUID } from "crypto";

export default async (req) => {
  if (req.method !== "POST")
    return json({ ok: false, error: "Method not allowed" }, 405);

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return json({ ok: false, error: "Server misconfigured" }, 500);

  // Auth via header only — token never travels in the body
  if (req.headers.get("X-Admin-Token") !== adminToken)
    return json({ ok: false, error: "Forbidden" }, 403);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const uses = Math.max(1, parseInt(body.uses) || 10);
  const rand = () => randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const key  = `COSMIC-${rand()}-${rand()}-${rand()}-${rand()}`;

  const keys = await keysGet();
  keys[key] = {
    created_at:  new Date().toISOString(),
    expires_at:  null,
    uses_left:   uses,
    max_uses:    uses,
    active:      true,
    created_by:  "admin_bot",
    redeemed_by: [],
  };
  await keysSet(keys);

  return json({ ok: true, key, uses });
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

export const config = { path: "/api/keys-create" };
