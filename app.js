const fallbackSubscriptions = [
  {
    id: "bayou-starter",
    name: "Bayou Starter",
    price: "$200",
    cadence: "yearly",
    tag: "New Collector",
    squareUrl: "",
    summary: "Entry access for online collectors who want Cajun Cards Discord alerts, digital drop visibility, and a cleaner path to sealed product opportunities.",
    features: ["Members-only Discord access", "Online sealed product drop alerts", "Monthly digital TCG market notes", "Standard access to subscription-only announcements"],
    bestFor: "Online collectors who want reliable drop awareness and Discord access"
  },
  {
    id: "lagniappe-club",
    name: "Lagniappe Club",
    price: "$400",
    cadence: "yearly",
    tag: "Most Popular",
    popular: true,
    squareUrl: "",
    summary: "Priority online membership with earlier Discord notifications, better sealed-product access windows, and stronger visibility into limited digital drops.",
    features: ["Everything in Bayou Starter", "Priority Discord drop notifications", "Early online access windows for sealed product", "Member-only digital claim opportunities", "Online collector request priority"],
    bestFor: "Active online TCG collectors who want earlier access and better drop positioning"
  },
  {
    id: "fleur-de-lis-elite",
    name: "Fleur-de-Lis Elite",
    price: "$600",
    cadence: "yearly",
    tag: "Premium",
    squareUrl: "",
    summary: "The highest-access online tier for collectors who want first-look sealed opportunities, elite Discord alerts, and premium digital sourcing priority.",
    features: ["Everything in Lagniappe Club", "First-look Discord alerts before other tiers", "Top priority for limited sealed product opportunities", "Elite-only online drop notifications", "Highest priority digital sourcing requests", "Premium access to rare sealed availability updates"],
    bestFor: "Serious online collectors who want the highest level of access and exclusivity"
  }
];

const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  hero: {
    eyebrow: "Collector memberships with Cajun character",
    headline: "Cajun Cards & Collectibles",
    copy: "A subscription-first TCG club for online collectors who want Discord alerts, sealed drop access, digital claim windows, and a little lagniappe with every year.",
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
