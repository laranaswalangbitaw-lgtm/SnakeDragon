// netlify/functions/sms-status.js
// GET /api/sms-status

import { statusGet } from "./_store.js";

export default async (req) => {
  const data = await statusGet("sms_status");
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};

export const config = { path: "/api/sms-status" };
