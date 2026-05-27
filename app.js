const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  hero: {
    eyebrow: "Collector memberships with Cajun character",
    headline: "Cajun Cards & Collectibles",
    copy: "A subscription-first TCG club for collectors who want early drop alerts, live break access, trade-night perks, and a little lagniappe with every month.",
    primaryCta: "Compare memberships",
    secondaryCta: "Discord drops"
  },
  announcements: [],
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
let selectedTier = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getPath(path) {
  return path.split(".").reduce((value, key) => value?.[key], config);
}

async function loadConfig() {
  const response = await fetch("config/site.json", { cache: "no-store" });
  config = response.ok ? await response.json() : fallbackConfig;
}

function applyTextConfig() {
  document.title = config.brand || fallbackConfig.brand;
  $$("[data-config]").forEach((node) => {
    node.textContent = getPath(node.dataset.config) || "";
  });
}

function renderAnnouncements() {
  const announcements = config.announcements?.length ? config.announcements : ["Subscriptions redirect to Square checkout."];
  const items = [...announcements, ...announcements].map((text) => `
    <div class="announcement-item"><span>CCC</span> ${escapeHtml(text)}</div>
  `);
  $("#announcementTrack").innerHTML = items.join("");
}

function renderDiscordDrop() {
  const drop = config.discordDrop || {};
  const section = $("#dropNotification");
  section.classList.toggle("hidden", !drop.enabled);
  if (!drop.enabled) {
    section.innerHTML = "";
    return;
  }
  section.innerHTML = `
    <div>
      <p class="eyebrow">Discord Drop</p>
      <h2>${escapeHtml(drop.title || "Discord drop notification")}</h2>
      <p>${escapeHtml(drop.message || "")}</p>
      ${drop.postedAt ? `<span>${escapeHtml(drop.postedAt)}</span>` : ""}
    </div>
    ${drop.discordUrl ? `<a class="button primary" href="${escapeHtml(drop.discordUrl)}" target="_blank" rel="noopener">Open Discord drop</a>` : ""}
  `;
}

function tierMatches(tier) {
  const query = $("#tierSearch").value.trim().toLowerCase();
  const filter = $("#tierFilter").value;
  const haystack = [
    tier.name,
    tier.summary,
    tier.bestFor,
    tier.tag,
    ...(tier.features || [])
  ].join(" ").toLowerCase();
  const passesSearch = !query || haystack.includes(query);
  const passesFilter = filter === "all"
    || (filter === "starter" && haystack.includes("new"))
    || (filter === "break" && haystack.includes("break"))
    || (filter === "premium" && (haystack.includes("premium") || haystack.includes("vip")));
  return passesSearch && passesFilter;
}

function renderSubscriptions() {
  const tiers = (config.subscriptions || []).filter(tierMatches);
  $("#subscriptionGrid").innerHTML = tiers.map((tier) => `
    <article class="subscription-card ${tier.popular ? "popular" : ""}">
      <div class="tier-head">
        <div>
          <span class="badge">${escapeHtml(tier.tag || "Membership")}</span>
          <h3>${escapeHtml(tier.name)}</h3>
        </div>
        <div>
          <div class="price">${escapeHtml(tier.price)}</div>
          <div class="cadence">${escapeHtml(tier.cadence)}</div>
        </div>
      </div>
      <p>${escapeHtml(tier.summary)}</p>
      <ul>${(tier.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      <p><strong>Best for:</strong> ${escapeHtml(tier.bestFor)}</p>
      <button class="button primary" type="button" data-join-tier="${escapeHtml(tier.id)}">Join with Square</button>
    </article>
  `).join("") || "<p>No subscriptions match that search.</p>";
}

function renderAll() {
  applyTextConfig();
  renderAnnouncements();
  renderDiscordDrop();
  renderSubscriptions();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function openTray(tier) {
  selectedTier = tier;
  $("#trayTitle").textContent = tier.name;
  $("#trayCopy").textContent = tier.squareUrl
    ? `${tier.name} will open in Square checkout.`
    : `${tier.name} needs a Square checkout link before this button can send traffic.`;
  $("#squareCheckoutLink").href = tier.squareUrl || "#memberships";
  $("#squareCheckoutLink").textContent = tier.squareUrl ? "Continue to Square" : "Square link coming soon";
  $("#trayMessage").textContent = tier.squareUrl ? "" : "This tier needs a Square link before it can send traffic.";
  $("#joinTray").classList.add("open");
  $("#joinTray").setAttribute("aria-hidden", "false");
}

function closeTray() {
  $("#joinTray").classList.remove("open");
  $("#joinTray").setAttribute("aria-hidden", "true");
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

document.addEventListener("click", async (event) => {
  const joinButton = event.target.closest("[data-join-tier]");
  if (joinButton) {
    const tier = (config.subscriptions || []).find((candidate) => candidate.id === joinButton.dataset.joinTier);
    if (tier) openTray(tier);
  }

  if (event.target.id === "closeTray") closeTray();
  if (event.target.id === "downloadConfig") downloadConfig();
  if (event.target.id === "copySquareLink") {
    const link = selectedTier?.squareUrl || "";
    if (!link) {
      showToast("No Square link configured yet.");
      return;
    }
    await navigator.clipboard.writeText(link);
    showToast("Square link copied.");
  }
});

$("#tierSearch").addEventListener("input", renderSubscriptions);
$("#tierFilter").addEventListener("change", renderSubscriptions);

loadConfig()
  .then(renderAll)
  .catch((error) => {
    console.error(error);
    config = fallbackConfig;
    renderAll();
  });
