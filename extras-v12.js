// CHATI-AI V12:
//  - Visual novel mode (full-screen scene, big character, typewriter text)
//  - Seasonal themes (Halloween, winter holidays, Valentine's) by date
//  - Photo album (every picture your characters sent you)
//  - Your week recap (shareable story card)
//  - Surprise crossover (two of your characters meet in one scene)
//  - On phones, one ✨ menu groups the chat extras (scene, card, timeline, album)
(() => {
  "use strict";

  const ROBOT = "assets/icons/favicon.svg";
  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");
  const es = () => lang() === "es";
  const t = text => window.ChatiI18n?.t?.(text) ?? text;
  const toast = (text, kind) => window.ChatiToast?.(text, kind);
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plain = text => String(text || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  const current = () => (typeof currentCharacter !== "undefined" ? currentCharacter : null);
  const isGroup = c => (typeof isGroupCharacter === "function" ? isGroupCharacter(c) : Boolean(c?.isGroup));
  const allCharacters = () => (typeof characters !== "undefined" && Array.isArray(characters) ? characters : []);
  const chatsOf = c => {
    try { return typeof getCharacterChats === "function" && c ? getCharacterChats(c.id) : []; } catch { return []; }
  };
  const textOf = message => {
    try {
      return typeof getMessageText === "function" ? getMessageText(normalizeMessage(message)) : String(message.text || "");
    } catch {
      return String(message?.text || "");
    }
  };
  const actionsToHtml = text => esc(text).replace(/\*\*([^*]+)\*\*/g, "<em>$1</em>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
  const pref = (key, fallback = true) => {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === "1"; } catch { return fallback; }
  };
  const setPref = (key, value) => { try { localStorage.setItem(key, value ? "1" : "0"); } catch {} };

  function modal(className, html) {
    const overlay = document.createElement("div");
    overlay.className = "v11-modal " + (className || "");
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = event => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-close]")) close();
    });
    return { overlay, close };
  }

  // =====================================================================
  // Visual novel mode
  // =====================================================================
  const vn = { root: null, lines: [], index: 0, timer: 0, typing: false, full: "" };

  function vnLines() {
    const chat = typeof getCurrentChat === "function" ? getCurrentChat() : null;
    const character = current();
    return (chat?.messages || [])
      .filter(message => message.sender !== "system")
      .map(message => ({
        id: message.id,
        user: message.sender === "user",
        name: message.sender === "user" ? t("You") : character?.name || "",
        text: textOf(message),
        image: message.attachment?.type === "image" ? message.attachment.dataUrl : ""
      }));
  }

  function vnShow(index, animate = true) {
    if (!vn.root) return;
    const lines = vn.lines;
    const box = vn.root.querySelector(".v12-vn-text");
    const name = vn.root.querySelector(".v12-vn-name");
    const counter = vn.root.querySelector(".v12-vn-count");
    const picture = vn.root.querySelector(".v12-vn-picture");
    clearInterval(vn.timer);

    if (!lines.length) {
      const character = current();
      name.textContent = character?.name || "";
      box.innerHTML = '<span class="v12-vn-hint">' + esc(plain(character?.scenario) || t("Write something to begin the scene.")) + "</span>";
      counter.textContent = "";
      picture.hidden = true;
      return;
    }

    vn.index = Math.max(0, Math.min(index, lines.length - 1));
    const line = lines[vn.index];
    vn.root.classList.toggle("v12-vn-user", line.user);
    name.textContent = line.name;
    counter.textContent = vn.index + 1 + " / " + lines.length;
    picture.hidden = !line.image;
    if (line.image) picture.src = line.image;

    const html = actionsToHtml(line.text);
    if (!animate || reducedMotion()) {
      box.innerHTML = html;
      vn.typing = false;
      return;
    }
    // Typewriter: reveal the text node by node, character by character.
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const total = holder.textContent.length;
    let shown = 0;
    vn.typing = true;
    const step = () => {
      shown = Math.min(total, shown + 2);
      box.innerHTML = "";
      let left = shown;
      const copy = node => {
        if (left <= 0) return null;
        if (node.nodeType === Node.TEXT_NODE) {
          const part = node.textContent.slice(0, left);
          left -= part.length;
          return document.createTextNode(part);
        }
        const clone = node.cloneNode(false);
        node.childNodes.forEach(child => {
          const piece = copy(child);
          if (piece) clone.appendChild(piece);
        });
        return clone;
      };
      holder.childNodes.forEach(child => {
        const piece = copy(child);
        if (piece) box.appendChild(piece);
      });
      if (shown >= total) {
        clearInterval(vn.timer);
        vn.typing = false;
      }
    };
    vn.timer = setInterval(step, 18);
    step();
  }

  function vnAdvance(delta) {
    if (vn.typing && delta > 0) {
      clearInterval(vn.timer);
      vn.typing = false;
      vn.root.querySelector(".v12-vn-text").innerHTML = actionsToHtml(vn.lines[vn.index]?.text || "");
      return;
    }
    if (delta > 0 && vn.index >= vn.lines.length - 1) return;
    vnShow(vn.index + delta);
  }

  let vnRefreshTimer = 0;
  function vnRefresh() {
    if (!vn.root) return;
    clearTimeout(vnRefreshTimer);
    vnRefreshTimer = setTimeout(() => {
      const busy = typeof isSending !== "undefined" && isSending;
      vn.root.classList.toggle("v12-vn-busy", busy);
      const lines = vnLines();
      const grew = lines.length > vn.lines.length;
      const lastChanged = lines.length && vn.lines.length && lines[lines.length - 1].text !== vn.lines[vn.lines.length - 1]?.text;
      vn.lines = lines;
      if (!busy && (grew || lastChanged)) vnShow(lines.length - 1);
      else if (busy && grew && lines[lines.length - 1]?.user) vnShow(lines.length - 1, false);
    }, 500);
  }

  function openVN() {
    const character = current();
    if (!character || vn.root) return;
    const background = character.background || character.image || "";
    const root = document.createElement("div");
    root.className = "v12-vn";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML =
      '<div class="v12-vn-bg" style="background-image:url(&quot;' + esc(background) + '&quot;)"></div>' +
      '<div class="v12-vn-shade"></div>' +
      (character.image && !isGroup(character) ? '<img class="v12-vn-sprite" alt="" src="' + esc(character.image) + '">' : "") +
      '<button type="button" class="v12-vn-close" aria-label="' + t("Close") + '">✕</button>' +
      '<div class="v12-vn-box" tabindex="0">' +
        '<span class="v12-vn-name"></span>' +
        '<img class="v12-vn-picture" alt="" hidden>' +
        '<div class="v12-vn-text"></div>' +
        '<div class="v12-vn-typing"><i></i><i></i><i></i></div>' +
        '<div class="v12-vn-nav">' +
          '<button type="button" data-prev aria-label="' + t("Previous") + '">◀</button>' +
          '<span class="v12-vn-count"></span>' +
          '<button type="button" data-next aria-label="' + t("Next") + '">▶</button>' +
        "</div>" +
      "</div>" +
      '<form class="v12-vn-input"><input type="text" autocomplete="off" placeholder="' + t("Write your next line…") + '"><button type="submit" aria-label="' + t("Send") + '">↑</button></form>';
    document.body.appendChild(root);
    vn.root = root;
    vn.lines = vnLines();

    const close = () => {
      clearInterval(vn.timer);
      root.remove();
      vn.root = null;
      document.removeEventListener("keydown", onKey);
    };
    const onKey = event => {
      if (event.target.closest?.(".v12-vn-input")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); vnAdvance(1); }
      if (event.key === "ArrowLeft") vnAdvance(-1);
    };
    document.addEventListener("keydown", onKey);
    root.querySelector(".v12-vn-close").addEventListener("click", close);
    root.querySelector("[data-prev]").addEventListener("click", event => { event.stopPropagation(); vnAdvance(-1); });
    root.querySelector("[data-next]").addEventListener("click", event => { event.stopPropagation(); vnAdvance(1); });
    root.querySelector(".v12-vn-text").addEventListener("click", () => vnAdvance(1));
    root.querySelector(".v12-vn-picture").addEventListener("click", event => window.ChatiViewer?.(event.currentTarget.src));
    root.querySelector(".v12-vn-input").addEventListener("submit", event => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input");
      const text = input.value.trim();
      const messageInput = document.getElementById("messageInput");
      const form = document.getElementById("chatForm");
      if (!text || !messageInput || !form || (typeof isSending !== "undefined" && isSending)) return;
      messageInput.value = text;
      form.requestSubmit();
      input.value = "";
    });

    vnShow(vn.lines.length - 1);
  }

  // =====================================================================
  // Photo album
  // =====================================================================
  function albumItems() {
    const items = [];
    allCharacters().forEach(character => {
      if (isGroup(character)) return;
      chatsOf(character).forEach(chat => {
        (chat.messages || []).forEach(message => {
          if (message.sender === "character" && message.attachment?.type === "image" && message.attachment.dataUrl) {
            items.push({ src: message.attachment.dataUrl, character, time: Number(message.time) || 0, caption: plain(textOf(message)).slice(0, 80) });
          }
        });
      });
    });
    return items.sort((a, b) => b.time - a.time);
  }

  function openAlbum(onlyCharacterId) {
    const items = albumItems();
    const people = [...new Map(items.map(item => [item.character.id, item.character])).values()];
    let filter = onlyCharacterId && people.some(p => p.id === onlyCharacterId) ? onlyCharacterId : "all";
    const { overlay } = modal("v12-album-modal",
      '<div class="v11-modal-box v12-album">' +
        '<div class="v11-timeline-head"><strong>📸 ' + t("Photo album") + '</strong><button type="button" data-close aria-label="' + t("Close") + '">✕</button></div>' +
        '<div class="v12-album-chips"></div>' +
        '<div class="v12-album-grid"></div>' +
      "</div>");
    const chips = overlay.querySelector(".v12-album-chips");
    const grid = overlay.querySelector(".v12-album-grid");

    function render() {
      chips.innerHTML = [["all", t("All") + " · " + items.length]]
        .concat(people.map(p => [p.id, p.name + " · " + items.filter(i => i.character.id === p.id).length]))
        .map(([id, label]) => '<button type="button" class="v9-tag-chip' + (id === filter ? " active" : "") + '" data-filter="' + esc(id) + '">' + esc(label) + "</button>")
        .join("");
      const shown = items.filter(item => filter === "all" || item.character.id === filter);
      grid.innerHTML = shown.length
        ? shown.map((item, i) =>
            '<button type="button" class="v12-polaroid" style="--tilt:' + (((i % 5) - 2) * 1.4) + 'deg" data-src="' + i + '">' +
              '<img alt="" loading="lazy" src="' + esc(item.src) + '">' +
              "<strong>" + esc(item.character.name) + "</strong>" +
              "<small>" + (item.time ? new Date(item.time).toLocaleDateString(lang(), { day: "numeric", month: "short" }) : "") + "</small>" +
            "</button>"
          ).join("")
        : '<div class="v12-album-empty"><img src="' + ROBOT + '" alt=""><p>' + t("No pictures yet. Ask a character: “Crea una imagen de ti”.") + "</p></div>";
      grid._items = shown;
    }
    chips.addEventListener("click", event => {
      const id = event.target.closest("[data-filter]")?.dataset.filter;
      if (!id) return;
      filter = id;
      render();
    });
    grid.addEventListener("click", event => {
      const index = event.target.closest("[data-src]")?.dataset.src;
      if (index === undefined) return;
      window.ChatiViewer?.(grid._items[Number(index)].src);
    });
    render();
  }

  // =====================================================================
  // Your week recap
  // =====================================================================
  function weekStats() {
    const now = Date.now();
    const from = now - 7 * 864e5;
    const perCharacter = new Map();
    const perDay = new Array(7).fill(0);
    let sent = 0, photos = 0, night = 0, chats = 0, bestLine = null;
    allCharacters().forEach(character => {
      if (isGroup(character)) return;
      chatsOf(character).forEach(chat => {
        let active = false;
        (chat.messages || []).forEach(message => {
          const time = Number(message.time) || 0;
          if (time < from) return;
          active = true;
          if (message.sender === "user") {
            sent += 1;
            perCharacter.set(character.id, (perCharacter.get(character.id) || 0) + 1);
            perDay[new Date(time).getDay()] += 1;
            if (new Date(time).getHours() < 4) night += 1;
          } else if (message.sender === "character") {
            if (message.attachment?.type === "image") photos += 1;
            const spoken = textOf(message).replace(/\*\*[^*]*\*\*/g, " ").replace(/\*[^*]*\*/g, " ").replace(/\s+/g, " ").trim();
            const sentences = spoken.split(/(?<=[.!?…])\s+/).filter(s => s.length >= 25 && s.length <= 120);
            sentences.forEach(sentence => {
              const score = sentence.length + (/[!?]/.test(sentence) ? 20 : 0);
              if (!bestLine || score > bestLine.score) bestLine = { text: sentence, character, score };
            });
          }
        });
        if (active) chats += 1;
      });
    });
    const top = [...perCharacter.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCharacter = top ? allCharacters().find(c => c.id === top[0]) : null;
    const busiest = perDay.indexOf(Math.max(...perDay));
    const dayName = new Date(2024, 0, 7 + busiest).toLocaleDateString(lang(), { weekday: "long" });
    return { sent, photos, night, chats, characters: perCharacter.size, topCharacter, topCount: top?.[1] || 0, dayName, bestLine, from, now };
  }

  async function buildRecapCard(stats) {
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext("2d");
    const font = '"Plus Jakarta Sans", system-ui, sans-serif';
    const loadImage = window.ChatiExtras?.loadImage;
    const hue = (stats.topCharacter && (await window.ChatiExtras?.characterHue?.(stats.topCharacter))) ?? 265;

    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${hue},70%,30%)`);
    g.addColorStop(0.55, `hsl(${(hue + 40) % 360},60%,16%)`);
    g.addColorStop(1, "#0b0a14");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // soft glow blobs
    [[200, 260, 420, 0.35], [900, 900, 380, 0.25], [300, 1600, 360, 0.2]].forEach(([x, y, r, a]) => {
      const blob = c.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, `hsla(${hue},90%,70%,${a})`);
      blob.addColorStop(1, "transparent");
      c.fillStyle = blob;
      c.fillRect(0, 0, W, H);
    });

    c.textAlign = "center";
    c.fillStyle = "rgba(255,255,255,0.75)";
    c.font = `700 40px ${font}`;
    const range = new Date(stats.from).toLocaleDateString(lang(), { day: "numeric", month: "short" }) + " – " + new Date(stats.now).toLocaleDateString(lang(), { day: "numeric", month: "short" });
    c.fillText(range.toUpperCase(), W / 2, 170);
    c.fillStyle = "#fff";
    c.font = `800 92px ${font}`;
    c.fillText(es() ? "Tu semana en" : "Your week on", W / 2, 285);
    c.fillText("Chati-AI", W / 2, 390);

    c.font = `800 260px ${font}`;
    c.fillStyle = `hsl(${hue},95%,82%)`;
    c.fillText(String(stats.sent), W / 2, 680);
    c.font = `600 44px ${font}`;
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.fillText(es() ? "mensajes enviados" : "messages sent", W / 2, 750);

    // Top character
    if (stats.topCharacter) {
      const cx = W / 2, cy = 960, r = 130;
      c.save();
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.closePath(); c.clip();
      try {
        const img = await loadImage(stats.topCharacter.image);
        const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
        c.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      } catch {
        c.fillStyle = `hsl(${hue},40%,35%)`;
        c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      }
      c.restore();
      c.lineWidth = 8;
      c.strokeStyle = `hsl(${hue},95%,80%)`;
      c.beginPath(); c.arc(cx, cy, r + 6, 0, Math.PI * 2); c.stroke();
      c.font = `600 36px ${font}`;
      c.fillStyle = "rgba(255,255,255,0.75)";
      c.fillText(es() ? "Tu personaje favorito" : "Your favorite character", W / 2, 1150);
      c.font = `800 64px ${font}`;
      c.fillStyle = "#fff";
      c.fillText(plain(stats.topCharacter.name).slice(0, 24), W / 2, 1225);
    }

    // Stats grid
    const cells = [
      [String(stats.chats), es() ? "chats activos" : "active chats"],
      [String(stats.photos), es() ? "fotos recibidas" : "photos received"],
      [stats.dayName, es() ? "día más activo" : "busiest day"]
    ];
    cells.forEach(([value, label], i) => {
      const x = 90 + i * 310, y = 1300, w = 280, h = 170;
      c.fillStyle = "rgba(255,255,255,0.09)";
      c.beginPath(); c.roundRect(x, y, w, h, 28); c.fill();
      c.fillStyle = "#fff";
      c.font = `800 ${value.length > 6 ? 40 : 64}px ${font}`;
      c.fillText(value.charAt(0).toUpperCase() + value.slice(1), x + w / 2, y + 85);
      c.font = `600 28px ${font}`;
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.fillText(label, x + w / 2, y + 135);
    });

    // Line of the week
    if (stats.bestLine) {
      c.font = `700 30px ${font}`;
      c.fillStyle = `hsl(${hue},95%,82%)`;
      c.fillText((es() ? "FRASE DE LA SEMANA" : "LINE OF THE WEEK"), W / 2, 1560);
      c.font = `italic 600 40px ${font}`;
      c.fillStyle = "#fff";
      const words = ("“" + stats.bestLine.text + "”").split(" ");
      const lines = [];
      let line = "";
      words.forEach(word => {
        const test = line ? line + " " + word : word;
        if (c.measureText(test).width > W - 200 && line) { lines.push(line); line = word; } else line = test;
      });
      lines.push(line);
      lines.slice(0, 3).forEach((l, i) => c.fillText(l, W / 2, 1620 + i * 52));
      c.font = `600 30px ${font}`;
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.fillText("— " + plain(stats.bestLine.character.name), W / 2, 1620 + Math.min(lines.length, 3) * 52 + 14);
    }

    try {
      const robot = await loadImage(ROBOT);
      c.drawImage(robot, W / 2 - 200, 1800, 56, 56);
    } catch {}
    c.textAlign = "left";
    c.font = `800 40px ${font}`;
    c.fillStyle = "#fff";
    c.fillText("chati-ai.com", W / 2 - 128, 1842);
    return canvas;
  }

  async function openRecap() {
    const stats = weekStats();
    const { overlay, close } = modal("", '<div class="v11-modal-box v11-card-box"><div class="v11-card-loading">' + t("Preparing your week…") + "</div></div>");
    const box = overlay.querySelector(".v11-modal-box");
    if (stats.sent < 1) {
      box.innerHTML =
        '<div class="v12-album-empty"><img src="' + ROBOT + '" alt=""><p>' + t("Chat a bit this week and your recap will be ready here.") + "</p></div>" +
        '<div class="v11-modal-actions"><button type="button" data-close>' + t("Close") + "</button></div>";
      return;
    }
    let url;
    try {
      url = (await buildRecapCard(stats)).toDataURL("image/png");
    } catch {
      close();
      toast(t("Couldn't create the card."), "error");
      return;
    }
    const file = "chati-ai-" + (es() ? "mi-semana" : "my-week") + ".png";
    box.classList.add("v12-recap-box");
    box.innerHTML =
      '<img class="v11-card-preview" alt="" src="' + url + '">' +
      '<div class="v11-modal-actions">' +
        '<a class="v11-primary" download="' + file + '" href="' + url + '">⬇ ' + t("Download") + "</a>" +
        '<button type="button" data-share>↗ ' + t("Share") + "</button>" +
        '<button type="button" data-close>✕ ' + t("Close") + "</button>" +
      "</div>";
    box.querySelector("[data-share]").addEventListener("click", async () => {
      try {
        const blob = await (await fetch(url)).blob();
        const shareFile = new File([blob], file, { type: "image/png" });
        if (navigator.canShare?.({ files: [shareFile] })) await navigator.share({ files: [shareFile], text: "chati-ai.com" });
        else box.querySelector("a.v11-primary").click();
      } catch {}
    });
  }

  // =====================================================================
  // Surprise crossover
  // =====================================================================
  function crossoverPool() {
    const pool = allCharacters().filter(c => !isGroup(c) && c.name);
    const explore = window.ChatiExplore;
    if (pool.length < 2 && explore) {
      explore.starters.filter(s => explore.hasArt?.(s) && !pool.some(c => c.id === "starter_" + s.key))
        .forEach(s => pool.push({ id: "starter_" + s.key, name: s.name, image: explore.profileArt(s), scenario: s[lang()].scenario, _starter: s }));
    }
    return pool;
  }

  function firstSentence(text) {
    const value = plain(text);
    const match = value.match(/^.*?[.!?…](\s|$)/);
    return (match ? match[0] : value).trim().slice(0, 220);
  }

  function crossoverScenario(visitor, host) {
    const place = firstSentence(host.scenario || host.description || host.bio);
    return es()
      ? `Una grieta se abre en el aire y ${visitor.name} cae de golpe en el mundo de ${host.name}. ${place ? "La escena: " + place + " " : ""}Ninguno de los dos sabe cómo pasó esto, pero ahora están frente a frente.`
      : `A rift tears open and ${visitor.name} drops straight into ${host.name}'s world. ${place ? "The scene: " + place + " " : ""}Neither of them knows how this happened, but now they're face to face.`;
  }

  function openCrossover() {
    const pool = crossoverPool();
    if (pool.length < 2) {
      toast(t("You need at least two characters for a crossover."));
      return;
    }
    let pair = [];
    const roll = () => {
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      pair = [shuffled[0], shuffled[1]];
    };
    roll();
    const { overlay, close } = modal("", '<div class="v11-modal-box v12-cross"></div>');
    const box = overlay.querySelector(".v12-cross");

    function render() {
      const [visitor, host] = pair;
      const face = c => c.image
        ? '<img alt="" src="' + esc(c.image) + '">'
        : '<span class="v12-cross-initial">' + esc((c.name || "?").charAt(0)) + "</span>";
      box.innerHTML =
        '<span class="v12-cross-kicker">🎲 ' + t("Surprise crossover") + "</span>" +
        '<div class="v12-cross-faces"><div>' + face(visitor) + "</div><b>×</b><div>" + face(host) + "</div></div>" +
        '<strong class="v12-cross-title">' + esc(visitor.name) + " × " + esc(host.name) + "</strong>" +
        '<p class="v12-cross-text">' + esc(crossoverScenario(visitor, host)) + "</p>" +
        '<div class="v11-modal-actions">' +
          '<button type="button" data-roll>🎲 ' + t("Another pair") + "</button>" +
          '<button type="button" data-go class="v11-primary">✨ ' + t("Start!") + "</button>" +
        "</div>";
      box.querySelector("[data-roll]").addEventListener("click", () => { roll(); render(); });
      box.querySelector("[data-go]").addEventListener("click", () => { close(); startCrossover(pair); });
    }
    render();
  }

  function startCrossover([visitorRaw, hostRaw]) {
    const explore = window.ChatiExplore;
    const real = c => (c._starter ? explore?.ensure?.(c._starter) : c);
    const visitor = real(visitorRaw);
    const host = real(hostRaw);
    if (!visitor || !host || typeof normalizeCharacter !== "function") return;
    const group = normalizeCharacter({
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      name: `${visitor.name} × ${host.name}`,
      image: "",
      pronouns: "THEY",
      bio: es() ? `Encuentro sorpresa: ${visitor.name} y ${host.name}` : `Surprise crossover: ${visitor.name} and ${host.name}`,
      description: es() ? `Encuentro sorpresa: ${visitor.name} y ${host.name}` : `Surprise crossover: ${visitor.name} and ${host.name}`,
      personality: "",
      scenario: crossoverScenario(visitor, host),
      instructions: "",
      exampleMessages: [],
      hasPowers: false,
      background: host.background || "",
      isGroup: true,
      memberIds: [host.id, visitor.id]
    });
    characters.push(group);
    saveCharacters();
    if (typeof renderCharacters === "function") renderCharacters();
    const chat = typeof createNewChat === "function" ? createNewChat(group, false) : null;
    openChat(group, chat?.id || null);
    if (typeof renderChatHistory === "function") renderChatHistory();
  }

  // =====================================================================
  // Seasonal themes
  // =====================================================================
  const SEASON_KEY = "chatiSeasonsV1";
  const SEASONS = {
    halloween: { emoji: "🎃", label: "Halloween special", note: "Spooky season — your characters may be in a darker mood 🦇" },
    winter: { emoji: "❄️", label: "Winter holidays", note: "Snow, lights and cozy stories ✨" },
    valentine: { emoji: "💘", label: "Valentine's week", note: "Love is in the air 💌" }
  };

  function seasonNow(date = new Date()) {
    let override = "";
    try { override = new URLSearchParams(location.search).get("season") || localStorage.getItem("chatiSeasonOverride") || ""; } catch {}
    if (override === "none") return "";
    if (SEASONS[override]) return override;
    const m = date.getMonth() + 1, d = date.getDate();
    if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) return "halloween";
    if (m === 12 || (m === 1 && d <= 6)) return "winter";
    if (m === 2 && d >= 7 && d <= 15) return "valentine";
    return "";
  }

  const seasonFx = { canvas: null, parts: [], frame: 0, kind: "" };

  function seasonParticle(kind, w, h, fresh) {
    const r = Math.random;
    if (kind === "halloween") {
      return r() < 0.35
        ? { type: "bat", x: fresh ? r() * w : -30, y: r() * h * 0.6, vx: 0.6 + r() * 0.9, phase: r() * 6, size: 7 + r() * 7 }
        : { type: "ember", x: r() * w, y: fresh ? r() * h : h + 10, vy: -(0.3 + r() * 0.6), phase: r() * 6, size: 1 + r() * 2 };
    }
    if (kind === "winter") return { type: "snow", x: r() * w, y: fresh ? r() * h : -10, vy: 0.4 + r() * 0.8, phase: r() * 6, size: 1 + r() * 2.4 };
    return { type: "heart", x: r() * w, y: fresh ? r() * h : h + 20, vy: -(0.3 + r() * 0.5), phase: r() * 6, size: 6 + r() * 8 };
  }

  function drawSeason() {
    const canvas = seasonFx.canvas;
    seasonFx.frame = 0;
    const home = document.getElementById("homeView");
    const visible = home && home.offsetParent && !document.hidden;
    if (!canvas || !visible) {
      if (canvas) canvas.style.opacity = "0";
      setTimeout(() => { if (!seasonFx.frame) seasonFx.frame = requestAnimationFrame(drawSeason); }, 800);
      return;
    }
    canvas.style.opacity = "1";
    seasonFx.frame = requestAnimationFrame(drawSeason);
    const now = performance.now();
    if (now - (seasonFx.last || 0) < 32) return;
    seasonFx.last = now;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth, h = window.innerHeight;
    if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); seasonFx.parts = []; }
    const c = canvas.getContext("2d");
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);
    const target = Math.min(70, Math.round((w * h) / 26000));
    while (seasonFx.parts.length < target) seasonFx.parts.push(seasonParticle(seasonFx.kind, w, h, true));
    seasonFx.parts.forEach((p, i) => {
      p.phase += 0.03;
      if (p.type === "bat") {
        p.x += p.vx; p.y += Math.sin(p.phase) * 0.6;
        const flap = Math.sin(p.phase * 4) * 0.6;
        c.fillStyle = "rgba(20,12,30,0.75)";
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.quadraticCurveTo(p.x - p.size, p.y - p.size * (0.6 + flap), p.x - p.size * 1.8, p.y + p.size * 0.1);
        c.quadraticCurveTo(p.x - p.size * 0.8, p.y + p.size * 0.1, p.x, p.y + p.size * 0.35);
        c.quadraticCurveTo(p.x + p.size * 0.8, p.y + p.size * 0.1, p.x + p.size * 1.8, p.y + p.size * 0.1);
        c.quadraticCurveTo(p.x + p.size, p.y - p.size * (0.6 + flap), p.x, p.y);
        c.fill();
        if (p.x > w + 40) seasonFx.parts[i] = seasonParticle("halloween", w, h, false);
      } else if (p.type === "ember") {
        p.y += p.vy; p.x += Math.sin(p.phase) * 0.4;
        c.fillStyle = "rgba(255,140,40,0.55)";
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
        if (p.y < -10) seasonFx.parts[i] = seasonParticle("halloween", w, h, false);
      } else if (p.type === "snow") {
        p.y += p.vy; p.x += Math.sin(p.phase) * 0.4;
        c.fillStyle = "rgba(255,255,255,0.6)";
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
        if (p.y > h + 10) seasonFx.parts[i] = seasonParticle("winter", w, h, false);
      } else {
        p.y += p.vy; p.x += Math.sin(p.phase) * 0.5;
        c.fillStyle = "rgba(255,105,160,0.4)";
        const s = p.size;
        c.beginPath();
        c.moveTo(p.x, p.y + s * 0.3);
        c.bezierCurveTo(p.x - s, p.y - s * 0.5, p.x - s * 0.4, p.y - s * 1.1, p.x, p.y - s * 0.45);
        c.bezierCurveTo(p.x + s * 0.4, p.y - s * 1.1, p.x + s, p.y - s * 0.5, p.x, p.y + s * 0.3);
        c.fill();
        if (p.y < -20) seasonFx.parts[i] = seasonParticle("valentine", w, h, false);
      }
    });
  }

  function applySeason() {
    const season = pref(SEASON_KEY) ? seasonNow() : "";
    const root = document.documentElement;
    Object.keys(SEASONS).forEach(key => root.classList.toggle("season-" + key, key === season));
    document.getElementById("v12SeasonBanner")?.remove();
    if (!season) {
      seasonFx.canvas?.remove();
      seasonFx.canvas = null;
      return;
    }
    const info = SEASONS[season];
    const top = document.querySelector("#homeView .top-bar");
    if (top) {
      const banner = document.createElement("div");
      banner.id = "v12SeasonBanner";
      banner.className = "v12-season-banner";
      banner.innerHTML = "<strong>" + info.emoji + " " + t(info.label) + "</strong><span>" + t(info.note) + "</span>";
      top.appendChild(banner);
    }
    if (!reducedMotion()) {
      if (!seasonFx.canvas) {
        seasonFx.canvas = document.createElement("canvas");
        seasonFx.canvas.className = "v12-season-fx";
        seasonFx.canvas.setAttribute("aria-hidden", "true");
        document.body.prepend(seasonFx.canvas);
      }
      seasonFx.kind = season;
      seasonFx.parts = [];
      if (!seasonFx.frame) seasonFx.frame = requestAnimationFrame(drawSeason);
    }
  }

  // =====================================================================
  // Entry points: home actions, chat header, phone ✨ menu, settings
  // =====================================================================
  function ensureHomeActions() {
    const top = document.querySelector("#homeView .top-bar");
    if (!top || document.getElementById("v12HomeActions")) return;
    const row = document.createElement("div");
    row.id = "v12HomeActions";
    row.className = "v12-home-actions";
    row.innerHTML =
      '<button type="button" data-a="recap">✨ <span>' + t("Your week") + "</span></button>" +
      '<button type="button" data-a="album">📸 <span>' + t("Album") + "</span></button>" +
      '<button type="button" data-a="cross">🎲 <span>' + t("Surprise crossover") + "</span></button>";
    row.addEventListener("click", event => {
      const action = event.target.closest("[data-a]")?.dataset.a;
      if (action === "recap") openRecap();
      if (action === "album") openAlbum();
      if (action === "cross") openCrossover();
    });
    top.appendChild(row);
  }

  function ensureChatButtons() {
    const actions = document.querySelector("#chatView .chat-actions");
    if (!actions || document.getElementById("v12VnBtn")) return;
    const vnButton = document.createElement("button");
    vnButton.type = "button";
    vnButton.id = "v12VnBtn";
    vnButton.className = "v11-head-btn";
    vnButton.title = t("Visual novel mode");
    vnButton.setAttribute("aria-label", t("Visual novel mode"));
    vnButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M3 15h18M7 18h5"></path><circle cx="9" cy="9.5" r="2"></circle></svg>';
    vnButton.addEventListener("click", openVN);

    const more = document.createElement("button");
    more.type = "button";
    more.id = "v12MoreBtn";
    more.className = "v11-head-btn";
    more.title = t("More");
    more.setAttribute("aria-label", t("More"));
    more.textContent = "✨";
    more.addEventListener("click", event => {
      event.stopPropagation();
      toggleMoreMenu(more);
    });
    actions.prepend(vnButton, more);
  }

  function toggleMoreMenu(anchor) {
    const existing = document.getElementById("v12MoreMenu");
    if (existing) { existing.remove(); return; }
    const character = current();
    const menu = document.createElement("div");
    menu.id = "v12MoreMenu";
    menu.className = "v12-more-menu";
    const items = [
      ["vn", "🎬", "Visual novel mode"],
      window.ChatiCanon && ["canon", "📜", "Canon voice"],
      !isGroup(character) && ["card", "🃏", "Share card"],
      ["timeline", "📖", "Story timeline"],
      !isGroup(character) && ["album", "📸", "Album"]
    ].filter(Boolean);
    menu.innerHTML = items.map(([id, emoji, label]) => '<button type="button" data-m="' + id + '">' + emoji + " " + t(label) + "</button>").join("");
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = rect.bottom + 8 + "px";
    menu.style.right = Math.max(12, window.innerWidth - rect.right) + "px";
    menu.addEventListener("click", event => {
      const id = event.target.closest("[data-m]")?.dataset.m;
      menu.remove();
      if (id === "vn") openVN();
      if (id === "canon") window.ChatiCanon?.open();
      if (id === "card") window.ChatiExtras?.openCard();
      if (id === "timeline") window.ChatiExtras?.openTimeline();
      if (id === "album") openAlbum(character?.id);
    });
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
  }

  function ensureSeasonSetting() {
    const anchor = document.getElementById("v11EffectsToggle")?.closest(".mature-content-row");
    if (!anchor || document.getElementById("v12SeasonToggle")) return;
    const on = pref(SEASON_KEY);
    const row = document.createElement("div");
    row.className = "mature-content-row v11-setting-row";
    row.innerHTML =
      '<div class="mature-content-copy"><strong>' + t("Seasonal themes") + "</strong><span>" + t("Halloween, winter holidays and Valentine's decorations on their dates.") + "</span></div>" +
      '<button id="v12SeasonToggle" type="button" class="mature-content-toggle' + (on ? " is-on" : "") + '" role="switch" aria-checked="' + on + '" aria-label="' + t("Seasonal themes") + '"><span class="mature-content-knob"></span></button>';
    row.querySelector("button").addEventListener("click", event => {
      const button = event.currentTarget;
      const next = !button.classList.contains("is-on");
      button.classList.toggle("is-on", next);
      button.setAttribute("aria-checked", String(next));
      setPref(SEASON_KEY, next);
      applySeason();
    });
    anchor.insertAdjacentElement("afterend", row);
  }

  function initialize() {
    document.documentElement.classList.add("v12");
    ensureHomeActions();
    ensureChatButtons();
    applySeason();

    const messages = document.getElementById("messages");
    let chatTimer = 0;
    if (messages) new MutationObserver(() => {
      clearTimeout(chatTimer);
      chatTimer = setTimeout(() => { ensureChatButtons(); vnRefresh(); }, 250);
    }).observe(messages, { childList: true, subtree: true });

    let bodyTimer = 0;
    new MutationObserver(records => {
      if (messages && records.every(record => messages.contains(record.target))) return;
      clearTimeout(bodyTimer);
      bodyTimer = setTimeout(() => {
        ensureHomeActions();
        ensureSeasonSetting();
        if (!document.getElementById("v12SeasonBanner") && seasonNow() && pref(SEASON_KEY)) applySeason();
      }, 200);
    }).observe(document.body, { childList: true, subtree: true });

    window.addEventListener("chati:languagechange", () => {
      document.getElementById("v12HomeActions")?.remove();
      ensureHomeActions();
      applySeason();
    });
  }

  window.ChatiV12 = Object.freeze({ openVN, openAlbum, openRecap, openCrossover, seasonNow, weekStats });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
