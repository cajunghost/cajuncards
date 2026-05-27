const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  meta: { description: "" },
  footer: { tagline: "A TCG collector club with Cajun character.", copyright: "2026 Cajun Cards & Collectibles. All rights reserved." },
  admin: {
    username: "CajunGamers",
    passwordHash: "5b2371cd0a4d0e10ac35d80642f1366a730165ff8c55253541ce53491453935c"
  },
  hero: {
    eyebrow: "Collector memberships with Cajun character",
    headline: "Cajun Cards & Collectibles",
    copy: "A subscription-first TCG club for online collectors who want Discord alerts, sealed drop access, digital claim windows, and a little lagniappe with every year.",
    primaryCta: "Explore memberships",
    secondaryCta: "Join Discord"
  },
  announcements: [],
  discordDrop: { enabled: false, title: "", message: "", discordUrl: "", postedAt: "" },
  discordServerUrl: "",
  subscriptions: []
};

let config = { ...fallbackConfig };

const $ = (id) => document.getElementById(id);

const githubRepo   = "cajunghost/cajuncards";
const githubBranch = "main";

/* ─── Utility ──────────────────────────────── */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}

async function sha256(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

/* ─── Status messages ──────────────────────── */
function setStatus(message, type = "info") {
  const el = $("adminMessage");
  el.textContent = message;
  el.className = `admin-status ${type}`;
  el.classList.remove("hidden");
  if (type === "success") window.setTimeout(() => el.classList.add("hidden"), 6000);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ─── Auth ─────────────────────────────────── */
function isUnlocked() { return sessionStorage.getItem("cajunAdminUnlocked") === "true"; }

function setUnlocked(value) {
  if (value) sessionStorage.setItem("cajunAdminUnlocked", "true");
  else sessionStorage.removeItem("cajunAdminUnlocked");
}

/* ─── GitHub Token ─────────────────────────── */
function getSavedToken() {
  return sessionStorage.getItem("cajunAdminPublishToken") || "";
}

function setSavedToken(token) {
  if (token) sessionStorage.setItem("cajunAdminPublishToken", token);
  else sessionStorage.removeItem("cajunAdminPublishToken");
}

function updateTokenStatus() {
  const token = getSavedToken();
  const field = $("githubPublishToken");
  const status = $("tokenStatus");
  if (token) {
    field.value = "";
    field.placeholder = `Token saved (ends …${token.slice(-4)})`;
    status.textContent = `Token saved — ends in …${token.slice(-4)}`;
    status.className = "token-status set";
  } else {
    field.placeholder = "github_pat_...";
    status.textContent = "No token saved. Paste one above and click Save.";
    status.className = "token-status unset";
  }
}

function getToken() {
  return getSavedToken() || $("githubPublishToken").value.trim();
}

/* ─── Config loading ───────────────────────── */
async function loadConfig() {
  const localOverride = localStorage.getItem("cajunSitePreviewConfig");
  const response = await fetch("config/site.json", { cache: "no-store" });
  config = response.ok ? await response.json() : { ...fallbackConfig };
  if (localOverride) {
    try {
      const preview = JSON.parse(localOverride);
      if (Array.isArray(preview.subscriptions) && preview.subscriptions.length) {
        config = preview;
      } else {
        localStorage.removeItem("cajunSitePreviewConfig");
      }
    } catch {
      localStorage.removeItem("cajunSitePreviewConfig");
    }
  }
}

function savePreview() {
  localStorage.setItem("cajunSitePreviewConfig", JSON.stringify(config));
}

/* ─── Tab switching ────────────────────────── */
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const pane = $(`tab-${btn.dataset.tab}`);
      if (pane) pane.classList.add("active");
    });
  });
}

/* ─── Announcement editor ──────────────────── */
function renderAnnouncementEditor() {
  const items = config.announcements || [];
  const list = $("announcementList");
  if (!items.length) {
    list.innerHTML = `<p class="form-note" style="padding:8px 0">No announcements yet. Add one below.</p>`;
    return;
  }
  list.innerHTML = items.map((item, i) => `
    <div class="announcement-edit-item">
      <span title="${escapeHtml(item)}">${escapeHtml(item)}</span>
      <button class="button ghost" type="button" data-remove-announcement="${i}" style="min-height:32px;padding:4px 10px;font-size:0.78rem">Remove</button>
    </div>
  `).join("");
}

