// Keeps characters sounding like themselves over a long chat.
//
// Small roleplay models drift in two ways: they copy their own earlier
// replies (the same openings, the same "smirks", the same pet phrases until
// every message sounds alike) and they slide into stock AI prose ("barely
// above a whisper", "a hint of mischief") instead of the character's voice.
//
// - findOverusedPhrases(): phrases this character already used in several
//   recent replies, so the next reply is told to avoid them.
// - buildVoiceAnchor(): a short reminder of WHO is talking and HOW, placed
//   right before the user's last message, where the model looks hardest.
//   (The full rules sit at the top of a long chat, far from the end.)
// - polishReply(): removes sentences copied word for word from recent
//   replies or repeated inside the reply, and stuttered word loops.

// Stock phrases that make every character sound like the same AI.
export const CLICHE_PHRASES = [
  "barely above a whisper", "voice barely a whisper", "a hint of", "sends shivers down", "shiver down", "shivers down your spine",
  "a mischievous glint", "glint in her eye", "glint in his eye", "eyes sparkling with", "smirk playing on", "smile playing on",
  "can't help but", "couldn't help but", "her heart pounding", "his heart pounding", "heart skips a beat", "breath hitches",
  "a mix of", "a blend of", "eyes locking", "eyes lock onto", "the air is thick", "electricity in the air", "ministrations",
  "testament to", "palpable", "for what feels like an eternity", "little did", "dance of", "sly grin", "knowing smile",
  "un toque de", "un atisbo de", "apenas un susurro", "un brillo travieso", "no puede evitar", "una mezcla de", "el corazón le late"
];

// A varied handful for the anchor (the whole list would be too long).
const ANCHOR_CLICHES = ["barely above a whisper", "a hint of", "sends shivers down", "a mischievous glint", "can't help but", "a mix of"];

const STOP = new Set((
  "a an and are as at be but by for from had has have he her hers him his i if in into is it its me my no not of on or our she so " +
  "than that the their them then there they this to too up us was we were what when where which who will with you your " +
  "y o a al de del el la los las lo le les un una unos unas que en por para con sin se su sus mi mis tu tus te me es soy eres " +
  "está esta este eso esa ese no sí si pero como más muy ya yo tú él ella"
).split(" "));

