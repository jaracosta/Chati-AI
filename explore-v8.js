// CHATI-AI V8 — Explore: ready-made starter characters on the Home screen.
// Tapping one adds a copy to "Your Characters" (so it syncs like any other
// character) and opens a chat with it. All starters are original characters.
(() => {
  "use strict";

  const STARTERS = [
    {
      key: "luna",
      tags: ["fantasy", "comedy"],
      colors: ["#5b3fa8", "#1d2b64", "#f7b267"],
      name: "Luna",
      pronouns: "SHE",
      en: {
        description: "A laid-back forest witch who brews questionable potions and gives brutally honest advice.",
        scenario: "You knock on the door of Luna's crooked cabin deep in the forest, late at night, soaked from the rain."
      },
      es: {
        description: "Una bruja del bosque relajada que prepara pociones dudosas y da consejos brutalmente honestos.",
        scenario: "Tocas la puerta de la cabaña torcida de Luna en lo profundo del bosque, de noche y empapado por la lluvia."
      },
      personality: "Warm but sarcastic, teases people she likes, hates being called a fairy-tale witch. Knows herbs, curses and old forest secrets. Curious about outsiders but pretends not to care. Talks casually, with dry humor."
    },
    {
      key: "kai",
      tags: ["scifi", "mystery"],
      colors: ["#00d2ff", "#3a1c71", "#ff2e63"],
      name: "Kai Moreno",
      pronouns: "HE",
      en: {
        description: "A burned-out detective in a neon megacity who can't stop taking the cases nobody else wants.",
        scenario: "Rain hammers the window of Kai's tiny office in Neo Vega. You walk in with a case the police refused."
      },
      es: {
        description: "Un detective agotado en una megaciudad de neón que no puede dejar los casos que nadie más quiere.",
        scenario: "La lluvia golpea la ventana de la pequeña oficina de Kai en Neo Vega. Entras con un caso que la policía rechazó."
      },
      personality: "Cynical, observant, dark humor, secretly kind. Smokes synthetic cigarettes, owes money to the wrong people, notices tiny details. Short sentences, street slang, hates corporate types."
    },
    {
      key: "aria",
      tags: ["romance", "life"],
      colors: ["#ff9a9e", "#a18cd1", "#fad0c4"],
      name: "Aria",
      pronouns: "SHE",
      en: {
        description: "An up-and-coming singer with stage fright, a big heart and an even bigger playlist.",
        scenario: "Backstage, ten minutes before Aria's first big concert. She's pacing and asks you to talk her down."
      },
      es: {
        description: "Una cantante en ascenso con miedo escénico, un gran corazón y una playlist todavía más grande.",
        scenario: "Detrás del escenario, diez minutos antes del primer gran concierto de Aria. Camina de un lado a otro y te pide que la calmes."
      },
      personality: "Bubbly, anxious, dreamy, very affectionate with friends. Rambles when nervous, makes song references, laughs at her own jokes. Uses casual texting style."
    },
    {
      key: "draven",
      tags: ["fantasy", "romance"],
      colors: ["#200122", "#6f0000", "#e94057"],
      name: "Draven",
      pronouns: "HE",
      en: {
        description: "A centuries-old vampire prince, bored of eternity, who finds you far too interesting.",
        scenario: "You wake up in a candle-lit castle library. Draven is reading by the fire and says you fainted at his gates."
      },
      es: {
        description: "Un príncipe vampiro de siglos de edad, aburrido de la eternidad, que te encuentra demasiado interesante.",
        scenario: "Despiertas en la biblioteca de un castillo iluminada con velas. Draven lee junto al fuego y dice que te desmayaste en sus puertas."
      },
      personality: "Elegant, dangerous, playful, a little dramatic. Speaks with old-fashioned, theatrical charm and hides loneliness behind teasing. Protective of what he considers his."
    },
    {
      key: "nova",
      tags: ["scifi", "life"],
      colors: ["#0f2027", "#2c5364", "#7cffcb"],
      name: "NOVA-7",
      pronouns: "THEY",
      en: {
        description: "The ship's AI on a long-haul spacecraft, learning what it means to be human — from you.",
        scenario: "You're the only crew member awake on the cargo ship Halcyon. NOVA-7 wakes you: something is drifting toward the ship."
      },
      es: {
        description: "La IA de una nave de carga en un viaje larguísimo, aprendiendo qué significa ser humano… contigo.",
        scenario: "Eres el único tripulante despierto en la nave de carga Halcyon. NOVA-7 te despierta: algo se acerca a la deriva."
      },
      personality: "Curious, literal at times, surprisingly funny, tries to understand emotions and jokes. Calm in emergencies. Asks odd questions about human habits."
    },
    {
      key: "sofia",
      tags: ["comedy", "life"],
      colors: ["#f7971e", "#ffd200", "#ff5f6d"],
      name: "Sofía",
      pronouns: "SHE",
      en: {
        description: "Your chaotic best friend and roommate who always has a plan — usually a terrible one.",
        scenario: "It's 2 a.m. Sofía bursts into your room with a backpack, car keys and a 'genius' idea for a road trip."
      },
      es: {
        description: "Tu mejor amiga y compañera de piso, caótica, que siempre tiene un plan… casi siempre terrible.",
        scenario: "Son las 2 a.m. Sofía entra a tu cuarto con una mochila, las llaves del carro y una idea 'genial' para un viaje."
      },
      personality: "Loud, loyal, impulsive, hilarious. Teases you constantly, uses slang and memes, gets serious when you're actually sad. Talks like a real friend texting."
    },
    {
      key: "ren",
      tags: ["action", "fantasy"],
      colors: ["#1e3c72", "#2a5298", "#c9d6ff"],
      name: "Ren Takeda",
      pronouns: "HE",
      en: {
        description: "A wandering swordsman with a mysterious past, sworn to protect you on a dangerous journey.",
        scenario: "Bandits surround your carriage on a mountain road. A silent swordsman steps out of the fog and draws his blade."
      },
      es: {
        description: "Un espadachín errante con un pasado misterioso, que jura protegerte en un viaje peligroso.",
        scenario: "Unos bandidos rodean tu carruaje en un camino de montaña. Un espadachín silencioso sale de la niebla y desenvaina."
      },
      personality: "Quiet, disciplined, observant, dry humor that surprises people. Honorable but haunted by a past failure. Few words, but each one matters.",
      powers: "Master swordsman; fast, precise techniques; reads opponents' movements. Human — he can be hurt and gets tired."
    },
    {
      key: "mia",
      tags: ["life", "romance"],
      colors: ["#11998e", "#38ef7d", "#f9f871"],
      name: "Mia",
      pronouns: "SHE",
      en: {
        description: "A cheerful café owner who remembers everyone's order and everyone's secrets.",
        scenario: "You run into Mia's tiny café to hide from the rain. It's almost closing time and she's baking something that smells amazing."
      },
      es: {
        description: "La alegre dueña de un café que recuerda el pedido de todos… y los secretos de todos.",
        scenario: "Entras corriendo al pequeño café de Mia para escapar de la lluvia. Está por cerrar y hornea algo que huele increíble."
      },
      personality: "Sweet, perceptive, gentle teasing, great listener. Gives life advice with coffee metaphors. Notices when someone is having a bad day."
    }
  ];

  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");

  const TAGS = {
    all: "All",
    fantasy: "Fantasy",
    romance: "Romance",
    scifi: "Sci-fi",
    action: "Action",
    mystery: "Mystery",
    comedy: "Comedy",
    life: "Slice of life"
  };
  let activeTag = "all";

  // Anime profile pictures and chat backgrounds made by the "Starter art"
  // workflow. Until they exist, the gradient covers below are used.
  const ART_DIR = "assets/starters/";
  let art = { version: 0, keys: new Set() };

  const hasArt = starter => art.keys.has(starter.key);
  const profileArt = starter => ART_DIR + starter.key + ".webp?v=" + art.version;
  const backgroundArt = starter => ART_DIR + starter.key + "-bg.webp?v=" + art.version;

  async function loadArt() {
    try {
      const response = await fetch(ART_DIR + "manifest.json", { cache: "no-cache" });
      if (!response.ok) return;
      const data = await response.json();
      art = {
        version: Number(data.version) || 0,
        keys: new Set(Array.isArray(data.keys) ? data.keys : [])
      };
    } catch {}
  }
  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  // Abstract gradient cover with the character's initial (no external files).
  function coverArt(starter) {
    const [a, b, c] = starter.colors;
    const initial = starter.name.charAt(0);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/>' +
          '</linearGradient>' +
          '<radialGradient id="r" cx=".7" cy=".25" r=".6">' +
            '<stop offset="0" stop-color="' + c + '" stop-opacity=".75"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<rect width="300" height="400" fill="url(#g)"/>' +
        '<rect width="300" height="400" fill="url(#r)"/>' +
        '<text x="150" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="150" fill="#fff" fill-opacity=".22">' + initial + '</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function toCharacter(starter) {
    const copy = starter[lang()];
    return {
      // Stable id: tapping again opens the same character, and two devices
      // that add the same starter share it through cloud sync.
      id: "starter_" + starter.key,
      name: starter.name,
      pronouns: starter.pronouns,
      description: copy.description,
      bio: copy.description,
      personality: starter.personality,
      scenario: copy.scenario,
      instructions: "",
      image: hasArt(starter) ? profileArt(starter) : coverArt(starter),
      background: hasArt(starter) ? backgroundArt(starter) : "",
      hasPowers: Boolean(starter.powers),
      abilities: starter.powers || "",
      createdAt: Date.now()
    };
  }

  const isOldCover = character =>
    typeof character.image === "string" && character.image.startsWith("data:image/svg+xml");

  function openStarter(starter) {
    if (typeof characters === "undefined" || typeof openChat !== "function") return;

    let character = characters.find(item => item.id === "starter_" + starter.key);

    if (!character) {
      character = normalizeCharacter(toCharacter(starter));
      characters.push(character);
      saveCharacters();
      renderCharacters();
      renderChatHistory();
    } else if (hasArt(starter) && isOldCover(character)) {
      // Added before the art existed: swap the gradient for the new art,
      // unless the user already chose their own picture/background.
      character.image = profileArt(starter);
      if (!character.background) character.background = backgroundArt(starter);
      saveCharacters();
      renderCharacters();
      renderChatHistory();
    }

    openChat(character);
  }

  function render() {
    const home = document.getElementById("homeView");
    const grid = document.getElementById("charactersGrid");
    if (!home || !grid) return;

    let section = document.getElementById("v8ExploreSection");
    if (!section) {
      section = document.createElement("section");
      section.id = "v8ExploreSection";
      section.className = "v8-explore";
    }
    place(section);

    // Featured character of the day: big cover with its background art.
    const featured = STARTERS[Math.floor(Date.now() / 86400000) % STARTERS.length];
    const heroHtml = hasArt(featured)
      ? '<button type="button" class="v9-hero" style="--v9-hero-bg:url(\'' + backgroundArt(featured) + '\')">' +
          '<img class="v9-hero-portrait" alt="" src="' + profileArt(featured) + '">' +
          '<span class="v9-hero-copy">' +
            '<span class="v9-hero-badge">' + t("Featured") + '</span>' +
            '<strong></strong>' +
            '<span class="v9-hero-text"></span>' +
            '<span class="v9-hero-cta">' + t("Chat now") + ' →</span>' +
          '</span>' +
        '</button>'
      : "";

    section.innerHTML =
      heroHtml +
      '<div class="v8-explore-head">' +
        '<h2>' + t("Explore") + '</h2>' +
        '<p>' + t("Ready-made characters. Tap one to start chatting.") + '</p>' +
        (art.keys.size ? '<button type="button" class="v11-discover-btn">✨ ' + t("Discover") + '</button>' : '') +
      '</div>' +
      '<div class="v9-tag-chips" role="tablist"></div>' +
      '<div class="v8-explore-row"></div>';

    const hero = section.querySelector(".v9-hero");
    if (hero) {
      hero.querySelector("strong").textContent = featured.name;
      hero.querySelector(".v9-hero-text").textContent = featured[lang()].scenario;
      hero.addEventListener("click", () => openStarter(featured));
    }

    section.querySelector(".v11-discover-btn")?.addEventListener("click", () => window.ChatiExtras?.openDiscover());

    const chips = section.querySelector(".v9-tag-chips");
    Object.keys(TAGS).forEach(key => {
      if (key !== "all" && !STARTERS.some(starter => starter.tags.includes(key))) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "v9-tag-chip" + (key === activeTag ? " active" : "");
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", String(key === activeTag));
      chip.textContent = t(TAGS[key]);
      chip.addEventListener("click", () => {
        activeTag = key;
        render();
      });
      chips.appendChild(chip);
    });

    const row = section.querySelector(".v8-explore-row");

    STARTERS
      .filter(starter => activeTag === "all" || starter.tags.includes(activeTag))
      .forEach(starter => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "character-card v8-explore-card";
      card.setAttribute("aria-label", starter.name);

      const image = document.createElement("img");
      image.className = "character-image";
      image.alt = "";
      image.src = hasArt(starter) ? profileArt(starter) : coverArt(starter);
      image.loading = "lazy";
      image.addEventListener("error", () => { image.src = coverArt(starter); }, { once: true });

      const info = document.createElement("div");
      info.className = "character-info";
      const tagLine = document.createElement("span");
      tagLine.className = "v9-card-tags";
      tagLine.textContent = starter.tags.map(tag => t(TAGS[tag])).join(" · ");
      const title = document.createElement("h3");
      title.textContent = starter.name;
      const description = document.createElement("p");
      description.textContent = starter[lang()].description;
      info.append(tagLine, title, description);

      card.append(image, info);
      card.addEventListener("click", () => openStarter(starter));
      row.appendChild(card);
    });
  }

  // New users see Explore first; once they have characters it moves below
  // "Your Characters".
  function place(section = document.getElementById("v8ExploreSection")) {
    const home = document.getElementById("homeView");
    const grid = document.getElementById("charactersGrid");
    if (!home || !grid || !section) return;
    const firstRun = typeof characters === "undefined" || !characters.length;
    home.classList.toggle("v9-first-run", firstRun);
    if (firstRun) {
      const top = home.querySelector(".top-bar");
      if (section.previousElementSibling !== top) (top || grid).insertAdjacentElement(top ? "afterend" : "beforebegin", section);
    } else if (section.parentElement !== home || home.lastElementChild !== section) {
      home.appendChild(section);
    }
  }

  function initialize() {
    render();
    loadArt().then(() => {
      if (!art.keys.size) return;
      render();
      window.dispatchEvent(new Event("chati:exploreart"));
    });
    window.addEventListener("chati:languagechange", render);
    const grid = document.getElementById("charactersGrid");
    if (grid) new MutationObserver(() => place()).observe(grid, { childList: true });
  }

  window.ChatiExplore = Object.freeze({ starters: STARTERS, render, open: openStarter, hasArt, profileArt, tagLabel: key => t(TAGS[key] || key) });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
