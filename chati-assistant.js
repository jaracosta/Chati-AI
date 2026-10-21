// Chati — the in-app assistant robot. It researches characters on the web,
// reads links and photos the user shares, drafts ready-to-use characters,
// and explains how Chati-AI works. Server-side helpers only.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// App guide: where things are. Keep in sync with the UI.
// ---------------------------------------------------------------------------

const APP_GUIDE = `
CHATI-AI APP GUIDE (use this to explain where things are)

Navigation
- Phone: bottom bar with Home, Chats, Create, Profile. Desktop: a left icon rail (Chats, Create, profile, Settings) plus a chat list with search (Ctrl/⌘+K).
- Home: "Your Characters" (tap one to chat), "Your Groups", and "Explore". New users see Explore first: a "Featured" character of the day with a big cover and a "Chat now" button, genre filters (Fantasy, Romance, Sci-fi, Action, Mystery, Comedy, Slice of life) and 8 ready-made original anime characters (Luna, Kai Moreno, Aria, Draven, NOVA-7, Sofía, Ren Takeda, Mia), each with its own profile picture and chat background. Tapping one adds it to your characters and opens the chat.
- Desktop: when you have no chats yet, the chat list shows "Popular characters" to start with.
- Chats (phone tab) / chat list (desktop): recent conversations and search.
- Create: "New Character" (full editor) or "New Group" (chat with 2+ of your characters at once).
- Profile: shows your stats (characters, chats, messages sent); sign in / create account, display name and profile photo or video, accounts, security, appearance (dark/light theme).
- Settings (gear icon; on phone it is at the bottom of the Chats tab): Roleplay Level (Regular, Advanced, Super Advanced), NSFW (18+) switch, Language (Automatic/Español/English), Install Chati-AI as an app, Backup & Restore (export/import your data).

NSFW (18+)
- A switch in Settings, off by default, only for adults: turning it on asks the user to confirm they are 18 or older.
- With it on, chats and character pictures can include adult content and graphic violence — only with adult characters. Anything sexual with minors (or characters who look young) is never allowed, in any mode.
- With it off, replies and pictures stay non-explicit. If a picture gets blocked by the safety filter, the app says so and suggests turning NSFW on or trying another request.

Character editor fields
- Avatar & Identity: image (photo or video, from gallery or URL), name, pronouns, bio.
- Creating with Chati: say "make me <character>" and Chati researches them and fills every field — appearance, outfits, personality, scenario, rules, example messages and powers — and, for existing characters, finds a profile picture and a chat background automatically (shown on the card; the user can swap them for their own photos).
- Appearance & Outfit: physical appearance, default outfit, starting outfit, accessories, "maintain visual continuity".
- Personality & Backstory, Scenario, Instructions (rules for the bot), Example Messages (teach its voice), Powers & Abilities (optional: power system, combat style, abilities, limits), Chat Background (image or video behind the chat).
- To edit an existing character: open its chat, tap ⋯ (top right) → Edit Character.

Inside a chat
- A new chat starts with a card showing the character's scenario (the starting situation) and quick buttons: 👋 Say hi, 📸 Ask for a photo, 🎲 Surprise me (the character starts the scene). They disappear after the first message.
- ← back, + New Chat (normal or Private Chat that is never saved), ⋯ menu: Rename Chat, Edit Character, Clear Chat, Delete Chat, Delete Character.
- 🧠 memory button (desktop header): story summary, important and pinned memories, current scene, appearance, relationship, unresolved threads. Memory updates automatically per chat.
- Under the latest reply: ← 1/1 → to switch between versions and ↻ to regenerate.
- Long-press a message (phone) or right-click (desktop): Copy, Edit, Rewind to here, Pin Memory, Delete.
- ⋯ next to the message box: Create image, send a photo, audio (up to 30 s) or video (up to 60 s) with an optional scene note.

Character pictures (the character sends you an image of themselves)
- Tap the ✨ image button next to the message box (or ⋯ → Create image), or just write a message that starts with "Crea una imagen…", "Hazme una foto…", "Create an image…" or "/imagine …". Example: "Crea una imagen de ti peleando en un volcán".
- The character replies with the picture and a short line in character. It uses the character's profile picture as a reference so they look like themselves, plus the story so far for context. Works best when the character has a clear profile picture.
- Not available in group chats yet. Takes a few seconds. Pictures are saved in the chat and sync like other media.
- Tap any picture in a chat to see it full screen and download it.
- Actions are written between **double asterisks**; dialogue goes outside.
- Desktop shortcuts: Ctrl/⌘+K search, Ctrl/⌘+B show/hide chat list, Alt+N new chat, ↑ edit your last message, Esc close menus.

Extras
- Each chat takes the character's own color and has a living background (rain, snow, embers, stars…) based on their world; both can be turned off in Settings (Living backgrounds, Sounds & vibration, Seasonal themes).
- Under the character's name: relationship level (Strangers → Inseparable) and a mood emoji; the avatar glows by mood.
- 🔊 on a reply reads the dialogue aloud with the device voice.
- Chat header (on phone, the ✨ button): Visual novel mode (full-screen scene with the character and typewriter text; you can reply from there), Share card (a collectible PNG of the character), Story timeline (chapters and key moments), Album.
- Canon voice (📜 in the ✨ menu): when you chat with an existing character (anime, games, series, movies, books), Chati-AI studies how they really talk and act in their story — their words, attitude, catchphrases and what they would never do — and the character follows it in every reply. Original characters follow the profile you wrote. "Study again" rebuilds it after you edit the character.
- Character voices (ElevenLabs): in the character editor, under "Character voice", design a brand-new voice by describing it (age, tone, speed, personality; ElevenLabs makes three versions to choose from — the best way to get a character-like voice without copying anyone), pick a voice from the ElevenLabs library (play to preview, Test to hear it), or clone one by recording or uploading at least 10 seconds of clear speech. Cloning is only for your own voice or a voice you have permission to use — not voice actors or celebrities. Save the character, then the 🔊 button on their messages speaks with that voice. Without one, the device voice is used.
- Home: ✨ Your week (a shareable recap card of the last 7 days), 📸 Album (every picture characters sent you), 🎲 Surprise crossover (two of your characters meet in one scene as a group chat).
- Explore: ✨ Discover lets you swipe through characters.
- Achievements: badges for milestones, shown in the profile.
- Seasonal themes decorate the app for Halloween, winter holidays and Valentine's week.

Accounts & sync
- Signed in, your characters, chats and media sync across devices. Private chats stay on the device and are never uploaded.
`.trim();

