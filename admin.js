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
  renderCategoryManager();
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

/* ─── GitHub publishing ────────────────────── */
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

  // Embed a sentinel timestamp so we can detect when Pages has deployed
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

  // Poll the live URL (cache-busted) until the new config is confirmed deployed
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

  // Still published — just took longer than expected
  setStatus("Published. The site should reflect your changes within a couple of minutes.", "info");
  renderAdmin();
}

/* ─── Products ──────────────────────────────── */
let products = [];

const COLUMN_ALIASES = {
  name:      ["product name","card name","item name","item title","product title","title","item","card","singles","name"],
  setName:   ["set name","set/expansion","card set","game set","set title","product line","expansion","collection","edition","series","set"],
  price:     ["market price","tcgplayer price","tcg price","buy price","sell price","sale price","asking price","list price","retail price","our price","store price","low price","market low","cost","price","value"],
  condition: ["card condition","item condition","grading","condition","quality","grade","cond"],
  rarity:    ["card type","treatment","printing","variant","finish","rarity","rare","foil","holo"],
  quantity:  ["qty available","qty in stock","available qty","qty","quantity","in stock","count","total","available","inventory","copies","stock"],
  sku:       ["product id","item id","catalog #","product #","card number","card #","item #","upc","barcode","number","sku","id"],
  language:  ["edition language","language","lang"],
  imageUrl:  ["image url","card image","img url","image link","photo url","thumbnail","image","photo","img"],
  notes:     ["additional info","description","details","comments","comment","notes","note"]
};

const COLUMN_MAP = Object.entries(COLUMN_ALIASES)
  .flatMap(([field, aliases]) => aliases.map((alias) => [alias, field]))
  .sort((a, b) => b[0].length - a[0].length);

function matchColumn(rawHeader) {
  const h = rawHeader.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const [alias, field] of COLUMN_MAP) {
    if (h === alias) return field;
  }
  for (const [alias, field] of COLUMN_MAP) {
    if (alias.length >= 4 && h.includes(alias)) return field;
  }
  return null;
}

