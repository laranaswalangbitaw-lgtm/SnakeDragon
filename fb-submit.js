// netlify/functions/fb-submit.js
// POST /api/fb-submit  { key, url, count, reason }

import { keysGet, queueGet, queueSet } from "./_store.js";
import { randomUUID } from "crypto";

export default async (req) => {
  if (req.method === "OPTIONS") return cors();
  if (req.method !== "POST")
    return json({ ok: false, error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const key   = (body.key || "").trim().toUpperCase();
  const keys  = await keysGet();
  const entry = keys[key];
  if (!entry || !entry.active)
    return json({ ok: false, error: "Unauthorized" }, 403);

  const job = {
    job_id:    randomUUID(),
    url:       String(body.url    || ""),
    reason:    String(body.reason || "spam"),
    count:     Math.max(1, Math.min(parseInt(body.count) || 10, 100)),
    submitted: new Date().toISOString(),
  };

  const q = await queueGet("fb_queue");
  q.jobs.push(job);
  await queueSet("fb_queue", q);

  return json({ ok: true, job_id: job.job_id });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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

export const config = { path: "/api/fb-submit" };
