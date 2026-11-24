// app.js — COSMIC TOOLS
// DEMO / SIMULATION MODE
// All operations are simulated client-side.
// No real SMS, FB reports, or network calls to tool APIs.
// Key gate still validates against demo key or locally stored keys.
// When connecting to a real backend, swap the DEMO_* functions
// with fetch() calls to /api/* endpoints.

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_KEY = "COSMIC-DEMO-DEMO-DEMO-DEMO";

const SMS_SERVICES = [
  "EZLOAN", "XPRESS", "ABENSON", "EXCELLENT_LENDING",
  "FORTUNE_PAY", "WEMOVE", "LBC", "PICKUP_COFFEE",
  "HONEY_LOAN", "KOMO_PH", "S5_OTP", "CUSTOM_SMS",
];

// ─────────────────────────────────────────────────────────────────────────────
// SESSION (localStorage — no token stored, just key + uid + valid flag)
// ─────────────────────────────────────────────────────────────────────────────

let SESSION = (() => {
  try { return JSON.parse(localStorage.getItem("cosmic_session") || "null"); }
  catch { return null; }
})();

// ─────────────────────────────────────────────────────────────────────────────
// DEMO KEY STORE (simulated, in-memory + localStorage, no server)
// ─────────────────────────────────────────────────────────────────────────────

function demoStore() {
  try { return JSON.parse(localStorage.getItem("cosmic_demo_keys") || "null") || seedStore(); }
  catch { return seedStore(); }
}

function seedStore() {
  const store = {
    [DEMO_KEY]: {
      created_at:  "2026-01-01T00:00:00Z",
      expires_at:  null,
      uses_left:   99999,
      max_uses:    99999,
      active:      true,
      created_by:  "demo",
      redeemed_by: [],
    },
  };
  localStorage.setItem("cosmic_demo_keys", JSON.stringify(store));
  return store;
}

function storeSave(keys) {
  localStorage.setItem("cosmic_demo_keys", JSON.stringify(keys));
}

function demoKeyGen(uses) {
  const rand = () => Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, "X");
  return `COSMIC-${rand()}-${rand()}-${rand()}-${rand()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  buildSvcGrid();
  renderKeyList();

  if (SESSION?.valid) showApp();

  document.querySelectorAll(".tab").forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );

  ["gate-key", "gate-uid"].forEach(id =>
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") redeemKey();
    })
  );
});

function buildSvcGrid() {
  const grid = document.getElementById("svc-grid");
  SMS_SERVICES.forEach(svc => {
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" value="${svc}" checked> ${svc.replace(/_/g, " ")}`;
    grid.appendChild(lbl);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH (simulated redeem + validate against local demo store)
// ─────────────────────────────────────────────────────────────────────────────

async function redeemKey() {
  const key = document.getElementById("gate-key").value.trim().toUpperCase();
  const uid = document.getElementById("gate-uid").value.trim();
  const msg = document.getElementById("gate-msg");
  const btn = document.getElementById("gate-btn");

  if (!key || !uid) { setMsg(msg, "Enter key and user ID.", "err"); return; }

  btn.disabled = true;
  btn.textContent = "CHECKING…";
  setMsg(msg, "", "");

  // Simulate network delay
  await sleep(600);

  const keys  = demoStore();
  const entry = keys[key];

  if (!entry) {
    setMsg(msg, "❌ Invalid key.", "err");
    btn.disabled = false; btn.textContent = "UNLOCK";
    return;
  }

  if (!entry.active) {
    setMsg(msg, "❌ Key is inactive.", "err");
    btn.disabled = false; btn.textContent = "UNLOCK";
    return;
  }

  // Already redeemed by this uid → just let them in
  if (entry.redeemed_by.includes(uid)) {
    SESSION = { key, uid, valid: true };
    localStorage.setItem("cosmic_session", JSON.stringify(SESSION));
    showApp();
    btn.disabled = false; btn.textContent = "UNLOCK";
    return;
  }

  // First-time redeem
  if (entry.uses_left <= 0) {
    setMsg(msg, "❌ Key exhausted.", "err");
    btn.disabled = false; btn.textContent = "UNLOCK";
    return;
  }

  entry.uses_left  -= 1;
  entry.redeemed_by = [...entry.redeemed_by, uid];
  if (entry.uses_left <= 0 && entry.max_uses !== 99999) entry.active = false;
  keys[key] = entry;
  storeSave(keys);

  setMsg(msg, `✓ Key accepted! ${entry.uses_left} uses left.`, "ok");
  SESSION = { key, uid, valid: true };
  localStorage.setItem("cosmic_session", JSON.stringify(SESSION));

  await sleep(800);
  showApp();
  btn.disabled = false; btn.textContent = "UNLOCK";
}