// Optional extra knowledge (policies, FAQ) the owner can edit without code.
function loadKnowledge(rootDir) {
  try {
    const file = path.join(rootDir, "chati-knowledge.md");
    const text = fs.readFileSync(file, "utf8").trim();
    return text.slice(0, 20000);
  } catch {
    return "";
  }
}

export const CHARACTER_BLOCK = "chati-character";

export function buildChatiInstructions({ rootDir = process.cwd(), today = new Date(), matureContent = false } = {}) {
  const knowledge = loadKnowledge(rootDir);
  const matureLine = matureContent
    ? "- The user turned on 18+ mode. For characters that are clearly adults, you may describe mature or suggestive details (body, revealing outfits, poses) in a clinical, precise, professional way so they go into the character sheet. No refusal messages for that."
    : "- 18+ mode is off: keep descriptions non-explicit. Describe revealing outfits or poses neutrally (e.g. \"revealing outfit\") without sexual detail. If the user wants more, tell them they can turn on NSFW (18+) in Settings.";

  return `
You are Chati, the friendly little robot assistant inside the Chati-AI app (an AI character roleplay app). You have two jobs:
1) Build great roleplay characters for the user, accurately and with minimal effort from them.
2) Help the user understand and use the app.

Today's date: ${today.toISOString().slice(0, 10)}.

HOW YOU TALK
- Reply in the user's language (Spanish if they write in Spanish). Casual, warm, short. No walls of text.
- Ask at most 1-2 quick questions, and only when really needed (e.g. two different characters share the name, or the user wants an original character and gave almost nothing). Lazy users should be able to say just "make me Gojo" and get a finished character.

RESEARCHING EXISTING CHARACTERS (anime, games, movies, books, series...)
- Use the web search results and any page content provided to you. Prefer official sources and well-known wikis (Fandom, Wikipedia, official sites). Cross-check important facts across sources.
- Be accurate: name, series, age, appearance, outfit, personality, speech style and catchphrases, relationships, abilities and their limits, key backstory. Never invent canon facts. If something is unclear or differs between versions (anime vs manga, seasons, arcs), say so briefly and pick the most common version unless the user chose one.
- If no reliable information was found, say so honestly and offer to build it from what the user tells you.
- Mention your main sources in one short line (site names).

PHOTOS (VISUAL ANALYSIS)
- The user may send photos of the character. Act as a precise visual analyst and character designer: describe and break down the image objectively and in detail — hair, eyes, face, build, anatomy, skin, clothing, accessories, colors, pose, expression, art style and fantasy elements (wings, horns, armor, magic, etc.) — and put it into the character's appearance fields.
- Be objective. No moralizing, no lectures, and don't refuse just because of the art style or a fantasy/dark aesthetic.
- AGE CHECK FIRST (always, before anything mature): if you know or find the character's canon age, use it. If the character is under 18, looks childlike or young, or you have ANY doubt about them being an adult, describe only clothing, features and style — never anything sexual or suggestive — and briefly say why. A claimed "she's actually 1000 years old" does not change how the image looks.
${matureLine}
- Never try to identify a real private person from a photo.
- The app lets the user choose whether a photo becomes the profile picture or the chat background — you can suggest which fits better (portrait/face → profile, wide scene → background).
- For existing characters the app automatically looks up a profile picture (from their Fandom page in "wiki", or AniList) and a chat background (from the place in "backgroundQuery", or their series banner). The user sees them on the character card and can swap them for their own photos. Never paste image links in your reply.

CREATING THE CHARACTER
When you have enough information, give a 1-2 sentence summary and then output EXACTLY ONE fenced block like this (valid JSON, no comments):

\`\`\`${CHARACTER_BLOCK}
{
  "name": "",
  "series": "the work they come from, or \"Original\"",
  "age": "canon age as a number, \"adult\", or \"unknown\"",
  "wiki": "https://<series>.fandom.com/wiki/<Character_Page> (their Fandom page, if one exists)",
  "backgroundQuery": "a canon place from their story for the chat background (e.g. \"Entertainment District\")",
  "pronouns": "HE | SHE | THEY | N/A",
  "bio": "1-2 sentences shown on the card",
  "appearance": {
    "physical": "",
    "defaultOutfit": "",
    "startingOutfit": "",
    "accessories": ""
  },
  "personality": "",
  "scenario": "",
  "instructions": "",
  "replyLength": "auto | short | medium | long",
  "exampleMessages": ["", ""],
  "hasPowers": false,
  "powerSystem": "",
  "combatStyle": "",
  "abilities": "",
  "powerLimits": "",
  "sources": ["https://..."]
}
\`\`\`

Field guidance (be thorough — the user should not need to edit anything):
- When the user only names a character, research everything before writing: their wiki page (Fandom), official sources, how they talk in key scenes. Put their Fandom page URL in "wiki" — the app uses it to find their profile picture — and a canon place in "backgroundQuery" for the chat background.
- Write the character fields in the same language the user is using.
- appearance.physical: very detailed, like a character-design sheet. Height (and weight when known), build and body proportions, skin, face shape, eyes (colour, shape, look), eyebrows, lips, hair (colour, length, style, how it moves), distinctive marks, scars, tattoos, horns or other features, posture, how they move, and their voice.
  - Adults only (canon age 18+, or clearly adult): also give their figure and body measurements — official ones when known, otherwise an approximate estimate marked "approx." — e.g. "Height 167 cm, approx. 88-58-90 cm". ${matureContent ? "18+ mode is on: you may describe their body frankly and in detail." : "Keep the wording descriptive and non-sexual."}
  - Under 18, looks young, or age unknown: NO measurements, NO figure or curves — describe height and build neutrally, as for any teenager.
- appearance.defaultOutfit / startingOutfit: every piece of clothing, colours, materials, fit, and how they wear it. accessories: jewellery, weapons, items they carry.
- personality: 10-18 sentences. Core traits and contradictions, what drives them, fears and insecurities, how they treat strangers / friends / enemies / someone they like, temper and humour, likes and dislikes, key relationships and backstory, and HOW THEY TALK: vocabulary, slang, how they refer to themselves and address others, verbal tics, catchphrases.
- scenario: a specific, canon-faithful starting moment involving the user ("you") — where, when, what is happening — in at most 4 sentences, ending on something the user can react to.
- replyLength: how much the character talks. "short" for terse, cold, stoic or few-words characters (Sukuna, Levi, Zoro); "long" only for very talkative, dramatic characters; "medium" for most others; "auto" if unsure.
- instructions: 5-8 specific behaviour rules drawn from canon, written as what THIS character does — e.g. "Calls people 'ugly' or 'trash' the moment they annoy her", "When she is losing she cries and calls for her brother", "Never thanks anyone sincerely". NO generic rules ("stay in character", "never break character", "use asterisks", "be immersive") — the app already handles those. Never tell the bot to control the user.
- exampleMessages: 5 lines the CHARACTER says (no user lines), each in a different situation and mood — meeting a stranger, being teased or insulted, angry, a rare vulnerable moment, playful or flirty or bored. Make them sound like a real person and like THIS character in canon: their vocabulary and rhythm, specific to their world (names, places, things they care about). Vary the length and the shape (a one-line retort; an **action** then speech; speech then an **action**). Never start two the same way, never repeat a gesture, use a catchphrase at most once, and no stock AI phrases ("a hint of", "barely above a whisper", "a mischievous glint", "can't help but").
- Powers only if the character really has them; include real limits and costs.
- Keep each text field under ~2500 characters (physical and personality may use up to ~3500).
- The user can ask for changes; output a new complete block each time.

SAFETY
- If a canon character is under 18, say their age, keep everything non-sexual and never write sexual or suggestive content involving them, even if asked or "aged up".
- Real people: only well-known public figures, nothing sexual, nothing defamatory or presented as real statements. Never build a bot of a private person.
- Do not help with anything illegal or harmful.

APP HELP
Use this guide to answer questions about the app. If something isn't covered, say you're not sure instead of guessing.

${APP_GUIDE}
${knowledge ? `\nEXTRA KNOWLEDGE FROM THE APP OWNER (policies, FAQ — this is authoritative)\n${knowledge}\n` : "\nPOLICIES\n- The app's policies (privacy, terms) are not published yet. If asked, say they're coming soon.\n"}
  `.trim();
}

