// CHATI-AI V14 — character voices with ElevenLabs.
//
// Character editor: a "Voice" section to pick a voice from the ElevenLabs
// library, or clone one from 10+ seconds of audio (recorded with the mic or
// uploaded) — only after confirming the person has the right to use it.
// Chat: the 🔊 button plays the reply in the character's voice; characters
// without one keep the browser voice.
(() => {
  "use strict";

  const MIN_SECONDS = 10;
  const t = text => window.ChatiI18n?.t?.(text) ?? text;
  const translateError = text => {
    const missing = String(text).match(/^The ElevenLabs key is missing permissions(?: \(([a-z_]+)\))?/);
    if (missing && window.ChatiI18n?.lang === "es") {
      return "A la clave de ElevenLabs le faltan permisos" + (missing[1] ? ` (${missing[1]})` : "") +
        ". Crea una clave con “Restrict key” apagado, o activa Voices: Write y Text to Speech: Access.";
    }
    return t(text);
  };
  const toast = (text, kind) => window.ChatiToast?.(translateError(text), kind);
  const escapeHtml = text => String(text ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  let status = null; // { enabled, voices }

  async function loadVoices(fresh = false) {
    if (status && !fresh) return status;
    try {
      const response = await fetch("/api/voices" + (fresh ? "?fresh=1" : ""));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load voices.");
      status = { enabled: Boolean(data.enabled), voices: Array.isArray(data.voices) ? data.voices : [], error: "" };
    } catch (error) {
      status = { enabled: true, voices: [], error: error.message };
    }
    return status;
  }

  // ---------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------
  const audioCache = new Map();
  let playing = null;

  function stop() {
    if (playing) {
      playing.audio.pause();
      playing.button?.classList.remove("playing", "loading");
      playing = null;
    }
  }

  async function play(button, text, character) {
    const voiceId = character?.voiceId;
    if (!voiceId) return false;
    if (playing && playing.button === button) {
      stop();
      return true;
    }
    stop();
    window.speechSynthesis?.cancel?.();
    const key = voiceId + "|" + text;
    button?.classList.add("loading");
    try {
      let url = audioCache.get(key);
      if (!url) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceId, text })
        });
        if (!response.ok) {
          let message = "Couldn't play the character's voice.";
          try { message = (await response.json()).error || message; } catch {}
          throw new Error(message);
        }
        url = URL.createObjectURL(await response.blob());
        audioCache.set(key, url);
        if (audioCache.size > 40) {
          const [oldKey, oldUrl] = audioCache.entries().next().value;
          URL.revokeObjectURL(oldUrl);
          audioCache.delete(oldKey);
        }
      }
      const audio = new Audio(url);
      playing = { audio, button };
      button?.classList.remove("loading");
      button?.classList.add("playing");
      audio.onended = audio.onerror = () => {
        if (playing?.audio === audio) stop();
      };
      await audio.play();
      return true;
    } catch (error) {
      button?.classList.remove("loading", "playing");
      if (playing?.button === button) playing = null;
      toast(error.message, "error");
      return true;
    }
  }

  // The character who wrote a bubble (group chats have several).
  function characterForBubble(bubble) {
    const character = typeof currentCharacter !== "undefined" ? currentCharacter : null;
    const isGroup = character && typeof isGroupCharacter === "function" && isGroupCharacter(character);
    if (!isGroup) return character;
    const id = bubble?.dataset?.messageId;
    const message = typeof getCurrentChat === "function" ? getCurrentChat()?.messages?.find(item => String(item.id) === String(id)) : null;
    return (message?.characterId && typeof getCharacterById === "function" && getCharacterById(message.characterId)) || null;
  }

  // ---------------------------------------------------------------------
  // Character editor
  // ---------------------------------------------------------------------
  const field = id => document.getElementById(id);

  function currentChoice() {
    return { id: field("characterVoiceId")?.value || "", name: field("characterVoiceName")?.value || "" };
  }

  function setChoice(id, name) {
    const idInput = field("characterVoiceId");
    const nameInput = field("characterVoiceName");
    if (!idInput || !nameInput) return;
    idInput.value = id || "";
    nameInput.value = id ? name || "Voice" : "";
    renderSection();
  }

  function ensureSection() {
    const section = field("v14VoiceField");
    if (!section || section.dataset.ready) return;
    section.dataset.ready = "1";
    renderSection();
    loadVoices().then(renderSection);
  }

  const ICONS = {
    wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3"></path></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"></path></svg>',
    library: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0"></path><rect x="3.5" y="13" width="4" height="6.5" rx="1.6"></rect><rect x="16.5" y="13" width="4" height="6.5" rx="1.6"></rect></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"></path></svg>',
    design: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"></path><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"></path></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path></svg>',
    record: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"></circle></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"></rect></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M5 15.5v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5"></path></svg>'
  };

  function renderSection() {
    const section = field("v14VoiceField");
    if (!section) return;
    const card = field("v14VoiceCard");
    if (card) card.hidden = Boolean(status && !status.enabled);
    const choice = currentChoice();
    const voice = choice.id ? (status?.voices || []).find(item => item.id === choice.id) : null;
    const subtitle = choice.id
      ? "ElevenLabs" + (voice?.category === "cloned" ? " · " + t("Cloned") : "")
      : t("Basic voice from your browser");
    section.innerHTML =
      '<div class="v14-current' + (choice.id ? " has-voice" : "") + '">' +
      '<span class="v14-current-icon">' + ICONS.wave + "</span>" +
      '<div class="v14-current-text"><strong>' + escapeHtml(choice.id ? choice.name : t("Device voice")) + "</strong><small>" + escapeHtml(subtitle) + "</small></div>" +
      (choice.id
        ? '<button type="button" class="v14-play" data-v14="test" aria-label="' + escapeHtml(t("Test")) + '" title="' + escapeHtml(t("Test")) + '">' + ICONS.play + "</button>" +
          '<button type="button" class="v14-link" data-v14="clear">' + escapeHtml(t("Remove")) + "</button>"
        : "") +
      "</div>" +
      '<div class="v14-options">' +
      '<button type="button" class="v14-option" data-v14="design"><span class="v14-option-icon">' + ICONS.design + "</span><span><strong>" +
      escapeHtml(t("Design a voice")) + "</strong><small>" + escapeHtml(t("Describe how they sound and get a brand-new voice made for them.")) + "</small></span></button>" +
      '<button type="button" class="v14-option" data-v14="pick"><span class="v14-option-icon">' + ICONS.library + "</span><span><strong>" +
      escapeHtml(t("Voice library")) + "</strong><small>" + escapeHtml(t("Ready-made ElevenLabs voices: deep, young, villain, narrator…")) + "</small></span></button>" +
      '<button type="button" class="v14-option" data-v14="clone"><span class="v14-option-icon">' + ICONS.mic + "</span><span><strong>" +
      escapeHtml(t("Clone a voice")) + "</strong><small>" + escapeHtml(t("From 10+ seconds of your voice, or of someone who gave you permission.")) + "</small></span></button>" +
      "</div>";
  }

  async function testVoice(button) {
    const choice = currentChoice();
    const name = field("characterName")?.value.trim() || "";
    const sample = window.ChatiI18n?.lang === "es"
      ? `Hola, soy ${name || "tu personaje"}. ¿Así suena mi voz?`
      : `Hi, I'm ${name || "your character"}. Is this how I sound?`;
    await play(button, sample, { voiceId: choice.id });
  }

  // Voice picker -----------------------------------------------------------
  function closeSheet() {
    stopRecording();
    document.getElementById("v14VoiceSheet")?.remove();
    previewAudio?.pause();
  }

  function openSheet(title, body) {
    closeSheet();
    const sheet = document.createElement("div");
    sheet.id = "v14VoiceSheet";
    sheet.className = "v14-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.innerHTML =
      '<div class="v14-sheet-panel"><div class="v14-sheet-head"><strong>' + escapeHtml(title) +
      '</strong><button type="button" class="v14-sheet-close" aria-label="' + escapeHtml(t("Close")) + '">' + ICONS.close + "</button></div>" +
      '<div class="v14-sheet-body">' + body + "</div></div>";
    document.body.appendChild(sheet);
    sheet.addEventListener("click", event => { if (event.target === sheet) closeSheet(); });
    sheet.querySelector(".v14-sheet-close").addEventListener("click", closeSheet);
    return sheet;
  }

  let previewAudio = null;

  async function openPicker() {
    const sheet = openSheet(t("Choose a voice"), '<input type="search" class="v14-voice-search" placeholder="' + escapeHtml(t("Search voices…")) + '"><div class="v14-voice-list"><p class="v14-muted">' + escapeHtml(t("Loading voices…")) + "</p></div>");
    const data = await loadVoices(true);
    if (!sheet.isConnected) return;
    const list = sheet.querySelector(".v14-voice-list");
    const draw = query => {
      const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
      const voices = data.voices.filter(voice => {
        const text = [voice.name, voice.category, voice.description, ...Object.values(voice.labels || {})].join(" ").toLowerCase();
        return words.every(word => text.includes(word));
      });
      if (data.error) {
        list.innerHTML = '<p class="v14-muted">' + escapeHtml(translateError(data.error)) + "</p>";
        return;
      }
      list.innerHTML = voices.length
        ? voices.map(voice =>
          '<div class="v14-voice-row" data-id="' + escapeHtml(voice.id) + '">' +
          "<div><strong>" + escapeHtml(voice.name) + "</strong><small>" +
          escapeHtml([voice.category === "cloned" ? t("Cloned") : "", ...Object.values(voice.labels || {})].filter(Boolean).join(" · ")) +
          "</small></div>" +
          (voice.previewUrl ? '<button type="button" class="v14-round" data-preview="' + escapeHtml(voice.previewUrl) + '" aria-label="' + escapeHtml(t("Test")) + '">' + ICONS.play + "</button>" : "") +
          '<button type="button" class="v14-use">' + escapeHtml(t("Use")) + "</button></div>").join("")
        : '<p class="v14-muted">' + escapeHtml(t("No voices found.")) + "</p>";
    };
    draw("");
    sheet.querySelector(".v14-voice-search").addEventListener("input", event => draw(event.target.value));
    list.addEventListener("click", event => {
      const preview = event.target.closest("[data-preview]");
      if (preview) {
        previewAudio?.pause();
        previewAudio = new Audio(preview.dataset.preview);
        previewAudio.play().catch(() => {});
        return;
      }
      const use = event.target.closest(".v14-use");
      if (use) {
        const row = use.closest(".v14-voice-row");
        const voice = data.voices.find(item => item.id === row.dataset.id);
        setChoice(voice.id, voice.name);
        closeSheet();
        toast("Voice selected. Save the character to keep it.");
      }
    });
  }

  // Voice design -----------------------------------------------------------
  // [label, English description, Spanish description]
  const STYLE_PRESETS = [
    ["Young and energetic", "Teenage boy, around 17, bright and slightly high voice, energetic, fast talker, jokes a lot, nervous laugh when embarrassed.", "Chico adolescente de unos 17 años, voz clara y algo aguda, energético, habla rápido, bromea mucho y se ríe nervioso cuando se avergüenza."],
    ["Deep villain", "Adult man, very deep and calm voice, slow and menacing delivery, cold and confident, a hint of amusement.", "Hombre adulto, voz muy grave y tranquila, habla lento y amenazante, frío y seguro, con un toque burlón."],
    ["Sweet and soft", "Young woman, soft and warm voice, gentle and kind, speaks calmly with a smile in her voice.", "Mujer joven, voz suave y cálida, dulce y amable, habla con calma y se le nota la sonrisa."],
    ["Cocky and playful", "Young adult man, smooth and relaxed voice, cocky and teasing tone, playful and carefree, confident.", "Hombre joven, voz suave y relajada, tono arrogante y burlón, juguetón, despreocupado y muy seguro de sí."],
    ["Rough warrior", "Adult man, rough and gravelly voice, strong and loud, short direct sentences, battle-hardened.", "Hombre adulto, voz ronca y áspera, fuerte, frases cortas y directas, curtido en batalla."],
    ["Elegant and cold", "Adult woman, elegant and composed voice, cool and distant tone, precise and refined diction.", "Mujer adulta, voz elegante y serena, tono frío y distante, dicción precisa y refinada."]
  ];

  function defaultSampleLine() {
    const name = field("characterName")?.value.trim() || "";
    return window.ChatiI18n?.lang === "es"
      ? `¿Así que por fin llegaste? Soy ${name || "yo"}, y te estaba esperando. No te preocupes, no muerdo… bueno, no siempre. Ven, siéntate, que tenemos mucho de qué hablar.`
      : `So you finally made it? I'm ${name || "the one you were looking for"}, and I've been waiting for you. Relax, I don't bite… well, not always. Come on, sit down, we have a lot to talk about.`;
  }

  function openDesigner() {
    const name = (field("characterName")?.value.trim() || t("New voice")).slice(0, 60);
    const sheet = openSheet(t("Design a voice"),
      '<p class="v14-muted">' + escapeHtml(t("Describe the voice: age, gender, tone, speed, accent and personality. ElevenLabs creates three versions for you to pick from.")) + "</p>" +
      '<label class="v14-clone-label">' + escapeHtml(t("Voice description")) +
      '<textarea class="v14-textarea v14-design-desc" rows="3" maxlength="1000" placeholder="' + escapeHtml(t("Example: teenage boy, slightly high voice, energetic and joking, talks fast")) + '"></textarea></label>' +
      '<div class="v14-presets">' + STYLE_PRESETS.map(([label], index) => '<button type="button" class="v14-preset" data-preset="' + index + '">' + escapeHtml(t(label)) + "</button>").join("") + "</div>" +
      '<label class="v14-clone-label">' + escapeHtml(t("Test line")) +
      '<textarea class="v14-textarea v14-design-text" rows="3" maxlength="1000">' + escapeHtml(defaultSampleLine()) + "</textarea>" +
      '<small class="v14-hint">' + escapeHtml(t("At least 100 characters. It's what the previews will say.")) + "</small></label>" +
      '<button type="button" class="v14-primary v14-design-go">' + ICONS.design + "<span>" + escapeHtml(t("Create voices")) + "</span></button>" +
      '<div class="v14-design-results"></div>');

    const description = sheet.querySelector(".v14-design-desc");
    const line = sheet.querySelector(".v14-design-text");
    const go = sheet.querySelector(".v14-design-go");
    const results = sheet.querySelector(".v14-design-results");

    sheet.querySelector(".v14-presets").addEventListener("click", event => {
      const preset = event.target.closest("[data-preset]");
      if (!preset) return;
      const presetRow = STYLE_PRESETS[Number(preset.dataset.preset)];
      description.value = window.ChatiI18n?.lang === "es" ? presetRow[2] : presetRow[1];
      sheet.querySelectorAll(".v14-preset").forEach(node => node.classList.toggle("active", node === preset));
    });

    go.addEventListener("click", async () => {
      const text = line.value.trim();
      if (description.value.trim().length < 20) { toast("Describe the voice in a bit more detail (20+ characters).", "error"); return; }
      if (text.length < 100) { toast("The sample line must be at least 100 characters.", "error"); return; }
      go.disabled = true;
      go.classList.add("busy");
      go.querySelector("span").textContent = t("Creating voices…");
      results.innerHTML = "";
      try {
        const response = await fetch("/api/voices/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: description.value.trim(), text, language: window.ChatiI18n?.lang === "es" ? "es" : "en" })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Couldn't create the voices.");
        results.innerHTML =
          '<p class="v14-results-title">' + escapeHtml(t("Pick the one you like")) + "</p>" +
          data.previews.map((preview, index) =>
            '<div class="v14-preview" data-id="' + escapeHtml(preview.id) + '">' +
            '<button type="button" class="v14-play" data-audio="' + index + '" aria-label="' + escapeHtml(t("Test")) + '">' + ICONS.play + "</button>" +
            '<div class="v14-current-text"><strong>' + escapeHtml(t("Option")) + " " + (index + 1) + "</strong><small>" + (preview.seconds ? Math.round(preview.seconds) + " s" : "") + "</small></div>" +
            '<button type="button" class="v14-secondary v14-keep">' + escapeHtml(t("Use this voice")) + "</button></div>").join("");
        results.__previews = data.previews;
      } catch (error) {
        toast(error.message, "error");
      } finally {
        go.disabled = false;
        go.classList.remove("busy");
        go.querySelector("span").textContent = t("Create again");
      }
    });

    results.addEventListener("click", async event => {
      const previews = results.__previews || [];
      const playButton = event.target.closest("[data-audio]");
      if (playButton) {
        const preview = previews[Number(playButton.dataset.audio)];
        if (previewAudio && previewAudio.__button === playButton && !previewAudio.paused) {
          previewAudio.pause();
          playButton.classList.remove("playing");
          return;
        }
        previewAudio?.pause();
        results.querySelectorAll(".v14-play.playing").forEach(node => node.classList.remove("playing"));
        previewAudio = new Audio(preview.audio);
        previewAudio.__button = playButton;
        playButton.classList.add("playing");
        previewAudio.onended = () => playButton.classList.remove("playing");
        previewAudio.play().catch(() => playButton.classList.remove("playing"));
        return;
      }
      const keep = event.target.closest(".v14-keep");
      if (!keep) return;
      const row = keep.closest(".v14-preview");
      keep.disabled = true;
      keep.textContent = t("Saving…");
      try {
        const response = await fetch("/api/voices/design/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: description.value.trim(), generatedVoiceId: row.dataset.id })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Couldn't save the voice.");
        status = null;
        setChoice(data.id, data.name);
        closeSheet();
        toast("Voice created. Save the character to keep it.");
      } catch (error) {
        toast(error.message, "error");
        keep.disabled = false;
        keep.textContent = t("Use this voice");
      }
    });
  }

  // Voice cloning ----------------------------------------------------------
  let recorder = null;
  let recordTimer = 0;
  let samples = []; // [{ blob, seconds, label }]

  function stopRecording() {
    clearInterval(recordTimer);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder = null;
  }

  function totalSeconds() {
    return samples.reduce((sum, sample) => sum + (sample.seconds || 0), 0);
  }

  function blobDuration(blob) {
    return new Promise(resolve => {
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(blob);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const finite = Number.isFinite(audio.duration) ? audio.duration : 0;
        URL.revokeObjectURL(url);
        resolve(finite);
      };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      audio.src = url;
    });
  }

  function toDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function guessAudioType(name) {
    const extension = String(name || "").toLowerCase().split(".").pop();
    return { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", webm: "audio/webm", flac: "audio/flac", aac: "audio/aac", m4a: "audio/mp4", mp4: "audio/mp4", mov: "video/quicktime" }[extension] || "audio/mp4";
  }

  // Any audio the browser can play (iPhone voice memos, mp3, recordings…)
  // becomes a mono 22 kHz WAV, so ElevenLabs always gets a format it reads
  // and the length is exact.
  async function toWav(blob) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return { blob, seconds: await blobDuration(blob) };
    const context = new AudioCtx();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const rate = 22050;
      const length = Math.ceil(decoded.duration * rate);
      const offline = new OfflineAudioContext(1, length, rate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start();
      const rendered = await offline.startRendering();
      const samples = rendered.getChannelData(0);
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);
      const write = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
      write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); write(8, "WAVE");
      write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      write(36, "data"); view.setUint32(40, samples.length * 2, true);
      for (let index = 0; index < samples.length; index += 1) {
        const value = Math.max(-1, Math.min(1, samples[index]));
        view.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      }
      return { blob: new Blob([buffer], { type: "audio/wav" }), seconds: decoded.duration };
    } finally {
      context.close?.();
    }
  }

  function openCloner() {
    samples = [];
    const defaultName = (field("characterName")?.value.trim() || t("My voice")).slice(0, 60);
    const sheet = openSheet(t("Clone a voice"),
      '<p class="v14-muted">' + escapeHtml(t("Record or upload at least 10 seconds of clear speech, with no music or other voices. More audio (30–60 s) sounds better.")) + "</p>" +
      '<div class="v14-clone-actions">' +
      '<button type="button" class="v14-record">' + ICONS.record + "<span>" + escapeHtml(t("Record")) + "</span></button>" +
      '<label class="v14-upload">' + ICONS.upload + "<span>" + escapeHtml(t("Upload audio")) + "</span>" + '<input type="file" accept="audio/*,video/webm" multiple hidden></label>' +
      "</div>" +
      '<div class="v14-samples"></div>' +
      '<label class="v14-clone-label">' + escapeHtml(t("Voice name")) + '<input type="text" class="v14-clone-name" maxlength="60" value="' + escapeHtml(defaultName) + '"></label>' +
      '<label class="v14-consent"><input type="checkbox" class="v14-consent-box"> <span>' +
      escapeHtml(t("This is my own voice, or I have the owner's permission to clone it. I won't clone voice actors, celebrities or anyone else without their consent.")) +
      "</span></label>" +
      '<button type="button" class="v14-clone-go" disabled>' + escapeHtml(t("Clone voice")) + "</button>");

    const recordButton = sheet.querySelector(".v14-record");
    const list = sheet.querySelector(".v14-samples");
    const go = sheet.querySelector(".v14-clone-go");
    const consent = sheet.querySelector(".v14-consent-box");

    const refresh = () => {
      const seconds = Math.round(totalSeconds());
      list.innerHTML = samples.map((sample, index) =>
        '<div class="v14-sample"><span>' + escapeHtml(sample.label) + " · " + Math.round(sample.seconds) +  ' s</span><button type="button" class="v14-round" data-remove="' + index + '" aria-label="' + escapeHtml(t("Remove")) + '">' + ICONS.close + "</button></div>").join("") +
        '<p class="v14-total' + (seconds >= MIN_SECONDS ? " ok" : "") + '">' + seconds + " / " + MIN_SECONDS + " s</p>";
      go.disabled = !(seconds >= MIN_SECONDS && consent.checked && !recorder);
    };
    refresh();
    consent.addEventListener("change", refresh);
    list.addEventListener("click", event => {
      const remove = event.target.closest("[data-remove]");
      if (remove) { samples.splice(Number(remove.dataset.remove), 1); refresh(); }
    });

    recordButton.addEventListener("click", async () => {
      if (recorder) { stopRecording(); return; }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        toast("Recording isn't available on this device. Upload an audio file instead.", "error");
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast("Microphone permission was denied.", "error");
        return;
      }
      const chunks = [];
      const started = Date.now();
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const seconds = (Date.now() - started) / 1000;
        const raw = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        recordButton.innerHTML = ICONS.record + "<span>" + escapeHtml(t("Record")) + "</span>";
        recordButton.classList.remove("recording");
        if (!raw.size) { refresh(); return; }
        toWav(raw)
          .then(wav => samples.push({ blob: wav.blob, seconds: wav.seconds || seconds, label: t("Recording") + " " + (samples.length + 1) }))
          .catch(() => samples.push({ blob: raw, seconds, label: t("Recording") + " " + (samples.length + 1) }))
          .finally(refresh);
      };
      recorder.start();
      recordButton.classList.add("recording");
      recordTimer = setInterval(() => {
        recordButton.innerHTML = ICONS.stop + "<span>" + escapeHtml(t("Stop")) + " · " + Math.floor((Date.now() - started) / 1000) + " s</span>";
      }, 250);
      refresh();
    });

    sheet.querySelector(".v14-upload input").addEventListener("change", async event => {
      for (const file of [...event.target.files].slice(0, 5)) {
        if (file.size > 40 * 1024 * 1024) { toast("Each sample must be under 10 MB.", "error"); continue; }
        try {
          const wav = await toWav(file);
          samples.push({ blob: wav.blob, seconds: wav.seconds, label: file.name.slice(0, 40) });
        } catch {
          // This browser can't decode it (e.g. AAC on some Linux builds):
          // send the original file and let ElevenLabs read it.
          const blob = file.type ? file : new Blob([file], { type: guessAudioType(file.name) });
          const seconds = await blobDuration(blob);
          samples.push({ blob, seconds: seconds || MIN_SECONDS, label: file.name.slice(0, 40) + (seconds ? "" : " · ?") });
        }
      }
      event.target.value = "";
      refresh();
    });

    go.addEventListener("click", async () => {
      go.disabled = true;
      go.textContent = t("Cloning…");
      try {
        const response = await fetch("/api/voices/clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: sheet.querySelector(".v14-clone-name").value.trim() || defaultName,
            consent: consent.checked === true,
            samples: await Promise.all(samples.map(sample => toDataUrl(sample.blob)))
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Couldn't clone the voice.");
        status = null;
        setChoice(data.id, data.name);
        closeSheet();
        toast("Voice cloned! Save the character to keep it.");
      } catch (error) {
        toast(error.message, "error");
        go.textContent = t("Clone voice");
        refresh();
      }
    });
  }

  function initialize() {
    window.ChatiVoice = { play, stop, characterForBubble, loadVoices };
    ensureSection();
    new MutationObserver(() => ensureSection()).observe(document.body, { childList: true, subtree: false });
    document.addEventListener("click", event => {
      const action = event.target.closest?.("#v14VoiceField [data-v14]")?.dataset.v14;
      if (!action) return;
      event.preventDefault();
      if (action === "pick") openPicker();
      if (action === "clone") openCloner();
      if (action === "design") openDesigner();
      if (action === "clear") setChoice("", "");
      if (action === "test") testVoice(event.target.closest("button"));
    });
    // The editor fills / resets these fields when it opens a character.
    ["characterVoiceId", "characterVoiceName"].forEach(id => field(id)?.addEventListener("input", renderSection));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSheet(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
