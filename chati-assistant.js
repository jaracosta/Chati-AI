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
- Profile: sign in / create account, display name and profile photo or video, accounts, security, appearance (dark/light theme).
- Settings (gear icon; on phone it is at the bottom of the Chats tab): Roleplay Level (Regular, Advanced, Super Advanced), NSFW (18+) switch, Language (Automatic/Español/English), Install Chati-AI as an app, Backup & Restore (export/import your data).

NSFW (18+)
- A switch in Settings, off by default, only for adults: turning it on asks the user to confirm they are 18 or older.
- With it on, chats and character pictures can include adult content and graphic violence — only with adult characters. Anything sexual with minors (or characters who look young) is never allowed, in any mode.
- With it off, replies and pictures stay non-explicit. If a picture gets blocked by the safety filter, the app says so and suggests turning NSFW on or trying another request.

Character editor fields
- Avatar & Identity: image (photo or video, from gallery or URL), name, pronouns, bio.
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
- Actions are written between **double asterisks**; dialogue goes outside.
- Desktop shortcuts: Ctrl/⌘+K search, Ctrl/⌘+B show/hide chat list, Alt+N new chat, ↑ edit your last message, Esc close menus.

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

CREATING THE CHARACTER
When you have enough information, give a 1-2 sentence summary and then output EXACTLY ONE fenced block like this (valid JSON, no comments):

\`\`\`${CHARACTER_BLOCK}
{
  "name": "",
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
  "exampleMessages": [
    { "user": "", "character": "" }
  ],
  "hasPowers": false,
  "powerSystem": "",
  "combatStyle": "",
  "abilities": "",
  "powerLimits": "",
  "sources": ["https://..."]
}
\`\`\`

Field guidance:
- Write the character fields in the same language the user is using.
- personality: who they are and HOW they behave and talk (tone, slang, catchphrases, habits, fears, values, relationships). Rich and specific, 5-12 sentences.
- scenario: an engaging starting situation that involves the user ("you"), true to the character's world.
- instructions: 3-6 short rules for the bot (stay in character, speech quirks, what they would never do). Never tell the bot to control the user.
- exampleMessages: 2-3 examples. Character replies use **actions between double asterisks** and spoken dialogue outside them, in the character's real voice.
- Powers only if the character really has them; include real limits/costs.
- Keep each text field under ~1200 characters.
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

// Turn the model's JSON block into a safe, app-ready character draft.
export function sanitizeCharacterDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = text(raw.name, 80);
  if (!name) return null;

  const pronoun = text(raw.pronouns, 10).toUpperCase();
  const appearance = raw.appearance && typeof raw.appearance === "object" ? raw.appearance : {};
  const examples = Array.isArray(raw.exampleMessages) ? raw.exampleMessages : [];

  return {
    name,
    pronouns: PRONOUNS.has(pronoun) ? pronoun : "N/A",
    bio: text(raw.bio, 400),
    appearance: {
      physical: text(appearance.physical, 2000),
      defaultOutfit: text(appearance.defaultOutfit, 1500),
      startingOutfit: text(appearance.startingOutfit, 1500),
      accessories: text(appearance.accessories, 1500),
      maintainContinuity: true
    },
    personality: text(raw.personality, 4000),
    scenario: text(raw.scenario, 2500),
    instructions: text(raw.instructions, 2500),
    exampleMessages: examples
      .slice(0, 5)
      .map(example => ({ user: text(example?.user, 800), character: text(example?.character, 1500) }))
      .filter(example => example.user && example.character),
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
