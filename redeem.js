// netlify/functions/redeem.js
// POST /api/redeem  { key, user_id }

import { keysGet, keysSet } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const key    = (body.key    || "").trim().toUpperCase();
  const userId = String(body.user_id || "").trim();

  if (!key || !userId) {
    return json({ ok: false, error: "Missing key or user_id" }, 400);
  }

  const keys  = await keysGet();
  const entry = keys[key];

  if (!entry)                return json({ ok: false, error: "Invalid key" }, 403);
  if (!entry.active)         return json({ ok: false, error: "Key is inactive" }, 403);
  if (entry.uses_left <= 0)  return json({ ok: false, error: "Key exhausted" }, 403);

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return json({ ok: false, error: "Key expired" }, 403);
  }

  const redeemed = entry.redeemed_by || [];
  if (redeemed.includes(userId)) {
    return json({ ok: false, error: "Already redeemed by this user" }, 403);
  }

  entry.uses_left  -= 1;
  entry.redeemed_by = [...redeemed, userId];
  if (entry.uses_left <= 0) entry.active = false;
  keys[key] = entry;
  await keysSet(keys);

  return json({ ok: true, uses_left: entry.uses_left });
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

export const config = { path: "/api/redeem" };
