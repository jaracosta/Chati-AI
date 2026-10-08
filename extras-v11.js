// CHATI-AI V11 — the "unique" layer:
//  1. Chat tinted with each character's own color (from their picture)
//  2. Living backgrounds (rain, snow, embers, petals, stars, fireflies…)
//  3. Shareable character card (PNG)
//  4. Relationship meter
//  5. Mood aura on the character's avatar
//  6. Character voice (device text-to-speech)
//  7. Achievements
//  8. Story timeline (chapters + memories)
//  9. Sounds & vibration
// 10. Swipe to discover characters
(() => {
  "use strict";

  const ROBOT = "assets/icons/favicon.svg";
  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");
  const t = text => window.ChatiI18n?.t?.(text) ?? text;
  const es = () => lang() === "es";
  const toast = (text, kind) => (window.ChatiToast ? window.ChatiToast(text, kind) : null);
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const pref = (key, fallback = true) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === "1";
    } catch {
      return fallback;
    }
  };
  const setPref = (key, value) => {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch {}
  };
  const EFFECTS_KEY = "chatiEffectsV1";
  const SOUNDS_KEY = "chatiSoundsV1";

  const current = () => (typeof currentCharacter !== "undefined" ? currentCharacter : null);
  const isGroup = character =>
    typeof isGroupCharacter === "function" ? isGroupCharacter(character) : Boolean(character?.isGroup);
  const chatsOf = character => {
    try {
      return typeof getCharacterChats === "function" && character ? getCharacterChats(character.id) : [];
    } catch {
      return [];
    }
  };
  const plain = text => String(text || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();

  async function loadImage(src) {
    if (!src) throw new Error("no image");
    let url = src;
    let revoke = null;
    if (!/^(data:|blob:)/.test(src) && !src.startsWith(location.origin) && /^https?:/.test(src)) {
      const blob = await (await fetch(src)).blob();
      url = URL.createObjectURL(blob);
      revoke = url;
    }
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    if (revoke) setTimeout(() => URL.revokeObjectURL(revoke), 60000);
    return image;
  }

  // ---------------------------------------------------------------------
  // 1. Character color
  // ---------------------------------------------------------------------
  const colorCache = new Map();

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  async function characterHue(character) {
    const key = character.id + "|" + String(character.image || "").slice(-40);
    if (colorCache.has(key)) return colorCache.get(key);
    let result = null;
    try {
      const image = await loadImage(character.image);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 40;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, 40, 40);
      const data = context.getImageData(0, 0, 40, 40).data;
      const bins = new Array(24).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        if (s < 0.28 || l < 0.15 || l > 0.85) continue;
        bins[Math.floor(h / 15) % 24] += s * (1 - Math.abs(l - 0.5));
      }
      const best = bins.indexOf(Math.max(...bins));
      if (bins[best] > 6) result = best * 15 + 7;
    } catch {}
    colorCache.set(key, result);
    return result;
  }

  let tintFor = "";
  async function applyTint() {
    const character = current();
    const root = document.documentElement;
    if (!character || isGroup(character)) {
      root.classList.remove("v11-tint");
      tintFor = "";
      return;
    }
    const key = character.id + "|" + String(character.image || "").slice(-40);
    if (tintFor === key) return;
    tintFor = key;
    const hue = await characterHue(character);
    if (tintFor !== key) return;
    if (hue === null) {
      root.classList.remove("v11-tint");
      return;
    }
    root.style.setProperty("--v11-h", String(Math.round(hue)));
    root.classList.add("v11-tint");
  }

  // ---------------------------------------------------------------------
  // 2. Living backgrounds
  // ---------------------------------------------------------------------
  const EFFECTS = [
    ["rain", /\b(rain|raining|rainy|storm|lluvia|llueve|lloviendo|tormenta|aguacero)/i],
    ["snow", /\b(snow|snowy|winter|blizzard|frost|nieve|nevando|invierno|helad)/i],
    ["embers", /\b(fire|flame|volcano|ember|lava|inferno|hell|curse|demon|fuego|llama|volc[aá]n|brasa|infierno|maldici[oó]n|demonio|vela|candle)/i],
    ["petals", /\b(sakura|cherry blossom|petal|blossom|spring|cerezo|p[eé]talo|primavera|jard[ií]n|garden)/i],
    ["stars", /\b(space|spaceship|starship|galaxy|cosmos|orbit|nebula|espacio|nave|galaxia|estrellas|[oó]rbita|planeta)/i],
    ["fireflies", /\b(forest|woods|witch|fairy|magic|night|bosque|bruja|hada|magia|noche|luci[eé]rnaga)/i]
  ];

  function pickEffect(character) {
    const text = [character.scenario, character.description, character.bio, character.personality, character.background]
      .filter(value => typeof value === "string")
      .join(" ")
      .slice(0, 4000);
    for (const [name, pattern] of EFFECTS) if (pattern.test(text)) return name;
    return "dust";
  }

  const fx = { canvas: null, effect: "", particles: [], frame: 0, last: 0 };

  function makeParticle(effect, w, h, fresh) {
    const r = Math.random;
    const y = fresh ? r() * h : (effect === "embers" || effect === "fireflies" ? h + 10 : -10);
    switch (effect) {
      case "rain": return { x: r() * w, y, len: 10 + r() * 14, vy: 9 + r() * 6, vx: -1.5, a: 0.18 + r() * 0.25 };
      case "snow": return { x: r() * w, y, size: 1 + r() * 2.6, vy: 0.4 + r() * 0.9, vx: 0, phase: r() * 6, a: 0.5 + r() * 0.4 };
      case "embers": return { x: r() * w, y, size: 1 + r() * 2.2, vy: -(0.5 + r() * 1.3), vx: 0, phase: r() * 6, a: 0.5 + r() * 0.5, life: 1 };
      case "petals": return { x: r() * w, y, size: 3 + r() * 4, vy: 0.6 + r() * 0.9, vx: 0.4 + r() * 0.6, rot: r() * 6, spin: (r() - 0.5) * 0.05, a: 0.55 + r() * 0.35 };
      case "stars": return { x: r() * w, y: r() * h, size: 0.6 + r() * 1.6, tw: r() * 6, speed: 0.02 + r() * 0.04, a: 0.4 + r() * 0.6 };
      case "fireflies": return { x: r() * w, y: fresh ? r() * h : r() * h, size: 1.5 + r() * 2, vx: (r() - 0.5) * 0.4, vy: (r() - 0.5) * 0.4, tw: r() * 6, a: 0.6 };
      default: return { x: r() * w, y: fresh ? r() * h : h + 5, size: 0.6 + r() * 1.4, vy: -(0.1 + r() * 0.25), vx: (r() - 0.5) * 0.15, a: 0.12 + r() * 0.2 };
    }
  }

  function countFor(effect, w, h) {
    const area = (w * h) / 100000;
    const per = { rain: 9, snow: 5, embers: 3.5, petals: 1.6, stars: 6, fireflies: 1.4, dust: 2.4 }[effect] || 2;
    return Math.min(220, Math.round(area * per));
  }

  function drawFx(time) {
    const canvas = fx.canvas;
    fx.frame = 0;
    if (!canvas || !canvas.isConnected || document.hidden || !canvas.offsetParent) return;
    fx.frame = requestAnimationFrame(drawFx);
    // ~30 fps is plenty for ambience; drop to ~20 fps while a reply streams
    // so the text and scrolling get the frame budget.
    const busy = typeof isSending !== "undefined" && isSending;
    if (time - (fx.last || 0) < (busy ? 48 : 32)) return;
    const dt = Math.min(3, (time - (fx.last || time)) / 16.7 || 1);
    fx.last = time;

    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      fx.particles = [];
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, w, h);

    const effect = fx.effect;
    const target = countFor(effect, w, h);
    while (fx.particles.length < target) fx.particles.push(makeParticle(effect, w, h, fx.particles.length < target * 0.9 && !fx.started));
    fx.started = true;

    const hue = Number(getComputedStyle(document.documentElement).getPropertyValue("--v11-h")) || 265;

    fx.particles.forEach((p, index) => {
      switch (effect) {
        case "rain":
          p.y += p.vy * dt; p.x += p.vx * dt;
          context.strokeStyle = `rgba(190,210,255,${p.a})`;
          context.lineWidth = 1;
          context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(p.x + p.vx * 2, p.y + p.len); context.stroke();
          if (p.y > h) fx.particles[index] = makeParticle(effect, w, h, false);
          break;
        case "snow":
          p.phase += 0.02 * dt; p.y += p.vy * dt; p.x += Math.sin(p.phase) * 0.4 * dt;
          context.fillStyle = `rgba(255,255,255,${p.a})`;
          context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
          if (p.y > h + 5) fx.particles[index] = makeParticle(effect, w, h, false);
          break;
        case "embers":
          p.phase += 0.04 * dt; p.y += p.vy * dt; p.x += Math.sin(p.phase) * 0.6 * dt; p.life -= 0.0025 * dt;
          // Cheap glow: a faint larger circle instead of shadowBlur.
          context.fillStyle = `rgba(255,120,40,${Math.max(0, p.a * p.life * 0.25)})`;
          context.beginPath(); context.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); context.fill();
          context.fillStyle = `rgba(255,${120 + Math.round(p.life * 80)},60,${Math.max(0, p.a * p.life)})`;
          context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
          if (p.y < -10 || p.life <= 0) fx.particles[index] = makeParticle(effect, w, h, false);
          break;
        case "petals":
          p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.y / 40) * 0.5) * dt; p.rot += p.spin * dt;
          context.save(); context.translate(p.x, p.y); context.rotate(p.rot);
          context.fillStyle = `rgba(255,183,213,${p.a})`;
          context.beginPath(); context.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); context.fill();
          context.restore();
          if (p.y > h + 10 || p.x > w + 10) fx.particles[index] = makeParticle(effect, w, h, false);
          break;
        case "stars":
          p.tw += p.speed * dt; p.x -= 0.05 * dt;
          context.fillStyle = `rgba(220,230,255,${p.a * (0.55 + Math.sin(p.tw) * 0.45)})`;
          context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
          if (p.x < -2) { p.x = w + 2; p.y = Math.random() * h; }
          break;
        case "fireflies":
          p.tw += 0.03 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (Math.random() < 0.01) { p.vx = (Math.random() - 0.5) * 0.5; p.vy = (Math.random() - 0.5) * 0.5; }
          {
            const glow = 0.25 + Math.max(0, Math.sin(p.tw)) * 0.65;
            context.fillStyle = `rgba(210,255,120,${glow * 0.22})`;
            context.beginPath(); context.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2); context.fill();
            context.fillStyle = `rgba(230,255,150,${glow})`;
            context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
          }
          if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) fx.particles[index] = makeParticle(effect, w, h, true);
          break;
        default:
          p.y += p.vy * dt; p.x += p.vx * dt;
          context.fillStyle = `hsla(${hue},80%,80%,${p.a})`;
          context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
          if (p.y < -5) fx.particles[index] = makeParticle(effect, w, h, false);
      }
    });
  }

  function syncEffects() {
    const background = document.getElementById("chatBackground");
    const character = current();
    const enabled = pref(EFFECTS_KEY) && !reducedMotion() && character && !isGroup(character);
    if (!background || !enabled) {
      if (fx.canvas) fx.canvas.hidden = true;
      document.documentElement.classList.remove("v11-fx-on");
      return;
    }
    document.documentElement.classList.add("v11-fx-on");
    if (!fx.canvas || !fx.canvas.isConnected) {
      fx.canvas = document.createElement("canvas");
      fx.canvas.className = "v11-fx";
      fx.canvas.setAttribute("aria-hidden", "true");
      background.insertAdjacentElement("afterend", fx.canvas);
    }
    fx.canvas.hidden = false;
    const effect = pickEffect(character);
    if (effect !== fx.effect) {
      fx.effect = effect;
      fx.particles = [];
      fx.started = false;
    }
    if (!fx.frame) fx.frame = requestAnimationFrame(drawFx);
  }

  // ---------------------------------------------------------------------
  // 4. Relationship meter + 5. mood aura
  // ---------------------------------------------------------------------
  const BONDS = [
    [0, "🌱", "Strangers"],
    [10, "🙂", "Acquaintances"],
    [30, "🤝", "Friends"],
    [80, "💫", "Close bond"],
    [150, "❤️", "Inseparable"]
  ];

  function bondOf(character) {
    let sent = 0;
    chatsOf(character).forEach(chat => {
      sent += (chat.messages || []).filter(message => message.sender === "user").length;
    });
    let index = 0;
    BONDS.forEach((bond, i) => { if (sent >= bond[0]) index = i; });
    const next = BONDS[index + 1];
    const progress = next ? (sent - BONDS[index][0]) / (next[0] - BONDS[index][0]) : 1;
    return { index, emoji: BONDS[index][1], label: t(BONDS[index][2]), sent, progress };
  }

  const MOODS = [
    ["angry", "😠", /\b(furious|rage|glare|snarl|growl|seeth|kill|idiot|fool|insect|grit|fur[ií]a|enoj|furios|grita|gru[ñn]|matar|idiota|insecto|mira con odio)/i],
    ["sad", "😢", /\b(tears|cry|cries|crying|sob|sigh|lonely|hurt|l[aá]grima|llora|solloz|suspira|triste|sola?\b|dolid)/i],
    ["flirty", "😏", /\b(blush|wink|kiss|lips|lean(s)? closer|whisper|darling|sonroj|gui[ñn]a|beso|labios|se acerca|susurra|cari[ñn]o)/i],
    ["happy", "😄", /\b(laugh|giggle|grin|beam|smil|cheer|r[ií]e|carcaj|sonr[ií]e|alegr|feliz)/i]
  ];

  function moodOf(text) {
    for (const [name, emoji, pattern] of MOODS) if (pattern.test(text)) return { name, emoji };
    return { name: "calm", emoji: "" };
  }

  function syncHeader() {
    const character = current();
    const info = document.querySelector("#chatView .chat-character-info");
    const avatar = document.getElementById("chatCharacterImage");
    let bond = document.getElementById("v11Bond");
    if (!info || !character || isGroup(character)) {
      if (bond) bond.hidden = true;
      avatar?.removeAttribute("data-mood");
      return;
    }
    if (!bond) {
      bond = document.createElement("div");
      bond.id = "v11Bond";
      bond.className = "v11-bond";
      info.appendChild(bond);
    }
    bond.hidden = false;
    const data = bondOf(character);
    const replies = [...document.querySelectorAll("#messages .message-row.character:not(.typing-row) .message")];
    const mood = moodOf(replies.length ? replies[replies.length - 1].textContent.slice(-600) : "");
    avatar?.setAttribute("data-mood", mood.name);
    const filled = Math.max(1, Math.min(5, data.index + 1));
    bond.innerHTML =
      (mood.emoji ? '<span class="v11-mood" title="' + t("Mood") + '">' + mood.emoji + "</span>" : "") +
      '<span class="v11-bond-label">' + data.emoji + " " + data.label + "</span>" +
      '<span class="v11-bond-bar" aria-hidden="true">' +
        [0, 1, 2, 3, 4].map(i => '<i class="' + (i < filled ? "on" : "") + '"></i>').join("") +
      "</span>";
    bond.title = t("Relationship") + ": " + data.label + " · " + data.sent + " " + t("messages");
  }

  // ---------------------------------------------------------------------
  // 6. Character voice
  // ---------------------------------------------------------------------
  function pickVoice(character, language) {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const prefix = language === "es" ? "es" : "en";
    const pool = voices.filter(voice => voice.lang?.toLowerCase().startsWith(prefix));
    const he = /male|jorge|diego|juan|carlos|alex|daniel|fred|david|enrique|pablo|miguel|reed|rocko|eddy/i;
    const she = /female|paulina|m[oó]nica|samantha|helena|laura|victoria|karen|moira|luc[ií]a|sabina|marisol|isabela|flo|sandy|shelley/i;
    const want = character?.pronouns === "HE" ? he : character?.pronouns === "SHE" ? she : null;
    return (want && pool.find(voice => want.test(voice.name) && !(want === he && /female/i.test(voice.name)))) || pool[0] || voices[0] || null;
  }

  function speak(button, text) {
    const synth = window.speechSynthesis;
    if (!synth) {
      toast(t("Voice isn't available on this device."), "error");
      return;
    }
    if (synth.speaking) {
      synth.cancel();
      document.querySelectorAll(".v11-speak.playing").forEach(node => node.classList.remove("playing"));
      if (button.classList.contains("playing")) return;
    }
    // Only the spoken words, not the **actions**.
    const spoken = String(text || "")
      .replace(/\*\*[^*]*\*\*/g, " ")
      .replace(/\*[^*]*\*/g, " ")
      .replace(/[«»"“”]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!spoken) {
      toast(t("This reply has only actions — nothing to read aloud."));
      return;
    }
    const character = current();
    const language = /[ñáéíóú¿¡]/i.test(spoken) || (lang() === "es" && !/\b(the|you|and|is)\b/i.test(spoken)) ? "es" : "en";
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = language === "es" ? "es-ES" : "en-US";
    const voice = pickVoice(character, language);
    if (voice) utterance.voice = voice;
    utterance.pitch = character?.pronouns === "HE" ? 0.85 : character?.pronouns === "SHE" ? 1.12 : 1;
    utterance.rate = 1;
    utterance.onend = utterance.onerror = () => button.classList.remove("playing");
    button.classList.add("playing");
    synth.speak(utterance);
  }

  function decorateVoices() {
    if (!window.speechSynthesis) return;
    // Don't touch bubbles while a reply is streaming in.
    if (typeof isSending !== "undefined" && isSending) return;
    document.querySelectorAll("#messages .message-row.character:not(.typing-row) .message.character").forEach(bubble => {
      if (bubble.querySelector(".v11-speak")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "v11-speak";
      button.setAttribute("aria-label", t("Listen"));
      button.title = t("Listen");
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"></path><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"></path></svg>';
      button.addEventListener("click", event => {
        event.stopPropagation();
        const clone = bubble.cloneNode(true);
        clone.querySelectorAll(".v11-speak, .message-attachment").forEach(node => node.remove());
        // Rebuild ** marks from the italic action spans so they are skipped.
        clone.querySelectorAll(".action-text, em, i").forEach(node => { node.textContent = "**" + node.textContent + "**"; });
        speak(button, clone.textContent);
      });
      bubble.appendChild(button);
    });
  }

  // ---------------------------------------------------------------------
  // 9. Sounds & vibration
  // ---------------------------------------------------------------------
  let audio = null;
  function blip(kind) {
    if (!pref(SOUNDS_KEY)) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === "send" ? [[740, 0], [988, 0.05]] : [[523, 0], [784, 0.07]];
      notes.forEach(([frequency, delay]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        const start = audio.currentTime + delay;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === "send" ? 0.05 : 0.06, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        osc.connect(gain).connect(audio.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
      navigator.vibrate?.(kind === "send" ? 8 : [6, 40, 10]);
    } catch {}
  }

  const seen = { chat: "", ids: new Set() };
  function watchNewMessages() {
    const chatId = typeof currentChatId !== "undefined" ? String(currentChatId || "") : "";
    const rows = [...document.querySelectorAll("#messages .message-row[data-message-id]")];
    if (seen.chat !== chatId) {
      seen.chat = chatId;
      seen.ids = new Set(rows.map(row => row.dataset.messageId));
      return;
    }
    rows.forEach(row => {
      const id = row.dataset.messageId;
      if (seen.ids.has(id)) return;
      seen.ids.add(id);
      if (row.classList.contains("user")) blip("send");
      else if (row.classList.contains("character")) blip("receive");
    });
  }

  // ---------------------------------------------------------------------
  // 3. Shareable character card
  // ---------------------------------------------------------------------
  function wrapLines(context, text, maxWidth, maxLines) {
    const words = plain(text).split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines) break;
      } else {
        line = test;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    }
    return lines;
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function cover(context, image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale;
    const sh = h / scale;
    context.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  }

  async function buildCard(character) {
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d");
    const hue = (await characterHue(character)) ?? 265;
    const font = '"Plus Jakarta Sans", system-ui, sans-serif';

    // Background
    const gradient = context.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, `hsl(${hue},55%,22%)`);
    gradient.addColorStop(1, "#0b0a14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, W, H);
    try {
      const background = await loadImage(character.background || character.image);
      context.globalAlpha = 0.45;
      context.filter = "blur(6px)";
      cover(context, background, -20, -20, W + 40, H + 40);
      context.filter = "none";
      context.globalAlpha = 1;
    } catch {}
    const shade = context.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(8,6,16,0.25)");
    shade.addColorStop(0.55, "rgba(8,6,16,0.7)");
    shade.addColorStop(1, "rgba(8,6,16,0.95)");
    context.fillStyle = shade;
    context.fillRect(0, 0, W, H);

    // Frame
    context.lineWidth = 6;
    context.strokeStyle = `hsla(${hue},85%,70%,0.85)`;
    roundRect(context, 36, 36, W - 72, H - 72, 44);
    context.stroke();

    // Portrait
    const px = 140, py = 110, pw = W - 280, ph = 640;
    context.save();
    roundRect(context, px, py, pw, ph, 36);
    context.clip();
    try {
      cover(context, await loadImage(character.image), px, py, pw, ph);
    } catch {
      context.fillStyle = `hsl(${hue},45%,30%)`;
      context.fillRect(px, py, pw, ph);
      context.fillStyle = "rgba(255,255,255,0.3)";
      context.font = `800 260px ${font}`;
      context.textAlign = "center";
      context.fillText((character.name || "?").charAt(0).toUpperCase(), W / 2, py + ph / 2 + 90);
    }
    context.restore();
    context.lineWidth = 3;
    context.strokeStyle = "rgba(255,255,255,0.25)";
    roundRect(context, px, py, pw, ph, 36);
    context.stroke();

    // Name + bond
    const bond = bondOf(character);
    context.textAlign = "center";
    context.fillStyle = "#fff";
    context.font = `800 76px ${font}`;
    context.fillText(plain(character.name).slice(0, 26), W / 2, 850);
    context.font = `600 32px ${font}`;
    context.fillStyle = `hsl(${hue},90%,82%)`;
    context.fillText(bond.emoji + "  " + bond.label.toUpperCase(), W / 2, 902);

    // Bio
    context.font = `500 34px ${font}`;
    context.fillStyle = "rgba(255,255,255,0.86)";
    wrapLines(context, character.bio || character.description || character.scenario || "", W - 260, 3)
      .forEach((line, i) => context.fillText(line, W / 2, 970 + i * 46));

    // Powers
    if (character.hasPowers && (character.abilities || character.powerSystem)) {
      context.font = `600 28px ${font}`;
      context.fillStyle = `hsl(${hue},85%,78%)`;
      const powers = wrapLines(context, "⚡ " + (character.abilities || character.powerSystem), W - 300, 1)[0];
      context.fillText(powers, W / 2, 1130);
    }

    // Footer
    try {
      const robot = await loadImage(ROBOT);
      context.drawImage(robot, W / 2 - 250, 1188, 64, 64);
    } catch {}
    context.textAlign = "left";
    context.font = `700 34px ${font}`;
    context.fillStyle = "#fff";
    context.fillText(es() ? "Chatea conmigo en" : "Chat with me on", W / 2 - 170, 1218);
    context.font = `800 38px ${font}`;
    context.fillStyle = `hsl(${hue},90%,80%)`;
    context.fillText("chati-ai.com", W / 2 - 170, 1262);

    return canvas;
  }

  async function openCard() {
    const character = current();
    if (!character || isGroup(character)) return;
    const overlay = document.createElement("div");
    overlay.className = "v11-modal";
    overlay.innerHTML = '<div class="v11-modal-box v11-card-box"><div class="v11-card-loading">' + t("Creating card…") + "</div></div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });

    let canvas;
    try {
      canvas = await buildCard(character);
    } catch {
      overlay.remove();
      toast(t("Couldn't create the card."), "error");
      return;
    }
    let url;
    try {
      url = canvas.toDataURL("image/png");
    } catch {
      overlay.remove();
      toast(t("Couldn't create the card."), "error");
      return;
    }
    const box = overlay.querySelector(".v11-modal-box");
    const fileName = plain(character.name).replace(/[^\w-]+/g, "-").toLowerCase() + "-chati-ai.png";
    box.innerHTML =
      '<img class="v11-card-preview" alt="" src="' + url + '">' +
      '<div class="v11-modal-actions">' +
        '<a class="v11-primary" download="' + fileName + '" href="' + url + '">⬇ ' + t("Download") + "</a>" +
        '<button type="button" data-share>↗ ' + t("Share") + "</button>" +
        '<button type="button" data-close>✕ ' + t("Close") + "</button>" +
      "</div>";
    box.querySelector("[data-close]").addEventListener("click", () => overlay.remove());
    const share = box.querySelector("[data-share]");
    share.addEventListener("click", async () => {
      try {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: character.name, text: (es() ? "Chatea con " : "Chat with ") + character.name + " — chati-ai.com" });
        } else {
          box.querySelector("a.v11-primary").click();
        }
      } catch {}
    });
  }

  // ---------------------------------------------------------------------
  // 8. Story timeline
  // ---------------------------------------------------------------------
  function openTimeline() {
    const character = current();
    const chat = typeof getCurrentChat === "function" ? getCurrentChat() : null;
    if (!character || !chat) return;
    const messages = (chat.messages || []).filter(message => message.sender !== "system");
    const memory = chat.memory || {};

    const chapters = [];
    let chapter = null;
    messages.forEach(message => {
      const time = Number(message.time) || 0;
      const gap = chapter && time && chapter.last && time - chapter.last > 3 * 3600e3;
      if (!chapter || gap || chapter.items.length >= 40) {
        chapter = { items: [], first: message, start: time, last: time };
        chapters.push(chapter);
      }
      chapter.items.push(message);
      if (time) chapter.last = time;
    });

    const textOf = message => plain(typeof getMessageText === "function" ? getMessageText(normalizeMessage(message)) : message.text);
    const date = time => (time ? new Date(time).toLocaleDateString(lang(), { day: "numeric", month: "short" }) : "");
    const esc = value => String(value || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    const list = value => (Array.isArray(value) ? value : [])
      .map(item => (typeof item === "string" ? item : item?.text || item?.content || ""))
      .filter(Boolean);
    const moments = [...list(memory.pinnedMemories), ...list(memory.importantFacts)].slice(0, 8);

    const overlay = document.createElement("div");
    overlay.className = "v11-modal";
    overlay.innerHTML =
      '<div class="v11-modal-box v11-timeline">' +
        '<div class="v11-timeline-head"><strong>📖 ' + t("Your story with") + " " + esc(character.name) + '</strong><button type="button" data-close aria-label="' + t("Close") + '">✕</button></div>' +
        (memory.summary ? '<p class="v11-timeline-summary">' + esc(memory.summary) + "</p>" : "") +
        (moments.length ? '<div class="v11-timeline-moments"><span>' + t("Key moments") + "</span>" + moments.map(m => "<p>⭐ " + esc(m) + "</p>").join("") + "</div>" : "") +
        '<ol class="v11-chapters">' +
          (chapters.length
            ? chapters.map((c, i) => {
                const reply = c.items.find(m => m.sender === "character") || c.first;
                return '<li><button type="button" data-id="' + esc(c.first.id) + '">' +
                  '<span class="v11-ch-num">' + t("Chapter") + " " + (i + 1) + "</span>" +
                  '<span class="v11-ch-text">' + esc(textOf(reply).slice(0, 110)) + "</span>" +
                  '<span class="v11-ch-meta">' + date(c.start) + " · " + c.items.length + " " + t("messages") + "</span>" +
                "</button></li>";
              }).join("")
            : "<li class='v11-empty'>" + t("Your story starts with your first message.") + "</li>") +
        "</ol>" +
      "</div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-close]")) {
        overlay.remove();
        return;
      }
      const id = event.target.closest("[data-id]")?.dataset.id;
      if (!id) return;
      overlay.remove();
      const row = document.querySelector('#messages .message-row[data-message-id="' + CSS.escape(id) + '"]');
      row?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      row?.classList.add("v11-flash");
      setTimeout(() => row?.classList.remove("v11-flash"), 1600);
    });
  }

  function ensureHeaderButtons() {
    const actions = document.querySelector("#chatView .chat-actions");
    if (!actions || document.getElementById("v11CardBtn")) return;
    const make = (id, label, svg, handler) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = id;
      button.className = "v11-head-btn";
      button.title = t(label);
      button.setAttribute("aria-label", t(label));
      button.innerHTML = svg;
      button.addEventListener("click", handler);
      return button;
    };
    actions.prepend(
      make("v11TimelineBtn", "Story timeline", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"></path><path d="M9 9h6M9 12.5h6M9 16h3.5"></path></svg>', openTimeline),
      make("v11CardBtn", "Share card", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="3"></rect><path d="M8.5 15.5l2.5-3 2 2 2.5-3.5"></path><circle cx="9.5" cy="8.5" r="1.4"></circle></svg>', openCard)
    );
  }

  // ---------------------------------------------------------------------
  // 7. Achievements
  // ---------------------------------------------------------------------
  const BADGES = [
    ["first-chat", "💬", "First chat", "Send your first message", s => s.sent >= 1],
    ["talker", "🗣️", "Chatterbox", "Send 100 messages", s => s.sent >= 100],
    ["legend", "👑", "Legend", "Send 1,000 messages", s => s.sent >= 1000],
    ["creator", "🎨", "Creator", "Create your first character", s => s.created >= 1],
    ["world", "🌍", "World builder", "Create 10 characters", s => s.created >= 10],
    ["explorer", "🧭", "Explorer", "Chat with 3 Explore characters", s => s.starters >= 3],
    ["photo", "📸", "Photographer", "Get a picture from a character", s => s.photos >= 1],
    ["saga", "📚", "Saga", "Reach 100 messages in one chat", s => s.longest >= 100],
    ["night", "🌙", "Night owl", "Chat between midnight and 4 a.m.", s => s.night],
    ["chati", "🤖", "Chati's friend", "Ask Chati for help", s => s.chati]
  ];

  function achievementStats() {
    const list = typeof characters !== "undefined" && Array.isArray(characters) ? characters : [];
    const stats = { sent: 0, created: 0, starters: 0, photos: 0, longest: 0, night: false, chati: false };
    list.forEach(character => {
      const own = chatsOf(character);
      const talked = own.some(chat => (chat.messages || []).some(m => m.sender === "user"));
      if (String(character.id).startsWith("starter_")) { if (talked) stats.starters += 1; }
      else if (!character.isGroup) stats.created += 1;
      own.forEach(chat => {
        const messages = chat.messages || [];
        stats.longest = Math.max(stats.longest, messages.length);
        messages.forEach(message => {
          if (message.sender === "user") {
            stats.sent += 1;
            const hour = message.time ? new Date(message.time).getHours() : 12;
            if (hour < 4) stats.night = true;
          } else if (message.sender === "character" && message.attachment?.type === "image") {
            stats.photos += 1;
          }
        });
      });
    });
    try { stats.chati = JSON.parse(localStorage.getItem("chatiAssistantHistoryV1") || "[]").some(m => m.role === "user"); } catch {}
    return stats;
  }

  const BADGES_KEY = "chatiAchievementsV1";
  let badgeTimer = 0;
  function checkAchievements() {
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      const stats = achievementStats();
      const earned = BADGES.filter(badge => badge[4](stats)).map(badge => badge[0]);
      let known = null;
      try { known = JSON.parse(localStorage.getItem(BADGES_KEY) || "null"); } catch {}
      const fresh = Array.isArray(known) ? earned.filter(id => !known.includes(id)) : [];
      // A burst (e.g. after cloud sync on a new device) is stored silently.
      if (fresh.length && fresh.length <= 2) {
        fresh.forEach(id => {
          const badge = BADGES.find(b => b[0] === id);
          toast("🏆 " + t("Achievement unlocked") + ": " + badge[1] + " " + t(badge[2]), "info");
        });
      }
      // Never forget a badge (data may still be loading or syncing).
      const all = [...new Set([...(Array.isArray(known) ? known : []), ...earned])];
      try { localStorage.setItem(BADGES_KEY, JSON.stringify(all)); } catch {}
    }, 1200);
  }

  function badgesElement() {
    const stats = achievementStats();
    const grid = document.createElement("div");
    grid.className = "v11-badges";
    const earnedCount = BADGES.filter(b => b[4](stats)).length;
    grid.innerHTML =
      '<div class="v11-badges-head"><strong>🏆 ' + t("Achievements") + "</strong><span>" + earnedCount + "/" + BADGES.length + "</span></div>" +
      '<div class="v11-badges-grid">' +
        BADGES.map(([, emoji, name, hint, test]) =>
          '<div class="v11-badge' + (test(stats) ? " earned" : "") + '" title="' + t(hint) + '"><span>' + emoji + "</span><small>" + t(name) + "</small></div>"
        ).join("") +
      "</div>";
    return grid;
  }

  function decorateProfileBadges() {
    const panel = document.getElementById("v6ProfilePanel");
    const anchor = panel?.querySelector(".v10-profile-stats") || panel?.querySelector(".v6-panel-head");
    if (!anchor || panel.querySelector(".v11-badges")) return;
    anchor.insertAdjacentElement("afterend", badgesElement());
  }

  // ---------------------------------------------------------------------
  // 10. Swipe to discover
  // ---------------------------------------------------------------------
  function openDiscover() {
    const explore = window.ChatiExplore;
    if (!explore) return;
    const deck = explore.starters.filter(starter => explore.hasArt?.(starter));
    if (!deck.length) return;
    let index = 0;

    const overlay = document.createElement("div");
    overlay.className = "v11-modal v11-discover";
    overlay.innerHTML =
      '<div class="v11-discover-stage"></div>' +
      '<button type="button" data-close class="v11-discover-close" aria-label="' + t("Close") + '">✕</button>' +
      '<div class="v11-discover-actions">' +
        '<button type="button" data-skip aria-label="' + t("Skip") + '">👎</button>' +
        '<button type="button" data-chat class="v11-primary">💬 ' + t("Chat now") + "</button>" +
      "</div>" +
      '<p class="v11-discover-hint">' + t("Swipe right to chat, left to skip") + "</p>";
    document.body.appendChild(overlay);
    const stage = overlay.querySelector(".v11-discover-stage");

    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };

    function render() {
      stage.innerHTML = "";
      if (index >= deck.length) {
        stage.innerHTML = '<div class="v11-discover-end"><img src="' + ROBOT + '" alt=""><strong>' + t("You've seen them all!") + '</strong><button type="button" data-again class="v11-primary">↻ ' + t("Start over") + "</button></div>";
        stage.querySelector("[data-again]").addEventListener("click", () => { index = 0; render(); });
        return;
      }
      [deck[index + 1], deck[index]].filter(Boolean).forEach((starter, layer, arr) => {
        const top = layer === arr.length - 1;
        const card = document.createElement("div");
        card.className = "v11-swipe-card" + (top ? " top" : " under");
        const art = explore.profileArt(starter);
        const backgroundArt = art.replace(".webp", "-bg.webp");
        card.style.setProperty("--bg", 'url("' + backgroundArt + '")');
        card.innerHTML =
          '<img class="v11-swipe-portrait" alt="" src="' + art + '">' +
          '<div class="v11-swipe-copy"><span class="v11-swipe-tags"></span><strong></strong><p></p></div>' +
          '<span class="v11-stamp like">💬</span><span class="v11-stamp nope">✕</span>';
        card.querySelector("strong").textContent = starter.name;
        card.querySelector("p").textContent = starter[lang()].scenario;
        card.querySelector(".v11-swipe-tags").textContent = (starter.tags || []).map(tag => explore.tagLabel?.(tag) || tag).join(" · ");
        stage.appendChild(card);
        if (top) enableDrag(card, starter);
      });
    }

    function decide(card, starter, like) {
      card.classList.add(like ? "out-right" : "out-left");
      setTimeout(() => {
        if (like) {
          close();
          explore.open(starter);
        } else {
          index += 1;
          render();
        }
      }, 260);
    }

    function enableDrag(card, starter) {
      let startX = 0, dx = 0, dragging = false;
      card.addEventListener("pointerdown", event => {
        dragging = true;
        startX = event.clientX;
        card.setPointerCapture(event.pointerId);
        card.style.transition = "none";
      });
      card.addEventListener("pointermove", event => {
        if (!dragging) return;
        dx = event.clientX - startX;
        card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 18 + "deg)";
        card.style.setProperty("--like", String(Math.max(0, Math.min(1, dx / 120))));
        card.style.setProperty("--nope", String(Math.max(0, Math.min(1, -dx / 120))));
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        card.style.transition = "";
        if (Math.abs(dx) > 110) decide(card, starter, dx > 0);
        else {
          card.style.transform = "";
          card.style.setProperty("--like", "0");
          card.style.setProperty("--nope", "0");
        }
        dx = 0;
      };
      card.addEventListener("pointerup", end);
      card.addEventListener("pointercancel", end);
    }

    const topCard = () => stage.querySelector(".v11-swipe-card.top");
    overlay.querySelector("[data-skip]").addEventListener("click", () => { const c = topCard(); if (c) decide(c, deck[index], false); });
    overlay.querySelector("[data-chat]").addEventListener("click", () => { const c = topCard(); if (c) decide(c, deck[index], true); });
    overlay.querySelector("[data-close]").addEventListener("click", close);
    const onKey = event => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") overlay.querySelector("[data-skip]").click();
      if (event.key === "ArrowRight") overlay.querySelector("[data-chat]").click();
    };
    document.addEventListener("keydown", onKey);
    render();
  }

  // ---------------------------------------------------------------------
  // Settings toggles: background effects, sounds & vibration
  // ---------------------------------------------------------------------
  function ensureSettings() {
    const mature = document.querySelector(".mature-content-row");
    if (!mature || document.getElementById("v11EffectsToggle")) return;
    const row = (id, title, note, key) => {
      const wrap = document.createElement("div");
      wrap.className = "mature-content-row v11-setting-row";
      const on = pref(key);
      wrap.innerHTML =
        '<div class="mature-content-copy"><strong>' + t(title) + "</strong><span>" + t(note) + "</span></div>" +
        '<button id="' + id + '" type="button" class="mature-content-toggle' + (on ? " is-on" : "") + '" role="switch" aria-checked="' + on + '" aria-label="' + t(title) + '"><span class="mature-content-knob"></span></button>';
      wrap.querySelector("button").addEventListener("click", event => {
        const button = event.currentTarget;
        const next = !button.classList.contains("is-on");
        button.classList.toggle("is-on", next);
        button.setAttribute("aria-checked", String(next));
        setPref(key, next);
        syncEffects();
      });
      return wrap;
    };
    mature.insertAdjacentElement("afterend", row("v11SoundsToggle", "Sounds & vibration", "Soft sounds when messages are sent and received.", SOUNDS_KEY));
    mature.insertAdjacentElement("afterend", row("v11EffectsToggle", "Living backgrounds", "Rain, snow, embers, stars… based on each character's world.", EFFECTS_KEY));
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------
  // Trailing debounce: while a reply streams, #messages changes every frame,
  // so this waits until the text settles and then runs once.
  let syncTimer = 0;
  let headerTimer = 0;
  function syncChat() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (typeof isSending !== "undefined" && isSending) {
        // Still streaming: check again shortly instead of doing the heavy work.
        syncChat();
        return;
      }
      ensureHeaderButtons();
      applyTint();
      syncEffects();
      clearTimeout(headerTimer);
      headerTimer = setTimeout(syncHeader, 350);
      decorateVoices();
      watchNewMessages();
      checkAchievements();
    }, 150);
  }

  function initialize() {
    document.documentElement.classList.add("v11");
    ensureSettings();
    syncChat();

    const messages = document.getElementById("messages");
    // Listen buttons go on new bubbles right away (observer callbacks run
    // before the next paint), so they never blink in a moment later.
    if (messages) new MutationObserver(records => {
      if (records.some(record => record.target === messages && record.addedNodes.length)) decorateVoices();
      syncChat();
    }).observe(messages, { childList: true, subtree: true });

    let bodyTimer = 0;
    new MutationObserver(records => {
      if (messages && records.every(record => messages.contains(record.target))) return;
      clearTimeout(bodyTimer);
      bodyTimer = setTimeout(() => {
        decorateProfileBadges();
        ensureSettings();
      }, 200);
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) syncEffects();
    });
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});

    // Seed the achievements list silently the first time.
    checkAchievements();
  }

  window.ChatiExtras = Object.freeze({ openCard, openTimeline, openDiscover, pickEffect, moodOf, bondOf, badgesElement, characterHue, loadImage });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
