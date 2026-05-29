let siteConfig = {};
let products = [];
let filteredProducts = [];

const imageCache = new Map();
const pendingFetches = new Set();

const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) scheduleImageLoad(e.target); }),
  { rootMargin: "300px" }
);

const $ = (id) => document.getElementById(id);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}

async function loadData() {
  const [siteRes, prodRes] = await Promise.allSettled([
    fetch(`config/site.json?t=${Date.now()}`,     { cache: "no-store" }),
    fetch(`config/products.json?t=${Date.now()}`, { cache: "no-store" })
  ]);

  if (siteRes.status === "fulfilled" && siteRes.value.ok) {
    siteConfig = await siteRes.value.json();
  }
  if (prodRes.status === "fulfilled" && prodRes.value.ok) {
    const data = await prodRes.value.json();
    products = Array.isArray(data.products) ? data.products : [];
  }
  filteredProducts = [...products];
}

function applyBranding() {
  const brand   = siteConfig.brand   || "Cajun Cards & Collectibles";
  const footer  = siteConfig.footer  || {};

  document.title = `Store — ${brand}`;

  const footerBrand = $("footerBrand");
  if (footerBrand) footerBrand.textContent = brand;

  const footerTagline = $("footerTagline");
  if (footerTagline) footerTagline.textContent = footer.tagline || "";

  const footerCopyright = $("footerCopyright");
  if (footerCopyright) footerCopyright.textContent = footer.copyright || "";

  const items = siteConfig.announcements || [];
  const strip = $("announcementStrip");
  const track = $("announcementTrack");
  if (items.length && strip && track) {
    const doubled = [...items, ...items];
    track.innerHTML = doubled.map((i) => `<span class="announcement-item">${escapeHtml(i)}</span>`).join("");
    strip.hidden = false;
  }
}

function buildCategoryFilter() {
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const select = $("categoryFilter");
  if (!select) return;
  if (!cats.length) { select.hidden = true; return; }
  select.innerHTML = `<option value="">All Categories</option>` +
    cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  select.hidden = false;
}

function buildSetFilter() {
  const activeCat = $("categoryFilter")?.value || "";
  const pool = activeCat ? products.filter((p) => (p.category || "") === activeCat) : products;
  const sets = [...new Set(pool.map((p) => p.setName).filter(Boolean))].sort();
  const select = $("setFilter");
  if (!select) return;
  if (!sets.length) { select.hidden = true; select.value = ""; return; }
  const current = select.value;
  select.innerHTML = `<option value="">All Sets</option>` +
    sets.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  if (sets.includes(current)) select.value = current;
  select.hidden = false;
}

function parsePrice(str) {
  const n = parseFloat(String(str || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function applyFilters() {
  const search   = ($("storeSearch")?.value || "").toLowerCase().trim();
  const category = $("categoryFilter")?.value || "";
  const set      = $("setFilter")?.value || "";
  const sort     = $("sortBy")?.value || "default";

  filteredProducts = products.filter((p) => {
    const matchSearch = !search ||
      (p.name || "").toLowerCase().includes(search) ||
      (p.setName   || "").toLowerCase().includes(search) ||
      (p.category  || "").toLowerCase().includes(search) ||
      (p.condition || "").toLowerCase().includes(search);
    const matchCat = !category || (p.category || "") === category;
    const matchSet = !set      || p.setName === set;
    return matchSearch && matchCat && matchSet;
  });

  if (sort === "name")        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "price-asc")   filteredProducts.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  if (sort === "price-desc")  filteredProducts.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));

  renderGrid();
}

