// Keeps the chat memory from losing what the user told the character.
//
// The memory model rewrites the whole memory every 10 messages. Models drop
// details when they rewrite (a name, a favourite food, a promise), so:
// - userDetails (what the user said about themselves or their character) is
//   merged with the previous list: an old detail survives unless the new
//   list has an updated version of it;
// - importantFacts cannot shrink drastically in one update;
// - relevantDetails() picks the remembered details that matter for what the
//   user just wrote, to remind the character right before it answers.

const STOP_WORDS = new Set((
  "a al algo como con de del el ella ellas ellos en era es esa ese eso esta este esto fue ha han hay la las le les lo los me mi mis muy no nos o para pero por que se si sin su sus te tiene tu tus un una uno y ya yo usuario user users " +
  "about and are as at be but by for from has have he her his i in is it its me my of on or our she so that the their them they this to was we were with you your"
).split(" "));

function plain(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function keywords(text) {
  const words = plain(text).match(/[a-z0-9ñ]{3,}/g) || [];
  return [...new Set(words.filter(word => !STOP_WORDS.has(word)))];
}

function clean(list, max = 300) {
  return (Array.isArray(list) ? list : [])
    .map(item => (typeof item === "string" ? item : item?.text))
    .filter(item => typeof item === "string")
    .map(item => item.replace(/\s+/g, " ").trim().slice(0, max))
    .filter(Boolean);
}

// "User's name is Ana" and "User's name is Ana María" are the same detail:
// the first two meaningful words match ("name ana", "favorite color").
function topicKey(text) {
  return keywords(text).slice(0, 2).join(" ");
}

function sameText(a, b) {
  return plain(a).replace(/[^a-z0-9ñ]+/g, " ").trim() === plain(b).replace(/[^a-z0-9ñ]+/g, " ").trim();
}

export function mergeUserDetails(previous, next, { limit = 60 } = {}) {
  const fresh = clean(next);
  const keys = new Set(fresh.map(topicKey).filter(key => key.split(" ").length >= 2));
  const kept = clean(previous).filter(old =>
    !fresh.some(item => sameText(item, old)) && !keys.has(topicKey(old))
  );
  return [...fresh, ...kept].slice(0, limit);
}

// A rewrite that throws away most known facts is a model slip, not an
// update: keep the old ones that disappeared.
export function protectFacts(previous, next, { limit = 80 } = {}) {
  const old = clean(previous);
  const fresh = clean(next);
  if (old.length < 5 || fresh.length >= old.length * 0.6) return fresh.slice(0, limit);
  const missing = old.filter(item => !fresh.some(other => sameText(other, item)));
  return [...fresh, ...missing].slice(0, limit);
}

export function relevantDetails(details, query, { limit = 3 } = {}) {
  const wanted = keywords(query);
  if (!wanted.length) return [];
  return clean(details)
    .map((detail, index) => {
      const words = new Set(keywords(detail));
      let score = 0;
      for (const word of wanted) if (words.has(word)) score += word.length >= 6 ? 2 : 1;
      return { detail, index, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(item => item.detail);
}
