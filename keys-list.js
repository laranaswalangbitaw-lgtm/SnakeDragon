// netlify/functions/keys-list.js
// GET /api/keys-list
// Auth: X-Admin-Token header

import { keysGet } from "./_store.js";

export default async (req) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken)
    return new Response(JSON.stringify({ ok: false, error: "Server misconfigured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  if (req.headers.get("X-Admin-Token") !== adminToken)
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });

  const keys = await keysGet();
  return new Response(JSON.stringify({ ok: true, keys }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/keys-list" };
