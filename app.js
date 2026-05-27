const fallbackConfig = {
  brand: "Cajun Cards & Collectibles",
  hero: {
    eyebrow: "Collector memberships with Cajun character",
    headline: "Cajun Cards & Collectibles",
    copy: "A subscription-first TCG club for collectors who want early drop alerts, live break access, trade-night perks, and a little lagniappe with every month.",
    primaryCta: "Compare memberships",
    secondaryCta: "View calendar"
  },
  announcements: [],
  subscriptions: [],
  shopLikeFeatures: [],
  calendar: [],
  faq: []
};

let config = fallbackConfig;
let selectedTier = null;
const wishlist = JSON.parse(localStorage.getItem("cajunWishlist") || "[]");

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

function renderFeatures() {
  $("#featureGrid").innerHTML = (config.shopLikeFeatures || []).map((feature) => `
    <article class="feature-card">
      <h3>${escapeHtml(feature.title)}</h3>
      <p>${escapeHtml(feature.copy)}</p>
    </article>
  `).join("");
}

function renderCalendar() {
  $("#calendarList").innerHTML = (config.calendar || []).map((item) => `
    <article class="calendar-item">
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.date)}</strong>
      <p>${escapeHtml(item.title)}</p>
    </article>
  `).join("");
}

function renderCompare() {
  const tiers = config.subscriptions || [];
  const featureRows = ["Price", "Best for", "Primary perks", "Square link"];
  const rowHtml = featureRows.map((row) => {
    const cells = tiers.map((tier) => {
      if (row === "Price") return `${escapeHtml(tier.price)} / ${escapeHtml(tier.cadence)}`;
      if (row === "Best for") return escapeHtml(tier.bestFor);
      if (row === "Primary perks") return escapeHtml((tier.features || []).slice(0, 3).join(", "));
      return tier.squareUrl ? "Configured" : "Needs Square link";
    });
    return `<tr><th>${row}</th>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
  }).join("");
  $("#compareTable").innerHTML = `
    <table>
      <thead><tr><th>Tier</th>${tiers.map((tier) => `<th>${escapeHtml(tier.name)}</th>`).join("")}</tr></thead>
      <tbody>${rowHtml}</tbody>
    </table>
  `;
}

function renderFaq() {
  $("#faqList").innerHTML = (config.faq || []).map((item) => `
    <details class="faq-card">
      <summary><strong>${escapeHtml(item.question)}</strong></summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>
  `).join("");
}

function renderWishlist() {
  $("#wishlistItems").innerHTML = wishlist.map((item, index) => `
    <div class="wishlist-item">
      <strong>${escapeHtml(item.target)}</strong>
      <p>${escapeHtml(item.notes)}</p>
      <button class="button ghost" type="button" data-remove-wishlist="${index}">Remove</button>
    </div>
  `).join("");
}

function renderAll() {
  applyTextConfig();
  renderAnnouncements();
  renderSubscriptions();
  renderFeatures();
  renderCalendar();
  renderCompare();
  renderFaq();
  renderWishlist();
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

  const removeWishlist = event.target.closest("[data-remove-wishlist]");
  if (removeWishlist) {
    wishlist.splice(Number(removeWishlist.dataset.removeWishlist), 1);
    localStorage.setItem("cajunWishlist", JSON.stringify(wishlist));
    renderWishlist();
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

$("#wishlistForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  wishlist.push({
    target: form.get("target"),
    notes: form.get("notes")
  });
  localStorage.setItem("cajunWishlist", JSON.stringify(wishlist));
  event.target.reset();
  renderWishlist();
});

loadConfig()
  .then(renderAll)
  .catch((error) => {
    console.error(error);
    config = fallbackConfig;
    renderAll();
  });
