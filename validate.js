// netlify/functions/validate.js
// POST /api/validate  { key, user_id }

import { keysGet } from "./_store.js";

export default async (req) => {
  if (req.method === "OPTIONS") return cors();

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const key    = (body.key    || "").trim().toUpperCase();
  const userId = String(body.user_id || "").trim();

  if (!key) return json({ ok: false, error: "Missing key" }, 400);

  const keys  = await keysGet();
  const entry = keys[key];

  if (!entry) return json({ ok: false, valid: false, error: "Invalid key" });

  const redeemed = (entry.redeemed_by || []).includes(userId);
  const active   = !!entry.active;
  const expired  = entry.expires_at
    ? new Date(entry.expires_at) < new Date()
    : false;

  return json({
    ok:        true,
    valid:     active && !expired && redeemed,
    redeemed,
    active,
    expired,
    uses_left: entry.uses_left ?? 0,
  });
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

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export const config = { path: "/api/validate" };
