// _store.js — thin wrapper around Netlify Blobs
// Netlify Blobs docs: https://docs.netlify.com/blobs/overview/
// Store name "cosmic" is auto-created on first write.

import { getStore } from "@netlify/blobs";

function store() {
  return getStore("cosmic");
}

export async function keysGet() {
  try {
    const raw = await store().get("keys.json", { type: "text" });
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function keysSet(data) {
  await store().set("keys.json", JSON.stringify(data, null, 2));
}

export async function queueGet(name) {
  // name: "sms_queue" | "fb_queue"
  try {
    const raw = await store().get(`${name}.json`, { type: "text" });
    return raw ? JSON.parse(raw) : { jobs: [] };
  } catch {
    return { jobs: [] };
  }
}

export async function queueSet(name, data) {
  await store().set(`${name}.json`, JSON.stringify(data, null, 2));
}

export async function statusGet(name) {
  // name: "sms_status"
  try {
    const raw = await store().get(`${name}.json`, { type: "text" });
    return raw ? JSON.parse(raw) : { status: "idle" };
  } catch {
    return { status: "idle" };
  }
}

export async function statusSet(name, data) {
  await store().set(`${name}.json`, JSON.stringify(data, null, 2));
}
