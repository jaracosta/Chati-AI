// Roleplay reply guardrails shared by the chat endpoint.
//
// Small roleplay models often (1) drift into writing the user's next turn,
// (2) prefix replies with "Name:", and (3) lose the formatting rules when the
// prompt does not fit their context window. These helpers keep replies on
// the character's side and make the prompt fit.

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A line starting with one of these means the model began writing the
// user's turn (or a chat-template header) instead of the character's.
const USER_TURN_PATTERNS = [
  /^(?:user|you|human|player|usuario|t[uú]|jugador)\s*:/i,
  /^\{\{\s*user\s*\}\}/i,
  /^<\s*\/?\s*user\s*>/i,
  /^<\|(?:im_start|im_end|user|end|eot_id|start_header_id)/i,
  /^\[\s*(?:user|you|usuario|inst)\b/i,
  /^#{2,}\s*(?:instruction|input|user|response|human)/i
];

// How many characters of a line we need before we can tell it is not a
// user-turn header. Headers are short ("Usuario:", "### Instruction").
const DECIDE_AFTER = 18;

function isUserTurnLine(line) {
  const text = String(line || "").trim().replace(/^[*_"“]+/, "").trim();
  return USER_TURN_PATTERNS.some(pattern => pattern.test(text));
}

function makeOwnNamePrefix(characterName) {
  const name = String(characterName || "").trim();
  if (!name) return null;
  return new RegExp(
    "^(\\s*)(?:\\*{0,2}\\s*)" + escapeRegExp(name) + "\\s*(?:\\*{0,2})\\s*:\\s*(?:\\*{2}(?!\\S*\\*{2})\\s*)?",
    "i"
  );
}

// Streaming filter. push() returns the text that is safe to show now; once
// a user-turn line appears, everything from that line on is dropped and
// done() becomes true so the caller can stop reading the model stream.
export function createReplyGuard({ characterName } = {}) {
  const ownPrefix = makeOwnNamePrefix(characterName);
  let pending = "";
  let lineDecided = false;
  let stopped = false;
  // After "Name:" is removed, drop the space that may arrive in a later chunk.
  let skipLeadingSpace = false;

  const cleanLineStart = line => {
    if (!ownPrefix || !ownPrefix.test(line)) return line;
    const cleaned = line.replace(ownPrefix, "$1");
    if (!cleaned.trim()) skipLeadingSpace = true;
    return cleaned;
  };

  const passThrough = text => {
    if (!skipLeadingSpace) return text;
    const trimmed = text.replace(/^[ \t]+/, "");
    if (trimmed) skipLeadingSpace = false;
    return trimmed;
  };

  const take = final => {
    if (stopped) return "";
    let out = "";

    while (pending) {
      const newline = pending.indexOf("\n");

      if (newline === -1) {
        if (lineDecided) {
          out += passThrough(pending);
          pending = "";
          break;
        }

        const enough =
          final ||
          pending.trim().length >= DECIDE_AFTER ||
          /:/.test(pending.slice(0, DECIDE_AFTER + 4));

        if (!enough) break;

        if (isUserTurnLine(pending)) {
          stopped = true;
          pending = "";
          break;
        }

        out += cleanLineStart(pending);
        pending = "";
        lineDecided = true;
        break;
      }

      const line = pending.slice(0, newline);

      if (!lineDecided && isUserTurnLine(line)) {
        stopped = true;
        pending = "";
        break;
      }

      out += (lineDecided ? passThrough(line) : cleanLineStart(line)) + "\n";
      pending = pending.slice(newline + 1);
      lineDecided = false;
      skipLeadingSpace = false;
    }

    return out;
  };

  return {
    push(delta) {
      if (stopped) return "";
      pending += String(delta || "");
      return take(false);
    },
    flush() {
      return take(true);
    },
    done() {
      return stopped;
    }
  };
}

// Same filter for a complete (non-streamed) reply.
export function cleanRoleplayReply(text, characterName) {
  const guard = createReplyGuard({ characterName });
  return (guard.push(text) + guard.flush()).replace(/\s+$/, "");
}

// Short, explicit rules repeated at the very end of the system prompt, where
// small models pay the most attention.
export function buildCoreRoleplayRules(characterName) {
  const name = String(characterName || "the character").trim();
  return `
MOST IMPORTANT RULES (ALWAYS FOLLOW)

1. You are ONLY ${name}. The user controls their own character. Never write the user's dialogue, actions, thoughts, feelings, or decisions, and never continue the conversation as the user. Stop after ${name}'s turn.

2. Write every action, gesture, expression, and narration between double asterisks, and write spoken words outside them. Example:
**${name} crosses their arms and looks away.** I never said I was worried.

3. Do not start your reply with "${name}:" or any name label.
  `.trim();
}

// Known context windows for models that need the compact prompt. Larger
// models default to a big window so nothing is trimmed.
const KNOWN_CONTEXT_TOKENS = [
  [/mythomax/i, 4096],
  [/mythalion/i, 4096],
  [/llama-2|l2-/i, 4096],
  [/remm-slerp/i, 6144],
  [/weaver/i, 8000]
];

export function getModelContextTokens(model, env = {}) {
  const fromEnv = Number(env.OPENROUTER_CONTEXT_TOKENS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  for (const [pattern, tokens] of KNOWN_CONTEXT_TOKENS) {
    if (pattern.test(String(model || ""))) return tokens;
  }

  return 128000;
}

// Rough token estimate (no tokenizer on the server): ~3.5 characters per
// token for mixed English/Spanish text, rounded up to stay on the safe side.
export function estimateTokens(value) {
  if (!value) return 0;
  if (typeof value === "string") return Math.ceil(value.length / 3.5) + 4;
  if (Array.isArray(value)) {
    return value.reduce((sum, part) => {
      if (part?.type === "input_image") return sum + 800;
      return sum + estimateTokens(part?.text || "");
    }, 4);
  }
  return estimateTokens(String(value));
}

// Drop the oldest messages until instructions + history + reply fit. Always
// keeps the latest messages so the character answers the current turn.
export function fitInputToContext(input, { instructions, contextTokens, maxOutputTokens, keepLast = 2 }) {
  const budget =
    contextTokens - maxOutputTokens - estimateTokens(instructions) - 64;

  const kept = [];
  let used = 0;

  for (let index = input.length - 1; index >= 0; index -= 1) {
    const cost = estimateTokens(input[index].content);
    const mustKeep = kept.length < keepLast;

    if (!mustKeep && used + cost > budget) break;

    kept.unshift(input[index]);
    used += cost;
  }

  // Chat templates expect the history to start with a user turn.
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();

  return kept;
}
