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
  meta: { description: "" },
  footer: { tagline: "A TCG collector club with Cajun character.", copyright: "2026 Cajun Cards & Collectibles. All rights reserved." },
  hero: {
    eyebrow: "Collector memberships with Cajun character",
    headline: "Cajun Cards & Collectibles",
    copy: "A subscription-first TCG club for online collectors who want Discord alerts, sealed drop access, digital claim windows, and a little lagniappe with every year.",
    primaryCta: "Explore memberships",
    secondaryCta: "Join Discord"
  },
  announcements: [],
  discordServerUrl: "",
  discordDrop: { enabled: false, title: "", message: "", discordUrl: "", postedAt: "" },
  subscriptions: fallbackSubscriptions
};

let config = fallbackConfig;
let selectedTier = null;

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}

function getPath(path) {
  return path.split(".").reduce((v, k) => v?.[k], config);
}

async function loadConfig() {
  // ?t= cache-busts the GitHub Pages CDN so changes appear immediately after publish
  const response = await fetch(`config/site.json?t=${Date.now()}`, { cache: "no-store" });
  config = response.ok ? await response.json() : fallbackConfig;
}

function applyTextConfig() {
  document.title = config.brand || fallbackConfig.brand;
  const metaEl = document.getElementById("metaDesc");
  if (metaEl && config.meta?.description) metaEl.content = config.meta.description;
  document.querySelectorAll("[data-config]").forEach((node) => {
    node.textContent = getPath(node.dataset.config) ?? "";
  });
}

function renderAnnouncementStrip() {
  const items = config.announcements || [];
  const strip = $("announcementStrip");
  if (!items.length) { strip.hidden = true; return; }
  const doubled = [...items, ...items];
  $("announcementTrack").innerHTML = doubled.map((item) =>
    `<span class="announcement-item">${escapeHtml(item)}</span>`
  ).join("");
  strip.hidden = false;
}

function renderDiscordDrop() {
  const drop = config.discordDrop;
  const wrap = $("discordDropWrap");
  if (!drop?.enabled) { wrap.hidden = true; return; }
  $("dropTitle").textContent = drop.title || "";
  $("dropMessage").textContent = drop.message || "";
  $("dropPostedAt").textContent = drop.postedAt || "";
  const link = $("dropLink");
  link.href = drop.discordUrl || "#";
  link.hidden = !drop.discordUrl;
  wrap.hidden = false;
}

function renderSubscriptions() {
  const tiers = config.subscriptions?.length ? config.subscriptions : fallbackSubscriptions;
  $("subscriptionGrid").innerHTML = tiers.map((tier) => `
    <article class="subscription-card${tier.popular ? " popular" : ""}">
      <div class="tier-head">
        <div class="tier-name-wrap">
          <span class="badge">${escapeHtml(tier.tag || "Membership")}</span>
          <h3>${escapeHtml(tier.name)}</h3>
        </div>
        <div class="tier-price-wrap">
          <div class="price">${escapeHtml(tier.price)}</div>
          <div class="cadence">${escapeHtml(tier.cadence)}</div>
        </div>
      </div>
      <p class="tier-summary">${escapeHtml(tier.summary)}</p>
      <ul>${(tier.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
      <p class="tier-best-for"><strong>Best for:</strong> ${escapeHtml(tier.bestFor)}</p>
      <button class="button primary full" type="button" data-join-tier="${escapeHtml(tier.id)}">Join with Square</button>
    </article>
  `).join("");
}

function renderAll() {
  applyTextConfig();
  renderAnnouncementStrip();
  renderDiscordDrop();
  renderSubscriptions();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function openTray(tier) {
  selectedTier = tier;
  $("trayTitle").textContent = tier.name;
  $("trayCopy").textContent = tier.squareUrl
    ? `${tier.name} will open in Square checkout.`
    : `${tier.name} needs a Square checkout link — contact the admin.`;
  $("squareCheckoutLink").href = tier.squareUrl || "#memberships";
  $("squareCheckoutLink").textContent = tier.squareUrl ? "Continue to Square" : "Square link coming soon";
  $("trayMessage").textContent = tier.squareUrl ? "" : "This tier needs a Square link before it can send traffic.";
  $("joinTray").classList.add("open");
  $("joinTray").setAttribute("aria-hidden", "false");
}

function closeTray() {
  $("joinTray").classList.remove("open");
  $("joinTray").setAttribute("aria-hidden", "true");
}

function openDiscordTray() {
  const url = config.discordServerUrl || "";
  $("discordServerLink").href = url || "#";
  $("discordServerLink").textContent = url ? "Open Discord" : "Discord link coming soon";
  $("discordJoinCopy").textContent = url
    ? "This opens the Cajun Cards Discord server invite."
    : "The Discord invite link hasn't been configured yet.";
  $("discordTrayMessage").textContent = url ? "" : "The Discord invite has not been configured yet.";
  $("discordTray").classList.add("open");
  $("discordTray").setAttribute("aria-hidden", "false");
}

function closeDiscordTray() {
  $("discordTray").classList.remove("open");
  $("discordTray").setAttribute("aria-hidden", "true");
}

document.addEventListener("click", async (event) => {
  const joinButton = event.target.closest("[data-join-tier]");
  if (joinButton) {
    const tier = (config.subscriptions || []).find((t) => t.id === joinButton.dataset.joinTier);
    if (tier) openTray(tier);
    return;
  }
  if (event.target.id === "closeTray")      { closeTray(); return; }
  if (event.target.id === "closeDiscordTray") { closeDiscordTray(); return; }
  if (event.target.id === "openDiscordJoin" || event.target.id === "openDiscordHero") {
    openDiscordTray(); return;
  }
  if (event.target.id === "copySquareLink") {
    const link = selectedTier?.squareUrl || "";
    if (!link) { showToast("No Square link configured yet."); return; }
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
