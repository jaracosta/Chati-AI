// Canon voice cards.
//
// The roleplay model is small and only half-remembers famous characters, so
// they drift into a generic "anime guy" voice. Before chatting, a stronger
// model (CHATI_MODEL, with web search) writes a short card describing how the
// character really talks and acts in their story, plus sample lines in the
// character's voice. The card goes into every roleplay prompt, where a small
// model imitates it far better than it recalls canon on its own.
//
// Original characters (made up by the user) get no card: "ORIGINAL".

const MAX_CARD_CHARS = 4000;
const CACHE_LIMIT = 300;

export const ORIGINAL_MARKER = "ORIGINAL";

// Same character sheet → same card. Changing the name, bio or personality
// in the editor gives a new fingerprint, so the card is rebuilt.
export function canonFingerprint(character = {}) {
  const text = [
    character.name,
    String(character.bio || character.description || "").slice(0, 600),
    String(character.personality || "").slice(0, 600)
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
  const sheet = [
    character.bio || character.description ? `Description: ${String(character.bio || character.description).slice(0, 1500)}` : "",
    character.personality ? `Personality: ${String(character.personality).slice(0, 1500)}` : "",
    character.scenario ? `Scenario: ${String(character.scenario).slice(0, 800)}` : ""
  ].filter(Boolean).join("\n");

  const system = `
You are an expert on anime, manga, games, TV series, films and books. You write "canon voice cards" that let a roleplay AI speak exactly like an existing fictional character.

First decide: is "${name}" an existing character from a published work (as the sheet below describes them)? If they are an original character someone made up, or you cannot identify them with confidence, reply with exactly: ${ORIGINAL_MARKER}

Otherwise write the card. Be specific to THIS character, never generic. Facts must be canon (search the web if unsure). Use this exact format, in English except where noted, at most about 450 words:

SOURCE: the work, and which point of the story this version is from (follow the sheet; otherwise their most iconic period).
WHO: 2-3 lines — who they are and what drives them.
VOICE: how they really talk — register, sentence length and rhythm, how they refer to themselves and address others (nicknames, honorifics), verbal tics, laugh, humour, swearing or not, how much they talk. Mention what makes their dialogue instantly recognisable.
ATTITUDE: how they treat strangers, friends/allies, enemies, and someone they like or tease.
SIGNATURE: their real catchphrases or iconic lines (they use these rarely, at the right moment).
NEVER: 4-6 things this character would never say or do (common out-of-character mistakes).
KNOWS: key people, places, powers and events they would naturally reference — and what they would not know.
SAMPLE LINES (EN): 6 short everyday lines in their exact voice: a greeting, being teased, being challenged, comforting someone, being bored, being complimented. One or two sentences each, with a short **action** where it fits.
SAMPLE LINES (ES): the same 6 lines in natural spoken Spanish (tú, not usted), keeping the voice and attitude.
  `.trim();

  return [
    { role: "system", content: system },
    { role: "user", content: `Character: ${name}\n${sheet || "(no sheet — identify them from the name)"}` }
  ];
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
- The creator's profile and the events of this chat can add to the card; for everything else, the card (canon) wins over generic roleplay habits.
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
  const labels = ["SOURCE", "WHO", "VOICE", "ATTITUDE", "SIGNATURE", "NEVER", "KNOWS", "SAMPLE LINES \\(EN\\)", "SAMPLE LINES \\(ES\\)"];
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
    samples: {
      en: lines(section("SAMPLE LINES \\(EN\\)")),
      es: lines(section("SAMPLE LINES \\(ES\\)"))
    }
  };
}
