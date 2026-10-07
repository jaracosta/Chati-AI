// Server-only: turns "create an image" requests in a character chat into a
// prompt for an image model. A text model writes the prompt (so it can use
// the character sheet and the recent story) and a short in-character caption.

const ASPECTS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);

const clip = (value, max) => String(value || "").trim().slice(0, max);

// Explicit under-18 ages in the character sheet ("16 years old", "15 años",
// "age: 12"). The text model also checks, this is a cheap extra guard.
export function sheetSaysMinor(text) {
  const source = String(text || "").toLowerCase();
  const patterns = [
    /\b(\d{1,2})[\s-]*(?:years?|yrs?)[\s-]*old\b/g,
    /\b(\d{1,2})\s+años\s+de\s+edad/g,
    /\btiene\s+(\d{1,2})\s+años/g,
    /\b(?:age|edad)\s*[:=]?\s*(\d{1,2})\b/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const age = Number(match[1]);
      if (age > 0 && age < 18) return true;
    }
  }
  return false;
}

export function characterSheet(character = {}) {
  const parts = [
    ["Name", clip(character.name, 120)],
    ["Pronouns", clip(character.pronouns, 20)],
    ["Description", clip(character.description || character.bio, 1200)],
    ["Appearance", clip(character.appearance, 1500)],
    ["Personality", clip(character.personality, 1200)],
    ["Scenario", clip(character.scenario, 800)]
  ];
  return parts.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n");
}

export function buildImagePromptMessages({ character = {}, request = "", recent = [], matureContent = false, lang = "en" }) {
  const sheet = characterSheet(character);
  const minor = sheetSaysMinor(sheet);
  const mature = matureContent === true && !minor;

  const story = (Array.isArray(recent) ? recent : [])
    .slice(-8)
    .map(item => `${item?.sender === "character" ? character.name || "Character" : "User"}: ${clip(item?.text, 400)}`)
    .join("\n");

  const system = `
You write prompts for an image generator inside a roleplay app. The user is chatting with the character below and wants a picture of the character (a selfie, a scene from the story, an outfit, etc.).

Return ONLY a JSON object:
{"ok": true, "prompt": "...", "caption": "...", "aspect": "3:4"}

prompt (English, 60-160 words): a detailed visual description for the image model. Keep the character's look consistent with the sheet (hair, eyes, build, outfit, accessories). If the character is from an existing series (anime, game, movie...), name them and the series in the prompt and describe their canon look precisely (hair style and color, eye color, face marks, build, signature outfit). Add pose, expression, setting, lighting, camera framing and art style. Default style: high-quality anime illustration, unless the user asks for another style or the character is clearly from a realistic setting. Use the recent story for context when the user refers to it. If a reference image is attached, the character must match it.
caption: 1-2 short sentences IN CHARACTER, in the user's language (${lang === "es" ? "Spanish" : "the language the user writes in"}), as if the character is sending the picture. Actions go between double asterisks and are written in the third person, present tense, describing what the character does (never an order to the user): ${lang === "es" ? '"**te manda una foto con una sonrisa** Aquí estoy." — never "**Envía una foto**"' : '"**sends you a photo with a smile** Here I am." — never "**Send a photo**"'}. Never speak or act for the user.
aspect: 3:4 for portraits/selfies, 16:9 for wide scenes, 1:1 otherwise.

AGE RULE (always, checked first):
- Decide whether the character is an adult using the sheet and what you know about them (canon age if it is an existing character).
- If the character is under 18, looks childlike or young, or you have ANY doubt, the picture must be fully non-sexual: normal clothing, no suggestive pose, no focus on the body. If the user asked for something sexual or suggestive, set "ok": false and write a short in-character caption declining it.
- Never describe anyone in a sexual way as young, small or childlike. Never make a minor look "older" to get around this.

CONTENT
${mature
    ? "- The user is a verified adult with NSFW (18+) on. For a clearly adult character you may describe nudity, sexual or suggestive content and graphic violence, but ONLY when the user's request explicitly asks for it. For an ordinary request (a selfie, a place, an outfit, an action) write a clean, non-suggestive prompt: no nudity, no sexual or seductive wording, no focus on the body, even if the character sheet is flirty. When adult content is asked for, be precise and descriptive, no moralizing."
    : "- NSFW is off: keep the picture non-explicit (no nudity, no sexual acts). Suggestive-but-clothed is fine for clearly adult characters. If the user asked for explicit content, make a tasteful version and mention in the caption that NSFW (18+) can be turned on in Settings."}
- Real people: only well-known public figures, never sexual. Never depict a private real person.
`.trim();

  const user = `
CHARACTER SHEET
${sheet || "(no details)"}

RECENT STORY
${story || "(none)"}

USER'S IMAGE REQUEST
${clip(request, 1000) || "A picture of yourself."}
`.trim();

  return {
    minor,
    mature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };
}

// After the image service rejects a prompt: ask for a fully non-suggestive
// version of the same picture (same character, scene and style).
export function buildSaferRetryMessages(messages, rejectedPrompt) {
  return [
    ...messages,
    { role: "assistant", content: JSON.stringify({ ok: true, prompt: rejectedPrompt }) },
    {
      role: "user",
      content:
        "The image service rejected that prompt as unsafe. Rewrite it as a fully safe-for-work prompt: keep the same character look, scene, pose idea and art style, but no nudity, no sexual, seductive or suggestive words, no body-focused descriptions, no gore, and no mention of age. Return the same JSON shape."
    }
  ];
}

export function parseImagePlan(raw, extractJsonObject) {
  let plan = null;
  try {
    plan = JSON.parse(extractJsonObject(raw));
  } catch {
    plan = null;
  }
  if (!plan || typeof plan !== "object") return null;

  const prompt = clip(plan.prompt, 2500);
  const caption = clip(plan.caption, 600);
  const aspect = ASPECTS.has(plan.aspect) ? plan.aspect : "3:4";

  if (plan.ok === false) return { ok: false, prompt: "", caption, aspect };
  if (!prompt) return null;
  return { ok: true, prompt, caption, aspect };
}

// The character's picture, sent as a reference for the look: a small inline
// image, or a public https link.
export function usableReferenceImage(value) {
  const text = String(value || "").trim();
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(text)) return text.length > 3_000_000 ? "" : text;
  if (/^https:\/\/[^\s"'<>]+$/i.test(text) && text.length < 2000) return text;
  return "";
}