function words(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[*_~"“”«»()[\]]/g, " ")
    .match(/[\p{L}\p{N}']+/gu) || [];
}

function normalizeSentence(sentence) {
  return words(sentence).join(" ");
}

function splitSentences(text) {
  return String(text || "").match(/\*\*[^*]+\*\*|\*[^*]+\*|[^.!?…*\n]+(?:[.!?…]+|$)/g) || [];
}

// Phrases (3-5 words, or a repeated opening) that appear in at least
// `minReplies` of the character's recent replies.
export function findOverusedPhrases(replies, { characterName = "", minReplies = 2, limit = 8 } = {}) {
  const recent = (Array.isArray(replies) ? replies : []).filter(Boolean).slice(-8);
  if (recent.length < 2) return [];
  const nameWords = new Set(words(characterName));
  const seen = new Map();
  const note = (phrase, index) => {
    if (!seen.has(phrase)) seen.set(phrase, new Set());
    seen.get(phrase).add(index);
  };
  recent.forEach((reply, index) => {
    const list = words(reply);
    for (let size = 5; size >= 3; size -= 1) {
      for (let start = 0; start + size <= list.length; start += 1) {
        const gram = list.slice(start, start + size);
        const content = gram.filter(word => !STOP.has(word) && !nameWords.has(word));
        if (content.length < 2) continue;
        note(gram.join(" "), index);
      }
    }
    // The way a reply opens ("*He smirks.*", "Tch. Oi,").
    const opening = list.slice(0, 3).join(" ");
    if (opening.split(" ").length === 3) note("OPEN:" + opening, index);
  });
  const repeated = [...seen]
    .filter(([, indexes]) => indexes.size >= minReplies)
    .map(([phrase, indexes]) => ({ phrase, count: indexes.size, length: phrase.split(" ").length }))
    .sort((a, b) => b.count - a.count || b.length - a.length);
  // Keep the longest phrases; drop ones contained in a phrase already kept.
  const kept = [];
  for (const item of repeated) {
    const text = item.phrase.replace(/^OPEN:/, "");
    if (kept.some(other => other.includes(text) || text.includes(other))) continue;
    kept.push(text);
    if (kept.length >= limit) break;
  }
  return kept;
}


// The *actions* used in recent replies, shortened ("crosses his arms",
// "sips his tea"), so the next reply picks a different gesture.
export function recentGestures(replies, { limit = 6 } = {}) {
  const found = [];
  for (const reply of (Array.isArray(replies) ? replies : []).slice(-5)) {
    for (const match of String(reply || "").matchAll(/\*\*([^*]+)\*\*|\*([^*]+)\*/g)) {
      const gist = words(match[1] || match[2]).slice(0, 6).join(" ");
      if (gist.split(" ").length >= 2 && !found.includes(gist)) found.push(gist);
    }
  }
  return found.slice(-limit);
}

// How a reply is built: only speech, action first, or speech first.
export function replyShape(reply) {
  const text = String(reply || "").trim();
  if (!/\*[^*]+\*/.test(text)) return "speech";
  return /^\*/.test(text) ? "action-first" : "speech-first";
}

const SHAPES = [
  { id: "action-first", weight: 3, text: "One short action, then what they say." },
  { id: "speech-first", weight: 3, text: "Start by speaking; add one small action or reaction after, or none." },
  { id: "speech", weight: 3, text: "Just speak this time — 1 to 3 spoken sentences, no action." },
  { id: "two-beats", weight: 1, text: "Two short paragraphs: react, then say a bit more or ask something." }
];

// Picks this turn's shape, avoiding the shape of the last two replies so
// the conversation does not fall into one template.
export function pickReplyShape(previousReplies = [], random = Math.random) {
  const recent = (Array.isArray(previousReplies) ? previousReplies : []).slice(-2).map(replyShape);
  const options = SHAPES.filter(shape => !(recent.length === 2 && recent[0] === recent[1] && shape.id === recent[1]) && shape.id !== recent[recent.length - 1]);
  const pool = options.length ? options : SHAPES;
  const total = pool.reduce((sum, shape) => sum + shape.weight, 0);
  let roll = random() * total;
  for (const shape of pool) {
    roll -= shape.weight;
    if (roll < 0) return shape.text;
  }
  return pool[0].text;
}

export function buildVoiceAnchor({ characterName = "the character", card = null, profile = "", examples = [], overused = [], gestures = [], shape = "", userAsked = false, language = "en" } = {}) {
  const name = String(characterName || "the character").trim();
  const lines = [];
  const voice = card?.voice || String(profile || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (voice) lines.push(`Voice: ${voice.slice(0, 400)}`);
  if (card?.never) lines.push(`Never: ${card.never.replace(/\s+/g, " ").slice(0, 300)}`);
  const samples = [
    ...(card?.quotes || []).slice(0, 2),
    ...((card?.samples?.[language === "es" ? "es" : "en"]) || []).slice(0, 1),
    ...(Array.isArray(examples) ? examples : [])
      .map(example => String(typeof example === "string" ? example : example?.character || "").trim())
      .filter(Boolean)
      .slice(0, 1)
  ].map(line => line.replace(/\s+/g, " ").slice(0, 180));
  if (samples.length) lines.push(`Sounds like: ${samples.map(line => `"${line}"`).join(" / ")}`);
  if (overused.length) lines.push(`Worn out — do NOT use again: ${overused.map(phrase => `"${phrase}"`).join(", ")}. Open differently from the last replies.`);
  if (gestures.length) lines.push(`Gestures already used — pick a different one, or none: ${gestures.map(gesture => `"${gesture}"`).join(", ")}.`);
  if (userAsked) lines.push(`They asked ${name} something: answer it first, in ${name}'s own way.`);
  if (shape) lines.push(`This reply: ${shape}`);
  lines.push(`No stock AI phrases (${ANCHOR_CLICHES.map(phrase => `"${phrase}"`).join(", ")}…). Fresh words, ${name}'s words.`);
  return `[Stay in character as ${name}. Answer the user's last message the way ${name} really would.\n${lines.map(line => "- " + line).join("\n")}]`;
}

// Removes repetition the model produced anyway. Never removes so much that
// the reply would lose its meaning (keeps the original if under 50% stays).
export function polishReply(text, previousReplies = []) {
  const value = String(text || "");
  if (!value.trim()) return value;
  const earlier = new Set();
  for (const reply of (Array.isArray(previousReplies) ? previousReplies : []).slice(-4)) {
    for (const sentence of splitSentences(reply)) {
      const key = normalizeSentence(sentence);
      if (key.split(" ").length >= 4) earlier.add(key);
    }
  }
  const seenHere = new Set();
  let removed = 0;
  // Work line by line so paragraphs and line breaks are kept.
  const polished = value.split(/(\n+)/).map(line => {
    if (/^\n+$/.test(line)) return line;
    const parts = splitSentences(line);
    if (!parts.length) return line;
    const kept = parts.filter(sentence => {
      // *Actions* stay (removing one can break the scene); the prompt asks
      // for fresh ones instead. Repeated speech is what reads as a loop.
      if (/^\s*\*/.test(sentence)) return true;
      const key = normalizeSentence(sentence);
      if (key.split(" ").length < 4) return true;
      if (earlier.has(key) || seenHere.has(key)) {
        removed += sentence.length;
        return false;
      }
      seenHere.add(key);
      return true;
    });
    return kept.join("").replace(/\s{2,}/g, " ");
  }).join("");
  const cleaned = polished
    // "no no no no no" → "no no no"; "very very very very" → "very very"
    .replace(/\b(\p{L}+)(?:[\s,]+\1\b){3,}/giu, (match, word) => `${word} ${word.toLowerCase()} ${word.toLowerCase()}`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!removed && cleaned === value.trim()) return value;
  return cleaned.length >= value.trim().length * 0.5 ? cleaned : value;
}
