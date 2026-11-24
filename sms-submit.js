// netlify/functions/sms-submit.js
// POST /api/sms-submit  { key, user_id, target_number, amount, services, sender_name, message }

import { keysGet, queueGet, queueSet } from "./_store.js";
import { randomUUID } from "crypto";

export default async (req) => {
  if (req.method === "OPTIONS") return cors();
  if (req.method !== "POST")
    return json({ ok: false, error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const key    = (body.key    || "").trim().toUpperCase();
  const userId = String(body.user_id || "anonymous");

  const keys  = await keysGet();
  const entry = keys[key];
  if (!entry || !entry.active)
    return json({ ok: false, error: "Unauthorized — invalid or inactive key" }, 403);

  const target = String(body.target_number || "").trim();
  if (!target) return json({ ok: false, error: "Missing target_number" }, 400);

  const amount  = Math.max(1, Math.min(parseInt(body.amount) || 1, 50));
  const services = Array.isArray(body.services) && body.services.length
    ? body.services
    : ["EZLOAN","XPRESS","ABENSON","EXCELLENT_LENDING",
       "FORTUNE_PAY","WEMOVE","LBC","PICKUP_COFFEE",
       "HONEY_LOAN","KOMO_PH","S5_OTP"];

  const job = {
    job_id:        randomUUID(),
    user_id:       userId,
    target_number: target,
    amount,
    services,
    sender_name:   String(body.sender_name || "User"),
    message:       String(body.message     || "Test Message"),
    submitted_at:  new Date().toISOString(),
  };

  const q = await queueGet("sms_queue");
  q.jobs.push(job);
  await queueSet("sms_queue", q);

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

export const config = { path: "/api/sms-submit" };
