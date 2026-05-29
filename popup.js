(function () {
  const bypass = new URLSearchParams(location.search).has("popup");
  if (!bypass && sessionStorage.getItem("cajun_featured_seen")) return;

  /* ── Card pools — one card picked at random from each pool on every load ── */
  const POOLS = [

    /* ── Pokémon ── */
    [
      {
        game: "Pokémon",
        name: "Charizard ex — Special Illustration Rare",
        value: "~$150 NM · Pokémon 151",
        img: "https://images.pokemontcg.io/sv3pt5/207_hires.png",
        imgFallbacks: [
          "https://images.pokemontcg.io/sv3pt5/207.png",
          "https://images.pokemontcg.io/base1/4_hires.png",
          "https://images.pokemontcg.io/base1/4.png",
        ],
        alt: "Charizard ex Special Illustration Rare from Pokémon 151",
        badge: "pokemon-badge", fallback: "fallback-pokemon",
      },
      {
        game: "Pokémon",
        name: "Umbreon VMAX — Alternate Art",
        value: "~$250 NM · Evolving Skies",
        img: "https://images.pokemontcg.io/swsh7/215_hires.png",
        imgFallbacks: [
          "https://images.pokemontcg.io/swsh7/215.png",
          "https://images.pokemontcg.io/sv3pt5/207_hires.png",
          "https://images.pokemontcg.io/sv3pt5/207.png",
        ],
        alt: "Umbreon VMAX Alternate Art from Evolving Skies",
        badge: "pokemon-badge", fallback: "fallback-pokemon",
      },
      {
        game: "Pokémon",
        name: "Pikachu ex — Special Illustration Rare",
        value: "~$160 NM · Prismatic Evolutions",
        img: "https://images.pokemontcg.io/sv8pt5/161_hires.png",
        imgFallbacks: [
          "https://images.pokemontcg.io/sv8pt5/161.png",
          "https://images.pokemontcg.io/base1/4_hires.png",
          "https://images.pokemontcg.io/base1/4.png",
        ],
        alt: "Pikachu ex Special Illustration Rare from Prismatic Evolutions",
        badge: "pokemon-badge", fallback: "fallback-pokemon",
      },
    ],

    /* ── One Piece ── */
    [
      {
        game: "One Piece",
        name: "Monkey D. Luffy — OP01-120 Secret Rare",
        value: "~$275 NM · Romance Dawn",
        img: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP01/OP01_120_EN.webp",
        imgFallbacks: [
          "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP01/OP01_120_p1_EN.webp",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120_p1.png",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png",
        ],
        alt: "Monkey D. Luffy OP01-120 Secret Rare One Piece card",
        badge: "onepiece-badge", fallback: "fallback-onepiece",
      },
      {
        game: "One Piece",
        name: "Portgas D. Ace — OP02-013 Secret Rare",
        value: "~$300 NM · Paramount War",
        img: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP02/OP02_013_EN.webp",
        imgFallbacks: [
          "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP02/OP02_013_p1_EN.webp",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013_p1.png",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png",
        ],
        alt: "Portgas D. Ace OP02-013 Secret Rare One Piece card",
        badge: "onepiece-badge", fallback: "fallback-onepiece",
      },
      {
        game: "One Piece",
        name: "Edward Newgate — OP02-004 Secret Rare",
        value: "~$225 NM · Paramount War",
        img: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP02/OP02_004_EN.webp",
        imgFallbacks: [
          "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/en/OP02/OP02_004_p1_EN.webp",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP02-004_p1.png",
          "https://en.onepiece-cardgame.com/images/cardlist/card/OP02-004.png",
        ],
        alt: "Edward Newgate OP02-004 Secret Rare One Piece card",
        badge: "onepiece-badge", fallback: "fallback-onepiece",
      },
    ],

    /* ── Lorcana ── */
    [
      {
        game: "Lorcana",
        name: "Elsa — Spirit of Winter (Enchanted)",
        value: "~$325 NM · The First Chapter",
        img: "https://lorcana-api.com/images/EN/Elsa_-_Spirit_of_Winter.png",
        imgFallbacks: [
          "https://lorcana-api.com/images/EN/Elsa_-_Spirit_of_Winter_Enchanted.png",
          "https://lorcana-api.com/images/EN/Elsa_-_Spirit_of_Winter.webp",
        ],
        alt: "Elsa Spirit of Winter Enchanted Disney Lorcana card",
        badge: "lorcana-badge", fallback: "fallback-lorcana",
      },
      {
        game: "Lorcana",
        name: "Simba — Protective Cub (Enchanted)",
        value: "~$275 NM · The First Chapter",
        img: "https://lorcana-api.com/images/EN/Simba_-_Protective_Cub.png",
        imgFallbacks: [
          "https://lorcana-api.com/images/EN/Simba_-_Protective_Cub_Enchanted.png",
          "https://lorcana-api.com/images/EN/Simba_-_Protective_Cub.webp",
        ],
        alt: "Simba Protective Cub Enchanted Disney Lorcana card",
        badge: "lorcana-badge", fallback: "fallback-lorcana",
      },
      {
        game: "Lorcana",
        name: "Stitch — Carefree Surfer (Enchanted)",
        value: "~$250 NM · Rise of the Floodborn",
        img: "https://lorcana-api.com/images/EN/Stitch_-_Carefree_Surfer.png",
        imgFallbacks: [
          "https://lorcana-api.com/images/EN/Stitch_-_Carefree_Surfer_Enchanted.png",
          "https://lorcana-api.com/images/EN/Stitch_-_Carefree_Surfer.webp",
        ],
        alt: "Stitch Carefree Surfer Enchanted Disney Lorcana card",
        badge: "lorcana-badge", fallback: "fallback-lorcana",
      },
    ],
  ];

  /* Pick one card at random from each pool */
  const CARDS = POOLS.map((pool) => pool[Math.floor(Math.random() * pool.length)]);

  /* ── Build HTML ── */
  const popup = document.createElement("div");
  popup.id = "featuredPopup";
  popup.className = "featured-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-labelledby", "featuredPopupTitle");

  popup.innerHTML = `
    <div class="featured-popup-backdrop" id="featuredBackdrop"></div>
    <div class="featured-popup-panel">
      <button class="featured-popup-close" id="featuredPopupClose" aria-label="Close">&times;</button>
      <p class="featured-popup-eyebrow">We Carry These Games</p>
      <h2 class="featured-popup-title" id="featuredPopupTitle">Pokémon &middot; One Piece &middot; Lorcana &amp; More</h2>
      <p class="featured-popup-intro">From Base Set Charizards to Secret Rare Shanks, we buy, sell, and break the cards you care about. Here&rsquo;s a look at some of the high-value singles in our world.</p>

      <div class="card-wheel-scene" aria-hidden="true">
        <div class="card-wheel" id="cardWheel">
          ${CARDS.map((c, i) => `
            <div class="wheel-card" data-idx="${i}">
              <img src="${c.img}"
                   data-fallbacks="${(c.imgFallbacks || []).join('|')}"
                   data-fallback-class="${c.fallback}"
                   alt="${c.alt}" class="wheel-card-img">
            </div>
          `).join("")}
        </div>
      </div>

      <div class="wheel-info" id="wheelInfo">
        ${CARDS.map((c, i) => `
          <div class="wheel-info-slide${i === 0 ? " active" : ""}" data-slide="${i}">
            <span class="wheel-game-badge ${c.badge}">${c.game}</span>
            <p class="wheel-card-name">${c.name}</p>
            <p class="wheel-card-value">${c.value}</p>
          </div>
        `).join("")}
      </div>

      <div class="wheel-dots" role="tablist" aria-label="Select card">
        ${CARDS.map((c, i) => `
          <button class="wheel-dot${i === 0 ? " active" : ""}"
                  data-card="${i}" role="tab"
                  aria-selected="${i === 0}"
                  aria-label="${c.game} card"></button>
        `).join("")}
      </div>

      <a class="button primary featured-store-btn" href="store.html">Browse Our Store &rarr;</a>
    </div>
  `;

  document.body.appendChild(popup);

  /* ── Image fallback chain ── */
  popup.querySelectorAll(".wheel-card-img").forEach((img) => {
    const queue = (img.dataset.fallbacks || "").split("|").filter(Boolean);
    let idx = 0;
    img.addEventListener("error", () => {
      if (idx < queue.length) {
        img.src = queue[idx++];
      } else {
        img.style.display = "none";
        img.closest(".wheel-card").classList.add("wheel-card-fallback", img.dataset.fallbackClass);
      }
    });
  });

  /* ── Controls ── */
  const wheel  = popup.querySelector("#cardWheel");
  const dots   = Array.from(popup.querySelectorAll(".wheel-dot"));
  const slides = Array.from(popup.querySelectorAll(".wheel-info-slide"));
  let current = 0;
  let timer;

  function goTo(idx) {
    current = ((idx % CARDS.length) + CARDS.length) % CARDS.length;
    wheel.style.transform = `rotateY(${-current * 120}deg)`;
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === current);
      d.setAttribute("aria-selected", String(i === current));
    });
    slides.forEach((s, i) => s.classList.toggle("active", i === current));
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 3500);
  }

  function open() {
    popup.classList.add("open");
    goTo(0);
    startAuto();
    document.addEventListener("keydown", onKey);
  }

  function close() {
    popup.classList.remove("open");
    clearInterval(timer);
    if (!bypass) sessionStorage.setItem("cajun_featured_seen", "1");
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) { if (e.key === "Escape") close(); }

  dots.forEach((d) => {
    d.addEventListener("click", () => { goTo(Number(d.dataset.card)); startAuto(); });
  });
  popup.querySelector("#featuredPopupClose").addEventListener("click", close);
  popup.querySelector("#featuredBackdrop").addEventListener("click", close);

  setTimeout(open, 700);
}());
