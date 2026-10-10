// Media the user sends (photo, voice/audio, short video) is something the
// character perceives live, inside the scene — not a file they were sent.
// These helpers frame it that way for the roleplay model, which may not be
// able to see images at all (most uncensored roleplay models are text-only):
// a vision model first turns pictures into "what the character sees".

const VISION_MODEL_PATTERN = /gpt-4o|gpt-4\.1|gpt-5|o\d-|gemini|claude|[-_/]vl\b|vl-|vision|pixtral|llava|qwen2\.5-vl|grok-.*vision/i;

// Can the roleplay model look at images itself?
export function modelSeesImages(model, env = {}) {
  if (env.CHAT_MODEL_VISION === "true") return true;
  if (env.CHAT_MODEL_VISION === "false") return false;
  return VISION_MODEL_PATTERN.test(String(model || ""));
}

// Prompt for the vision model that describes a photo or video moments.
export function buildSightMessages({ images = [], note = "", isVideo = false, characterName = "the character" }) {
  const name = String(characterName || "the character").trim();
  const system = `
You are the eyes of ${name}, a character in a live roleplay scene. Describe what ${name} is seeing right now, so another writer can make ${name} react to it.

- 2 to 5 short sentences, present tense, plain facts.
- Cover what matters: people (apparent age range, look, expression, what they are doing), the place, light and weather, objects, movement${isVideo ? " across the moments (they are one continuous event, in order)" : ""}, and any readable text.
- It is happening in front of ${name}. Never say photo, picture, image, frame, video, screen, camera or file.
- No guesses about who someone is unless the note names them. Never invent things that are not visible.
- Never describe anyone who might be under 18 in a sexual way.
  `.trim();
  const content = [
    { type: "text", text: note ? `Scene note from the player: ${note}` : "Describe what is in front of them." },
    ...images.slice(0, 6).map(url => ({ type: "image_url", image_url: { url, detail: "high" } }))
  ];
  return [
    { role: "system", content: system },
    { role: "user", content }
  ];
}

// The text the roleplay model receives for one user message with media.
export function frameSensoryInput({ type, characterName = "the character", sight = "", sound = "", note = "", unavailable = false }) {
  const name = String(characterName || "the character").trim();
  const lines = [];
  if (note) lines.push(`(Scene note: ${note})`);
  if (type === "audio") {
    lines.push(sound
      ? `[A SOUND IN THE SCENE — ${name} hears this live, right where they are. It is not a recording or a message.]\n${sound}`
      : unavailable
        ? `[Something is heard in the scene, but its details are lost. Rely on the scene note and what is going on.]`
        : `[A sound reaches ${name} in the scene. React carefully; do not invent exact words.]`);
  }
  if (type === "image") {
    lines.push(sight
      ? `[WHAT ${name.toUpperCase()} SEES RIGHT NOW, in front of them in the scene:]\n${sight}`
      : `[Something appears in front of ${name} in the scene. React carefully using the scene note.]`);
  }
  if (type === "video") {
    if (sight) lines.push(`[WHAT ${name.toUpperCase()} SEES HAPPENING RIGHT NOW, as one continuous moment in the scene:]\n${sight}`);
    if (sound) lines.push(`[WHAT ${name} HEARS AT THE SAME TIME:]\n${sound}`);
    if (!sight && !sound) {
      lines.push(unavailable
        ? `[Something happens in the scene, but its details are lost. Rely on the scene note and what is going on.]`
        : `[Something happens in front of ${name}. React carefully using the scene note.]`);
    }
  }
  return lines.join("\n\n");
}

// Rules added at the end of the prompt when the latest message has media.
export function buildSensesRules({ characterName = "the character", type }) {
  const name = String(characterName || "the character").trim();
  const sense = type === "audio" ? "hears" : type === "image" ? "sees" : "sees and hears";
  return `
SENSES — THIS TURN (VERY IMPORTANT)
- In the user's last message, something happens in the scene that ${name} ${sense} with their own ${type === "audio" ? "ears" : type === "image" ? "eyes" : "eyes and ears"}. It is part of the world, happening now, right where ${name} is.
- React to it like a real person who perceives it live, in character: turn toward the sound, flinch, freeze, squint, recognise a voice, step closer, comment on what is in front of them.
- If it is someone talking and nothing says otherwise, it is the user's character speaking to ${name} in person.
- NEVER mention or imply audio, recordings, voice notes, videos, clips, photos, pictures, images, files, screens, messages or that anything was "sent" or "played". Never say "I heard your audio" or "in the video".
- React only to what is actually described; do not invent extra details.
- Keep the normal reply format even when the moment is loud or shocking: actions in *asterisks*, never in [brackets], and never write the whole reply in CAPITAL LETTERS (a single shouted word or short line is fine).
  `.trim();
}
