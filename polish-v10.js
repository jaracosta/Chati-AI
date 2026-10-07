// CHATI-AI V10 — more polish (the launch screen robot is HTML/CSS): profile cover with
// stats, "last chat" badges on your characters, full-screen image viewer,
// floating toasts instead of grey system rows, and the Chati robot in
// empty states.
(() => {
  "use strict";

  const ROBOT = "assets/icons/favicon.svg";
  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");
  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  // ---------------------------------------------------------------------
  // 8. Toasts
  // ---------------------------------------------------------------------
  function toastHost() {
    let host = document.getElementById("v10Toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "v10Toasts";
      host.className = "v10-toasts";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(text, kind) {
    const message = t(String(text || ""));
    const type = kind || (/(could ?n.t|couldn|no se pudo|error|fail|bloque|block)/i.test(message) ? "error" : "info");
    const item = document.createElement("div");
    item.className = "v10-toast v10-toast-" + type;
    const icon = document.createElement("img");
    icon.src = ROBOT;
    icon.alt = "";
    const body = document.createElement("span");
    body.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", t("Close"));
    close.textContent = "×";
    item.append(icon, body, close);

    const dismiss = () => {
      item.classList.add("v10-toast-out");
      setTimeout(() => item.remove(), 300);
    };
    close.addEventListener("click", dismiss);
    setTimeout(dismiss, type === "error" ? 6500 : 4000);

    const host = toastHost();
    host.appendChild(item);
    while (host.children.length > 3) host.firstElementChild.remove();
  }

  // ---------------------------------------------------------------------
  // 7. Full-screen image viewer
  // ---------------------------------------------------------------------
  function openViewer(src) {
    closeViewer();
    const overlay = document.createElement("div");
    overlay.id = "v10Viewer";
    overlay.className = "v10-viewer";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const image = document.createElement("img");
    image.src = src;
    image.alt = "";

    const bar = document.createElement("div");
    bar.className = "v10-viewer-bar";
    const download = document.createElement("a");
    download.href = src;
    download.download = "chati-ai-image.jpg";
    download.textContent = "⬇ " + t("Download");
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "✕ " + t("Close");
    close.addEventListener("click", closeViewer);
    bar.append(download, close);

    overlay.append(image, bar);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeViewer();
    });
    document.body.appendChild(overlay);
    close.focus();
  }

  function closeViewer() {
    document.getElementById("v10Viewer")?.remove();
  }

  // ---------------------------------------------------------------------
  // 4. Profile cover + stats
  // ---------------------------------------------------------------------
  function stats() {
    const list = typeof characters !== "undefined" && Array.isArray(characters) ? characters : [];
    let chats = 0;
    let messages = 0;
    list.forEach(character => {
      try {
        const own = typeof getCharacterChats === "function" ? getCharacterChats(character.id) : [];
        chats += own.length;
        own.forEach(chat => { messages += (chat.messages || []).filter(m => m.sender === "user").length; });
      } catch {}
    });
    return { characters: list.filter(c => !c.isGroup).length, chats, messages };
  }

  function decorateProfile() {
    const panel = document.getElementById("v6ProfilePanel");
    const head = panel?.querySelector(".v6-panel-head");
    if (!head || panel.querySelector(".v10-profile-stats")) return;
    const data = stats();
    const row = document.createElement("div");
    row.className = "v10-profile-stats";
    [
      [data.characters, t("Characters")],
      [data.chats, t("Chats")],
      [data.messages, t("Messages sent")]
    ].forEach(([value, label]) => {
      const cell = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = Number(value).toLocaleString(lang());
      const small = document.createElement("small");
      small.textContent = label;
      cell.append(strong, small);
      row.appendChild(cell);
    });
    head.insertAdjacentElement("afterend", row);
  }

  // ---------------------------------------------------------------------
  // 5. "Last chat" badges on your characters
  // ---------------------------------------------------------------------
  function ago(time) {
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    const es = lang() === "es";
    if (minutes < 1) return es ? "ahora" : "now";
    if (minutes < 60) return es ? `hace ${minutes} min` : `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return es ? `hace ${hours} h` : `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return es ? `hace ${days} d` : `${days}d ago`;
    return "";
  }

  function lastChatTime(character) {
    try {
      const own = typeof getCharacterChats === "function" ? getCharacterChats(character.id) : [];
      let latest = 0;
      own.forEach(chat => {
        if (!(chat.messages || []).length) return;
        const stamp = Date.parse(chat.updatedAt) || Number(chat.updatedAt) || 0;
        const lastMessage = chat.messages[chat.messages.length - 1];
        latest = Math.max(latest, stamp, Number(lastMessage?.time) || 0);
      });
      return latest;
    } catch {
      return 0;
    }
  }

  let badgeTimer = 0;
  function decorateCards() {
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      const grid = document.getElementById("charactersGrid");
      if (!grid || typeof characters === "undefined") return;
      const byName = new Map();
      characters.forEach(character => {
        const key = String(character.name || "").trim();
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(character);
      });
      const used = new Map();
      grid.querySelectorAll(".character-card").forEach(card => {
        card.querySelector(".v10-last-chat")?.remove();
        const name = card.querySelector(".character-info h3")?.textContent.trim() || "";
        const index = used.get(name) || 0;
        used.set(name, index + 1);
        const character = byName.get(name)?.[index];
        if (!character) return;
        const time = lastChatTime(character);
        const label = time ? ago(time) : "";
        if (!label) return;
        const badge = document.createElement("span");
        badge.className = "v10-last-chat";
        badge.textContent = "💬 " + label;
        card.appendChild(badge);
      });
    }, 60);
  }

  // ---------------------------------------------------------------------
  // 10. Robot in empty states
  // ---------------------------------------------------------------------
  function decorateEmptyStates() {
    const icon = document.querySelector("#emptyState .empty-icon");
    if (icon && !icon.querySelector(".v10-robot")) {
      icon.innerHTML = '<img class="v10-robot" alt="" src="' + ROBOT + '">';
    }
    const mark = document.querySelector(".v6-signed-out-mark");
    if (mark && !mark.querySelector(".v10-robot")) {
      mark.innerHTML = '<img class="v10-robot" alt="" src="' + ROBOT + '">';
    }
  }

  function initialize() {
    document.documentElement.classList.add("v10");

    if (typeof addSystemMessage === "function" && !addSystemMessage.v10) {
      const replacement = text => toast(text);
      replacement.v10 = true;
      window.addSystemMessage = replacement;
    }
    window.ChatiToast = toast;
    window.ChatiViewer = openViewer;

    document.addEventListener("click", event => {
      const image = event.target.closest?.("#messages .message-attachment.image img, #messages .message-attachment img");
      if (image?.src) {
        event.preventDefault();
        openViewer(image.src);
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeViewer();
    });

    decorateEmptyStates();
    decorateCards();
    const grid = document.getElementById("charactersGrid");
    if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });

    // Streaming replies change #messages on every frame; that is not what
    // these decorations care about, so skip it and debounce the rest.
    const messagesBox = document.getElementById("messages");
    let timer = 0;
    new MutationObserver(records => {
      if (messagesBox && records.every(record => messagesBox.contains(record.target))) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        decorateProfile();
        decorateEmptyStates();
      }, 200);
    }).observe(document.body, { childList: true, subtree: true });

    window.addEventListener("chati:languagechange", decorateCards);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
