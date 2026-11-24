// netlify/functions/keys-list.js
// GET /api/keys-list
// Header: X-Admin-Token: <ADMIN_TOKEN env var>

import { keysGet } from "./_store.js";

export default async (req) => {
  const adminToken = process.env.ADMIN_TOKEN || "changeme";
  if (req.headers.get("X-Admin-Token") !== adminToken) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const keys = await keysGet();
  return new Response(JSON.stringify({ ok: true, keys }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/keys-list" };