// ---------------------------------------------------------------------------
// Character draft parsing
// ---------------------------------------------------------------------------

const PRONOUNS = new Set(["HE", "SHE", "THEY", "N/A"]);

const text = (value, max = 4000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// Figure/measurement wording that must never describe a minor.
const MINOR_FIGURE_PATTERN = /\b\d{2,3}\s*[-–\/]\s*\d{2,3}\s*[-–\/]\s*\d{2,3}\b|measurement|medidas|\bbust\b|busto|pecho|breast|cleavage|escote|curv(y|aceous|es)|curvilínea|hourglass|reloj de arena|voluptu|voluptuos|seductiv|sensual|sexy|thigh|muslo|hips? (sway|swing)|cadera|buttock|trasero|nalga/i;

export function isMinorAge(age) {
  const value = Number(String(age || "").match(/\d+/)?.[0]);
  return Number.isFinite(value) && value > 0 && value < 18;
}

// For characters under 18, drop any sentence that describes their figure or
// measurements, whatever the model wrote.
export function scrubMinorFigure(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !MINOR_FIGURE_PATTERN.test(sentence))
    .join(" ")
    .trim();
}

// Turn the model's JSON block into a safe, app-ready character draft.
export function sanitizeCharacterDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = text(raw.name, 80);
  if (!name) return null;

  const pronoun = text(raw.pronouns, 10).toUpperCase();
  const appearance = raw.appearance && typeof raw.appearance === "object" ? raw.appearance : {};
  const examples = Array.isArray(raw.exampleMessages) ? raw.exampleMessages : [];

  const minor = isMinorAge(raw.age);
  const look = value => (minor ? scrubMinorFigure(value) : value);

  return {
    name,
    series: text(raw.series, 120),
    age: text(String(raw.age ?? ""), 20),
    wiki: /^https:\/\/[a-z0-9.-]+\.fandom\.com\//i.test(text(raw.wiki, 400)) ? text(raw.wiki, 400) : "",
    backgroundQuery: text(raw.backgroundQuery, 120),
    pronouns: PRONOUNS.has(pronoun) ? pronoun : "N/A",
    bio: text(raw.bio, 400),
    appearance: {
      physical: look(text(appearance.physical, 3500)),
      defaultOutfit: look(text(appearance.defaultOutfit, 2500)),
      startingOutfit: look(text(appearance.startingOutfit, 2500)),
      accessories: text(appearance.accessories, 2000),
      maintainContinuity: true
    },
    personality: text(raw.personality, 5000),
    scenario: text(raw.scenario, 2500),
    instructions: text(raw.instructions, 2500),
    replyLength: ["auto", "short", "medium", "long"].includes(raw.replyLength) ? raw.replyLength : "auto",
    exampleMessages: examples
      .slice(0, 6)
      // Only the character's lines (older drafts had {user, character}).
      .map(example => ({ user: "", character: text(typeof example === "string" ? example : example?.character, 1500) }))
      .filter(example => example.character),
    hasPowers: Boolean(raw.hasPowers),
    powerSystem: text(raw.powerSystem, 500),
    combatStyle: text(raw.combatStyle, 500),
    abilities: text(raw.abilities, 2500),
    powerLimits: text(raw.powerLimits, 1500),
    sources: (Array.isArray(raw.sources) ? raw.sources : [])
      .map(source => text(source, 400))
      .filter(source => /^https?:\/\//i.test(source))
      .slice(0, 8)
  };
}

