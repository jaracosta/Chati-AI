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

export function isValidVoiceId(value) {
  return /^[A-Za-z0-9]{8,64}$/.test(String(value || ""));
}

function describeError(status, body) {
  const detail = body?.detail;
  const message = typeof detail === "string" ? detail : detail?.message || body?.message || "";
  if (status === 401) return new VoiceError("The ElevenLabs API key was rejected.", 502);
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

  const model = env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
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

    async speak({ voiceId, text }) {
      if (!isValidVoiceId(voiceId)) throw new VoiceError("This character has no valid voice.", 400);
      const spoken = spokenText(text);
      if (!spoken) throw new VoiceError("Nothing to read aloud.", 400);
      const response = await call(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text: spoken,
          model_id: model,
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
        })
      });
      return Buffer.from(await response.arrayBuffer());
    }
  };
}
