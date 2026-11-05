// CHATI-AI — voice calls with a character.
//
// The 📞 button in the chat header (only for characters with a voice)
// opens a full-screen call: a living orb in the middle, the character's
// voice (ElevenLabs, /api/tts) and the user's voice turned into text — by
// the browser (Web Speech API) or, where that is missing, by a short
// recording sent to /api/transcribe. Each turn goes to /api/chat with
// voiceCall: true, so the character answers in spoken lines, knowing the
// chat's story and memory.
//
// Every call is saved (calls rail button → "Calls"): who, when, how long
// and a transcript, with "Call again" to pick the conversation back up.
(() => {
  "use strict";

  const STORE_KEY = "chatiCallsV1";
  const MAX_CALLS = 60;
  const MAX_TURNS = 300;
  const SILENCE_MS = 1100;      // pause that ends what the user said
  const RECORD_SILENCE_MS = 1300;
  const MAX_RECORD_MS = 30000;

  const t = text => window.ChatiI18n?.t?.(text) ?? text;
  const es = () => (window.ChatiI18n?.lang || document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("es");
  const tr = (en, spanish) => (es() ? spanish : en);
  const escapeHtml = text => String(text ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const toast = (text, kind = "info") => window.ChatiToast?.(text, kind);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  // ---------------------------------------------------------------------
  // Saved calls
  // ---------------------------------------------------------------------
  function readCalls() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function writeCalls(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_CALLS)));
    } catch (_) {}
  }

  function saveCall(record) {
    const list = readCalls().filter(item => item.id !== record.id);
    list.unshift(record);
    writeCalls(list);
    renderCallsList();
  }

  function deleteCall(id) {
    writeCalls(readCalls().filter(item => item.id !== id));
    renderCallsList();
  }

  // ---------------------------------------------------------------------
  // Helpers from the app (script.js globals)
  // ---------------------------------------------------------------------
  const appCharacter = () => (typeof currentCharacter !== "undefined" ? currentCharacter : null);
  const isGroup = character => Boolean(character && typeof isGroupCharacter === "function" && isGroupCharacter(character));
  const canCall = character => Boolean(character && !isGroup(character) && /^[A-Za-z0-9]{8,64}$/.test(String(character.voiceId || "")));
  const avatarOf = character => String(character?.image || character?.avatar || "");
  const backgroundOf = character => String(character?.background || character?.chatBackground || "");

  function chatContext() {
    try {
      const chat = typeof getCurrentChat === "function" ? getCurrentChat() : null;
      if (!chat) return { chat: null, messages: [] };
      const list = typeof getActiveMessages === "function" ? getActiveMessages(chat) : chat.messages || [];
      const messages = list
        .filter(message => message && message.sender !== "system")
        .map(message => ({
          sender: message.sender === "user" ? "user" : "character",
          text: typeof getMessageText === "function" ? getMessageText(message) : String(message.text || "")
        }))
        .filter(message => message.text && message.text.trim())
        .slice(-30);
      return { chat, messages };
    } catch (_) {
      return { chat: null, messages: [] };
    }
  }

  function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes + ":" + String(seconds % 60).padStart(2, "0");
  }

  function formatWhen(time) {
    const date = new Date(time);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    const clock = date.toLocaleTimeString(es() ? "es" : "en", { hour: "numeric", minute: "2-digit" });
    if (sameDay) return tr("Today", "Hoy") + " · " + clock;
    if (yesterday) return tr("Yesterday", "Ayer") + " · " + clock;
    return date.toLocaleDateString(es() ? "es" : "en", { day: "numeric", month: "short" }) + " · " + clock;
  }

  const PHONE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8 9 3.3l1.7 4.1-2.1 1.4a11 11 0 0 0 6.6 6.6l1.4-2.1 4.1 1.7-.5 2.4a2.3 2.3 0 0 1-2.4 1.8A16.5 16.5 0 0 1 4.8 6.2a2.3 2.3 0 0 1 1.8-2.4Z"/></svg>';
  const CALLS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8 9 3.3l1.7 4.1-2.1 1.4a11 11 0 0 0 6.6 6.6l1.4-2.1 4.1 1.7-.5 2.4a2.3 2.3 0 0 1-2.4 1.8A16.5 16.5 0 0 1 4.8 6.2a2.3 2.3 0 0 1 1.8-2.4Z"/><path d="M14.5 3.5a6 6 0 0 1 6 6M14.5 7a2.5 2.5 0 0 1 2.5 2.5"/></svg>';
  const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
  const MIC_OFF_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 9.5V6a3 3 0 0 0-5.6-1.5M9 9v2a3 3 0 0 0 4.7 2.5M5.5 11a6.5 6.5 0 0 0 10.3 5.3M18.5 11c0 .8-.1 1.5-.4 2.2M12 17.5V21M4 4l16 16"/></svg>';
  const END_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 14.6c4.7-4.1 12.9-4.1 17.6 0l-.9 2.7-4-.9-.4-2.6a10 10 0 0 0-7 0l-.4 2.6-4 .9Z"/></svg>';

  // ---------------------------------------------------------------------
  // The call
  // ---------------------------------------------------------------------
  let call = null;

  function buildScreen(character) {
    const screen = document.createElement("section");
    screen.className = "chati-call";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-label", tr("Call with ", "Llamada con ") + character.name);
    const background = backgroundOf(character) || avatarOf(character);
    screen.innerHTML =
      '<div class="chati-call-bg"' + (background ? ' style="background-image:url(\'' + escapeHtml(background).replace(/'/g, "%27") + '\')"' : "") + '></div>' +
      '<div class="chati-call-shade"></div>' +
      '<header class="chati-call-top">' +
        '<span class="chati-call-avatar">' + (avatarOf(character) ? '<img alt="" src="' + escapeHtml(avatarOf(character)) + '">' : escapeHtml(character.name.charAt(0))) + '</span>' +
        '<div><strong>' + escapeHtml(character.name) + '</strong><small class="chati-call-timer">0:00</small></div>' +
      '</header>' +
      '<button type="button" class="chati-call-orb-wrap" aria-label="' + escapeHtml(tr("Tap to interrupt or talk", "Toca para interrumpir o hablar")) + '">' +
        '<span class="chati-call-orb"><i></i><i></i><i></i></span>' +
      '</button>' +
      '<p class="chati-call-status"></p>' +
      '<p class="chati-call-caption" aria-live="polite"></p>' +
      '<footer class="chati-call-controls">' +
        '<button type="button" class="chati-call-btn" data-call="mute" aria-pressed="false" aria-label="' + escapeHtml(tr("Mute", "Silenciar")) + '">' + MIC_ICON + '</button>' +
        '<button type="button" class="chati-call-btn is-end" data-call="end" aria-label="' + escapeHtml(tr("End call", "Colgar")) + '">' + END_ICON + '</button>' +
      '</footer>';
    document.body.appendChild(screen);
    requestAnimationFrame(() => screen.classList.add("is-open"));
    return screen;
  }

  function setState(state, status) {
    if (!call) return;
    call.state = state;
    call.screen.dataset.state = state;
    const texts = {
      connecting: tr("Calling…", "Llamando…"),
      listening: call.muted ? tr("Muted — tap the mic to talk", "Silenciado — toca el micrófono para hablar") : tr("Listening…", "Te escucha…"),
      thinking: tr("…", "…"),
      speaking: call.character.name,
      error: status || ""
    };
    call.screen.querySelector(".chati-call-status").textContent = status || texts[state] || "";
  }

  function setCaption(text, who = "user") {
    if (!call) return;
    const caption = call.screen.querySelector(".chati-call-caption");
    caption.dataset.who = who;
    caption.textContent = text || "";
  }

  // Orb: follows the microphone while listening and the voice while speaking.
  function animate() {
    if (!call) return;
    const analyser = call.state === "speaking" ? call.outAnalyser : call.micAnalyser;
    let level = 0;
    if (analyser) {
      const data = call.levelData || (call.levelData = new Uint8Array(analyser.fftSize));
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let index = 0; index < data.length; index += 1) {
        const value = (data[index] - 128) / 128;
        sum += value * value;
      }
      level = Math.min(1, Math.sqrt(sum / data.length) * (call.state === "speaking" ? 3.2 : 4.5));
      if (call.state === "listening" && call.muted) level = 0;
    }
    call.level = call.level * 0.72 + level * 0.28;
    call.screen.style.setProperty("--level", call.level.toFixed(3));
    call.frame = requestAnimationFrame(animate);
  }

  function tickTimer() {
    if (!call) return;
    const timer = call.screen.querySelector(".chati-call-timer");
    if (timer) timer.textContent = formatDuration(Date.now() - call.record.startedAt);
  }

  async function startCall(character, { previous = null } = {}) {
    if (call) return;
    if (!canCall(character)) {
      toast(tr("Give this character a voice first (Edit character → Character voice).", "Primero ponle voz a este personaje (Editar personaje → Voz del personaje)."), "info");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast(tr("This browser can't use the microphone.", "Este navegador no puede usar el micrófono."), "error");
      return;
    }
    window.ChatiVoice?.stop?.();
    window.speechSynthesis?.cancel?.();

    const { chat, messages } = chatContext();
    const record = {
      id: "call-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      characterId: character.id,
      characterName: character.name,
      avatar: avatarOf(character).startsWith("data:") ? "" : avatarOf(character),
      chatId: chat?.id || null,
      startedAt: Date.now(),
      endedAt: null,
      turns: [],
      continues: previous?.id || null
    };

    call = {
      character,
      record,
      // What the character knows: the chat so far, then the earlier call
      // being continued, then this call.
      context: [
        ...messages,
        ...(previous?.turns || []).map(turn => ({ sender: turn.who === "user" ? "user" : "character", text: turn.text }))
      ],
      screen: buildScreen(character),
      state: "connecting",
      muted: false,
      level: 0,
      heard: "",
      silenceTimer: null,
      aborter: null,
      audio: null,
      speechQueue: [],
      voiceAborters: [],
      playing: false,
      replyDone: false,
      turnId: 0,
      spokenSoFar: "",
      ended: false
    };
    setState("connecting");
    bindControls();

    try {
      call.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (_) {
      setState("error", tr("Allow the microphone to talk.", "Permite el micrófono para poder hablar."));
      setTimeout(() => endCall(), 2200);
      return;
    }

    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      call.audioContext = new Context();
      await call.audioContext.resume?.();
      const source = call.audioContext.createMediaStreamSource(call.stream);
      call.micAnalyser = call.audioContext.createAnalyser();
      call.micAnalyser.fftSize = 512;
      source.connect(call.micAnalyser);
    } catch (_) {}

    call.timer = setInterval(tickTimer, 500);
    call.frame = requestAnimationFrame(animate);

    // A continued call opens with the character picking it back up.
    if (previous) {
      await reply(tr("[The call reconnects. Pick up right where you left off.]", "[La llamada se reconecta. Retoma justo donde se quedaron.]"), { hidden: true });
    } else {
      await reply(tr("[The user is calling you. Answer the call the way you would.]", "[El usuario te está llamando. Contesta la llamada como lo harías tú.]"), { hidden: true });
    }
  }

  function bindControls() {
    const screen = call.screen;
    screen.querySelector('[data-call="end"]').addEventListener("click", () => endCall());
    screen.querySelector('[data-call="mute"]').addEventListener("click", event => {
      if (!call) return;
      call.muted = !call.muted;
      const button = event.currentTarget;
      button.setAttribute("aria-pressed", String(call.muted));
      button.classList.toggle("is-on", call.muted);
      button.innerHTML = call.muted ? MIC_OFF_ICON : MIC_ICON;
      if (call.stream) call.stream.getAudioTracks().forEach(track => { track.enabled = !call.muted; });
      if (call.state === "listening") {
        stopListening();
        if (!call.muted) listen();
        setState("listening");
      }
    });
    // Tap the orb: cut the character off and talk.
    screen.querySelector(".chati-call-orb-wrap").addEventListener("click", () => {
      if (!call) return;
      if (call.state === "speaking" || call.state === "thinking") {
        call.aborter?.abort?.();
        stopAudio();
        listen();
      } else if (call.state === "listening" && !call.recognition && !call.recorder) {
        listen();
      }
    });
    call.onKey = event => {
      if (event.key === "Escape") endCall();
    };
    document.addEventListener("keydown", call.onKey);
  }

  // ---- Listening --------------------------------------------------------
  function speechLang() {
    const nav = String(navigator.language || "");
    if (es()) return nav.toLowerCase().startsWith("es") ? nav : "es-MX";
    return nav.toLowerCase().startsWith("en") ? nav : "en-US";
  }

  function listen() {
    if (!call || call.ended) return;
    setState("listening");
    setCaption("");
    call.heard = "";
    if (call.muted) return;
    if (SpeechRecognition) listenWithBrowser();
    else listenWithRecorder();
  }

  function stopListening() {
    if (!call) return;
    clearTimeout(call.silenceTimer);
    if (call.recognition) {
      const recognition = call.recognition;
      call.recognition = null;
      try { recognition.onend = null; recognition.abort(); } catch (_) {}
    }
    if (call.recorder) {
      const recorder = call.recorder;
      call.recorder = null;
      try { recorder.onstop = null; recorder.stop(); } catch (_) {}
    }
    if (call.vadFrame) cancelAnimationFrame(call.vadFrame);
  }

  function finishUtterance(text) {
    const said = String(text || "").replace(/\s+/g, " ").trim();
    stopListening();
    if (!call || call.ended) return;
    if (!said) {
      listen();
      return;
    }
    reply(said);
  }

  function listenWithBrowser() {
    const recognition = new SpeechRecognition();
    recognition.lang = speechLang();
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = "";
    recognition.onresult = event => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += " " + piece;
        else interim += piece;
      }
      const shown = (finalText + " " + interim).replace(/\s+/g, " ").trim();
      call.heard = shown;
      setCaption(shown, "user");
      clearTimeout(call.silenceTimer);
      // A short pause after speaking ends the turn.
      call.silenceTimer = setTimeout(() => finishUtterance(call?.heard || finalText), SILENCE_MS);
    };
    recognition.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        call.recognition = null;
        listenWithRecorder();
      }
    };
    // Browsers stop listening on their own after a while: keep it open.
    recognition.onend = () => {
      if (call && call.recognition === recognition && call.state === "listening") {
        try { recognition.start(); } catch (_) {}
      }
    };
    call.recognition = recognition;
    try {
      recognition.start();
    } catch (_) {
      call.recognition = null;
      listenWithRecorder();
    }
  }

  // No Web Speech API: record until the user stops talking, then send it
  // to /api/transcribe.
  function listenWithRecorder() {
    if (!call?.stream || typeof MediaRecorder === "undefined") {
      setState("error", tr("This browser can't listen. Try Chrome, Edge or Safari.", "Este navegador no puede escuchar. Prueba Chrome, Edge o Safari."));
      return;
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(candidate => MediaRecorder.isTypeSupported?.(candidate)) || "";
    const recorder = new MediaRecorder(call.stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    let spoke = false;
    let quietSince = 0;
    const startedAt = Date.now();
    recorder.ondataavailable = event => event.data?.size && chunks.push(event.data);
    recorder.onstop = async () => {
      if (!call || call.recorder !== null && call.recorder !== recorder) return;
      call.recorder = null;
      if (!spoke || !chunks.length) {
        listen();
        return;
      }
      setState("thinking");
      setCaption(tr("…", "…"), "user");
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" });
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: blob.type, language: es() ? "es" : "en" })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "");
        setCaption(data.text || "", "user");
        finishUtterance(data.text || "");
      } catch (_) {
        setCaption(tr("I didn't catch that.", "No te escuché bien."), "user");
        setTimeout(() => listen(), 900);
      }
    };
    call.recorder = recorder;
    recorder.start(250);
    // Voice activity: start counting silence once the user has spoken.
    const data = new Uint8Array(call.micAnalyser ? call.micAnalyser.fftSize : 0);
    const watch = () => {
      if (!call || call.recorder !== recorder) return;
      let level = 0;
      if (call.micAnalyser) {
        call.micAnalyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += ((value - 128) / 128) ** 2;
        level = Math.sqrt(sum / data.length);
      }
      const now = Date.now();
      if (level > 0.045) {
        spoke = true;
        quietSince = 0;
      } else if (spoke && !quietSince) {
        quietSince = now;
      }
      if ((spoke && quietSince && now - quietSince > RECORD_SILENCE_MS) || now - startedAt > MAX_RECORD_MS) {
        try { recorder.stop(); } catch (_) {}
        return;
      }
      call.vadFrame = requestAnimationFrame(watch);
    };
    call.vadFrame = requestAnimationFrame(watch);
  }

  // ---- The character answers ----------------------------------------------
  async function characterForRequest() {
    const character = call.character;
    const card = await (window.ChatiCanon?.cardFor?.(character).catch(() => "") || "");
    return card ? { ...character, canonProfile: card } : character;
  }

  // Splits what the character has written so far into sentences that can
  // be spoken now, keeping a **cue** with the words after it.
  function takeSentences(buffer, { final = false } = {}) {
    const sentences = [];
    let rest = buffer;
    const boundary = /[.!?…]+["”»)\]]*\s+|\n+/g;
    let match;
    let cut = 0;
    while ((match = boundary.exec(rest))) {
      const end = match.index + match[0].length;
      const piece = rest.slice(cut, end);
      // Never split inside a **cue**, and not into tiny fragments.
      if ((rest.slice(0, end).match(/\*\*/g) || []).length % 2) continue;
      if (piece.replace(/\*\*[^*]*\*\*/g, "").trim().length < 12 && !final) continue;
      sentences.push(piece.trim());
      cut = end;
    }
    rest = rest.slice(cut);
    if (final && rest.trim()) {
      sentences.push(rest.trim());
      rest = "";
    }
    return { sentences: sentences.filter(Boolean), rest };
  }

  // Voice for one sentence (fetched as soon as the sentence exists, so the
  // next one is ready while the current one plays).
  function fetchVoice(text) {
    const controller = new AbortController();
    call.voiceAborters.push(controller);
    return fetch("/api/tts", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceId: call.character.voiceId, text, call: true })
    }).then(async response => {
      if (!response.ok) {
        let message = "";
        try { message = (await response.json()).error || ""; } catch (_) {}
        throw new Error(message || tr("Couldn't play the voice.", "No se pudo reproducir la voz."));
      }
      return URL.createObjectURL(await response.blob());
    });
  }

  function queueSentence(text) {
    if (!call || call.ended || !text.replace(/\*\*[^*]*\*\*|\*[^*]*\*/g, "").trim()) return;
    call.speechQueue.push({ text, voice: fetchVoice(text) });
    playQueue();
  }

  // Plays the queued sentences one after another; the caption shows each
  // one as it is spoken.
  async function playQueue() {
    if (!call || call.playing) return;
    call.playing = true;
    const turn = call.turnId;
    while (call && !call.ended && call.turnId === turn && call.speechQueue.length) {
      const item = call.speechQueue.shift();
      let url = "";
      try {
        url = await item.voice;
      } catch (error) {
        if (!call || call.ended || call.turnId !== turn) break;
        if (error?.name !== "AbortError") setState("error", error.message);
        continue;
      }
      if (!call || call.ended || call.turnId !== turn) {
        URL.revokeObjectURL(url);
        break;
      }
      const audio = new Audio(url);
      call.audio = audio;
      try {
        if (call.audioContext) {
          const source = call.audioContext.createMediaElementSource(audio);
          call.outAnalyser = call.audioContext.createAnalyser();
          call.outAnalyser.fftSize = 512;
          source.connect(call.outAnalyser);
          call.outAnalyser.connect(call.audioContext.destination);
        }
      } catch (_) {}
      call.spokenSoFar = (call.spokenSoFar ? call.spokenSoFar + " " : "") + item.text.replace(/\*\*[^*]*\*\*|\*[^*]*\*/g, " ").replace(/\s+/g, " ").trim();
      setState("speaking");
      setCaption(call.spokenSoFar.split(/(?<=[.!?…])\s+/).slice(-2).join(" "), "character");
      await new Promise(resolve => {
        audio.onended = audio.onerror = audio.onpause = resolve;
        audio.play().catch(resolve);
      });
      URL.revokeObjectURL(url);
      if (call && call.audio === audio) call.audio = null;
    }
    if (!call) return;
    call.playing = false;
    // The reply is fully written and fully spoken: the user's turn.
    if (!call.ended && call.turnId === turn && call.replyDone && !call.speechQueue.length) listen();
  }

  async function reply(userText, { hidden = false } = {}) {
    if (!call || call.ended) return;
    stopListening();
    if (!hidden) {
      call.record.turns.push({ who: "user", text: userText, at: Date.now() });
      call.context.push({ sender: "user", text: userText });
      saveCall({ ...call.record });
    }
    setState("thinking");
    call.turnId += 1;
    call.replyDone = false;
    call.spokenSoFar = "";
    call.speechQueue = [];

    const { chat } = chatContext();
    const messages = [...call.context, ...(hidden ? [{ sender: "user", text: userText }] : [])].slice(-50);
    call.aborter = new AbortController();
    let text = "";
    let pending = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: call.aborter.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: await characterForRequest(),
          messages,
          memory: chat && typeof createMemoryPayload === "function" ? createMemoryPayload(chat.memory) : {},
          roleplayLevel: typeof normalizeRoleplayLevel === "function" && typeof roleplayLevel !== "undefined" ? normalizeRoleplayLevel(roleplayLevel) : undefined,
          matureContent: typeof isMatureContentEnabled === "function" ? isMatureContentEnabled() : false,
          voiceCall: true
        })
      });
      if (!response.ok || !response.body) throw new Error("HTTP " + response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let packet;
          try { packet = JSON.parse(line); } catch (_) { continue; }
          if (packet.type === "delta") {
            text += packet.delta || "";
            pending += packet.delta || "";
            // Speak each sentence as soon as it is written.
            const { sentences, rest } = takeSentences(pending);
            pending = rest;
            sentences.forEach(queueSentence);
          } else if (packet.type === "replace") {
            // A cleaned-up version (repeats or a stray script removed):
            // keep it for the transcript; what's not spoken yet follows it.
            const cleaned = packet.text || "";
            const spoken = text.length - pending.length;
            text = cleaned;
            pending = cleaned.slice(Math.min(spoken, cleaned.length));
          } else if (packet.type === "error") {
            throw new Error(packet.error || "");
          }
        }
      }
    } catch (error) {
      if (!call || call.ended || error?.name === "AbortError") return;
      setState("error", tr("The line cut out. Say it again?", "Se cortó la línea. ¿Lo repites?"));
      setTimeout(() => listen(), 1400);
      return;
    }
    if (!call || call.ended) return;

    takeSentences(pending, { final: true }).sentences.forEach(queueSentence);
    call.replyDone = true;
    const spoken = text.replace(/\s+/g, " ").trim();
    if (spoken) {
      call.record.turns.push({ who: "character", text: spoken, at: Date.now() });
      if (call.record.turns.length > MAX_TURNS) call.record.turns.splice(0, call.record.turns.length - MAX_TURNS);
      call.context.push({ sender: "character", text: spoken });
      saveCall({ ...call.record });
    }
    if (!call.playing && !call.speechQueue.length) listen();
  }

  // Cuts the character off (tap on the orb, hang up): stops the voice and
  // drops what was still queued.
  function stopAudio() {
    if (!call) return;
    call.turnId += 1;
    call.speechQueue = [];
    call.voiceAborters.forEach(controller => { try { controller.abort(); } catch (_) {} });
    call.voiceAborters = [];
    call.playing = false;
    if (call.audio) {
      const audio = call.audio;
      call.audio = null;
      try { audio.pause(); } catch (_) {}
    }
  }

  function endCall() {
    if (!call || call.ended) return;
    const current = call;
    current.ended = true;
    stopListening();
    stopAudio();
    current.aborter?.abort?.();
    clearInterval(current.timer);
    cancelAnimationFrame(current.frame);
    document.removeEventListener("keydown", current.onKey);
    current.stream?.getTracks().forEach(track => track.stop());
    current.audioContext?.close?.().catch?.(() => {});
    current.record.endedAt = Date.now();
    if (current.record.turns.length) {
      saveCall({ ...current.record });
      toast(tr("Call saved in Calls.", "Llamada guardada en Llamadas."), "info");
    }
    current.screen.classList.remove("is-open");
    current.screen.classList.add("is-closing");
    setTimeout(() => current.screen.remove(), 320);
    call = null;
  }

  // ---------------------------------------------------------------------
  // Chat header button (only characters with a voice)
  // ---------------------------------------------------------------------
  function ensureCallButton() {
    const actions = document.querySelector("#chatView .chat-actions");
    if (!actions) return null;
    let button = document.getElementById("callCharacterBtn");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "callCharacterBtn";
      button.className = "chati-call-header-btn";
      button.innerHTML = PHONE_ICON;
      button.addEventListener("click", () => startCall(appCharacter()));
      actions.insertBefore(button, actions.firstChild);
    }
    return button;
  }

  function refreshCallButton() {
    const button = ensureCallButton();
    if (!button) return;
    const character = appCharacter();
    const show = canCall(character);
    button.hidden = !show;
    const label = tr("Call ", "Llamar a ") + (character?.name || "");
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  // ---------------------------------------------------------------------
  // Calls panel: history, transcript, call again
  // ---------------------------------------------------------------------
  let panel = null;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("section");
    panel.className = "chati-calls";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.innerHTML =
      '<div class="chati-calls-card">' +
        '<header class="chati-calls-head">' +
          '<button type="button" class="chati-calls-icon" data-calls="back" hidden aria-label="' + escapeHtml(tr("Back", "Atrás")) + '"><svg viewBox="0 0 24 24"><path d="M14.5 6.5 9 12l5.5 5.5"/></svg></button>' +
          '<h2></h2>' +
          '<button type="button" class="chati-calls-icon" data-calls="close" aria-label="' + escapeHtml(tr("Close", "Cerrar")) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
        '</header>' +
        '<div class="chati-calls-body"></div>' +
      '</div>';
    panel.addEventListener("click", event => {
      if (event.target === panel) return closePanel();
      const action = event.target.closest("[data-calls]")?.dataset.calls;
      if (action === "close") closePanel();
      if (action === "back") renderCallsList();
      const open = event.target.closest("[data-call-id]")?.dataset.callId;
      if (open && !event.target.closest("[data-calls]")) renderTranscript(open);
      if (action === "again") callAgain(event.target.closest("[data-calls]").dataset.id);
      if (action === "delete") {
        deleteCall(event.target.closest("[data-calls]").dataset.id);
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && panel && !panel.hidden && !call) closePanel();
    });
    document.body.appendChild(panel);
    return panel;
  }

  function openPanel() {
    ensurePanel();
    renderCallsList();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-open"));
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove("is-open");
    setTimeout(() => { if (panel && !panel.classList.contains("is-open")) panel.hidden = true; }, 220);
  }

  function avatarHtml(record) {
    const character = typeof getCharacterById === "function" ? getCharacterById(record.characterId) : null;
    const src = avatarOf(character) || record.avatar;
    return '<span class="chati-calls-avatar">' + (src ? '<img alt="" src="' + escapeHtml(src) + '">' : escapeHtml((record.characterName || "?").charAt(0))) + '</span>';
  }

  function renderCallsList() {
    if (!panel) return;
    panel.querySelector("h2").textContent = tr("Calls", "Llamadas");
    panel.querySelector('[data-calls="back"]').hidden = true;
    const body = panel.querySelector(".chati-calls-body");
    const calls = readCalls();
    if (!calls.length) {
      body.innerHTML =
        '<div class="chati-calls-empty">' + CALLS_ICON +
        '<p>' + escapeHtml(tr("No calls yet.", "Aún no hay llamadas.")) + '</p>' +
        '<small>' + escapeHtml(tr("Open a chat with a character that has a voice and tap the phone.", "Abre el chat de un personaje con voz y toca el teléfono.")) + '</small></div>';
      return;
    }
    body.innerHTML = '<ul class="chati-calls-list">' + calls.map(record => {
      const last = [...record.turns].reverse().find(turn => turn.who === "character")?.text || record.turns[record.turns.length - 1]?.text || "";
      const duration = formatDuration((record.endedAt || record.turns[record.turns.length - 1]?.at || record.startedAt) - record.startedAt);
      return '<li><button type="button" class="chati-calls-item" data-call-id="' + escapeHtml(record.id) + '">' +
        avatarHtml(record) +
        '<span class="chati-calls-text"><strong>' + escapeHtml(record.characterName) + '</strong>' +
        '<small>' + escapeHtml(formatWhen(record.startedAt)) + ' · ' + duration + '</small>' +
        '<em>' + escapeHtml(last.replace(/\*\*[^*]*\*\*|\*[^*]*\*/g, " ").replace(/\s+/g, " ").trim().slice(0, 90)) + '</em></span>' +
        '<span class="chati-calls-again" data-calls="again" data-id="' + escapeHtml(record.id) + '" role="button" tabindex="0" aria-label="' + escapeHtml(tr("Call again", "Volver a llamar")) + '">' + PHONE_ICON + '</span>' +
        '</button></li>';
    }).join("") + '</ul>';
  }

  function renderTranscript(id) {
    const record = readCalls().find(item => item.id === id);
    if (!record || !panel) return;
    panel.querySelector("h2").textContent = record.characterName;
    panel.querySelector('[data-calls="back"]').hidden = false;
    const duration = formatDuration((record.endedAt || record.turns[record.turns.length - 1]?.at || record.startedAt) - record.startedAt);
    panel.querySelector(".chati-calls-body").innerHTML =
      '<div class="chati-calls-meta">' + avatarHtml(record) + '<span>' + escapeHtml(formatWhen(record.startedAt)) + ' · ' + duration + '</span></div>' +
      '<div class="chati-calls-transcript">' + record.turns.map(turn =>
        '<p class="is-' + (turn.who === "user" ? "user" : "character") + '">' +
        (turn.who === "user" ? "" : '<b>' + escapeHtml(record.characterName) + '</b>') +
        escapeHtml(turn.text.replace(/\*\*([^*]*)\*\*|\*([^*]*)\*/g, (match, a, b) => "(" + (a || b).trim() + ")").replace(/\s+/g, " ").trim()) + '</p>'
      ).join("") + '</div>' +
      '<div class="chati-calls-actions">' +
        '<button type="button" class="chati-calls-primary" data-calls="again" data-id="' + escapeHtml(record.id) + '">' + PHONE_ICON + '<span>' + escapeHtml(tr("Call again", "Volver a llamar")) + '</span></button>' +
        '<button type="button" class="chati-calls-secondary" data-calls="delete" data-id="' + escapeHtml(record.id) + '">' + escapeHtml(tr("Delete", "Borrar")) + '</button>' +
      '</div>';
  }

  // Opens the character's chat (so the call knows the story) and picks the
  // earlier call back up.
  function callAgain(id) {
    const record = readCalls().find(item => item.id === id);
    if (!record) return;
    const character = typeof getCharacterById === "function" ? getCharacterById(record.characterId) : null;
    if (!character) {
      toast(tr("That character no longer exists.", "Ese personaje ya no existe."), "error");
      return;
    }
    closePanel();
    try {
      if (typeof openChat === "function" && appCharacter()?.id !== character.id) openChat(character, record.chatId || null);
    } catch (_) {}
    setTimeout(() => startCall(appCharacter()?.id === character.id ? appCharacter() : character, { previous: record }), 250);
  }

  // Rail button (desktop) / Chats list (phone).
  function addRailButton() {
    const nav = document.querySelector("#sidebar .sidebar-nav");
    if (!nav || document.getElementById("callsRailBtn")) return;
    const label = tr("Calls", "Llamadas");
    const button = document.createElement("button");
    button.type = "button";
    button.id = "callsRailBtn";
    button.className = "nav-btn chati-calls-rail";
    button.dataset.tooltip = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = '<span class="sidebar-nav-icon" aria-hidden="true">' + CALLS_ICON + '</span><span class="sidebar-label"></span>';
    button.querySelector(".sidebar-label").textContent = label;
    button.addEventListener("click", openPanel);
    nav.appendChild(button);
  }

  function init() {
    if (/[?&]mini=1\b/.test(location.search) && window.top !== window) {
      // Inside the mini window the call still works; nothing special.
    }
    addRailButton();
    refreshCallButton();
    const name = document.getElementById("chatCharacterName");
    if (name) new MutationObserver(refreshCallButton).observe(name, { childList: true, characterData: true, subtree: true });
    window.addEventListener("chati:charactersaved", refreshCallButton);
    document.addEventListener("click", () => setTimeout(refreshCallButton, 0), true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.ChatiCalls = { start: () => startCall(appCharacter()), open: openPanel, list: readCalls };
})();
