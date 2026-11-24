// _store.js — Netlify Blobs wrapper
// Store name "cosmic" is auto-created on first write.
// No secrets in this file — all auth handled by callers via env vars.

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
