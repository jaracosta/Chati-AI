// Image generation backends, shared by the server and the starter-art script.
//   fal.ai      — IMAGE_PROVIDER=fal (default when FAL_KEY is set), FAL_MODEL
//                 (+ FAL_MODEL_NAME for fal-ai/lora checkpoints)
//   OpenRouter  — IMAGE_PROVIDER=openrouter, IMAGE_MODEL
// generate() always returns a data URL so the browser never has to fetch
// from a third-party host.

const FAL_SIZES = {
  "1:1": "square_hd",
  "3:4": "portrait_4_3",
  "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",
  "16:9": "landscape_16_9"
};

// Only sent to models that accept a negative prompt (not FLUX).
const NEGATIVE_PROMPT =
  "child, children, kid, minor, underage, teen, loli, shota, young-looking, school uniform, " +
  "lowres, bad anatomy, bad hands, extra fingers, blurry, watermark, text, logo";

export class ImageBlockedError extends Error {
  constructor() {
    super("The image was blocked by the safety filter.");
    this.name = "ImageBlockedError";
  }
}

export function imageProviderName(env = process.env) {
  const chosen = String(env.IMAGE_PROVIDER || "").toLowerCase();
  if (chosen === "fal" || chosen === "openrouter") return chosen;
  if (env.FAL_KEY) return "fal";
  if (env.OPENROUTER_API_KEY) return "openrouter";
  return "";
}

export function falRequestBody({ prompt, aspect = "3:4", mature = false, model = "", modelName = "" }) {
  const body = {
    prompt,
    image_size: FAL_SIZES[aspect] || "portrait_4_3",
    num_images: 1,
    output_format: "jpeg",
    // The provider's own filter stays on unless the user is in 18+ mode.
    enable_safety_checker: !mature
  };
  if (!/flux/i.test(model)) body.negative_prompt = NEGATIVE_PROMPT;
  // fal-ai/lora runs any SDXL checkpoint by name (e.g. an anime model).
  if (modelName) body.model_name = modelName;
  return body;
}

async function toDataUrl(url, fetchImpl) {
  if (url.startsWith("data:image/")) return url;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
  const type = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${type.split(";")[0]};base64,${buffer.toString("base64")}`;
}

export function createImageGenerator(env = process.env, fetchImpl = globalThis.fetch) {
  const provider = imageProviderName(env);

  async function callFal(model, body) {
    const response = await fetchImpl(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    // fal.ai also checks the prompt itself and answers 422
    // content_policy_violation; that is a block, not a server failure.
    const details = Array.isArray(data.detail) ? data.detail : [];
    if (details.some(item => item?.type === "content_policy_violation")) throw new ImageBlockedError();
    if (!response.ok) throw new Error(`fal.ai error ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
    // fal.ai returns a black picture when its safety checker flags it.
    if (Array.isArray(data.has_nsfw_concepts) && data.has_nsfw_concepts[0] === true) {
      throw new ImageBlockedError();
    }
    const url = data.images?.[0]?.url || "";
    return url ? toDataUrl(url, fetchImpl) : "";
  }

  async function viaFal({ prompt, aspect, mature, referenceImages = [] }) {
    // With the character's picture, an image-editing model keeps their real
    // look (face, hair, outfit, art style). Falls back to text-to-image.
    const referenceModel = env.FAL_REFERENCE_MODEL ?? "fal-ai/flux-kontext/dev";
    const reference = referenceImages[0];
    if (reference && referenceModel && referenceModel !== "off") {
      try {
        return await callFal(referenceModel, {
          prompt: `Keep this exact character from the reference image (same face, hair, eyes, body, outfit and art style). ${prompt}`,
          image_url: reference,
          num_images: 1,
          output_format: "jpeg",
          enable_safety_checker: !mature
        });
      } catch (error) {
        if (error instanceof ImageBlockedError) throw error;
        console.warn("Reference image generation failed, using text-to-image:", error.message);
      }
    }

    const model = env.FAL_MODEL || "fal-ai/flux/dev";
    return callFal(model, falRequestBody({ prompt, aspect, mature, model, modelName: env.FAL_MODEL_NAME || "" }));
  }

  async function viaOpenRouter({ prompt, aspect, referenceImages = [] }) {
    const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chati-ai.com",
        "X-OpenRouter-Title": "Chati-AI"
      },
      body: JSON.stringify({
        model: env.IMAGE_MODEL || "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...referenceImages.map(url => ({ type: "image_url", image_url: { url } }))
          ]
        }],
        modalities: ["image", "text"],
        image_config: { aspect_ratio: aspect }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OpenRouter error ${response.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
    return url ? toDataUrl(url, fetchImpl) : "";
  }

  return {
    provider,
    // { prompt, aspect: "3:4" | "16:9" | ..., mature, referenceImages } → data URL or ""
    async generate(options) {
      if (provider === "fal") return viaFal(options);
      if (provider === "openrouter") return viaOpenRouter(options);
      throw new Error("No image provider configured (set FAL_KEY or OPENROUTER_API_KEY).");
    }
  };
}
