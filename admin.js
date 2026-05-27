const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  admin: {
    username: "CajunGamers",
    passwordHash: "5b2371cd0a4d0e10ac35d80642f1366a730165ff8c55253541ce53491453935c"
  },
  subscriptions: []
};

let config = fallbackConfig;
const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadConfig() {
  const localOverride = localStorage.getItem("cajunSitePreviewConfig");
  if (localOverride) {
    config = JSON.parse(localOverride);
    return;
  }
  const response = await fetch("config/site.json", { cache: "no-store" });
  config = response.ok ? await response.json() : fallbackConfig;
}

function isUnlocked() {
  return sessionStorage.getItem("cajunAdminUnlocked") === "true";
}

function setUnlocked(value) {
  if (value) sessionStorage.setItem("cajunAdminUnlocked", "true");
  else sessionStorage.removeItem("cajunAdminUnlocked");
}

function renderAdmin() {
  $("#jsonEditor").value = JSON.stringify(config, null, 2);
  $("#squareLinkFields").innerHTML = (config.subscriptions || []).map((tier) => `
    <label>${escapeHtml(tier.name)}
      <input name="${escapeHtml(tier.id)}" value="${escapeHtml(tier.squareUrl || "")}" placeholder="https://square.link/u/...">
    </label>
  `).join("");
}

function renderAuthState() {
  const unlocked = isUnlocked();
  $("#adminLoginSection").classList.toggle("hidden", unlocked);
  $("#adminPanel").classList.toggle("hidden", !unlocked);
  if (unlocked) renderAdmin();
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "site.json";
  link.click();
  URL.revokeObjectURL(url);
}

$("#adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const expectedUser = config.admin?.username || fallbackConfig.admin.username;
  const expectedHash = config.admin?.passwordHash || fallbackConfig.admin.passwordHash;
  if (username === expectedUser && await sha256(password) === expectedHash) {
    setUnlocked(true);
    event.target.reset();
    $("#loginMessage").textContent = "";
    renderAuthState();
    return;
  }
  $("#loginMessage").textContent = "Login failed.";
});

$("#linkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  config.subscriptions = (config.subscriptions || []).map((tier) => ({
    ...tier,
    squareUrl: form.get(tier.id) || ""
  }));
  localStorage.setItem("cajunSitePreviewConfig", JSON.stringify(config));
  $("#adminMessage").textContent = "Square links previewed locally. Download site.json and commit it to make them public.";
  renderAdmin();
});

$("#jsonForm").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    config = JSON.parse($("#jsonEditor").value);
    localStorage.setItem("cajunSitePreviewConfig", JSON.stringify(config));
    $("#adminMessage").textContent = "Config previewed locally. Download site.json and commit it to make it public.";
    renderAdmin();
  } catch (error) {
    $("#adminMessage").textContent = `JSON error: ${error.message}`;
  }
});

$("#downloadConfig").addEventListener("click", downloadConfig);
$("#adminLogout").addEventListener("click", () => {
  setUnlocked(false);
  renderAuthState();
});

loadConfig()
  .then(renderAuthState)
  .catch((error) => {
    console.error(error);
    config = fallbackConfig;
    renderAuthState();
  });
