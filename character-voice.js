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
  const toast = (text, kind) => window.ChatiToast?.(t(text), kind);
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
    const anchor = document.querySelector(".reply-length-field");
    if (!anchor || field("v14VoiceField")) return;
    const section = document.createElement("div");
    section.id = "v14VoiceField";
    section.className = "v14-voice-field";
    anchor.insertAdjacentElement("afterend", section);
    renderSection();
    loadVoices().then(renderSection);
  }

  function renderSection() {
    const section = field("v14VoiceField");
    if (!section) return;
    if (status && !status.enabled) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    const choice = currentChoice();
    section.innerHTML =
      '<label>' + escapeHtml(t("Character voice")) + "</label>" +
      '<div class="v14-voice-current">' +
      '<span class="v14-voice-chip">' + (choice.id ? "🔊 " + escapeHtml(choice.name) : escapeHtml(t("Device voice (default)"))) + "</span>" +
      (choice.id ? '<button type="button" data-v14="test">▶ ' + escapeHtml(t("Test")) + '</button><button type="button" data-v14="clear">' + escapeHtml(t("Remove")) + "</button>" : "") +
      "</div>" +
      '<div class="v14-voice-actions">' +
      '<button type="button" data-v14="pick">🎧 ' + escapeHtml(t("Choose an ElevenLabs voice")) + "</button>" +
      '<button type="button" data-v14="clone">🎙️ ' + escapeHtml(t("Clone a voice")) + "</button>" +
      "</div>" +
      "<small>" + escapeHtml(t("The 🔊 button in the chat reads the character's lines with this voice.")) + "</small>";
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
      '</strong><button type="button" class="v14-sheet-close" aria-label="' + escapeHtml(t("Close")) + '">✕</button></div>' +
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
        list.innerHTML = '<p class="v14-muted">' + escapeHtml(t(data.error)) + "</p>";
        return;
      }
      list.innerHTML = voices.length
        ? voices.map(voice =>
          '<div class="v14-voice-row" data-id="' + escapeHtml(voice.id) + '">' +
          "<div><strong>" + escapeHtml(voice.name) + "</strong><small>" +
          escapeHtml([voice.category === "cloned" ? t("Cloned") : "", ...Object.values(voice.labels || {})].filter(Boolean).join(" · ")) +
          "</small></div>" +
          (voice.previewUrl ? '<button type="button" data-preview="' + escapeHtml(voice.previewUrl) + '">▶</button>' : "") +
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

  function openCloner() {
    samples = [];
    const defaultName = (field("characterName")?.value.trim() || t("My voice")).slice(0, 60);
    const sheet = openSheet(t("Clone a voice"),
      '<p class="v14-muted">' + escapeHtml(t("Record or upload at least 10 seconds of clear speech, with no music or other voices. More audio (30–60 s) sounds better.")) + "</p>" +
      '<div class="v14-clone-actions">' +
      '<button type="button" class="v14-record">⏺ ' + escapeHtml(t("Record")) + "</button>" +
      '<label class="v14-upload">⬆ ' + escapeHtml(t("Upload audio")) + '<input type="file" accept="audio/*,video/webm" multiple hidden></label>' +
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
        '<div class="v14-sample"><span>' + escapeHtml(sample.label) + " · " + Math.round(sample.seconds) + ' s</span><button type="button" data-remove="' + index + '">✕</button></div>').join("") +
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
        const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        if (blob.size) samples.push({ blob, seconds, label: t("Recording") + " " + (samples.length + 1) });
        recordButton.textContent = "⏺ " + t("Record");
        recordButton.classList.remove("recording");
        refresh();
      };
      recorder.start();
      recordButton.classList.add("recording");
      recordTimer = setInterval(() => {
        recordButton.textContent = "⏹ " + t("Stop") + " · " + Math.floor((Date.now() - started) / 1000) + " s";
      }, 250);
      refresh();
    });

    sheet.querySelector(".v14-upload input").addEventListener("change", async event => {
      for (const file of [...event.target.files].slice(0, 5)) {
        if (file.size > 10 * 1024 * 1024) { toast("Each sample must be under 10 MB.", "error"); continue; }
        samples.push({ blob: file, seconds: await blobDuration(file), label: file.name.slice(0, 40) });
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
