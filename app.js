const fallbackSubscriptions = [
  {
    id: "bayou-starter",
    name: "Bayou Starter",
    price: "$9",
    cadence: "monthly",
    tag: "New Collector",
    squareUrl: "",
    summary: "For collectors who want the drop radar, event calendar, and member-only alerts without overcommitting.",
    features: ["Early alerts for sealed product and singles", "Monthly TCG market email", "Trade-night calendar access", "Members-only Discord invite"],
    bestFor: "Casual collectors, parents, and new TCG players"
  },
  {
    id: "lagniappe-club",
    name: "Lagniappe Club",
    price: "$29",
    cadence: "monthly",
    tag: "Most Popular",
    popular: true,
    squareUrl: "",
    summary: "The core collector membership with useful monthly value, break priority, and members-only opportunities.",
    features: ["Everything in Bayou Starter", "Priority access to live break signups", "Monthly member discount code", "Members-only singles previews"],
    bestFor: "Active TCG collectors who follow drops and breaks"
  },
  {
    id: "fleur-de-lis-elite",
    name: "Fleur-de-Lis Elite",
    price: "$79",
    cadence: "monthly",
    tag: "Premium",
    squareUrl: "",
    summary: "A premium collector service for curated finds, VIP access, and a higher-touch monthly experience.",
    features: ["Everything in Lagniappe Club", "Quarterly curated collector box", "VIP event and trade-night access", "Personal sourcing request queue"],
    bestFor: "Serious collectors building a sharper collection"
  }
];

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
  subscriptions: fallbackSubscriptions
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

function renderSubscriptions() {
  const tiers = (config.subscriptions?.length ? config.subscriptions : fallbackSubscriptions);
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

loadConfig()
  .then(renderAll)
  .catch((error) => {
    console.error(error);
    config = fallbackConfig;
    renderAll();
  });