function detectSeparator(firstLine) {
  const counts = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    if (!inQ && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function detectColumnByValue(samples) {
  const nonempty = samples.filter(Boolean);
  if (!nonempty.length) return null;
  if (nonempty.every((s) => /^\$?[\d,]+(\.\d{1,2})?$/.test(s.trim()))) return "price";
  if (nonempty.some((s) => /^(nm|lp|mp|hp|dmg|near mint|lightly played|moderately played|heavily played|damaged|poor)\b/i.test(s.trim()))) return "condition";
  if (nonempty.some((s) => /^(common|uncommon|rare|holo|mythic|legendary|ultra rare|secret rare|promo)\b/i.test(s.trim()))) return "rarity";
  return null;
}

function normalizePrice(raw) {
  if (!raw) return "";
  const num = parseFloat(raw.replace(/[$,\s]/g, ""));
  if (isNaN(num)) return raw.trim();
  return num % 1 === 0 ? `$${num}` : `$${num.toFixed(2)}`;
}

async function loadProducts() {
  const res = await fetch(`config/products.json?t=${Date.now()}`, { cache: "no-store" });
  const data = res.ok ? await res.json() : {};
  products = Array.isArray(data.products) ? data.products : [];
}

function makeProductId(name, setName, category) {
  return `${category ? category + "-" : ""}${name}${setName ? `-${setName}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCSVRow(row, sep = ",") {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCSVText(text, category) {
  // Strip BOM that Excel / Google Sheets sometimes prepends
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];

  const sep = detectSeparator(lines[0]);
  const rawHeaders = parseCSVRow(lines[0], sep);
  const fieldMap = rawHeaders.map((h) => matchColumn(h));

  // Sample up to 5 data rows so unrecognised columns can be typed by value
  const samples = rawHeaders.map(() => []);
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    parseCSVRow(lines[i], sep).forEach((c, idx) => { if (samples[idx]) samples[idx].push(c.trim()); });
  }

  // Merge header-match with value-based inference
  const finalMap = fieldMap.map((field, i) => field || detectColumnByValue(samples[i]));
  if (!finalMap.includes("name")) {
    // Use the first unmapped column — never stomp a column that's already typed
    // (e.g. a "Quantity" column in position 0 should stay quantity, not become name)
    const freeIdx = finalMap.findIndex((f) => !f);
    if (freeIdx !== -1) {
      finalMap[freeIdx] = "name";
    } else {
      // Every column already has a type; fall back to overriding sku (weakest for display)
      const skuIdx = finalMap.indexOf("sku");
      finalMap[skuIdx !== -1 ? skuIdx : 0] = "name";
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i], sep);
    const product = { category: category || "" };
    finalMap.forEach((field, idx) => {
      if (field && cells[idx] !== undefined && cells[idx].trim()) {
        const val = cells[idx].trim();
        product[field] = field === "price" ? normalizePrice(val) : val;
      }
    });
    if (!product.name) continue;
    rows.push(product);
  }
  return rows;
}

function getCategories() {
  const seen = new Set();
  const cats = [];
  for (const p of products) {
    const c = p.category || "";
    if (!seen.has(c)) { seen.add(c); cats.push(c); }
  }
  return cats;
}

function renderCategoryManager() {
  const el = $("categoryManager");
  if (!el) return;
  const cats = getCategories();
  if (!cats.length) {
    el.innerHTML = `<p class="product-admin-empty">No categories yet — import a CSV above.</p>`;
    const label = $("productCountLabel");
    if (label) label.textContent = "";
    return;
  }
  el.innerHTML = `<div class="category-list">` + cats.map((c) => {
    const count = products.filter((p) => (p.category || "") === c).length;
    const label = c || "(Uncategorised)";
    return `
      <div class="category-row">
        <span class="category-row-name">${escapeHtml(label)}</span>
        <span class="category-row-count">${count} product${count !== 1 ? "s" : ""}</span>
        <button class="button ghost" type="button" data-delete-category="${escapeHtml(c)}"
          style="min-height:30px;padding:3px 10px;font-size:0.78rem">Delete</button>
      </div>
    `;
  }).join("") + `</div>`;
  const label = $("productCountLabel");
  if (label) label.textContent = `(${products.length})`;
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
            <th>Category</th>
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
              <td class="td-cat">${escapeHtml(p.category || "—")}</td>
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

function isSafeUrl(url) {
  if (!url) return true;
  return /^https:\/\//i.test(url);
}

function collectProductSquareUrls() {
  document.querySelectorAll("[data-product-idx]").forEach((input) => {
    const idx = parseInt(input.dataset.productIdx, 10);
    if (!isNaN(idx) && products[idx]) {
      const url = input.value.trim();
      if (url && !isSafeUrl(url)) {
        input.setCustomValidity("Square URLs must start with https://");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      products[idx].squareUrl = url;
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
        renderCategoryManager();
        renderProductManager();
        return;
      }
    } catch { /* keep polling */ }
    setStatus(`Waiting for deployment… (${attempt * 5}s)`, "info");
  }

  setStatus("Published. The store should reflect your changes within a couple of minutes.", "info");
  renderCategoryManager();
  renderProductManager();
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

  const rawCat   = ($("csvCategory")?.value || "").trim();
  const category = rawCat || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported";

  try {
    const text     = await file.text();
    const imported = parseCSVText(text, category);
    if (!imported.length) { if (statusEl) statusEl.textContent = "No valid rows found in the CSV."; return; }

    let added = 0, updated = 0;
    for (const row of imported) {
      const id  = makeProductId(row.name, row.setName, row.category);
      const idx = products.findIndex((p) => p.id === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...row, squareUrl: products[idx].squareUrl || "" };
        updated++;
      } else {
        products.push({ id, squareUrl: "", imageUrl: "", ...row });
        added++;
      }
    }

    if (statusEl) statusEl.textContent = `Done — ${added} added, ${updated} updated under "${category}". Click Publish to save.`;
    if ($("csvCategory")) $("csvCategory").value = "";
    $("csvFileInput").value = "";
    renderCategoryManager();
    renderProductManager();
  } catch (err) {
    if (statusEl) statusEl.textContent = `Error: ${err.message}`;
  }
});

$("publishProducts").addEventListener("click", async () => {
  try {
    await doPublishProducts();
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "error");
  }
});

$("wipeProducts").addEventListener("click", async () => {
  if (!confirm("Wipe ALL products and redeploy? This cannot be undone.")) return;
  products = [];
  renderCategoryManager();
  renderProductManager();
  try {
    await doPublishProducts();
    setStatus("All products wiped and redeployed.", "success");
  } catch (err) {
    setStatus(`Wipe failed: ${err.message}`, "error");
  }
});

document.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-product]");
  if (removeBtn) {
    const i = parseInt(removeBtn.dataset.removeProduct, 10);
    collectProductSquareUrls();
    products = products.filter((_, idx) => idx !== i);
    renderCategoryManager();
    renderProductManager();
    return;
  }
  const deleteBtn = e.target.closest("[data-delete-category]");
  if (deleteBtn) {
    const cat = deleteBtn.dataset.deleteCategory;
    const label = cat || "(Uncategorised)";
    const count = products.filter((p) => (p.category || "") === cat).length;
    if (!confirm(`Delete category "${label}" and its ${count} product${count !== 1 ? "s" : ""}? Click Publish to save.`)) return;
    collectProductSquareUrls();
    products = products.filter((p) => (p.category || "") !== cat);
    renderCategoryManager();
    renderProductManager();
  }
});

/* Logout */
$("adminLogout").addEventListener("click", () => {
  setUnlocked(false);
  renderAuthState();
});

/* ─── Init ──────────────────────────────────── */
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
