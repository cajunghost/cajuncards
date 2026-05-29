(function () {
  if (sessionStorage.getItem("cajun_featured_seen")) return;

  const CARDS = [
    {
      game: "Pokémon",
      name: "Charizard — Base Set 1st Edition",
      value: "~$420,000 PSA 10",
      img:  "https://images.pokemontcg.io/base1/4_hires.png",
      alt:  "Charizard Base Set 1st Edition Pokémon card",
      badge: "pokemon-badge",
      fallback: "fallback-pokemon",
    },
    {
      game: "One Piece",
      name: "Shanks — OP01-120 Secret Rare",
      value: "~$1,200 Raw",
      img:  "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120_p1.png",
      alt:  "Shanks OP01-120 Secret Rare One Piece card",
      badge: "onepiece-badge",
      fallback: "fallback-onepiece",
    },
    {
      game: "Lorcana",
      name: "Elsa — Spirit of Winter (Enchanted)",
      value: "~$500 Raw",
      img:  "https://lorcana-api.com/images/EN/Elsa_-_Spirit_of_Winter.png",
      alt:  "Elsa Spirit of Winter Enchanted Disney Lorcana card",
      badge: "lorcana-badge",
      fallback: "fallback-lorcana",
    },
  ];

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
      <p class="featured-popup-eyebrow">High-Value Showcase</p>
      <h2 class="featured-popup-title" id="featuredPopupTitle">Featured Cards</h2>

      <div class="card-wheel-scene" aria-hidden="true">
        <div class="card-wheel" id="cardWheel">
          ${CARDS.map((c, i) => `
            <div class="wheel-card" data-idx="${i}">
              <img src="${c.img}" alt="${c.alt}" class="wheel-card-img"
                   onerror="this.style.display='none';this.closest('.wheel-card').classList.add('wheel-card-fallback','${c.fallback}')">
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
    sessionStorage.setItem("cajun_featured_seen", "1");
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