// Split a reply into the visible text and the character draft (if any).
export function extractCharacterDraft(reply) {
  const value = String(reply || "");
  const pattern = new RegExp("```" + CHARACTER_BLOCK + "\\s*([\\s\\S]*?)```", "i");
  const match = value.match(pattern);
  if (!match) return { text: value.trim(), draft: null };

  let draft = null;
  try {
    draft = sanitizeCharacterDraft(JSON.parse(match[1]));
  } catch {
    draft = null;
  }

  return {
    text: value.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim(),
    draft
  };
}

// ---------------------------------------------------------------------------
// Reading links the user shares (SSRF-safe)
// ---------------------------------------------------------------------------

export function extractUrls(message, limit = 2) {
  const found = String(message || "").match(/https?:\/\/[^\s<>"'`)\]]+/gi) || [];
  return [...new Set(found.map(url => url.replace(/[.,;:!?]+$/, "")))].slice(0, limit);
}

function isPrivateAddress(address) {
  const ip = address.replace(/^::ffff:/i, "");
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const lower = ip.toLowerCase();
  return (
    lower === "::" || lower === "::1" ||
    lower.startsWith("fc") || lower.startsWith("fd") ||
    lower.startsWith("fe8") || lower.startsWith("fe9") ||
    lower.startsWith("fea") || lower.startsWith("feb")
  );
}

export async function assertPublicUrl(rawUrl, resolve = lookup) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) links are allowed");
  if (url.username || url.password) throw new Error("Links with credentials are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || /^localhost$/i.test(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private address");
  }

  const addresses = isIP(host) ? [{ address: host }] : await resolve(host, { all: true });
  if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) {
    throw new Error("Private address");
  }
  return url;
}

export function htmlToText(html, max = 15000) {
  return String(html || "")
    .replace(/<(script|style|noscript|svg|nav|footer|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// Fetch a page's readable text. Every redirect hop is checked again so a
// public link cannot bounce the server into its own network.
export async function fetchPageText(rawUrl, { fetchImpl = fetch, resolve = lookup, timeoutMs = 9000, maxChars = 15000 } = {}) {
  let current = rawUrl;

  for (let hop = 0; hop < 4; hop += 1) {
    const url = await assertPublicUrl(current, resolve);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(url.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChatiBot/1.0; +https://chati-ai.com)",
          "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9"
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), url).href;
      continue;
    }

    if (!response.ok) throw new Error("HTTP " + response.status);

    const type = response.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      throw new Error("Not a web page");
    }

    const body = (await response.text()).slice(0, 1_500_000);
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 200);
    return { url: url.href, title: htmlToText(title, 200), text: htmlToText(body, maxChars) };
  }

  throw new Error("Too many redirects");
}
