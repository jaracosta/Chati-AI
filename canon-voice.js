// CHATI-AI V13 — canon voice. When a chat with an existing character opens,
// ask the server for their "canon voice card" (how they really talk in their
// story, written once by a stronger model with web search), keep it in this
// browser, and send it with every message so the roleplay model talks like
// the real character. Original characters get no card.
(() => {
  "use strict";

  const STORE_KEY = "chatiCanonV1";
  const ORIGINAL = "ORIGINAL";
  const RETRY_AFTER = 10 * 60 * 1000;
  const t = text => window.ChatiI18n?.t?.(text) ?? text;
  const es = () => window.ChatiI18n?.lang === "es";

  // Must match canonFingerprint() in canon-profile.js.
  function fingerprint(character = {}) {
    const text = [
      character.name,
      String(character.bio || character.description || "").slice(0, 600),
      String(character.personality || "").slice(0, 600)
    ]
      .map(part => String(part || "").trim().toLowerCase().replace(/\s+/g, " "))
      .join("|");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch { return {}; }
  }

  function writeStore(store) {
    const keys = Object.keys(store);
    // Keep the newest 150 cards.
    if (keys.length > 150) {
      keys.sort((a, b) => (store[a].at || 0) - (store[b].at || 0)).slice(0, keys.length - 150).forEach(key => delete store[key]);
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }

  const failedAt = new Map();
  const pending = new Map();

  function stored(character) {
    return readStore()[fingerprint(character)]?.card;
  }

  function isGroup(character) {
    return Boolean(character?.isGroup) || (typeof isGroupCharacter === "function" && isGroupCharacter(character));
  }

  function fetchCard(character) {
    if (!character?.name || isGroup(character)) return Promise.resolve("");
    const key = fingerprint(character);
    const known = readStore()[key]?.card;
    if (known !== undefined) return Promise.resolve(known === ORIGINAL ? "" : known);
    if (pending.has(key)) return pending.get(key);
    if (Date.now() - (failedAt.get(key) || 0) < RETRY_AFTER) return Promise.resolve("");

    const job = fetch("/api/canon-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: {
          name: character.name,
          bio: character.bio || character.description || "",
          personality: character.personality || "",
          scenario: character.scenario || ""
        }
      })
    })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status))))
      .then(data => {
        const card = String(data?.card || "");
        if (!card) {
          failedAt.set(key, Date.now());
          return "";
        }
        const store = readStore();
        store[key] = { card, name: character.name, at: Date.now() };
        writeStore(store);
        if (card !== ORIGINAL) announce(character);
        return card === ORIGINAL ? "" : card;
      })
      .catch(() => {
        failedAt.set(key, Date.now());
        return "";
      })
      .finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  }

  function announce(character) {
    const message = es()
      ? `📜 ${character.name} ahora habla como en su historia original.`
      : `📜 ${character.name} now talks like in their original story.`;
    window.ChatiToast?.(message, "info");
  }

  // Used by requestCharacterReply() in script.js. Waits a little for a card
  // that is still being written, so even the first reply can use it.
  async function cardFor(character, waitMs = 9000) {
    if (!character?.name || isGroup(character)) return "";
    const known = stored(character);
    if (known !== undefined) return known === ORIGINAL ? "" : known;
    const job = fetchCard(character);
    const timeout = new Promise(resolve => setTimeout(() => resolve(""), waitMs));
    return Promise.race([job, timeout]);
  }

  function prefetchCurrent() {
    if (typeof currentCharacter === "undefined" || !currentCharacter) return;
    if (isGroup(currentCharacter)) {
      (currentCharacter.memberIds || []).forEach(id => {
        const member = typeof getCharacterById === "function" ? getCharacterById(id) : null;
        if (member) fetchCard(member);
      });
      return;
    }
    fetchCard(currentCharacter);
  }

  // ---------------------------------------------------------------------
  // Viewer: "📜 Canon voice" in the ✨ menu
  // ---------------------------------------------------------------------
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function formatCard(card) {
    return escapeHtml(card)
      .replace(/^([A-Z][A-Z ()]+):/gm, '<strong class="v13-canon-label">$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function close() {
    document.getElementById("v13CanonSheet")?.remove();
  }

  async function open() {
    close();
    const character = typeof currentCharacter !== "undefined" ? currentCharacter : null;
    if (!character) return;
    const sheet = document.createElement("div");
    sheet.id = "v13CanonSheet";
    sheet.className = "v13-canon";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.innerHTML =
      '<div class="v13-canon-panel">' +
      '<div class="v13-canon-head"><span>📜 ' + escapeHtml(t("Canon voice")) + " · " + escapeHtml(character.name) + '</span><button type="button" class="v13-canon-close" aria-label="' + escapeHtml(t("Close")) + '">✕</button></div>' +
      '<div class="v13-canon-body"><p class="v13-canon-muted">' + escapeHtml(t("Studying the character…")) + "</p></div>" +
      '<div class="v13-canon-foot"><button type="button" class="v13-canon-refresh">↻ ' + escapeHtml(t("Study again")) + "</button></div>" +
      "</div>";
    document.body.appendChild(sheet);
    sheet.addEventListener("click", event => { if (event.target === sheet) close(); });
    sheet.querySelector(".v13-canon-close").addEventListener("click", close);
    sheet.querySelector(".v13-canon-refresh").addEventListener("click", () => {
      const store = readStore();
      delete store[fingerprint(character)];
      writeStore(store);
      failedAt.delete(fingerprint(character));
      open();
    });

    const body = sheet.querySelector(".v13-canon-body");
    if (isGroup(character)) {
      body.innerHTML = '<p class="v13-canon-muted">' + escapeHtml(t("Each character in the group uses their own canon voice.")) + "</p>";
      return;
    }
    const card = await fetchCard(character);
    if (!sheet.isConnected) return;
    const known = stored(character);
    body.innerHTML = card
      ? formatCard(card)
      : '<p class="v13-canon-muted">' + escapeHtml(t(known === ORIGINAL
          ? "This looks like an original character, so they follow the profile you wrote."
          : "Couldn't study this character right now. Try again in a moment.")) + "</p>";
  }

  function initialize() {
    window.ChatiCanon = { cardFor, prefetch: fetchCard, open, fingerprint };
    const messages = document.getElementById("messages");
    let timer = 0;
    let lastKey = "";
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const key = typeof currentCharacter !== "undefined" && currentCharacter ? String(currentCharacter.id) + ":" + fingerprint(currentCharacter) : "";
        if (!key || key === lastKey) return;
        lastKey = key;
        prefetchCurrent();
      }, 300);
    };
    if (messages) new MutationObserver(check).observe(messages, { childList: true });
    check();
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
