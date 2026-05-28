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

/* ─── Utility ─────────────────────────── */
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

/* ─── Status messages ───────────────────── */
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

/* ─── Auth ─────────────────────────────── */
function isUnlocked() { return sessionStorage.getItem("cajunAdminUnlocked") === "true"; }

function setUnlocked(value) {
  if (value) sessionStorage.setItem("cajunAdminUnlocked", "true");
  else sessionStorage.removeItem("cajunAdminUnlocked");
}

/* ─── GitHub Token ─────────────────────── */
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

/* ─── Config loading ────────────────────── */
async function loadConfig() {
  const localOverride = localStorage.getItem("cajunSitePreviewConfig");
  const response = await fetch(`config/site.json?t=${Date.now()}`, { cache: "no-store" });
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

/* ─── Tab switching ──────────────────────── */
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

/* ─── Announcement editor ────────────────── */
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

/* ─── Render admin forms ─────────────────── */
function renderAdmin() {
  const hero   = config.hero   || fallbackConfig.hero;
  const footer = config.footer || fallbackConfig.footer;
  const meta   = config.meta   || fallbackConfig.meta;
  const drop   = config.discordDrop || fallbackConfig.discordDrop;

  /* Tab: Site Content */
  const siteForm = $("siteForm");
  siteForm.brand.value          = config.brand || "";
  siteForm.metaDescription.value = meta.description || "";
  siteForm.heroEyebrow.value    = hero.eyebrow || "";
  siteForm.heroHeadline.value   = hero.headline || "";
  siteForm.heroCopy.value       = hero.copy || "";
  siteForm.primaryCta.value     = hero.primaryCta || "";
  siteForm.secondaryCta.value   = hero.secondaryCta || "";
  siteForm.footerTagline.value  = footer.tagline || "";
  siteForm.footerCopyright.value = footer.copyright || "";
  renderAnnouncementEditor();

  /* Tab: Tiers */
  $("tiersJson").value = JSON.stringify(config.subscriptions || [], null, 2);

  /* Tab: Square */
  $("squareLinkFields").innerHTML = (config.subscriptions || []).map((tier) => `
    <label>${escapeHtml(tier.name)}
      <input name="${escapeHtml(tier.id)}" value="${escapeHtml(tier.squareUrl || "")}" placeholder="https://square.link/u/...">
    </label>
  `).join("");

  /* Tab: Discord */
  const dropForm = $("dropForm");
  dropForm.serverUrl.value = config.discordServerUrl || "";
  dropForm.enabled.checked = Boolean(drop.enabled);
  dropForm.title.value     = drop.title || "";
  dropForm.message.value   = drop.message || "";
  dropForm.discordUrl.value = drop.discordUrl || "";
  dropForm.postedAt.value  = drop.postedAt || "";

  /* Tab: Advanced JSON */
  $("jsonEditor").value = JSON.stringify(config, null, 2);

  /* Tab: Products */
  renderProductManager();
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
  config.brand = f.brand.value.trim() || fallbackConfig.brand;
  config.meta  = { ...(config.meta || {}), description: f.metaDescription.value.trim() };
  config.hero  = {
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

function applyAllForms({ save = true } = {}) {
  applySiteForm();
  applyTiersForm();
  applySquareForm({ save: false });
  applyDiscordForm({ save: false });
  if (save) savePreview();
}

/* ─── GitHub publishing ──────────────────── */
async function githubRequest(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error("No GitHub token. Save a token in the token box above.");
  const res = await fetch(`https://api.github.com/repos/${githubRepo}${path}`, {
    ...options,
    headers: {
      "Accept":              "application/vnd.github+json",
      "Authorization":       `Bearer ${token}`,
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

  config._publishedAt = new Date().toISOString();
  const publishTimestamp = config._publishedAt;

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

  setStatus("Published to GitHub. Waiting for the site to update…", "info");

  for (let attempt = 1; attempt <= 24; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res  = await fetch(`config/site.json?t=${Date.now()}`, { cache: "no-store" });
      const live = res.ok ? await res.json() : null;
      if (live?._publishedAt === publishTimestamp) {
        setStatus("Your changes are live on the website!", "success");
        renderAdmin();
        return;
      }
    } catch { /* network hiccup — keep polling */ }
    setStatus(`Waiting for deployment… (${attempt * 5}s)`, "info");
  }

  setStatus("Published. The site should reflect your changes within a couple of minutes.", "info");
  renderAdmin();
}

/* ─── Products ──────────────────────────── */
let products = [];

async function loadProducts() {
  const res = await fetch(`config/products.json?t=${Date.now()}`, { cache: "no-store" });
  const data = res.ok ? await res.json() : {};
  products = Array.isArray(data.products) ? data.products : [];
}

function makeProductId(name, setName) {
  return `${name}${setName ? `-${setName}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCSVRow(row) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());

  const nameIdx  = headers.findIndex((h) => h === "product name" || h === "name");
  const setIdx   = headers.findIndex((h) => h === "set name"     || h === "set");
  const priceIdx = headers.findIndex((h) => h === "price");

  if (nameIdx === -1) throw new Error('CSV must have a "Product Name" or "Name" column.');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells   = parseCSVRow(lines[i]);
    const name    = cells[nameIdx]?.trim() || "";
    const setName = setIdx   >= 0 ? (cells[setIdx]?.trim()   || "") : "";
    const price   = priceIdx >= 0 ? (cells[priceIdx]?.trim() || "") : "";
    if (!name) continue;
    rows.push({ name, setName, price });
  }
  return rows;
}

function renderProductManager() {
  const el = $("productManager");
  if (!el) return;

  if (!products.length) {
    el.innerHTML = `<p class="product-admin-empty">No products yet — import a CSV to get started.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="product-admin-wrap">
      <table class="product-admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Set</th>
            <th>Price</th>
            <th>Square Checkout URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${products.map((p, i) => `
            <tr>
              <td class="td-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</td>
              <td class="td-set">${escapeHtml(p.setName || "—")}</td>
              <td class="td-price">${escapeHtml(p.price || "—")}</td>
              <td class="td-url">
                <input type="url" value="${escapeHtml(p.squareUrl || "")}"
                  placeholder="https://square.link/u/…"
                  data-product-idx="${i}">
              </td>
              <td>
                <button class="button ghost" type="button"
                  data-remove-product="${i}"
                  style="min-height:32px;padding:4px 10px;font-size:0.78rem">
                  Remove
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function collectProductSquareUrls() {
  document.querySelectorAll("[data-product-idx]").forEach((input) => {
    const idx = parseInt(input.dataset.productIdx, 10);
    if (!isNaN(idx) && products[idx]) {
      products[idx].squareUrl = input.value.trim();
    }
  });
}

async function doPublishProducts() {
  collectProductSquareUrls();
  setStatus("Publishing products to GitHub…", "info");

  const payload = { products, _publishedAt: new Date().toISOString() };
  const publishTimestamp = payload._publishedAt;

  const filePath = "config/products.json";
  let sha = null;
  try {
    const existing = await githubRequest(`/contents/${filePath}?ref=${githubBranch}`);
    sha = existing.sha;
  } catch { /* file doesn't exist yet — first publish */ }

  const body = { message: "Update Cajun Cards products", branch: githubBranch, content: toBase64Utf8(`${JSON.stringify(payload, null, 2)}\n`) };
  if (sha) body.sha = sha;

  await githubRequest(`/contents/${filePath}`, { method: "PUT", body: JSON.stringify(body) });

  setStatus("Published to GitHub. Waiting for the site to update…", "info");

  for (let attempt = 1; attempt <= 24; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res  = await fetch(`config/products.json?t=${Date.now()}`, { cache: "no-store" });
      const live = res.ok ? await res.json() : null;
      if (live?._publishedAt === publishTimestamp) {
        setStatus("Products are live on the store!", "success");
        renderProductManager();
        return;
      }
    } catch { /* keep polling */ }
    setStatus(`Waiting for deployment… (${attempt * 5}s)`, "info");
  }

  setStatus("Published. The store should reflect your changes within a couple of minutes.", "info");
  renderProductManager();
}

/* ─── Download config ────────────────────── */
function downloadConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "site.json"; link.click();
  URL.revokeObjectURL(url);
}

/* ─── Event listeners ────────────────────── */

/* Login */
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

/* Token save */
$("saveToken").addEventListener("click", () => {
  const token = $("githubPublishToken").value.trim();
  if (!token) { showToast("Paste a token first."); return; }
  setSavedToken(token);
  updateTokenStatus();
  showToast("Token saved for this session.");
});

/* Tab: Site Content form */
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

/* Announcement add/remove */
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

/* Tab: Tiers */
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

/* Tab: Square */
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

/* Tab: Discord */
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

/* Tab: Advanced — JSON editor */
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

/* Tab: Advanced — Password change */
$("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const current  = $("currentPassword").value;
  const next     = $("newPassword").value;
  const confirm  = $("confirmPassword").value;
  const msgEl    = $("passwordMessage");

  if (!current || !next || !confirm) { msgEl.textContent = "Fill in all three fields."; return; }
  if (next !== confirm)              { msgEl.textContent = "New passwords don't match."; return; }
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

/* Tab: Products — CSV import */
$("importCsv").addEventListener("click", async () => {
  const file     = $("csvFileInput")?.files?.[0];
  const statusEl = $("csvImportStatus");
  if (!file) { if (statusEl) statusEl.textContent = "Select a CSV file first."; return; }

  try {
    const text     = await file.text();
    const imported = parseCSVText(text);
    if (!imported.length) { if (statusEl) statusEl.textContent = "No valid rows found in the CSV."; return; }

    let added = 0, updated = 0;
    for (const row of imported) {
      const id  = makeProductId(row.name, row.setName);
      const idx = products.findIndex((p) => p.id === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], name: row.name, setName: row.setName, price: row.price };
        updated++;
      } else {
        products.push({ id, name: row.name, setName: row.setName, price: row.price, squareUrl: "", imageUrl: "" });
        added++;
      }
    }

    if (statusEl) statusEl.textContent = `Done — ${added} added, ${updated} updated. Click Publish to save.`;
    renderProductManager();
    $("csvFileInput").value = "";
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error: ${err.message}`;
  }
});

$("clearProducts").addEventListener("click", () => {
  if (!products.length) return;
  if (!confirm("Clear all products? This won't take effect until you click Publish.")) return;
  products = [];
  renderProductManager();
  const statusEl = $("csvImportStatus");
  if (statusEl) statusEl.textContent = "All products cleared. Click Publish to save.";
});

$("publishProducts").addEventListener("click", async () => {
  try {
    await doPublishProducts();
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-product]");
  if (!btn) return;
  const i = parseInt(btn.dataset.removeProduct, 10);
  collectProductSquareUrls();
  products = products.filter((_, idx) => idx !== i);
  renderProductManager();
});

/* Logout */
$("adminLogout").addEventListener("click", () => {
  setUnlocked(false);
  renderAuthState();
});

/* ─── Init ────────────────────────────────── */
Promise.all([loadConfig(), loadProducts()])
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
