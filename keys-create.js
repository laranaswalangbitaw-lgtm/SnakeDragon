// netlify/functions/keys-create.js
// POST /api/keys-create  { uses, admin_token }
// Called by the Telegram admin bot to generate keys.

import { keysGet, keysSet } from "./_store.js";
import { randomUUID } from "crypto";

export default async (req) => {
  if (req.method !== "POST")
    return json({ ok: false, error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const adminToken = process.env.ADMIN_TOKEN || "changeme";
  if (body.admin_token !== adminToken)
    return json({ ok: false, error: "Forbidden" }, 403);

  const uses = Math.max(1, parseInt(body.uses) || 10);
  const parts = [0,0,0,0].map(() => randomUUID().replace(/-/g,"").slice(0,4).toUpperCase());
  const key   = "COSMIC-" + parts.join("-");

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
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const config = { path: "/api/keys-create" };