function renderGrid() {
  observer.disconnect();

  const grid     = $("productGrid");
  const countEl  = $("storeResultCount");
  if (!grid) return;

  if (!filteredProducts.length) {
    const msg = products.length
      ? "No products match your search. Try adjusting the filters."
      : "Products coming soon — check back after the launch.";
    grid.innerHTML = `<div class="store-empty"><p>${escapeHtml(msg)}</p></div>`;
    if (countEl) countEl.textContent = "";
    return;
  }

  if (countEl) {
    countEl.textContent = `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`;
  }

  grid.innerHTML = filteredProducts.map((p) => {
    const id = escapeHtml(p.id);
    const metaParts = [
      p.condition ? `<span class="product-meta-tag">${escapeHtml(p.condition)}</span>` : "",
      p.rarity    ? `<span class="product-meta-tag">${escapeHtml(p.rarity)}</span>`    : "",
      p.language && p.language.toLowerCase() !== "english"
        ? `<span class="product-meta-tag">${escapeHtml(p.language)}</span>` : ""
    ].filter(Boolean).join("");

    return `
      <article class="product-card" data-product-id="${id}">
        <div class="product-card-image">
          <div class="product-img-placeholder" id="ph-${id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <path d="M8 10h8M8 14h5"/>
            </svg>
          </div>
          <img id="img-${id}" alt="${escapeHtml(p.name)}" class="product-img" data-product-id="${id}">
        </div>
        <div class="product-card-body">
          ${p.category ? `<p class="product-card-category">${escapeHtml(p.category)}</p>` : ""}
          ${p.setName  ? `<p class="product-card-set">${escapeHtml(p.setName)}</p>` : ""}
          <h3 class="product-card-name">${escapeHtml(p.name)}</h3>
          ${metaParts ? `<div class="product-card-meta">${metaParts}</div>` : ""}
          <div class="product-card-footer">
            <span class="product-card-price">${escapeHtml(p.price || "")}</span>
            ${p.squareUrl && /^https:\/\//i.test(p.squareUrl)
              ? `<a class="button primary product-buy-btn" href="${escapeHtml(p.squareUrl)}" target="_blank" rel="noopener noreferrer">Buy</a>`
              : `<span class="button ghost product-buy-btn disabled" aria-disabled="true">Inquire</span>`
            }
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$(".product-card").forEach((card) => {
    const id = card.dataset.productId;
    if (imageCache.has(id)) {
      const cached = imageCache.get(id);
      if (cached) applyImage(id, cached);
    } else {
      observer.observe(card);
    }
  });
}

function scheduleImageLoad(card) {
  observer.unobserve(card);
  const id = card.dataset.productId;
  if (!id || imageCache.has(id) || pendingFetches.has(id)) return;
  pendingFetches.add(id);

  const product = products.find((p) => p.id === id);
  if (!product) { pendingFetches.delete(id); return; }

  const source = product.imageUrl
    ? Promise.resolve(product.imageUrl)
    : resolveImage(product);

  source.then((url) => {
    imageCache.set(id, url || null);
    pendingFetches.delete(id);
    if (url) applyImage(id, url);
  });
}

function applyImage(productId, url) {
  const img = $(`img-${productId}`);
  const ph  = $(`ph-${productId}`);
  if (!img) return;

  img.onload = () => {
    img.classList.add("loaded");
    if (ph) ph.hidden = true;
  };
  img.onerror = () => {
    img.style.display = "none";
  };
  img.src = url;
}

async function resolveImage(product) {
  const hint = `${product.category || ""} ${product.setName || ""}`.toLowerCase();
  const isPokemon = /pokemon|pok[eé]mon|ptcg|pocket/i.test(hint);
  const isMTG = /\bmtg\b|magic|commander|gathering|wizards/i.test(hint);

  if (isPokemon) return fetchPokemon(product.name, product.setName);
  if (isMTG) return fetchScryfall(product.name, product.setName);

  // Unknown game — try Scryfall first (no set hint to avoid false positives), then Pokemon
  const mtgUrl = await fetchScryfall(product.name);
  if (mtgUrl) return mtgUrl;
  return fetchPokemon(product.name, product.setName);
}

async function fetchScryfall(name, setName) {
  let url;
  if (setName) {
    url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${name}" s:"${setName}"`)}&unique=cards`;
  } else {
    url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
  }
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return null;
  const d = await res.json();
  const card = setName ? d.data?.[0] : d;
  return card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal || null;
}

async function fetchPokemon(name, setName) {
  const q = setName
    ? `name:"${name}" set.name:"${setName}"`
    : `name:"${name}"`;
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`
  );
  if (!res.ok) return null;
  const d = await res.json();
  return d.data?.[0]?.images?.large || d.data?.[0]?.images?.small || null;
}

/* ── Discord tray ──────────────────────────── */
function openDiscordTray() {
  const url  = siteConfig.discordServerUrl || "";
  const link = $("discordServerLink");
  const copy = $("discordJoinCopy");
  const msg  = $("discordTrayMessage");
  const tray = $("discordTray");
  if (link) { link.href = url || "#"; link.textContent = url ? "Open Discord" : "Discord link coming soon"; }
  if (copy) copy.textContent = url
    ? "This opens the Cajun Cards Discord server invite."
    : "The Discord invite link hasn't been configured yet.";
  if (msg)  msg.textContent  = url ? "" : "The Discord invite has not been configured yet.";
  if (tray) { tray.classList.add("open"); tray.setAttribute("aria-hidden", "false"); }
}

function closeDiscordTray() {
  const tray = $("discordTray");
  if (tray) { tray.classList.remove("open"); tray.setAttribute("aria-hidden", "true"); }
}

document.addEventListener("click", (e) => {
  if (e.target.id === "openDiscordJoin")   openDiscordTray();
  if (e.target.id === "closeDiscordTray")  closeDiscordTray();
});

$("storeSearch")?.addEventListener("input",  applyFilters);
$("categoryFilter")?.addEventListener("change", () => { buildSetFilter(); applyFilters(); });
$("setFilter")?.addEventListener("change",   applyFilters);
$("sortBy")?.addEventListener("change",      applyFilters);

loadData()
  .then(() => { applyBranding(); buildCategoryFilter(); buildSetFilter(); renderGrid(); })
  .catch((err) => {
    console.error(err);
    const grid = $("productGrid");
    if (grid) grid.innerHTML = `<div class="store-empty"><p>Unable to load products. Please refresh the page.</p></div>`;
  });
