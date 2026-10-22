// Canon voice cards.
//
// The roleplay model is small and only half-remembers famous characters, so
// they drift into a generic "anime guy" voice. Before chatting, a stronger
// model (CHATI_MODEL, with web search) writes a short card describing how the
// character really talks and acts in their story, plus sample lines in the
// character's voice. The card goes into every roleplay prompt, where a small
// model imitates it far better than it recalls canon on its own.
//
// Original characters (made up by the user) get a card too, written from the
// creator's profile, rules and example lines ("SOURCE: Original character").
// Only a sheet that says almost nothing gets "ORIGINAL" (no card).

const MAX_CARD_CHARS = 4000;
const CACHE_LIMIT = 300;

export const ORIGINAL_MARKER = "ORIGINAL";

// Bump when the card format changes, so every character gets a new card.
const CARD_VERSION = "v3";

// Same character sheet → same card. Changing the name, bio or personality
// in the editor gives a new fingerprint, so the card is rebuilt.
export function canonFingerprint(character = {}) {
  const text = [
    CARD_VERSION,
    character.name,
    String(character.bio || character.description || "").slice(0, 600),
    String(character.personality || "").slice(0, 600),
    String(character.instructions || "").slice(0, 400)
  ]
    .map(part => String(part || "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildCanonProfileMessages(character = {}) {
  const name = String(character.name || "").trim();
  const exampleLines = (Array.isArray(character.exampleMessages) ? character.exampleMessages : [])
    .map(example => String(typeof example === "string" ? example : example?.character || "").trim())
    .filter(Boolean)
    .slice(0, 4);
  const sheet = [
    character.bio || character.description ? `Description: ${String(character.bio || character.description).slice(0, 1500)}` : "",
    character.personality ? `Personality: ${String(character.personality).slice(0, 2000)}` : "",
    character.scenario ? `Scenario: ${String(character.scenario).slice(0, 800)}` : "",
    character.instructions ? `Creator's rules for this character: ${String(character.instructions).slice(0, 1500)}` : "",
    exampleLines.length ? `Lines the creator wrote for them:\n${exampleLines.map(line => `- ${line.slice(0, 400)}`).join("\n")}` : ""
  ].filter(Boolean).join("\n");

  const system = `
You are an expert on anime, manga, games, TV series, films and books, and on writing characters. You write "voice cards" that let a roleplay AI speak exactly like one specific character.

First decide: is "${name}" an existing character from a published work (as the sheet below describes them)?

A) EXISTING CHARACTER: write their canon card. Facts must be canon (search the web if unsure); where the sheet adds details, include them.
B) ORIGINAL CHARACTER (made up by the creator, or you cannot identify them with confidence): write the card FROM THE SHEET. The creator's personality, rules and lines are the truth — turn them into concrete, specific speaking and behaviour notes. Invent only small details that fit and never contradict the sheet. SOURCE must start with "Original character".
Only if the sheet is empty or says almost nothing about who they are, reply with exactly: ${ORIGINAL_MARKER}

Be specific to THIS character, never generic. Use this exact format, in English except where noted, at most about 520 words:

SOURCE: the work and which point of the story this version is from — or "Original character (creator's profile)".
WHO: 2-3 lines — who they are and what drives them.
VOICE: how they really talk — register, sentence length and rhythm, how they refer to themselves and address others (nicknames, honorifics), verbal tics, laugh, humour, swearing or not, how much they talk. Mention what makes their dialogue instantly recognisable.
ATTITUDE: how they treat strangers, friends/allies, enemies, and someone they like or tease.
SIGNATURE: their real catchphrases or iconic lines (they use these rarely, at the right moment).
REAL QUOTES: 3-5 short lines ${name} really says — from the work (exact wording when you know it), or for an original character the creator's own lines — each on its own line starting with "- ". These show how they truly sound.
NEVER: 4-6 things this character would never say or do (common out-of-character mistakes; for an original character, things that break the creator's profile).
KNOWS: key people, places, powers and events they would naturally reference — and what they would not know.
SAMPLE LINES (EN): 6 short everyday lines in their exact voice: a greeting, being teased, being challenged, comforting someone, being bored, being complimented. One or two sentences each, with a short **action** where it fits.
SAMPLE LINES (ES): the same 6 lines in natural spoken Spanish (tú, not usted), keeping the voice and attitude.
  `.trim();

  return [
    { role: "system", content: system },
    { role: "user", content: `Character: ${name}\n${sheet || "(no sheet — identify them from the name)"}` }
  ];
}

// True for a card written from the creator's profile (not from a series).
export function isOriginalCharacterCard(card) {
  return /^\s*\**SOURCE\**\s*:\s*original character/i.test(String(card || ""));
}

// The model's reply → a clean card, "ORIGINAL", or "" if unusable.
export function parseCanonProfile(text) {
  const raw = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```[a-z]*\s*|```\s*$/gim, "")
    .trim();
  if (!raw) return "";
  if (/^\W*ORIGINAL\W*$/i.test(raw) || (raw.length < 40 && /\bORIGINAL\b/i.test(raw))) return ORIGINAL_MARKER;
  // A card must at least say how the character talks.
  if (!/VOICE\s*:/i.test(raw)) return "";
  const start = raw.search(/SOURCE\s*:/i);
  return (start > 0 ? raw.slice(start) : raw).slice(0, MAX_CARD_CHARS).trim();
}

// Card from the client (it stores cards it was given). Trust only the shape.
export function sanitizeCanonProfile(value) {
  const text = String(value || "").trim();
  if (!text || text === ORIGINAL_MARKER) return "";
  if (!/VOICE\s*:/i.test(text)) return "";
  return text.slice(0, MAX_CARD_CHARS);
}

export function buildCanonPromptSection(characterName, card) {
  const name = String(characterName || "the character").trim();
  const text = sanitizeCanonProfile(card);
  if (!text) return "";
  return `
CANON VOICE CARD — THIS IS WHO ${name.toUpperCase()} REALLY IS (FOLLOW IT CLOSELY)

${text}

HOW TO USE THE CARD
- Every reply must sound like it was taken straight out of ${name}'s own story: their vocabulary, rhythm, attitude, and the way they treat the person in front of them.
- The sample lines show the voice. Write new lines in that same voice; do not copy the samples word for word.
- Use signature catchphrases rarely — only when the moment really calls for them, never every reply.
- Never do anything listed under NEVER.
- The card is WHO ${name} is: voice, personality, past and skills — it wins over generic roleplay habits.
- The scenario and the events of this chat are WHAT IS HAPPENING NOW. When they differ from canon (another setting, a different relationship, an alternate timeline), follow this story — never pull it back to canon events, places or people that are not part of it.
  `.trim();
}

// Small in-memory cache (shared by everyone chatting with the same Explore
// character) plus de-duplication of cards being written right now.
export function createCanonProfileStore({ generate, limit = CACHE_LIMIT } = {}) {
  const cache = new Map();
  const pending = new Map();

  function remember(key, card) {
    cache.delete(key);
    cache.set(key, card);
    while (cache.size > limit) cache.delete(cache.keys().next().value);
  }

  return {
    get(key) {
      return cache.has(key) ? cache.get(key) : undefined;
    },
    async load(character) {
      const key = canonFingerprint(character);
      if (cache.has(key)) return cache.get(key);
      if (pending.has(key)) return pending.get(key);
      const job = (async () => {
        try {
          const card = parseCanonProfile(await generate(character));
          // Do not cache failures, so a later request can try again.
          if (card) remember(key, card);
          return card;
        } finally {
          pending.delete(key);
        }
      })();
      pending.set(key, job);
      return job;
    }
  };
}

// Pulls the parts of a card the character lock needs. Labels follow the
// card format written by buildCanonProfileMessages().
export function parseCanonCard(card) {
  const text = sanitizeCanonProfile(card);
  if (!text) return null;
  const labels = ["SOURCE", "WHO", "VOICE", "ATTITUDE", "SIGNATURE", "REAL QUOTES", "NEVER", "KNOWS", "SAMPLE LINES \\(EN\\)", "SAMPLE LINES \\(ES\\)"];
  const section = label => {
    const others = labels.filter(other => other !== label).join("|");
    const match = text.match(new RegExp("(?:^|\\n)\\s*\\**" + label + "\\**\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\**(?:" + others + ")\\**\\s*:|$)", "i"));
    return match ? match[1].trim() : "";
  };
  const lines = value => value
    .split(/\n+|(?<=[.!?…])\s+(?=[-•\d]|\*\*)/)
    .map(line => line.replace(/^\s*(?:[-•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  return {
    voice: section("VOICE"),
    attitude: section("ATTITUDE"),
    never: section("NEVER"),
    quotes: lines(section("REAL QUOTES")),
    samples: {
      en: lines(section("SAMPLE LINES \\(EN\\)")),
      es: lines(section("SAMPLE LINES \\(ES\\)"))
    }
  };
}
