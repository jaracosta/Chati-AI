// CHATI-AI V8 — Chati, the assistant robot.
// A floating button on every screen opens a chat with Chati, who researches
// characters on the web, reads links and photos, drafts ready-to-use
// characters and explains how the app works.
(() => {
  "use strict";

  const STORAGE_KEY = "chatiAssistantHistoryV1";
  const WEB_KEY = "chatiAssistantWebV1";
  const MAX_STORED = 40;

  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  // Each copy gets its own gradient id: a hidden copy (the floating button
  // while the panel is open) would otherwise take the shared gradient with it.
  let robotCount = 0;
  const robot = () => ROBOT_TEMPLATE.replace(/v8ChatiGrad/g, "v8ChatiGrad" + (++robotCount));

  const ROBOT_TEMPLATE =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<defs><linearGradient id="v8ChatiGrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#9d8cff"/><stop offset="1" stop-color="#5b8cff"/>' +
      '</linearGradient></defs>' +
      '<line x1="32" y1="6" x2="32" y2="14" stroke="url(#v8ChatiGrad)" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="6" r="3.5" fill="#ffd36e"/>' +
      '<rect x="9" y="14" width="46" height="36" rx="14" fill="url(#v8ChatiGrad)"/>' +
      '<rect x="15" y="21" width="34" height="21" rx="9" fill="#141428"/>' +
      '<circle cx="25" cy="31.5" r="4" fill="#7cf3ff"/>' +
      '<circle cx="39" cy="31.5" r="4" fill="#7cf3ff"/>' +
      '<path d="M27 38.5c2.8 2 7.2 2 10 0" stroke="#7cf3ff" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<rect x="4" y="26" width="5" height="12" rx="2.5" fill="url(#v8ChatiGrad)"/>' +
      '<rect x="55" y="26" width="5" height="12" rx="2.5" fill="url(#v8ChatiGrad)"/>' +
      '<rect x="22" y="50" width="20" height="7" rx="3.5" fill="url(#v8ChatiGrad)"/>' +
    '</svg>';

  let messages = [];
  let busy = false;
  let panel = null;
  let fab = null;

  // ---------------------------------------------------------------------
  // Storage (photos stay in memory only; they are too big to keep)
  // ---------------------------------------------------------------------

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      messages = Array.isArray(saved) ? saved : [];
    } catch (_) {
      messages = [];
    }
  }

  function save() {
    try {
      const compact = messages.slice(-MAX_STORED).map(message => ({
        role: message.role,
        text: message.text,
        photoCount: (message.images || []).length || message.photoCount || 0,
        draft: message.draft || null,
        sources: message.sources || [],
        createdId: message.createdId || null
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch (_) {}
  }

  const webEnabled = () => {
    try {
      return localStorage.getItem(WEB_KEY) !== "off";
    } catch (_) {
      return true;
    }
  };

  // ---------------------------------------------------------------------
  // Text formatting (safe: everything is escaped first)
  // ---------------------------------------------------------------------

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function format(text) {
    let html = escapeHtml(text || "");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    html = html
      .split("\n")
      .map(line => /^\s*[-•]\s+/.test(line) ? "<span class=\"v8-chati-li\">" + line.replace(/^\s*[-•]\s+/, "") + "</span>" : line)
      .join("<br>");
    return html;
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_) {
      return url;
    }
  }

  // ---------------------------------------------------------------------
  // Photos
  // ---------------------------------------------------------------------

  function resizeImage(file, maxSide = 1280) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Invalid image"));
        image.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Photos shared in this session, newest last, for profile/background.
  function sessionPhotos() {
    return messages.flatMap(message => message.images || []);
  }

  // ---------------------------------------------------------------------
  // Creating the character in the app
  // ---------------------------------------------------------------------

  function createCharacter(draft, { avatar, background, edit }, messageIndex) {
    if (typeof characters === "undefined" || typeof normalizeCharacter !== "function") return;

    const character = normalizeCharacter({
      id: "chati_" + Date.now(),
      name: draft.name,
      pronouns: draft.pronouns,
      bio: draft.bio,
      description: draft.bio,
      image: avatar || "",
      background: background || "",
      personality: draft.personality,
      scenario: draft.scenario,
      instructions: draft.instructions,
      appearance: draft.appearance,
      exampleMessages: draft.exampleMessages,
      hasPowers: draft.hasPowers,
      powerSystem: draft.powerSystem,
      combatStyle: draft.combatStyle,
      abilities: draft.abilities,
      powerLimits: draft.powerLimits,
      createdAt: Date.now()
    });

    characters.push(character);
    saveCharacters();
    renderCharacters();
    if (typeof renderChatHistory === "function") renderChatHistory();

    // Remember it so the card shows "Created" instead of creating twice.
    if (messages[messageIndex]) messages[messageIndex].createdId = character.id;

    messages.push({
      role: "assistant",
      text: t("Done! I created") + " **" + character.name + "**. " +
        (edit ? t("You can adjust anything in the editor.") : t("Have fun chatting!"))
    });
    save();
    renderMessages();
    close();

    if (edit && typeof showCreateView === "function") {
      showCreateView(character);
    } else if (typeof openChat === "function") {
      openChat(character);
    }
  }

  function draftCard(draft, messageIndex) {
    const card = document.createElement("div");
    card.className = "v8-chati-draft";

    const photos = sessionPhotos();
    const photoOptions = photos.length
      ? '<option value="">' + escapeHtml(t("None")) + '</option>' +
        photos.map((_, index) => '<option value="' + index + '">' + escapeHtml(t("Photo")) + " " + (index + 1) + '</option>').join("")
      : "";

    const powers = draft.hasPowers && draft.abilities
      ? '<p><strong>' + escapeHtml(t("Abilities")) + ':</strong> ' + escapeHtml(draft.abilities) + '</p>'
      : "";

    card.innerHTML =
      '<div class="v8-chati-draft-head">' +
        '<span class="v8-chati-draft-badge">' + escapeHtml(t("Character ready")) + '</span>' +
        '<h4>' + escapeHtml(draft.name) + '</h4>' +
        '<p>' + escapeHtml(draft.bio) + '</p>' +
      '</div>' +
      '<details class="v8-chati-draft-more"><summary>' + escapeHtml(t("See details")) + '</summary>' +
        '<p><strong>' + escapeHtml(t("Personality & Backstory")) + ':</strong> ' + escapeHtml(draft.personality) + '</p>' +
        '<p><strong>' + escapeHtml(t("Physical Appearance")) + ':</strong> ' + escapeHtml(draft.appearance?.physical || "—") + '</p>' +
        '<p><strong>' + escapeHtml(t("Scenario")) + ':</strong> ' + escapeHtml(draft.scenario || "—") + '</p>' +
        powers +
      '</details>' +
      (photos.length
        ? '<div class="v8-chati-photo-pick">' +
            '<div class="v8-chati-thumbs">' + photos.map((src, index) =>
              '<figure><img src="' + src + '" alt=""><figcaption>' + (index + 1) + '</figcaption></figure>').join("") + '</div>' +
            '<label>' + escapeHtml(t("Profile picture")) + ' <select data-role="avatar">' + photoOptions + '</select></label>' +
            '<label>' + escapeHtml(t("Chat background")) + ' <select data-role="background">' + photoOptions + '</select></label>' +
          '</div>'
        : '<p class="v8-chati-hint">' + escapeHtml(t("Tip: send me a photo of the character to use it as the profile picture or background.")) + '</p>') +
      '<div class="v8-chati-draft-actions">' +
        '<button type="button" class="v8-chati-primary" data-action="chat">' + escapeHtml(t("Create & chat")) + '</button>' +
        '<button type="button" class="v8-chati-secondary" data-action="edit">' + escapeHtml(t("Create & edit")) + '</button>' +
      '</div>';

    const avatarSelect = card.querySelector('[data-role="avatar"]');
    const backgroundSelect = card.querySelector('[data-role="background"]');
    if (avatarSelect && photos.length) avatarSelect.value = "0";

    const createdId = messages[messageIndex]?.createdId;
    const existing = createdId && typeof characters !== "undefined"
      ? characters.find(item => String(item.id) === String(createdId))
      : null;

    if (existing) {
      card.classList.add("is-created");
      card.querySelector(".v8-chati-photo-pick, .v8-chati-hint")?.remove();
      card.querySelector(".v8-chati-draft-actions").innerHTML =
        '<span class="v8-chati-created">✓ ' + escapeHtml(t("Created")) + '</span>' +
        '<button type="button" class="v8-chati-secondary" data-action="open">' + escapeHtml(t("Open chat")) + '</button>';
    }

    card.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "open") {
        close();
        if (existing && typeof openChat === "function") openChat(existing);
        return;
      }
      if (existing) return;
      const pick = select => (select && select.value !== "" ? photos[Number(select.value)] : "");
      createCharacter(draft, {
        avatar: pick(avatarSelect),
        background: pick(backgroundSelect),
        edit: action === "edit"
      }, messageIndex);
    });

    return card;
  }

  // ---------------------------------------------------------------------
  // Panel UI
  // ---------------------------------------------------------------------

  function renderMessages() {
    if (!panel) return;
    const list = panel.querySelector(".v8-chati-messages");
    list.replaceChildren();

    if (!messages.length) {
      const welcome = document.createElement("div");
      welcome.className = "v8-chati-welcome";
      welcome.innerHTML =
        '<div class="v8-chati-welcome-bot">' + robot() + '</div>' +
        '<h3>' + escapeHtml(t("Hi! I'm Chati")) + '</h3>' +
        '<p>' + escapeHtml(t("Tell me a character from any anime, game, movie or book and I'll research it and build the bot for you. You can also send me photos, or ask me how the app works.")) + '</p>' +
        '<div class="v8-chati-chips">' +
          ["Make me a character from an anime or game", "Help me create an original character", "How does the app work?", "How do characters send me pictures?", "What is NSFW (18+)?"]
            .map(chip => '<button type="button" data-chip="' + escapeHtml(t(chip)) + '">' + escapeHtml(t(chip)) + '</button>').join("") +
        '</div>';
      welcome.addEventListener("click", event => {
        const chip = event.target.closest("[data-chip]")?.dataset.chip;
        if (!chip) return;
        const input = panel.querySelector(".v8-chati-input");
        input.value = chip;
        // Questions about the app are sent right away; the others are
        // starters the user finishes.
        if (/[?]$/.test(chip)) send();
        else input.focus();
      });
      list.appendChild(welcome);
      return;
    }

    messages.forEach((message, index) => {
      const row = document.createElement("div");
      row.className = "v8-chati-msg is-" + message.role;

      if (message.role === "assistant") {
        const avatar = document.createElement("span");
        avatar.className = "v8-chati-msg-avatar";
        avatar.innerHTML = robot();
        row.appendChild(avatar);
      }

      const bubble = document.createElement("div");
      bubble.className = "v8-chati-bubble";

      if (message.images?.length) {
        const gallery = document.createElement("div");
        gallery.className = "v8-chati-bubble-photos";
        message.images.forEach(src => {
          const image = document.createElement("img");
          image.src = src;
          image.alt = "";
          gallery.appendChild(image);
        });
        bubble.appendChild(gallery);
      } else if (message.photoCount) {
        const note = document.createElement("div");
        note.className = "v8-chati-photo-note";
        note.textContent = "📷 × " + message.photoCount;
        bubble.appendChild(note);
      }

      if (message.text) {
        const body = document.createElement("div");
        body.innerHTML = format(message.text);
        bubble.appendChild(body);
      }

      if (message.sources?.length) {
        const sources = document.createElement("div");
        sources.className = "v8-chati-sources";
        sources.innerHTML = escapeHtml(t("Sources")) + ": " + message.sources
          .map(source => '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title || hostOf(source.url)) + '</a>')
          .join(" · ");
        bubble.appendChild(sources);
      }

      row.appendChild(bubble);
      list.appendChild(row);

      if (message.draft) list.appendChild(draftCard(message.draft, index));
    });

    if (busy) {
      const typing = document.createElement("div");
      typing.className = "v8-chati-msg is-assistant is-typing";
      typing.innerHTML =
        '<span class="v8-chati-msg-avatar">' + robot() + '</span>' +
        '<div class="v8-chati-bubble"><span class="v8-chati-dots"><i></i><i></i><i></i></span> ' +
        escapeHtml(webEnabled() ? t("Researching…") : t("Thinking…")) + '</div>';
      list.appendChild(typing);
    }

    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }

  let pendingPhotos = [];

  function renderPendingPhotos() {
    const tray = panel.querySelector(".v8-chati-pending");
    tray.replaceChildren();
    tray.hidden = !pendingPhotos.length;
    pendingPhotos.forEach((src, index) => {
      const item = document.createElement("div");
      item.className = "v8-chati-pending-item";
      item.innerHTML = '<img src="' + src + '" alt=""><button type="button" aria-label="' + escapeHtml(t("Remove")) + '">×</button>';
      item.querySelector("button").addEventListener("click", () => {
        pendingPhotos.splice(index, 1);
        renderPendingPhotos();
      });
      tray.appendChild(item);
    });
  }

  async function send() {
    if (busy) return;
    const input = panel.querySelector(".v8-chati-input");
    const text = input.value.trim();
    if (!text && !pendingPhotos.length) return;

    messages.push({ role: "user", text, images: pendingPhotos.slice() });
    pendingPhotos = [];
    input.value = "";
    autoGrow(input);
    renderPendingPhotos();
    busy = true;
    renderMessages();
    save();

    try {
      const response = await fetch("/api/chati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          web: webEnabled(),
          lang: window.ChatiI18n?.lang || "en",
          matureContent: typeof isMatureContentEnabled === "function" && isMatureContentEnabled() === true,
          messages: messages.slice(-30).map(message => ({
            role: message.role,
            text: message.draft
              ? (message.text + "\n[I proposed the character " + message.draft.name + ".]").trim()
              : message.text,
            images: message.images || []
          }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "HTTP " + response.status);

      messages.push({
        role: "assistant",
        text: data.reply || "",
        draft: data.draft || null,
        sources: data.sources || []
      });
    } catch (error) {
      messages.push({
        role: "assistant",
        text: "⚠️ " + (error?.message || t("Chati couldn't answer right now. Please try again."))
      });
    } finally {
      busy = false;
      save();
      renderMessages();
    }
  }

  function autoGrow(input) {
    input.style.height = "auto";
    input.style.height = Math.min(140, input.scrollHeight) + "px";
  }

  function buildPanel() {
    panel = document.createElement("section");
    panel.className = "v8-chati-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chati");
    panel.hidden = true;
    panel.innerHTML =
      '<header class="v8-chati-header">' +
        '<span class="v8-chati-header-bot">' + robot() + '</span>' +
        '<div class="v8-chati-title"><strong>Chati</strong><small>' + escapeHtml(t("Your character-building assistant")) + '</small></div>' +
        '<button type="button" class="v8-chati-icon-btn" data-action="new" title="' + escapeHtml(t("New conversation")) + '" aria-label="' + escapeHtml(t("New conversation")) + '">' +
          '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
        '<button type="button" class="v8-chati-icon-btn" data-action="close" title="' + escapeHtml(t("Close")) + '" aria-label="' + escapeHtml(t("Close")) + '">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</header>' +
      '<div class="v8-chati-messages"></div>' +
      '<div class="v8-chati-pending" hidden></div>' +
      '<form class="v8-chati-composer">' +
        '<button type="button" class="v8-chati-icon-btn" data-action="photo" title="' + escapeHtml(t("Send photo")) + '" aria-label="' + escapeHtml(t("Send photo")) + '">' +
          '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><circle cx="9" cy="10.5" r="1.8"/><path d="m4.5 17 5-4.5 3.5 3 2.5-2 4 3.5"/></svg></button>' +
        '<button type="button" class="v8-chati-icon-btn v8-chati-web" data-action="web" aria-pressed="true">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5Z"/></svg></button>' +
        '<textarea class="v8-chati-input" rows="1" placeholder="' + escapeHtml(t("Ask Chati…")) + '"></textarea>' +
        '<button type="submit" class="v8-chati-send" aria-label="' + escapeHtml(t("Send")) + '">' +
          '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>' +
        '<input type="file" accept="image/*" multiple hidden>' +
      '</form>';

    document.body.appendChild(panel);

    const input = panel.querySelector(".v8-chati-input");
    const fileInput = panel.querySelector('input[type="file"]');
    const webButton = panel.querySelector('[data-action="web"]');

    const syncWeb = () => {
      const on = webEnabled();
      webButton.setAttribute("aria-pressed", on ? "true" : "false");
      webButton.title = on ? t("Web research: on") : t("Web research: off");
      webButton.setAttribute("aria-label", webButton.title);
    };
    syncWeb();

    panel.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "close") close();
      if (action === "new") {
        messages = [];
        pendingPhotos = [];
        save();
        renderPendingPhotos();
        renderMessages();
      }
      if (action === "photo") fileInput.click();
      if (action === "web") {
        try {
          localStorage.setItem(WEB_KEY, webEnabled() ? "off" : "on");
        } catch (_) {}
        syncWeb();
      }
    });

    fileInput.addEventListener("change", async () => {
      const files = [...fileInput.files].slice(0, 4);
      fileInput.value = "";
      for (const file of files) {
        try {
          pendingPhotos.push(await resizeImage(file));
        } catch (_) {}
      }
      pendingPhotos = pendingPhotos.slice(0, 4);
      renderPendingPhotos();
    });

    input.addEventListener("input", () => autoGrow(input));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing && window.matchMedia("(hover: hover)").matches) {
        event.preventDefault();
        send();
      }
    });

    panel.querySelector(".v8-chati-composer").addEventListener("submit", event => {
      event.preventDefault();
      send();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) close();
    });
  }

  function open() {
    if (!panel) buildPanel();
    panel.hidden = false;
    document.body.classList.add("v8-chati-open");
    renderMessages();
    requestAnimationFrame(() => {
      if (window.matchMedia("(hover: hover)").matches) panel.querySelector(".v8-chati-input")?.focus();
    });
  }

  function close() {
    if (!panel) return;
    panel.hidden = true;
    document.body.classList.remove("v8-chati-open");
  }

  function buildFab() {
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "v8-chati-fab";
    fab.title = "Chati";
    fab.setAttribute("aria-label", t("Open Chati, your assistant"));
    fab.innerHTML = robot();
    fab.addEventListener("click", () => (panel && !panel.hidden ? close() : open()));
    document.body.appendChild(fab);
  }

  function initialize() {
    load();
    buildFab();
  }

  window.ChatiAssistant = Object.freeze({ open, close });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