/* ─── Render admin forms ───────────────────── */
function renderAdmin() {
  const hero   = config.hero   || fallbackConfig.hero;
  const footer = config.footer || fallbackConfig.footer;
  const meta   = config.meta   || fallbackConfig.meta;
  const drop   = config.discordDrop || fallbackConfig.discordDrop;

  const siteForm = $("siteForm");
  siteForm.brand.value           = config.brand || "";
  siteForm.metaDescription.value = meta.description || "";
  siteForm.heroEyebrow.value     = hero.eyebrow || "";
  siteForm.heroHeadline.value    = hero.headline || "";
  siteForm.heroCopy.value        = hero.copy || "";
  siteForm.primaryCta.value      = hero.primaryCta || "";
  siteForm.secondaryCta.value    = hero.secondaryCta || "";
  siteForm.footerTagline.value   = footer.tagline || "";
  siteForm.footerCopyright.value = footer.copyright || "";
  renderAnnouncementEditor();

  $("tiersJson").value = JSON.stringify(config.subscriptions || [], null, 2);

  $("squareLinkFields").innerHTML = (config.subscriptions || []).map((tier) => `
    <label>${escapeHtml(tier.name)}
      <input name="${escapeHtml(tier.id)}" value="${escapeHtml(tier.squareUrl || "")}" placeholder="https://square.link/u/...">
    </label>
  `).join("");

  const dropForm = $("dropForm");
  dropForm.serverUrl.value  = config.discordServerUrl || "";
  dropForm.enabled.checked  = Boolean(drop.enabled);
  dropForm.title.value      = drop.title || "";
  dropForm.message.value    = drop.message || "";
  dropForm.discordUrl.value = drop.discordUrl || "";
  dropForm.postedAt.value   = drop.postedAt || "";

  $("jsonEditor").value = JSON.stringify(config, null, 2);
}

function renderAuthState() {
  const unlocked = isUnlocked();
  $("adminLoginSection").classList.toggle("hidden", unlocked);
  $("adminPanel").classList.toggle("hidden", !unlocked);
  if (unlocked) {
    renderAdmin();
    updateTokenStatus();
  }
}

/* ─── Apply form data to config ────────────── */
function readSubscriptionsJson(raw) {
  if (!raw?.trim()) return [];
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("Subscription tiers must be a JSON array.");
  const ids = new Set();
  arr.forEach((tier, i) => {
    if (!tier || typeof tier !== "object" || Array.isArray(tier)) throw new Error(`Tier ${i + 1} must be an object.`);
    if (!tier.id || typeof tier.id !== "string") throw new Error(`Tier ${i + 1} is missing a string id.`);
    if (ids.has(tier.id)) throw new Error(`Duplicate tier id: "${tier.id}"`);
    ids.add(tier.id);
  });
  return arr;
}

function applySiteForm() {
  const f = $("siteForm");
  config.brand  = f.brand.value.trim() || fallbackConfig.brand;
  config.meta   = { ...(config.meta || {}), description: f.metaDescription.value.trim() };
  config.hero   = {
    ...(config.hero || fallbackConfig.hero),
    eyebrow:      f.heroEyebrow.value.trim(),
    headline:     f.heroHeadline.value.trim(),
    copy:         f.heroCopy.value.trim(),
    primaryCta:   f.primaryCta.value.trim(),
    secondaryCta: f.secondaryCta.value.trim()
  };
  config.footer = {
    ...(config.footer || fallbackConfig.footer),
    tagline:   f.footerTagline.value.trim(),
    copyright: f.footerCopyright.value.trim()
  };
}

function applyTiersForm() {
  const raw = $("tiersJson").value.trim();
  config.subscriptions = raw ? readSubscriptionsJson(raw) : [];
}

function applySquareForm({ save = true } = {}) {
  const data = new FormData($("linkForm"));
  config.subscriptions = (config.subscriptions || []).map((tier) => ({
    ...tier,
    squareUrl: data.has(tier.id) ? (data.get(tier.id) || "") : (tier.squareUrl || "")
  }));
  if (save) savePreview();
}

function applyDiscordForm({ save = true } = {}) {
  const f = $("dropForm");
  config.discordServerUrl = f.serverUrl.value.trim();
  config.discordDrop = {
    enabled:    f.enabled.checked,
    title:      f.title.value.trim(),
    message:    f.message.value.trim(),
    discordUrl: f.discordUrl.value.trim(),
    postedAt:   f.postedAt.value.trim()
  };
  if (save) savePreview();
}

/* ─── GitHub publishing ────────────────────── */
async function githubRequest(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error("No GitHub token. Save a token in the token box above.");
  const res = await fetch(`https://api.github.com/repos/${githubRepo}${path}`, {
    ...options,
    headers: {
      "Accept":               "application/vnd.github+json",
      "Authorization":        `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `GitHub ${res.status}`);
  return data;
}

async function doPublish(label = "config") {
  setStatus(`Publishing ${label} to GitHub…`, "info");
  const filePath = "config/site.json";
  const current  = await githubRequest(`/contents/${filePath}?ref=${githubBranch}`);
  await githubRequest(`/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message:  `Update Cajun Cards ${label}`,
      branch:   githubBranch,
      sha:      current.sha,
      content:  toBase64Utf8(`${JSON.stringify(config, null, 2)}\n`)
    })
  });
  localStorage.removeItem("cajunSitePreviewConfig");
  setStatus(`Published. GitHub Pages may take a minute to reflect changes.`, "success");
  renderAdmin();
}