function logout() {
  SESSION = null;
  localStorage.removeItem("cosmic_session");
  document.getElementById("app").classList.remove("active");
  document.getElementById("gate").classList.add("active");
}

function showApp() {
  document.getElementById("gate").classList.remove("active");
  document.getElementById("app").classList.add("active");
  document.getElementById("hdr-uid").textContent = SESSION?.uid || "";
  renderKeyList();
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll(".tab")
    .forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content")
    .forEach(s => s.classList.toggle("active", s.id === `tab-${name}`));
  if (name === "keymgr") renderKeyList();
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS BOMBER (simulation)
// ─────────────────────────────────────────────────────────────────────────────

async function submitSMS() {
  const num  = document.getElementById("sms-num").value.trim();
  const amt  = parseInt(document.getElementById("sms-amt").value) || 5;
  const name = document.getElementById("sms-name").value.trim() || "User";
  const msg  = document.getElementById("sms-msg").value.trim() || "Test Message";
  const svcs = [...document.querySelectorAll("#svc-grid input:checked")].map(c => c.value);
  const box  = document.getElementById("sms-status");
  const btn  = document.getElementById("sms-btn");

  if (!num)         { showBox(box, "Enter a target number.", "err"); return; }
  if (!svcs.length) { showBox(box, "Select at least one service.", "err"); return; }

  btn.disabled = true;
  showBox(box, "⏳ Submitting job...", "info");

  await sleep(800);

  const jobId = "JOB-" + Math.random().toString(36).toUpperCase().slice(2, 10);
  showBox(box, `✅ Job queued!\nJob ID: ${jobId}\n\nPolling status...`, "ok");

  // Simulate batch processing
  let batch = 0;
  const totalBatches = amt;
  let success = 0;
  let failed  = 0;

  const interval = setInterval(async () => {
    batch++;
    const thisBatchSuccess = svcs.length - Math.floor(Math.random() * 2);
    const thisBatchFail    = svcs.length - thisBatchSuccess;
    success += thisBatchSuccess;
    failed  += thisBatchFail;

    if (batch < totalBatches) {
      showBox(box,
        `⚡ [SIM] Processing...\nBatch ${batch}/${totalBatches}\n` +
        `Services: ${svcs.length} | Success: ${success} | Failed: ${failed}`, "info");
    } else {
      clearInterval(interval);
      btn.disabled = false;
      showBox(box,
        `✅ [SIM] DONE\nTarget: ${num}\nSender: ${name}\nMessage: ${msg}\n` +
        `Batches: ${totalBatches} | Services/batch: ${svcs.length}\n` +
        `Success: ${success} | Failed: ${failed}\n\n⚡ Simulation only — no real SMS sent.`, "ok");
    }
  }, 700);
}

// ─────────────────────────────────────────────────────────────────────────────
// FB REPORTER (simulation)
// ─────────────────────────────────────────────────────────────────────────────

async function submitFB() {
  const url    = document.getElementById("fb-url").value.trim();
  const count  = parseInt(document.getElementById("fb-cnt").value) || 20;
  const reason = document.getElementById("fb-reason").value;
  const box    = document.getElementById("fb-status");
  const btn    = document.getElementById("fb-btn");

  if (!url) { showBox(box, "Enter a Facebook URL.", "err"); return; }

  btn.disabled = true;
  showBox(box, "⏳ Submitting...", "info");
  await sleep(900);

  const jobId = "FB-" + Math.random().toString(36).toUpperCase().slice(2, 10);
  showBox(box, `⚡ Simulating ${count} report(s)...\nReason: ${reason}`, "info");

  await sleep(1200);

  const sent = count - Math.floor(Math.random() * 3);
  btn.disabled = false;
  showBox(box,
    `✅ [SIM] Report job done!\nJob ID: ${jobId}\n` +
    `URL: ${url}\nReason: ${reason}\nSent: ${sent}/${count}\n\n⚡ Simulation only — no real reports sent.`, "ok");
}

// ─────────────────────────────────────────────────────────────────────────────
// MLBB CHECKER (simulation with demo data)
// ─────────────────────────────────────────────────────────────────────────────

async function checkMLBB() {
  const uid  = document.getElementById("mlbb-uid").value.trim();
  const zone = document.getElementById("mlbb-zone").value.trim();
  const box  = document.getElementById("mlbb-result");

  if (!uid || !zone) { showBox(box, "Enter User ID and Zone ID.", "err"); return; }

  showBox(box, "🔍 Checking...", "info");
  await sleep(1000);

  // Simulated response — replace with real API call in production
  const demoNames = ["CosmicPlayer", "NightHawk", "ZeroX", "PhantomX", "LegendBK"];
  const name  = demoNames[Math.floor(Math.random() * demoNames.length)];
  const level = 10 + Math.floor(Math.random() * 90);
  const banned = Math.random() < 0.1;

  if (banned) {
    showBox(box,
      `🚫 [SIM] BANNED\nUID: ${uid} | Zone: ${zone}\nName: ${name}\nStatus: Device Banned`, "err");
  } else {
    showBox(box,
      `✅ [SIM] FOUND\nUID: ${uid} | Zone: ${zone}\nName: ${name}\nLevel: ${level}\nStatus: Clean\n\n⚡ Simulation only.`, "ok");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY MANAGER (demo, no server calls, no admin token in source)
// ─────────────────────────────────────────────────────────────────────────────

function demoGenKey() {
  const uses  = parseInt(document.getElementById("km-uses").value) || 10;
  const box   = document.getElementById("km-gen-out");

  const key   = demoKeyGen(uses);
  const keys  = demoStore();
  keys[key] = {
    created_at:  new Date().toISOString(),
    expires_at:  null,
    uses_left:   uses,
    max_uses:    uses,
    active:      true,
    created_by:  "demo_panel",
    redeemed_by: [],
  };
  storeSave(keys);

  showBox(box, `✅ Key generated!\n${key}\nUses: ${uses === 99999 ? "Unlimited" : uses}`, "ok");
  renderKeyList();
}

function demoRevokeKey() {
  const input = document.getElementById("km-revoke-key").value.trim().toUpperCase();
  const box   = document.getElementById("km-rev-out");

  const keys  = demoStore();
  if (!keys[input]) { showBox(box, "❌ Key not found.", "err"); return; }
  keys[input].active = false;
  storeSave(keys);

  showBox(box, `✅ Revoked: ${input}`, "ok");
  document.getElementById("km-revoke-key").value = "";
  renderKeyList();
}

function renderKeyList() {
  const container = document.getElementById("km-list");
  const stats     = document.getElementById("km-stats");
  if (!container) return;

  const keys   = demoStore();
  const entries = Object.entries(keys);

  let totalActive = 0, totalRedeemed = 0;
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = `<p class="no-keys">No keys yet.</p>`;
    return;
  }

  entries.slice().reverse().forEach(([k, v]) => {
    const active   = v.active;
    const usesLeft = v.uses_left === 99999 ? "∞" : v.uses_left;
    const redeemed = v.redeemed_by?.length || 0;
    if (active) totalActive++;
    totalRedeemed += redeemed;

    const row = document.createElement("div");
    row.className = "key-row";
    row.innerHTML = `
      <span class="key-status ${active ? "active" : "inactive"}">${active ? "✅" : "❌"}</span>
      <span class="key-code">${k}</span>
      <span class="key-meta">${usesLeft} left · ${redeemed} redeemed</span>
      <button class="key-revoke-btn" onclick="quickRevoke('${k}')" ${!active ? "disabled" : ""}>Revoke</button>
    `;
    container.appendChild(row);
  });

  if (stats) {
    stats.textContent = `Total: ${entries.length} · Active: ${totalActive} · Total redeemed: ${totalRedeemed}`;
  }
}

function quickRevoke(key) {
  const keys  = demoStore();
  if (!keys[key]) return;
  keys[key].active = false;
  storeSave(keys);
  renderKeyList();
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

function showBox(el, text, cls) {
  el.className = `status-box show ${cls}`;
  el.textContent = text;
}

function setMsg(el, text, cls) {
  el.className = `gate-msg ${cls}`;
  el.textContent = text;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
