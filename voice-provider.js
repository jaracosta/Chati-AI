// ElevenLabs voices for characters.
//
// - listVoices(): the voices on the account (premade library voices and any
//   the user cloned), so a character can be given one.
// - cloneVoice(): Instant Voice Cloning from 10+ seconds of audio. Only for
//   voices the user owns or has permission to use — the app makes them
//   confirm that before anything is uploaded.
// - speak(): text-to-speech with a character's voice (mp3).
//
// The API key stays on the server (ELEVENLABS_API_KEY).

const DEFAULT_API = "https://api.elevenlabs.io/v1";
const MAX_TTS_CHARS = 1200;
const MAX_SAMPLE_BYTES = 10 * 1024 * 1024;
const MAX_SAMPLES = 5;
const VOICES_TTL_MS = 10 * 60 * 1000;

export class VoiceError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// What gets read aloud: the spoken words, not the **actions**.
export function spokenText(text) {
  return String(text || "")
    .replace(/\*\*[^*]*\*\*/g, " ")
    .replace(/\*[^*]*\*/g, " ")
    .replace(/[«»"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TTS_CHARS);
}

// Emotion cues for Eleven v3 audio tags, picked from the character's
// **actions** (English and Spanish). First match wins.
const ACTION_CUES = [
  [/\b(carcajada|laughs? (hard|loud)|bursts? (out )?laugh)/i, "[laughs harder]"],
  [/\b(r[ií]e|r[ií]endo|risa|re[ií]r|laugh|laughs|laughing)\b/i, "[laughs]"],
  [/\b(chuckl\w*|risita|ri[sz]ita|giggl\w*)/i, "[chuckles]"],
  [/\b(susurr\w*|whisper\w*|en voz baja|murmur\w*|mutter\w*)/i, "[whispers]"],
  [/\b(suspir\w*|sigh\w*)/i, "[sighs]"],
  [/\b(llor\w*|sollo\w*|cr(y|ies|ying)|sob\w*|tears?|l[aá]grimas?)\b/i, "[crying]"],
  [/\b(grit\w*|shout\w*|yell\w*|scream\w*|ruge|roars?)\b/i, "[shouting]"],
  [/\b(furios\w*|enfadad\w*|enojad\w*|ira|rabia|angr\w*|furious\w*|glares?|frunce)/i, "[angry]"],
  [/\b(sarc[aá]stic\w*|ir[oó]nic\w*|sarcastic\w*|rolls? (his|her|their) eyes|pone los ojos en blanco)/i, "[sarcastic]"],
  [/\b(malicia|malicios\w*|sonrisa (torcida|burlona|siniestra)|smirk\w*|sly\w*|mischiev\w*|evil grin|wicked)/i, "[mischievously]"],
  [/\b(fr[ií]o|fr[ií]a|fr[ií]amente|frialdad|cold\w*|icy|helad\w*)\b/i, "[coldly]"],
  [/\b(triste|tristeza|sad\w*|sorrow\w*|melanc\w*)/i, "[sad]"],
  [/\b(nervios\w*|tartamude\w*|stammer\w*|stutter\w*|nervous\w*)/i, "[nervously]"],
  [/\b(emocionad\w*|entusiasm\w*|excited\w*|eager\w*)/i, "[excited]"],
  [/\b(curios\w*|intrigad\w*|ladea la cabeza|tilts? (his|her|their) head|curious\w*)/i, "[curious]"],
  [/\b(exhal\w*|resopla|scoffs?|bufa)/i, "[exhales]"]
];

export function actionCue(action) {
  const text = String(action || "");
  for (const [pattern, cue] of ACTION_CUES) if (pattern.test(text)) return cue;
  return "";
}

// Turns a roleplay reply into what the voice should perform. **Actions** are
// not read aloud, but they become pauses — and, for expressive models
// (Eleven v3), emotion cues such as [whispers] or [laughs] — so the line is
// not read as one flat run-on sentence.
export function prepareSpeech(text, { expressive = true } = {}) {
  const parts = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const source = String(text || "").replace(/[«»"“”]/g, "");
  let last = 0;
  let match;
  const pushSpeech = chunk => {
    const lines = chunk.split(/\n+/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    // A line break ends a thought: make sure it ends like a sentence.
    const spoken = lines.map(line => (/[.!?…,;:]$/.test(line) ? line : line + ".")).join(" ");
    if (spoken) parts.push({ type: "speech", text: spoken });
  };
  while ((match = pattern.exec(source))) {
    pushSpeech(source.slice(last, match.index));
    parts.push({ type: "action", text: match[1] || match[2] });
    last = pattern.lastIndex;
  }
  pushSpeech(source.slice(last));

  let output = "";
  let pendingCue = "";
  let pendingPause = false;
  for (const part of parts) {
    if (part.type === "action") {
      pendingCue = expressive ? actionCue(part.text) || pendingCue : "";
      pendingPause = Boolean(output);
      continue;
    }
    if (pendingPause) output += expressive ? " … " : ' <break time="0.6s" /> ';
    else if (output) output += " ";
    if (pendingCue) output += pendingCue + " ";
    output += part.text;
    pendingCue = "";
    pendingPause = false;
  }
  return output.replace(/\s+/g, " ").trim().slice(0, MAX_TTS_CHARS);
}

export function isValidVoiceId(value) {
  return /^[A-Za-z0-9]{8,64}$/.test(String(value || ""));
}

function describeError(status, body) {
  const detail = body?.detail;
  const message = typeof detail === "string" ? detail : detail?.message || body?.message || "";
  const code = typeof detail === "object" ? String(detail?.status || "") : "";
  if (code === "missing_permissions" || /missing.*permission/i.test(message)) {
    // ElevenLabs names the permission, e.g. "missing the permission voices_write".
    const permission = (message.match(/permission[s]?\s+([a-z_]+)/i) || [])[1] || "";
    console.error("ElevenLabs key is missing a permission:", permission || message);
    return new VoiceError(
      "The ElevenLabs key is missing permissions" + (permission ? ` (${permission})` : "") +
      ". Create a key with “Restrict key” turned off, or allow Voices: Write and Text to Speech: Access.",
      502
    );
  }
  if (status === 401) {
    return new VoiceError("ElevenLabs rejected the API key (it may have been deleted or mistyped). Put a valid key in ELEVENLABS_API_KEY on Render.", 502);
  }
  if (status === 402 || /quota|credits|character limit/i.test(message)) {
    return new VoiceError("ElevenLabs credits ran out. Add credits or upgrade the plan.", 402);
  }
  if (/instant voice cloning|can_use_instant_voice_cloning|subscription/i.test(message)) {
    return new VoiceError("Voice cloning needs a paid ElevenLabs plan (Starter or higher).", 402);
  }
  if (status === 429) return new VoiceError("ElevenLabs is busy. Try again in a moment.", 429);
  return new VoiceError(message || `ElevenLabs request failed (${status}).`, status >= 500 ? 502 : 400);
}

export function createVoiceProvider(env = {}, fetchImpl = globalThis.fetch) {
  const key = String(env.ELEVENLABS_API_KEY || "").trim();
  if (!key) return null;

  const model = env.ELEVENLABS_MODEL || "eleven_v3";
  const fallbackModel = "eleven_multilingual_v2";
  const API = String(env.ELEVENLABS_BASE_URL || DEFAULT_API).replace(/\/$/, "");
  let voicesCache = null;

  async function call(path, options = {}) {
    const response = await fetchImpl(API + path, {
      ...options,
      headers: { "xi-api-key": key, ...(options.headers || {}) }
    });
    if (!response.ok) {
      let body = null;
      try { body = await response.json(); } catch {}
      throw describeError(response.status, body);
    }
    return response;
  }

  return {
    async listVoices({ fresh = false } = {}) {
      if (!fresh && voicesCache && Date.now() - voicesCache.at < VOICES_TTL_MS) return voicesCache.voices;
      const data = await (await call("/voices")).json();
      const voices = (Array.isArray(data?.voices) ? data.voices : []).map(voice => ({
        id: voice.voice_id,
        name: voice.name || "Voice",
        category: voice.category || "",
        labels: voice.labels || {},
        description: voice.description || "",
        previewUrl: voice.preview_url || ""
      })).filter(voice => isValidVoiceId(voice.id));
      voicesCache = { at: Date.now(), voices };
      return voices;
    },

    async cloneVoice({ name, description = "", samples = [] }) {
      const cleanName = String(name || "").trim().slice(0, 80);
      if (!cleanName) throw new VoiceError("Give the voice a name.", 400);
      const files = samples.slice(0, MAX_SAMPLES).filter(sample => sample?.buffer?.length);
      if (!files.length) throw new VoiceError("Add at least one audio sample.", 400);
      if (files.some(sample => sample.buffer.length > MAX_SAMPLE_BYTES)) {
        throw new VoiceError("Each sample must be under 10 MB.", 400);
      }
      const form = new FormData();
      form.append("name", cleanName);
      if (description) form.append("description", String(description).slice(0, 400));
      form.append("remove_background_noise", "true");
      files.forEach((sample, index) => {
        const type = sample.mimeType || "audio/webm";
        const extension = (type.split("/")[1] || "webm").split(";")[0];
        form.append("files", new Blob([sample.buffer], { type }), `sample-${index + 1}.${extension}`);
      });
      const data = await (await call("/voices/add", { method: "POST", body: form })).json();
      if (!isValidVoiceId(data?.voice_id)) throw new VoiceError("ElevenLabs did not return a voice.", 502);
      voicesCache = null;
      return { id: data.voice_id, name: cleanName };
    },

    // Voice Design: a brand-new voice from a description (it belongs to no
    // one). Returns a few previews; saveDesignedVoice() keeps the chosen one.
    async designVoice({ description, text, language = "" }) {
      const voiceDescription = String(description || "").trim().slice(0, 1000);
      if (voiceDescription.length < 20) throw new VoiceError("Describe the voice in a bit more detail (20+ characters).", 400);
      let sample = String(text || "").replace(/\s+/g, " ").trim().slice(0, 1000);
      if (sample.length < 100) throw new VoiceError("The sample line must be at least 100 characters.", 400);
      const data = await (await call("/text-to-voice/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_description: voiceDescription,
          text: sample,
          model_id: env.ELEVENLABS_DESIGN_MODEL || "eleven_ttv_v3",
          ...(language ? { language } : {}),
          guidance_scale: 5,
          should_enhance: true
        })
      })).json();
      const previews = (Array.isArray(data?.previews) ? data.previews : [])
        .filter(preview => preview?.generated_voice_id && preview?.audio_base_64)
        .slice(0, 3)
        .map(preview => ({
          id: String(preview.generated_voice_id),
          audio: `data:${preview.media_type || "audio/mpeg"};base64,${preview.audio_base_64}`,
          seconds: Number(preview.duration_secs) || 0
        }));
      if (!previews.length) throw new VoiceError("ElevenLabs did not return any voice previews.", 502);
      return { previews, text: data.text || sample };
    },

    async saveDesignedVoice({ name, description, generatedVoiceId }) {
      const cleanName = String(name || "").trim().slice(0, 80);
      if (!cleanName) throw new VoiceError("Give the voice a name.", 400);
      if (!/^[A-Za-z0-9_-]{4,128}$/.test(String(generatedVoiceId || ""))) throw new VoiceError("Pick one of the previews first.", 400);
      const data = await (await call("/text-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_name: cleanName,
          voice_description: String(description || cleanName).trim().slice(0, 1000).padEnd(20, "."),
          generated_voice_id: generatedVoiceId
        })
      })).json();
      if (!isValidVoiceId(data?.voice_id)) throw new VoiceError("ElevenLabs did not return a voice.", 502);
      voicesCache = null;
      return { id: data.voice_id, name: cleanName };
    },

    async speak({ voiceId, text }) {
      if (!isValidVoiceId(voiceId)) throw new VoiceError("This character has no valid voice.", 400);
      if (!spokenText(text)) throw new VoiceError("Nothing to read aloud.", 400);
      const request = async modelId => {
        // Eleven v3 performs emotion tags and only takes stability 0 / 0.5 / 1
        // (creative / natural / robust).
        const expressive = /v3/.test(modelId);
        const stability = Number(env.ELEVENLABS_STABILITY);
        const response = await call(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({
            text: prepareSpeech(text, { expressive }),
            model_id: modelId,
            voice_settings: expressive
              ? { stability: [0, 0.5, 1].includes(stability) ? stability : 0.5, similarity_boost: 0.8, use_speaker_boost: true }
              : { stability: 0.35, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true }
          })
        });
        return Buffer.from(await response.arrayBuffer());
      };
      try {
        return await request(model);
      } catch (error) {
        // An account or voice that can't use the expressive model still
        // speaks, with pauses, on the multilingual one.
        if (model !== fallbackModel && error instanceof VoiceError && error.status === 400) {
          return request(fallbackModel);
        }
        throw error;
      }
    }
  };
}
