// app.js — COSMIC TOOLS
// All /api/* calls route to Netlify Functions via netlify.toml redirect.
// No hardcoded server URL — works on any domain Netlify gives you.

const SMS_SERVICES = [
  "EZLOAN","XPRESS","ABENSON","EXCELLENT_LENDING",
  "FORTUNE_PAY","WEMOVE","LBC","PICKUP_COFFEE",
  "HONEY_LOAN","KOMO_PH","S5_OTP","CUSTOM_SMS"
];

let SESSION = (() => {
  try { return JSON.parse(localStorage.getItem("cosmic_session") || "null"); }
  catch { return null; }
})();

window.addEventListener("DOMContentLoaded", () => {
  buildSvcGrid();
  if (SESSION?.valid) showApp();
  document.querySelectorAll(".tab").forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );
  ["gate-key","gate-uid"].forEach(id =>
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") redeemKey();
    })
  );
});

function buildSvcGrid() {
  const grid = document.getElementById("svc-grid");
  SMS_SERVICES.forEach(svc => {
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" value="${svc}" checked> ${svc.replace(/_/g," ")}`;
    grid.appendChild(lbl);
  });
}

// ── auth ──────────────────────────────────────────────────────────────────────

async function redeemKey() {
  const key = document.getElementById("gate-key").value.trim().toUpperCase();
  const uid = document.getElementById("gate-uid").value.trim();
  const msg = document.getElementById("gate-msg");
  const btn = document.getElementById("gate-btn");

  if (!key || !uid) { setMsg(msg, "Enter key and user ID.", "err"); return; }

  btn.disabled = true;
  btn.textContent = "CHECKING…";
  setMsg(msg, "", "");

  try {
    // Check if already redeemed by this user
    let res  = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, user_id: uid }),
    });
    let data = await res.json();

    if (data.valid) {
      SESSION = { key, uid, valid: true };
      localStorage.setItem("cosmic_session", JSON.stringify(SESSION));
      showApp();
      return;
    }

    // First-time redeem
    res  = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, user_id: uid }),
    });
    data = await res.json();

    if (data.ok) {
      SESSION = { key, uid, valid: true };
      localStorage.setItem("cosmic_session", JSON.stringify(SESSION));
      setMsg(msg, `✓ Key accepted! ${data.uses_left} uses left.`, "ok");
      setTimeout(showApp, 800);
    } else {
      setMsg(msg, data.error || "Invalid key.", "err");
    }
  } catch (e) {
    setMsg(msg, "Network error. Try again.", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "UNLOCK";
  }
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
}

// ── tabs ──────────────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll(".tab")
    .forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content")
    .forEach(s => s.classList.toggle("active", s.id === `tab-${name}`));
}

// ── SMS ───────────────────────────────────────────────────────────────────────

async function submitSMS() {
  const num  = document.getElementById("sms-num").value.trim();
  const amt  = parseInt(document.getElementById("sms-amt").value) || 5;
  const name = document.getElementById("sms-name").value.trim() || "User";
  const msg  = document.getElementById("sms-msg").value.trim() || "Test Message";
  const svcs = [...document.querySelectorAll("#svc-grid input:checked")].map(c => c.value);
  const box  = document.getElementById("sms-status");

  if (!num)         { showBox(box, "Enter a target number.", "err"); return; }
  if (!svcs.length) { showBox(box, "Select at least one service.", "err"); return; }

  showBox(box, "⏳ Submitting job...", "info");

  try {
    const res  = await fetch("/api/sms-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key:           SESSION.key,
        user_id:       SESSION.uid,
        target_number: num,
        amount:        amt,
        services:      svcs,
        sender_name:   name,
        message:       msg,
      }),
    });
    const data = await res.json();

    if (data.ok) {
      showBox(box, `✅ Job queued!\nJob ID: ${data.job_id}\n\nPolling status...`, "ok");
      pollSMSStatus(box);
    } else {
      showBox(box, `❌ ${data.error}`, "err");
    }
  } catch {
    showBox(box, "Network error.", "err");
  }
}

let _smsPoller = null;
function pollSMSStatus(box) {
  clearInterval(_smsPoller);
  _smsPoller = setInterval(async () => {
    try {
      const data = await (await fetch("/api/sms-status")).json();
      const st   = data.status || "unknown";
      if (st === "completed") {
        clearInterval(_smsPoller);
        showBox(box,
          `✅ DONE\nTarget: ${data.target_number}\n`+
          `Batches: ${data.total_batches}\n`+
          `Success: ${data.success} | Failed: ${data.failed}`, "ok");
      } else if (st === "processing") {
        showBox(box,
          `⚡ Processing...\nBatch ${data.current_batch}/${data.total_batches}\n`+
          `Success: ${data.success} | Failed: ${data.failed}`, "info");
      } else if (st === "error") {
        clearInterval(_smsPoller);
        showBox(box, `❌ Error: ${data.error}`, "err");
      }
    } catch {}
  }, 2000);
}

// ── FB ────────────────────────────────────────────────────────────────────────

async function submitFB() {
  const url    = document.getElementById("fb-url").value.trim();
  const count  = parseInt(document.getElementById("fb-cnt").value) || 20;
  const reason = document.getElementById("fb-reason").value;
  const box    = document.getElementById("fb-status");

  if (!url) { showBox(box, "Enter a Facebook URL.", "err"); return; }

  showBox(box, "⏳ Submitting...", "info");

  try {
    const res  = await fetch("/api/fb-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: SESSION.key, url, count, reason }),
    });
    const data = await res.json();
    if (data.ok) showBox(box, `✅ FB report job queued!\nJob ID: ${data.job_id}`, "ok");
    else         showBox(box, `❌ ${data.error}`, "err");
  } catch {
    showBox(box, "Network error.", "err");
  }
}

// ── MLBB ──────────────────────────────────────────────────────────────────────

async function checkMLBB() {
  const uid  = document.getElementById("mlbb-uid").value.trim();
  const zone = document.getElementById("mlbb-zone").value.trim();
  const box  = document.getElementById("mlbb-result");

  if (!uid || !zone) { showBox(box, "Enter User ID and Zone ID.", "err"); return; }

  showBox(box, "🔍 Checking...", "info");

  try {
    const res  = await fetch(
      `https://api.mobilelegends.com/base/v1/user/lookup?uid=${encodeURIComponent(uid)}&zoneId=${encodeURIComponent(zone)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    if (data?.data?.name) {
      const d = data.data;
      showBox(box, `✅ FOUND\nName: ${d.name}\nLevel: ${d.exp_level || "?"}\nServer: ${zone}`, "ok");
    } else {
      showBox(box, `⚠️ Not found.\nRaw: ${JSON.stringify(data).slice(0,200)}`, "err");
    }
  } catch (e) {
    showBox(box, `❌ MLBB API unreachable.\n${e.message}`, "err");
  }
}

// ── utils ─────────────────────────────────────────────────────────────────────

function showBox(el, text, cls) {
  el.className = `status-box show ${cls}`;
  el.textContent = text;
}
function setMsg(el, text, cls) {
  el.className = `gate-msg ${cls}`;
  el.textContent = text;
}