/* ─── Download config ──────────────────────── */
function downloadConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "site.json"; link.click();
  URL.revokeObjectURL(url);
}

/* ─── Event listeners ──────────────────────── */

$("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data     = new FormData(e.target);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const expUser  = config.admin?.username || fallbackConfig.admin.username;
  const expHash  = config.admin?.passwordHash || fallbackConfig.admin.passwordHash;
  if (username.toLowerCase() === expUser.toLowerCase() && await sha256(password) === expHash) {
    setUnlocked(true);
    e.target.reset();
    $("loginMessage").textContent = "";
    renderAuthState();
    initTabs();
    return;
  }
  $("loginMessage").textContent = "Login failed.";
});

$("saveToken").addEventListener("click", () => {
  const token = $("githubPublishToken").value.trim();
  if (!token) { showToast("Paste a token first."); return; }
  setSavedToken(token);
  updateTokenStatus();
  showToast("Token saved for this session.");
});

$("siteForm").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    applySiteForm();
    savePreview();
    setStatus("Site content previewed locally. Click Publish to make it live.", "info");
    renderAdmin();
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  }
});

$("publishSiteContent").addEventListener("click", async () => {
  try {
    applySiteForm();
    applyTiersForm();
    applySquareForm({ save: false });
    applyDiscordForm({ save: false });
    await doPublish("site content");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("addAnnouncement").addEventListener("click", () => {
  const input = $("newAnnouncement");
  const text  = input.value.trim();
  if (!text) return;
  config.announcements = [...(config.announcements || []), text];
  input.value = "";
  savePreview();
  renderAnnouncementEditor();
});

document.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-announcement]");
  if (!removeBtn) return;
  const i = parseInt(removeBtn.dataset.removeAnnouncement, 10);
  config.announcements = (config.announcements || []).filter((_, idx) => idx !== i);
  savePreview();
  renderAnnouncementEditor();
});

$("tiersForm").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    applyTiersForm();
    savePreview();
    setStatus("Tiers previewed locally. Click Publish to make them live.", "info");
    renderAdmin();
  } catch (err) {
    setStatus(`Tiers error: ${err.message}`, "error");
  }
});

$("publishTiers").addEventListener("click", async () => {
  try {
    applyTiersForm();
    applySquareForm({ save: false });
    await doPublish("subscription tiers");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("linkForm").addEventListener("submit", (e) => {
  e.preventDefault();
  applySquareForm();
  setStatus("Square links previewed locally. Click Publish to make them live.", "info");
  renderAdmin();
});

$("publishSquare").addEventListener("click", async () => {
  try {
    applySquareForm();
    await doPublish("Square links");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("dropForm").addEventListener("submit", (e) => {
  e.preventDefault();
  applyDiscordForm();
  setStatus("Discord settings previewed locally. Click Publish to make them live.", "info");
  renderAdmin();
});

$("publishDiscord").addEventListener("click", async () => {
  try {
    applyDiscordForm();
    await doPublish("Discord config");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("jsonForm").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    config = JSON.parse($("jsonEditor").value);
    savePreview();
    setStatus("Full config previewed locally. Click Publish JSON to make it live.", "info");
    renderAdmin();
  } catch (err) {
    setStatus(`JSON error: ${err.message}`, "error");
  }
});

$("publishJson").addEventListener("click", async () => {
  try {
    config = JSON.parse($("jsonEditor").value);
    savePreview();
    await doPublish("full config");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("downloadConfig").addEventListener("click", downloadConfig);

$("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const current  = $("currentPassword").value;
  const next     = $("newPassword").value;
  const confirm  = $("confirmPassword").value;
  const msgEl    = $("passwordMessage");

  if (!current || !next || !confirm) { msgEl.textContent = "Fill in all three fields."; return; }
  if (next !== confirm)              { msgEl.textContent = "New passwords don’t match."; return; }
  if (next.length < 12)              { msgEl.textContent = "New password must be at least 12 characters."; return; }

  const expHash = config.admin?.passwordHash || fallbackConfig.admin.passwordHash;
  const currentHash = await sha256(current);
  if (currentHash !== expHash) { msgEl.textContent = "Current password is incorrect."; return; }

  try {
    const newHash = await sha256(next);
    config.admin  = { ...(config.admin || fallbackConfig.admin), passwordHash: newHash };
    await doPublish("admin password");
    e.target.reset();
    msgEl.textContent = "Password changed and published.";
    window.setTimeout(() => { msgEl.textContent = ""; }, 5000);
  } catch (err) {
    msgEl.textContent = `Failed: ${err.message}`;
  }
});

$("adminLogout").addEventListener("click", () => {
  setUnlocked(false);
  renderAuthState();
});

/* ─── Init ──────────────────────────────────── */
loadConfig()
  .then(() => {
    renderAuthState();
    if (isUnlocked()) initTabs();
  })
  .catch((err) => {
    console.error(err);
    config = { ...fallbackConfig };
    renderAuthState();
    if (isUnlocked()) initTabs();
  });
