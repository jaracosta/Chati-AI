// CHATI-AI V9 — visual polish: chat welcome card with quick starts, a visible
// image button, character avatars beside replies, popular characters in the
// empty desktop chat list, and the Chati robot as the app logo.
(() => {
  "use strict";

  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");
  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  const isGroup = character =>
    typeof isGroupCharacter === "function" ? isGroupCharacter(character) : Boolean(character?.isGroup);

  function sendText(text) {
    const input = document.getElementById("messageInput");
    const form = document.getElementById("chatForm");
    if (!input || !form) return;
    input.value = text;
    form.requestSubmit();
  }

  // ---------------------------------------------------------------------
  // 3. New chat: scenario card + quick starts
  // ---------------------------------------------------------------------
  function decorateEmptyChat() {
    const empty = document.querySelector("#messages .chat-empty");
    if (!empty || empty.querySelector(".v9-starts") || typeof currentCharacter === "undefined" || !currentCharacter) return;
    const character = currentCharacter;
    const group = isGroup(character);

    const scenario = String(character.scenario || "").trim();
    if (scenario) {
      const card = document.createElement("div");
      card.className = "v9-scenario";
      const label = document.createElement("span");
      label.className = "v9-scenario-label";
      label.textContent = "📖 " + t("The story so far");
      const text = document.createElement("p");
      text.textContent = scenario.replace(/\{\{user\}\}/gi, lang() === "es" ? "tú" : "you");
      card.append(label, text);
      empty.appendChild(card);
    }

    const name = character.name || "";
    const starts = [
      {
        label: "👋 " + t("Say hi"),
        run: () => sendText(lang() === "es" ? "**te acercas y saludas** Hola 👋" : "**walks up and waves** Hi 👋")
      },
      !group && window.ChatiImages && {
        label: "📸 " + t("Ask for a photo"),
        run: () => window.ChatiImages.createImage(lang() === "es" ? "Crea una imagen de ti" : "Create an image of yourself")
      },
      {
        label: "🎲 " + t("Surprise me"),
        run: () => sendText(lang() === "es"
          ? "**te quedas en silencio, esperando a ver qué hace " + name + "**"
          : "**stays quiet, waiting to see what " + name + " does**")
      }
    ].filter(Boolean);

    const row = document.createElement("div");
    row.className = "v9-starts";
    starts.forEach(start => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "v9-start-chip";
      button.textContent = start.label;
      button.addEventListener("click", start.run);
      row.appendChild(button);
    });
    empty.appendChild(row);
  }

  // ---------------------------------------------------------------------
  // 4. Visible image button + 7. avatar beside character replies
  // ---------------------------------------------------------------------
  function ensureImageButton() {
    const row = document.querySelector("#chatForm .chat-input-row");
    const input = document.getElementById("messageInput");
    if (!row || !input) return null;
    let button = document.getElementById("v9ImageBtn");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "v9ImageBtn";
      button.className = "v9-image-btn";
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<rect x="3" y="5" width="18" height="15" rx="4"></rect>' +
          '<circle cx="12" cy="12.5" r="3.6"></circle>' +
          '<path d="M8.5 5l1.4-2h4.2l1.4 2"></path>' +
        '</svg>';
      button.addEventListener("click", () => window.ChatiImages?.openPrompt());
      input.insertAdjacentElement("beforebegin", button);
    }
    const label = t("Create image");
    button.title = label;
    button.setAttribute("aria-label", label);
    return button;
  }

  function syncChat() {
    const messages = document.getElementById("messages");
    if (!messages || typeof currentCharacter === "undefined") return;
    const character = currentCharacter;
    const group = !character || isGroup(character);

    const button = ensureImageButton();
    if (button) button.hidden = group || !window.ChatiImages;

    messages.classList.toggle("v9-solo", !group);
    const image = !group && typeof character.image === "string" && character.image ? character.image : "";
    const value = image ? 'url("' + image.replace(/"/g, '\\"') + '")' : "none";
    if (messages.style.getPropertyValue("--v9-avatar") !== value) messages.style.setProperty("--v9-avatar", value);

    decorateEmptyChat();
  }

  // ---------------------------------------------------------------------
  // 9. Desktop: popular characters when the chat list is empty
  // ---------------------------------------------------------------------
  function decorateHistory() {
    const list = document.getElementById("chatHistoryList");
    const explore = window.ChatiExplore;
    if (!list || !explore || !list.querySelector(".history-empty") || list.querySelector(".v9-popular")) return;

    const box = document.createElement("div");
    box.className = "v9-popular";
    const title = document.createElement("span");
    title.className = "v9-popular-title";
    title.textContent = t("Popular characters");
    box.appendChild(title);

    explore.starters.slice(0, 5).forEach(starter => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "v9-popular-item";
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      if (explore.hasArt?.(starter)) img.src = explore.profileArt(starter);
      else img.hidden = true;
      const text = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = starter.name;
      const desc = document.createElement("small");
      desc.textContent = starter[lang()].description;
      text.append(name, desc);
      item.append(img, text);
      item.addEventListener("click", () => explore.open(starter));
      box.appendChild(item);
    });
    list.appendChild(box);
  }

  // ---------------------------------------------------------------------
  // 10. Chati robot as the app logo
  // ---------------------------------------------------------------------
  function swapLogo() {
    const old = document.querySelector(".sidebar-shape-logo-svg");
    if (!old || old.parentElement.querySelector(".v9-logo")) return;
    const logo = document.createElement("span");
    logo.className = "v9-logo";
    logo.setAttribute("aria-hidden", "true");
    logo.innerHTML =
      '<svg viewBox="0 0 64 64">' +
        '<defs><linearGradient id="v9LogoGrad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#6366f1"/>' +
        '</linearGradient></defs>' +
        '<line x1="32" y1="6" x2="32" y2="14" stroke="#a78bfa" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="32" cy="6" r="3.2" fill="#fbbf24"/>' +
        '<rect x="10" y="14" width="44" height="36" rx="13" fill="url(#v9LogoGrad)"/>' +
        '<rect x="16" y="21" width="32" height="20" rx="9" fill="#141428"/>' +
        '<circle cx="25" cy="31" r="3.6" fill="#67e8f9"/>' +
        '<circle cx="39" cy="31" r="3.6" fill="#67e8f9"/>' +
        '<path d="M27 37.5q5 3 10 0" stroke="#67e8f9" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        '<rect x="5" y="27" width="5" height="10" rx="2.5" fill="url(#v9LogoGrad)"/>' +
        '<rect x="54" y="27" width="5" height="10" rx="2.5" fill="url(#v9LogoGrad)"/>' +
      '</svg>';
    old.insertAdjacentElement("afterend", logo);
    old.parentElement.classList.add("v9-has-logo");
  }

  function initialize() {
    document.documentElement.classList.add("v9");
    swapLogo();
    syncChat();
    decorateHistory();

    const messages = document.getElementById("messages");
    if (messages) new MutationObserver(syncChat).observe(messages, { childList: true });
    const history = document.getElementById("chatHistoryList");
    if (history) new MutationObserver(decorateHistory).observe(history, { childList: true });
    const refreshPopular = () => {
      document.querySelectorAll(".v9-popular").forEach(node => node.remove());
      decorateHistory();
    };
    window.addEventListener("chati:exploreart", refreshPopular);
    window.addEventListener("chati:languagechange", () => {
      refreshPopular();
      ensureImageButton();
    });

    // Chat titles come from the first message: drop the ** action marks.
    if (typeof makeChatTitle === "function" && !makeChatTitle.v9) {
      const original = makeChatTitle;
      const cleaned = text => original(String(text || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim());
      cleaned.v9 = true;
      window.makeChatTitle = cleaned;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
