const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  admin: {
    username: "CajunGamers",
    passwordHash: "5b2371cd0a4d0e10ac35d80642f1366a730165ff8c55253541ce53491453935c"
  },
  discordDrop: {
    enabled: false,
    title: "",
    message: "",
    discordUrl: "",
    postedAt: ""
  },
  subscriptions: []
};

let config = fallbackConfig;
const $ = (selector) => document.querySelector(selector);
const githubRepo = "cajunghost/cajuncards";
const githubBranch = "main";

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
  const response = await fetch("config/site.json", { cache: "no-store" });
  config = response.ok ? await response.json() : fallbackConfig;
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
  const drop = config.discordDrop || fallbackConfig.discordDrop;
  const dropForm = $("#dropForm");
  dropForm.enabled.checked = Boolean(drop.enabled);
  dropForm.title.value = drop.title || "";
  dropForm.message.value = drop.message || "";
  dropForm.discordUrl.value = drop.discordUrl || "";
  dropForm.postedAt.value = drop.postedAt || "";
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

function applySquareLinkForm() {
  const form = new FormData($("#linkForm"));
  config.subscriptions = (config.subscriptions || []).map((tier) => ({
    ...tier,
    squareUrl: form.get(tier.id) || ""
  }));
  localStorage.setItem("cajunSitePreviewConfig", JSON.stringify(config));
}

function toBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function githubRequest(path, options = {}) {
  const token = $("#githubPublishToken").value.trim();
  if (!token) throw new Error("Paste a GitHub publish token first.");
  const response = await fetch(`https://api.github.com/repos/${githubRepo}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `GitHub request failed with ${response.status}`);
  }
  return data;
}

async function publishConfig() {
  applySquareLinkForm();
  const path = "config/site.json";
  $("#adminMessage").textContent = "Publishing config/site.json to GitHub...";
  const current = await githubRequest(`/contents/${path}?ref=${githubBranch}`);
  await githubRequest(`/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Update Square subscription links",
      branch: githubBranch,
      sha: current.sha,
      content: toBase64Utf8(`${JSON.stringify(config, null, 2)}\n`)
    })
  });
  localStorage.removeItem("cajunSitePreviewConfig");
  $("#adminMessage").textContent = "Published. GitHub Pages may take a minute to show the updated config.";
}

$("#adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const expectedUser = config.admin?.username || fallbackConfig.admin.username;
  const expectedHash = config.admin?.passwordHash || fallbackConfig.admin.passwordHash;
  if (username.toLowerCase() === expectedUser.toLowerCase() && await sha256(password) === expectedHash) {
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
  applySquareLinkForm();
  $("#adminMessage").textContent = "Square links previewed locally. Download site.json and commit it to make them public.";
  renderAdmin();
});

$("#publishConfig").addEventListener("click", async () => {
  try {
    await publishConfig();
  } catch (error) {
    $("#adminMessage").textContent = `Publish failed: ${error.message}`;
  }
});

$("#dropForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  config.discordDrop = {
    enabled: form.enabled.checked,
    title: form.title.value,
    message: form.message.value,
    discordUrl: form.discordUrl.value,
    postedAt: form.postedAt.value
  };
  localStorage.setItem("cajunSitePreviewConfig", JSON.stringify(config));
  $("#adminMessage").textContent = "Discord drop notification previewed locally. Download site.json and commit it to make it public.";
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
