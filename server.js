import express from "express";

import dotenv from "dotenv";

import OpenAI, { toFile } from "openai";

import path from "path";

import {
  fileURLToPath
} from "url";


dotenv.config();


const app =
  express();


const PORT =
  process.env.PORT ||
  3000;


const MODEL =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-terra";


const MEMORY_MODEL =
  process.env.OPENAI_MEMORY_MODEL ||
  "gpt-5.6-luna";


const AUDIO_MODEL =
  process.env.OPENAI_AUDIO_MODEL ||
  "gpt-audio-mini";


const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL ||
  "gpt-4o-transcribe";


if (
  !process.env
    .OPENAI_API_KEY
) {

  console.error(
    "❌ OPENAI_API_KEY is missing from .env"
  );


  process.exit(1);

}


const openai =
  new OpenAI({

    apiKey:
      process.env
        .OPENAI_API_KEY

  });


const __filename =
  fileURLToPath(
    import.meta.url
  );


const __dirname =
  path.dirname(
    __filename
  );


app.use(

  express.json({
    limit:
      "50mb"
  })

);


app.use(

  express.static(

    __dirname,

    {
      dotfiles:
        "deny"
    }

  )

);


// =========================
// ROLEPLAY LEVELS
// =========================

function normalizeRoleplayLevel(
  value
) {

  return [
    "regular",
    "advanced",
    "superAdvanced"
  ].includes(
    value
  )
    ? value
    : "advanced";

}


function getRoleplayLevelConfig(
  value
) {

  const level =
    normalizeRoleplayLevel(
      value
    );


  if (
    level ===
    "regular"
  ) {

    return {
      id:
        "regular",

      label:
        "REGULAR",

      maxOutputTokens:
        850,

      instructions:
        `
- Keep the roleplay natural, direct, and easy to follow.
- Prefer shorter dialogue and scene beats unless the moment clearly needs more.
- Maintain believable emotion and continuity without adding unnecessary dramatic detail.
- Action and conflict can still be serious, but keep the presentation focused rather than highly cinematic.
        `.trim()
    };

  }


  if (
    level ===
    "superAdvanced"
  ) {

    return {
      id:
        "superAdvanced",

      label:
        "SUPER ADVANCED",

      maxOutputTokens:
        1600,

      instructions:
        `
- Maximize immersion, continuity, and commitment to the established character.
- Preserve personality, motives, emotional history, relationships, visual state, and scene continuity even during highly intense moments.
- Allow layered emotional reactions, complex relationships, powerful non-explicit romantic tension or affection, and meaningful interpersonal conflict when supported by the story.
- Dark psychological themes, betrayal, tragedy, cruel fictional villains, horror atmosphere, and intense fictional conflict may be treated seriously when they fit the scene.
- Major battles, transformations, confrontations, revelations, and emotional turning points may become longer and more cinematic.
- Do not flatten, prematurely de-escalate, moralize over, or break character merely because a fictional scene becomes emotionally intense, dark, dramatic, romantic, or confrontational.
- Keep intensity story-driven rather than escalating every turn for its own sake.
        `.trim()
    };

  }


  return {
    id:
      "advanced",

    label:
      "ADVANCED",

    maxOutputTokens:
      1150,

    instructions:
      `
- Use richer emotional continuity and more expressive character reactions.
- Give important scenes stronger atmosphere, movement, dialogue rhythm, and cinematic detail.
- Let relationships develop with nuance, including strong non-explicit romantic tension or affection when it naturally fits.
- Treat serious fictional conflict, dark themes, and dramatic consequences with appropriate weight instead of automatically softening them.
- Keep casual moments concise, but let battles, revelations, and emotionally important scenes breathe.
      `.trim()
  };

}


// =========================
// MEMORY NORMALIZATION
// =========================

function normalizePinnedMemories(
  value
) {

  if (
    !Array.isArray(value)
  ) {

    return [];

  }


  return value
    .map(

      item => {

        if (
          typeof item ===
          "string"
        ) {

          return {

            id:
              "legacy",

            text:
              item,

            sourceMessageId:
              null,

            createdAt:
              null

          };

        }


        if (
          !item ||
          typeof item !==
            "object" ||
          typeof item.text !==
            "string"
        ) {

          return null;

        }


        return {

          id:
            item.id ||
            "legacy",

          text:
            item.text,

          sourceMessageId:
            item.sourceMessageId ||
            null,

          createdAt:
            item.createdAt ||
            null

        };

      }

    )
    .filter(Boolean);

}


function normalizeAppearanceProfile(
  value
) {

  const appearance =
    value &&
    typeof value ===
      "object"
      ? value
      : {};


  return {

    physical:
      typeof appearance.physical ===
      "string"
        ? appearance.physical
        : "",

    defaultOutfit:
      typeof appearance.defaultOutfit ===
      "string"
        ? appearance.defaultOutfit
        : "",

    startingOutfit:
      typeof appearance.startingOutfit ===
      "string"
        ? appearance.startingOutfit
        : "",

    accessories:
      typeof appearance.accessories ===
      "string"
        ? appearance.accessories
        : "",

    maintainContinuity:
      appearance.maintainContinuity !==
        false

  };

}


function normalizeCurrentAppearance(
  value
) {

  return {

    characters:
      Array.isArray(
        value?.characters
      )
        ? value.characters
            .map(

              item => {

                if (
                  !item ||
                  typeof item !==
                    "object"
                ) {

                  return null;

                }


                return {

                  characterId:
                    String(
                      item.characterId ??
                      ""
                    ),

                  characterName:
                    typeof item.characterName ===
                    "string"
                      ? item.characterName
                      : "Character",

                  outfit:
                    typeof item.outfit ===
                    "string"
                      ? item.outfit
                      : "",

                  condition:
                    typeof item.condition ===
                    "string"
                      ? item.condition
                      : "",

                  accessories:
                    typeof item.accessories ===
                    "string"
                      ? item.accessories
                      : "",

                  temporaryChanges:
                    Array.isArray(
                      item.temporaryChanges
                    )
                      ? item
                          .temporaryChanges
                          .filter(
                            change =>
                              typeof change ===
                              "string"
                          )
                      : []

                };

              }

            )
            .filter(Boolean)
        : []

  };

}


function normalizeMemory(
  memory
) {

  return {

    summary:
      typeof memory?.summary ===
      "string"
        ? memory.summary
        : "",

    importantFacts:
      Array.isArray(
        memory?.importantFacts
      )
        ? memory.importantFacts
        : [],

    currentScene:
      typeof memory?.currentScene ===
      "string"
        ? memory.currentScene
        : "",

    currentAppearance:
      normalizeCurrentAppearance(
        memory?.currentAppearance
      ),

    relationshipState:
      typeof memory?.relationshipState ===
      "string"
        ? memory.relationshipState
        : "",

    unresolvedThreads:
      Array.isArray(
        memory?.unresolvedThreads
      )
        ? memory.unresolvedThreads
        : [],

    pinnedMemories:
      normalizePinnedMemories(
        memory?.pinnedMemories
      )

  };

}


// =========================
// BATTLE MEDIA ATTACHMENTS
// =========================

function normalizeAttachment(
  attachment
) {

  if (
    !attachment ||
    typeof attachment !==
      "object"
  ) {

    return null;

  }


  let type =
    typeof attachment.type ===
    "string"
      ? attachment.type
      : "";


  if (
    !type &&
    typeof attachment.dataUrl ===
      "string" &&
    attachment.dataUrl.startsWith(
      "data:image/"
    )
  ) {

    type =
      "image";

  }


  if (
    ![
      "image",
      "audio",
      "video"
    ].includes(type)
  ) {

    return null;

  }


  const normalized = {

    type,

    note:
      typeof attachment.note ===
      "string"
        ? attachment.note
            .slice(
              0,
              1200
            )
        : "",

    mimeType:
      typeof attachment.mimeType ===
      "string"
        ? attachment.mimeType
            .slice(
              0,
              120
            )
        : "",

    name:
      typeof attachment.name ===
      "string"
        ? attachment.name
            .slice(
              0,
              180
            )
        : `${type}-reference`,

    duration:
      Number.isFinite(
        attachment.duration
      )
        ? attachment.duration
        : null,

    mediaUnavailable:
      Boolean(
        attachment.mediaUnavailable
      ),

    frames:
      Array.isArray(
        attachment.frames
      )
        ? attachment.frames
            .filter(

              frame =>
                typeof frame ===
                  "string" &&
                frame.startsWith(
                  "data:image/"
                )

            )
            .slice(
              0,
              8
            )
        : []

  };


  if (
    type ===
    "image"
  ) {

    normalized.dataUrl =
      typeof attachment.dataUrl ===
        "string" &&
      attachment.dataUrl.startsWith(
        "data:image/"
      )
        ? attachment.dataUrl
        : "";


    if (
      !normalized.dataUrl
    ) {

      return null;

    }

  }


  if (
    type ===
      "audio" ||
    type ===
      "video"
  ) {

    const prefix =
      type ===
      "audio"
        ? "data:audio/"
        : "data:video/";


    normalized.mediaDataUrl =
      typeof attachment.mediaDataUrl ===
        "string" &&
      attachment.mediaDataUrl.startsWith(
        prefix
      )
        ? attachment.mediaDataUrl
        : "";

  }


  return normalized;

}


function getAttachmentNote(
  attachment
) {

  if (
    !attachment ||
    typeof attachment !==
      "object" ||
    typeof attachment.note !==
      "string"
  ) {

    return "";

  }


  return attachment.note
    .slice(
      0,
      1200
    )
    .trim();

}


function decodeDataUrl(
  dataUrl
) {

  if (
    typeof dataUrl !==
    "string"
  ) {

    return null;

  }


  const match =
    dataUrl.match(
      /^data:([^;,]+);base64,(.+)$/s
    );


  if (!match) {

    return null;

  }


  try {

    return {
      mimeType:
        match[1],

      base64:
        match[2],

      buffer:
        Buffer.from(
          match[2],
          "base64"
        )
    };

  }

  catch {

    return null;

  }

}


function extensionForMime(
  mimeType,
  fallbackType = "audio"
) {

  const map = {
    "audio/mpeg":
      "mp3",
    "audio/mp3":
      "mp3",
    "audio/wav":
      "wav",
    "audio/x-wav":
      "wav",
    "audio/m4a":
      "m4a",
    "audio/mp4":
      "m4a",
    "audio/ogg":
      "ogg",
    "audio/webm":
      "webm",
    "audio/flac":
      "flac",
    "video/mp4":
      "mp4",
    "video/webm":
      "webm",
    "video/mpeg":
      "mpeg"
  };


  return (
    map[mimeType] ||
    (
      fallbackType ===
      "video"
        ? "mp4"
        : "mp3"
    )
  );

}


function safeMediaFilename(
  name,
  mimeType,
  type
) {

  const clean =
    String(
      name ||
      ""
    )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )
      .slice(
        0,
        120
      );


  if (
    /\.[a-zA-Z0-9]{2,5}$/
      .test(
        clean
      )
  ) {

    return clean;

  }


  return (
    `${clean || `scene-${type}`}.${extensionForMime(
      mimeType,
      type
    )}`
  );

}


async function transcribeMediaAttachment(
  attachment
) {

  if (
    !attachment?.mediaDataUrl
  ) {

    return "";

  }


  const decoded =
    decodeDataUrl(
      attachment.mediaDataUrl
    );


  if (
    !decoded?.buffer?.length
  ) {

    return "";

  }


  try {

    const file =
      await toFile(
        decoded.buffer,
        safeMediaFilename(
          attachment.name,
          decoded.mimeType ||
          attachment.mimeType,
          attachment.type
        ),
        {
          type:
            decoded.mimeType ||
            attachment.mimeType ||
            undefined
        }
      );


    const transcription =
      await openai
        .audio
        .transcriptions
        .create({
          model:
            TRANSCRIBE_MODEL,
          file,
          prompt:
            "Transcribe the audible scene faithfully. Keep screams, gasps, crying, laughter, shouted words, impacts, and strong environmental sounds when they are clearly audible. Do not invent events."
        });


    return (
      typeof transcription?.text ===
      "string"
        ? transcription.text.trim()
        : ""
    );

  }

  catch (error) {

    console.warn(
      "⚠️ Media transcription failed:",
      error?.message ||
      error
    );


    return "";

  }

}


function audioInputFormatFromMime(
  mimeType
) {

  if (
    mimeType ===
      "audio/wav" ||
    mimeType ===
      "audio/x-wav"
  ) {

    return "wav";

  }


  if (
    mimeType ===
      "audio/mpeg" ||
    mimeType ===
      "audio/mp3"
  ) {

    return "mp3";

  }


  return null;

}


async function analyzeAudioAttachment(
  attachment
) {

  if (
    !attachment?.mediaDataUrl
  ) {

    return "";

  }


  const decoded =
    decodeDataUrl(
      attachment.mediaDataUrl
    );


  if (!decoded) {

    return "";

  }


  const format =
    audioInputFormatFromMime(
      decoded.mimeType ||
      attachment.mimeType
    );


  if (format) {

    try {

      const completion =
        await openai
          .chat
          .completions
          .create({
            model:
              AUDIO_MODEL,
            messages: [
              {
                role:
                  "system",
                content:
                  "Analyze this short in-world audio event for another roleplay model. Return a compact factual description of what is audibly happening: clear speech, shouting, scream/gasp/laughter/crying, emotional intensity when strongly audible, impacts, and major environmental sounds. Do not guess speaker identity. Do not mention files, recordings, clips, uploads, or analysis. Do not invent uncertain details."
              },
              {
                role:
                  "user",
                content: [
                  {
                    type:
                      "text",
                    text:
                      attachment.note
                        ? `User scene clarification: ${attachment.note}`
                        : "Describe only what is audibly supported."
                  },
                  {
                    type:
                      "input_audio",
                    input_audio: {
                      data:
                        decoded.base64,
                      format
                    }
                  }
                ]
              }
            ],
            modalities: [
              "text"
            ],
            max_completion_tokens:
              450
          });


      const content =
        completion
          .choices?.[0]
          ?.message
          ?.content;


      if (
        typeof content ===
          "string" &&
        content.trim()
      ) {

        return content.trim();

      }

    }

    catch (error) {

      console.warn(
        "⚠️ Direct audio understanding failed; falling back to transcription:",
        error?.message ||
        error
      );

    }

  }


  return transcribeMediaAttachment(
    attachment
  );

}


// =========================
// CHARACTER NORMALIZATION
// =========================

function normalizeCharacter(
  character = {}
) {

  return {

    id:
      character.id ??
      "",

    name:
      character.name ||
      "Unnamed Character",

    image:
      character.image ||
      "",

    pronouns:
      character.pronouns ||
      "N/A",

    bio:
      character.bio ||
      character.description ||
      "",

    personality:
      character.personality ||
      "",

    scenario:
      character.scenario ||
      "",

    instructions:
      character.instructions ||
      "",

    appearance:
      normalizeAppearanceProfile(
        character.appearance
      ),

    appearanceRoster:
      Array.isArray(
        character.appearanceRoster
      )
        ? character.appearanceRoster
            .map(
              member => ({
                id:
                  String(
                    member?.id ??
                    ""
                  ),
                name:
                  member?.name ||
                  "Character",
                appearance:
                  normalizeAppearanceProfile(
                    member?.appearance
                  )
              })
            )
        : [],

    isGroup:
      Boolean(
        character.isGroup
      ),

    memberIds:
      Array.isArray(
        character.memberIds
      )
        ? character.memberIds
            .map(String)
        : [],

    exampleMessages:
      Array.isArray(
        character.exampleMessages
      )
        ? character.exampleMessages
        : [],

    hasPowers:
      Boolean(
        character.hasPowers
      ),

    powerSystem:
      character.powerSystem ||
      "",

    combatStyle:
      character.combatStyle ||
      "",

    abilities:
      character.abilities ||
      "",

    powerLimits:
      character.powerLimits ||
      "",

    background:
      character.background ||
      ""

  };

}


function formatAppearanceProfile(
  character
) {

  const appearance =
    normalizeAppearanceProfile(
      character?.appearance
    );


  return `
Physical appearance:
${appearance.physical || "Not specified."}

Default outfit:
${appearance.defaultOutfit || "Not specified."}

Starting outfit for a new chat:
${appearance.startingOutfit || appearance.defaultOutfit || "Not specified."}

Accessories / equipment:
${appearance.accessories || "Not specified."}

Maintain visual continuity:
${appearance.maintainContinuity ? "Yes" : "No"}
  `.trim();

}


function formatAppearanceRoster(
  character
) {

  const roster =
    Array.isArray(
      character?.appearanceRoster
    )
      ? character.appearanceRoster
      : [];


  if (!roster.length) {

    return formatAppearanceProfile(
      character
    );

  }


  return roster
    .map(

      member =>
        `${member.name} [id: ${member.id}]\n${formatAppearanceProfile(member)}`

    )
    .join("\n\n");

}


function formatCurrentAppearanceForPrompt(
  value
) {

  const clean =
    normalizeCurrentAppearance(
      value
    );


  if (!clean.characters.length) {

    return "No current visual state has been stored yet. Use the character's Starting Outfit (or Default Outfit if Starting Outfit is blank) until the roleplay establishes a change.";

  }


  return clean.characters
    .map(

      entry => `
${entry.characterName}${entry.characterId ? ` [id: ${entry.characterId}]` : ""}
- Current outfit: ${entry.outfit || "Not specified."}
- Visible condition: ${entry.condition || "No temporary condition stored."}
- Accessories / equipment: ${entry.accessories || "Not specified."}
- Temporary visual changes: ${entry.temporaryChanges.length ? entry.temporaryChanges.join("; ") : "None stored."}
      `.trim()

    )
    .join("\n\n");

}


// =========================
// MEMORY PROMPT
// =========================

function formatMemoryForPrompt(
  memory
) {

  const clean =
    normalizeMemory(
      memory
    );


  const bullets =
    items => {

      if (
        !items.length
      ) {

        return "- None.";

      }


      return items
        .map(

          item =>
            `- ${
              typeof item ===
              "string"
                ? item
                : item.text
            }`

        )
        .join(
          "\n"
        );

    };


  return `
PINNED MEMORIES — user-selected and especially important:
${bullets(clean.pinnedMemories)}

CHAT SUMMARY:
${clean.summary || "No long-term summary yet."}

IMPORTANT MEMORIES:
${bullets(clean.importantFacts)}

CURRENT SCENE:
${clean.currentScene || "No specific scene stored yet."}

CURRENT APPEARANCE / VISUAL STATE:
${formatCurrentAppearanceForPrompt(clean.currentAppearance)}

RELATIONSHIP / SOCIAL STATE:
${clean.relationshipState || "No relationship development stored yet."}

UNRESOLVED THREADS:
${bullets(clean.unresolvedThreads)}
  `.trim();

}


// =========================
// EXAMPLE MESSAGES
// =========================

function formatExamples(
  examples
) {

  const valid =
    examples.filter(

      example =>
        example &&
        (
          example.user ||
          example.character
        )

    );


  if (
    !valid.length
  ) {

    return (
      "No example messages provided."
    );

  }


  return valid
    .map(

      (
        example,
        index
      ) => {

        return `
Example ${index + 1}

User:
${example.user || ""}

Character:
${example.character || ""}
        `.trim();

      }

    )
    .join(
      "\n\n"
    );

}


// =========================
// POWERS
// =========================

function formatPowers(
  character
) {

  if (
    !character.hasPowers
  ) {

    return (
      "This character has no special powers profile enabled."
    );

  }


  return `
Power system / source:
${character.powerSystem || "Not specified"}

Combat style:
${character.combatStyle || "Not specified"}

Abilities:
${character.abilities || "Not specified"}

Rules / limitations:
${character.powerLimits || "Not specified"}
  `.trim();

}


// =========================
// MULTIMODAL CHAT INPUT
// =========================

async function buildChatInputMessage(
  message
) {

  const role =
    message.sender ===
    "character"

      ? "assistant"

      : "user";


  const attachment =
    role ===
    "user"

      ? normalizeAttachment(
          message.attachment
        )

      : null;


  if (!attachment) {

    return {
      role,

      content:
        message.text ||
        ""
    };

  }


  const note =
    attachment.note
      .trim();


  const textParts =
    [];


  const content =
    [];


  if (
    message.text
      ?.trim()
  ) {

    textParts.push(
      message.text.trim()
    );

  }


  if (note) {

    textParts.push(
      `Scene clarification: ${note}`
    );

  }


  if (
    attachment.type ===
    "audio"
  ) {

    const audioContext =
      await analyzeAudioAttachment(
        attachment
      );


    if (audioContext) {

      textParts.push(
        `Audible scene context:\n${audioContext}`
      );

    }

    else if (
      attachment.mediaUnavailable
    ) {

      textParts.push(
        "An audio event belongs to the current scene, but its stored media is unavailable on this device. Rely on the user's Scene clarification and established context."
      );

    }

    else {

      textParts.push(
        "An audio event is occurring in the current scene. React conservatively using the user's clarification and established context; do not invent exact words or sounds."
      );

    }

  }


  if (
    attachment.type ===
    "video"
  ) {

    const audibleContext =
      await transcribeMediaAttachment(
        attachment
      );


    if (audibleContext) {

      textParts.push(
        `Audible context during the current event:\n${audibleContext}`
      );

    }


    if (
      attachment.frames.length
    ) {

      textParts.push(
        "The following visual moments are sampled in chronological order from one continuous event. Infer motion conservatively from changes between them."
      );

    }

    else if (
      attachment.mediaUnavailable
    ) {

      textParts.push(
        "A video event belongs to the current scene, but its stored media is unavailable on this device. Rely on the user's Scene clarification and established context."
      );

    }

  }


  if (
    !textParts.length
  ) {

    textParts.push(
      "React naturally to what is happening right now."
    );

  }


  content.push({
    type:
      "input_text",
    text:
      textParts.join(
        "\n\n"
      )
  });


  if (
    attachment.type ===
    "image"
  ) {

    content.push({
      type:
        "input_image",
      image_url:
        attachment.dataUrl,
      detail:
        "high"
    });

  }


  if (
    attachment.type ===
    "video"
  ) {

    for (
      const frame of
      attachment.frames
    ) {

      content.push({
        type:
          "input_image",
        image_url:
          frame,
        detail:
          "high"
      });

    }

  }


  return {
    role:
      "user",
    content
  };

}


// =========================
// CHAT API
// =========================

app.post(

  "/api/chat",

  async (
    req,
    res
  ) => {

    try {

      const character =
        normalizeCharacter(
          req.body.character
        );


      const messages =
        req.body.messages;


      const memory =
        req.body.memory;


      const roleplayConfig =
        getRoleplayLevelConfig(
          req.body.roleplayLevel
        );


      const groupContinuation =
        Boolean(
          req.body.groupContinuation
        );


      if (
        !character.name
      ) {

        return res
          .status(400)
          .json({

            error:
              "Character information is missing."

          });

      }


      if (
        !Array.isArray(
          messages
        ) ||
        !messages.length
      ) {

        return res
          .status(400)
          .json({

            error:
              "Conversation is empty."

          });

      }


      const instructions = `
You are roleplaying as ${character.name}.

CHARACTER PROFILE

Name:
${character.name}

Pronouns:
${character.pronouns}

Bio:
${character.bio || "No bio provided."}


APPEARANCE & OUTFIT

${formatAppearanceProfile(character)}


VISUAL CONTINUITY RULES

- Treat the Physical Appearance as the character's stable visual identity unless the roleplay explicitly establishes a lasting change.

- At the beginning of a fresh chat, use Starting Outfit. If Starting Outfit is blank, use Default Outfit.

- The CURRENT APPEARANCE / VISUAL STATE in chat memory represents what is true now and overrides the starting/default outfit when the story has changed it.

- If Maintain visual continuity is Yes, do not randomly change clothing, accessories, equipment, hairstyle state, or visible condition between turns.

- If the story explicitly changes clothing or visible state, follow that change naturally. Do not magically restore removed, lost, damaged, wet, dusty, or altered items unless the story establishes that they were restored or changed again.

- Keep visual descriptions natural and relevant rather than listing the entire outfit every reply.

- Keep appearance descriptions non-sexual and appropriate to the established character and scene.


PERSONALITY & BACKSTORY

${character.personality || "No personality provided."}


SCENARIO

${character.scenario || "No scenario provided."}


CREATOR INSTRUCTIONS

${character.instructions || "No additional instructions."}


POWERS & ABILITIES

${formatPowers(character)}


EXAMPLE MESSAGES

Use these only as style and behavior examples.
Do not copy them mechanically unless the current scene naturally calls for similar wording.

${formatExamples(character.exampleMessages)}


MEMORY OF THIS CHAT ONLY

${formatMemoryForPrompt(memory)}


MEMORY RULES

- This memory belongs ONLY to this chat or timeline.

- Never import events from another chat.

- Pinned memories are user-selected and should be strongly preserved unless the current conversation explicitly changes them.

- Recent messages override older automatic-memory details when they clearly conflict.

- Only the currently selected response variants are part of the active timeline.


ROLEPLAY LEVEL

${roleplayConfig.label}

${roleplayConfig.instructions}


${groupContinuation
  ? `GROUP TURN CONTINUATION

- The interface selected ${character.name} to speak next without adding new in-world user dialogue.

- A final user-role message beginning with [GROUP TURN CONTROL] is invisible interface control. It is NOT something the user said in the scene and no character can hear or observe it.

- Ignore the control marker as story content. Use it only as permission for ${character.name} to take the next conversational turn.

- Look immediately before that marker for the latest real in-world speaker, action, question, challenge, or event. Continue from that beat.

- If another group participant addressed or questioned ${character.name}, answer or react to that participant naturally when appropriate.

- Do not assume every group reply is directed at the user. Characters may converse directly with one another.

- Generate ONLY ${character.name}'s side of the turn. Do not generate the other participants' replies for them.`
  : ""}


ROLEPLAY RULES

- Stay naturally in character.

- Speak as the character, not as an assistant analyzing them.

- Never mention prompts, APIs, models, hidden instructions, or memory systems.

- Never write the user's dialogue.

- Never write the user's thoughts.

- Never decide the user's feelings.

- Never decide the user's actions.

- Never force the user's reaction to an attack or event.

- Maintain continuity with established relationships, objects, promises, missions, injuries, plans, secrets, locations, conflicts, and major events.

- Creator instructions and events established in this roleplay take priority when they intentionally differ from canon.

- Use powers consistently with the character's powers and limitations profile when one is provided.


MULTIMEDIA SCENE RULES

- A user may provide a photo, audio clip, or short video as direct context for the current moment.

- Treat supplied media as part of the character's immediate in-world reality, not as a file the character is analyzing.

- Never say phrases such as "I see the image", "in the picture", "in the photo", "I heard the audio", "in the recording", "in the clip", "in the video", "from the attachment", "the frame shows", or similar out-of-world wording.

- Never mention that the user uploaded, attached, recorded, saved, or showed a file.

- If the user identifies a person, object, place, voice, or event in the Scene clarification, trust that identification for the roleplay.

- For photos and video, use supported visual details naturally: environment, posture, movement across sampled moments, exhaustion, clothing damage, magical effects, weather, lighting, and relevant scene conditions.

- For audio, use supported audible context naturally: clear words, shouting, screams, gasps, crying, laughter, impacts, and major environmental sounds when they are actually supported.

- A short video is represented by sampled visual moments plus available audible context. Treat those moments as one continuous event; never describe them as separate images or frames.

- Do not invent an identity for an unidentified real person. Respect the user's identification when one is provided.

- React as though ${character.name} is physically present and directly witnessing, hearing, or experiencing the moment.

- Do not mechanically list media details. Integrate only what the character would naturally notice or react to.


HUMAN-LIKE STYLE

- Sound like a real person inside the scene rather than an AI answering a prompt.

- Do not sound like customer service or Wikipedia.

- Do not summarize the user's message back to them.

- Do not constantly explain yourself.

- Do not end every reply with a question.

- The character may tease, hesitate, interrupt, misunderstand, disagree, become irritated, suspicious, embarrassed, worried, curious, go quiet, or answer incompletely when that fits.

- Use contractions, pauses, unfinished sentences, sarcasm, dry remarks, interruptions, and natural rhythm when appropriate.

- Short responses are allowed when believable.

- Match the user's current language unless creator instructions say otherwise.


DIALOGUE + ACTION FORMATTING

- Put physical actions, narration, atmosphere, and scene description inside DOUBLE ASTERISKS.

Example:

**She slowly lowers her sword.**

- Keep spoken dialogue outside the double asterisks.

Example:

What are you staring at?

- Separate action and dialogue with line breaks when natural.

- Do not use markdown headings inside the roleplay response.

- Do not use bullet lists inside the roleplay response.

- Do not label sections as Action, Dialogue, Thought, etc.


RESPONSE LENGTH

For casual conversation:

- Usually respond naturally and relatively concisely.

- Often 1–4 sentences or a few short dialogue/action beats are enough.

- A one-line response is completely acceptable.

For emotional scenes, battles, transformations, revelations, important explanations, and signature abilities:

- Responses may become longer and more cinematic.

- Let the intensity of the scene control response length.


CINEMATIC ACTION

During important combat or dramatic scenes, describe relevant:

- movement
- stance
- environment
- visual effects
- sound
- energy
- expression
- atmosphere
- immediate consequences

Do not rush iconic transformations or signature abilities.

Do not automatically decide that an attack hits the user's character.

Do not automatically decide the user's injury, fear, surprise, defeat, or inability to respond.


SCENE AWARENESS

- Track where everyone currently is.

- Track important objects.

- Track injuries and environmental conditions.

- Track active goals.

- Do not randomly change location.

- Do not force a giant plot twist every turn.

- React primarily to the latest message and current scene.


SAFETY BOUNDARIES — APPLY TO EVERY ROLEPLAY LEVEL

- Do not produce sexual or erotic roleplay.

- Never sexualize minors.

- Keep violence non-graphic. Do not dwell on gore, gruesome injuries, or graphic bodily detail.

- Do not provide practical instructions that facilitate dangerous real-world acts.

- Normal fictional drama, non-explicit romance or affection, strong language, fantasy combat, horror atmosphere, dark themes, or villainous behavior are not by themselves reasons to break character when they remain within these boundaries.


FINAL RULE

Return only what the character says or does.
      `.trim();


      const input =
        await Promise.all(

          messages
            .slice(
              -50
            )
            .filter(

              message =>
                message.sender !==
                "system"

            )
            .map(
              buildChatInputMessage
            )

        );


      const responseRequest = {

        model:
          MODEL,

        store:
          false,

        reasoning: {
          effort:
            "none"
        },

        text: {
          verbosity:
            "low"
        },

        instructions,

        input,

        max_output_tokens:
          roleplayConfig
            .maxOutputTokens

      };


      const stream =
        await openai
          .responses
          .create({

            ...responseRequest,

            stream:
              true

          });


      res.status(
        200
      );


      res.setHeader(

        "Content-Type",

        "application/x-ndjson; charset=utf-8"

      );


      res.setHeader(

        "Cache-Control",

        "no-cache, no-transform"

      );


      res.setHeader(

        "Connection",

        "keep-alive"

      );


      res.setHeader(

        "X-Accel-Buffering",

        "no"

      );


      if (
        res.flushHeaders
      ) {

        res.flushHeaders();

      }


      let generatedText =
        "";

      let refusalText =
        "";

      let completedResponse =
        null;


      const extractResponseText =
        response => {

          if (
            typeof response?.output_text ===
              "string" &&
            response.output_text.trim()
          ) {

            return response.output_text.trim();

          }


          const pieces = [];


          for (
            const item of
              response?.output || []
          ) {

            if (
              !Array.isArray(
                item?.content
              )
            ) {

              continue;

            }


            for (
              const part of
                item.content
            ) {

              if (
                part?.type ===
                  "output_text" &&
                typeof part.text ===
                  "string"
              ) {

                pieces.push(
                  part.text
                );

              }

              else if (
                part?.type ===
                  "refusal" &&
                typeof part.refusal ===
                  "string"
              ) {

                pieces.push(
                  part.refusal
                );

              }

            }

          }


          return pieces
            .join("")
            .trim();

        };


      try {

        for await (
          const event of stream
        ) {

          if (
            event.type ===
            "response.output_text.delta"
          ) {

            generatedText +=
              event.delta;


            res.write(

              JSON.stringify({

                type:
                  "delta",

                delta:
                  event.delta

              }) +
              "\n"

            );

          }


          if (
            event.type ===
              "response.refusal.delta"
          ) {

            refusalText +=
              event.delta ||
              "";

          }


          if (
            event.type ===
              "response.completed"
          ) {

            completedResponse =
              event.response ||
              null;

          }


          if (
            event.type ===
            "response.failed"
          ) {

            throw new Error(

              event.response
                ?.error
                ?.message ||

              "OpenAI response failed."

            );

          }

        }


        if (
          !generatedText.trim()
        ) {

          const completedText =
            extractResponseText(
              completedResponse
            );


          if (completedText) {

            generatedText =
              completedText;


            res.write(

              JSON.stringify({

                type:
                  "delta",

                delta:
                  completedText

              }) +
              "\n"

            );

          }

          else if (
            refusalText.trim()
          ) {

            generatedText =
              refusalText.trim();


            res.write(

              JSON.stringify({

                type:
                  "delta",

                delta:
                  generatedText

              }) +
              "\n"

            );

          }

          else {

            console.warn(
              "⚠️ Empty streamed response; retrying once without streaming."
            );


            const fallbackResponse =
              await openai
                .responses
                .create({

                  ...responseRequest,

                  stream:
                    false

                });


            const fallbackText =
              extractResponseText(
                fallbackResponse
              );


            if (!fallbackText) {

              throw new Error(
                "The model returned an empty response after retry."
              );

            }


            generatedText =
              fallbackText;


            res.write(

              JSON.stringify({

                type:
                  "delta",

                delta:
                  fallbackText

              }) +
              "\n"

            );

          }

        }


        res.write(

          JSON.stringify({
            type:
              "done"
          }) +
          "\n"

        );


        res.end();

      }

      catch (
        streamError
      ) {

        console.error(
          "❌ Streaming error:",
          streamError
        );


        res.write(

          JSON.stringify({

            type:
              "error",

            message:
              "The response stream stopped unexpectedly."

          }) +
          "\n"

        );


        res.end();

      }

    }

    catch (error) {

      console.error(
        "❌ Chati-AI error:",
        error
      );


      if (
        !res.headersSent
      ) {

        res
          .status(500)
          .json({

            error:
              error?.message ||
              "Chati-AI could not generate a response."

          });

      }

      else {

        res.end();

      }

    }

  }

);


// =========================
// MEMORY API
// =========================

app.post(

  "/api/memory",

  async (
    req,
    res
  ) => {

    try {

      const character =
        normalizeCharacter(
          req.body.character
        );


      const oldMemory =
        normalizeMemory(
          req.body.memory
        );


      const messages =
        req.body.messages;


      if (
        !character.name
      ) {

        return res
          .status(400)
          .json({

            error:
              "Character is missing."

          });

      }


      if (
        !Array.isArray(
          messages
        ) ||
        !messages.length
      ) {

        return res
          .status(400)
          .json({

            error:
              "No new messages to remember."

          });

      }


      const formattedMessages =
        messages
          .map(

            message => {

              const sceneNote =
                getAttachmentNote(
                  message.attachment
                );


              const sceneSuffix =
                sceneNote

                  ? `\n[Scene clarification: ${sceneNote}]`

                  : "";


              return (
                (
                  message.sender ===
                  "character"

                    ? character.name

                    : "User"
                ) +
                ": " +
                (
                  message.text ||
                  ""
                ) +
                sceneSuffix
              );

            }

          )
          .join(
            "\n\n"
          );


      const memoryInstructions = `
You maintain long-term memory for ONE fictional roleplay conversation.

This memory belongs ONLY to the current chat.

Never import another chat.


CHARACTER:

${character.name}


BASE APPEARANCE PROFILES:

${formatAppearanceRoster(character)}


EXISTING AUTOMATIC MEMORY:

${JSON.stringify(
  {
    summary:
      oldMemory.summary,

    importantFacts:
      oldMemory.importantFacts,

    currentScene:
      oldMemory.currentScene,

    currentAppearance:
      oldMemory.currentAppearance,

    relationshipState:
      oldMemory.relationshipState,

    unresolvedThreads:
      oldMemory.unresolvedThreads
  },
  null,
  2
)}


USER-PINNED MEMORIES

These are stored separately.
Do not rewrite them.

${
  oldMemory
    .pinnedMemories
    .length

    ? oldMemory
        .pinnedMemories
        .map(
          memory =>
            `- ${memory.text}`
        )
        .join("\n")

    : "- None"
}


NEW ACTIVE-TIMELINE MESSAGES:

${formattedMessages}


RULES

- Store only information actually stated or strongly established by context.

- Never invent memories.

- Ignore greetings and meaningless filler.

- Prioritize details that could matter hundreds or thousands of messages later.

- Preserve important older information unless new messages clearly update it.

- Keep the story summary compact but useful.

- Track the current location and immediate situation in currentScene.

- Track meaningful trust, rivalry, teamwork, tension, friendship, etc. in relationshipState.

- Do not invent romantic development.

- unresolvedThreads should contain genuinely unfinished missions, promises, mysteries, plans, conflicts, threats, or important questions.

- Remove unresolved threads when they are resolved.

- importantFacts should be concise and specific.

- Merge duplicate facts.

- Update contradictions instead of keeping both versions.

- The client sends only the selected response variant.

- Scene clarifications attached to user messages are factual context for that moment and may be remembered when they materially affect the story.

- Maintain currentAppearance separately for each character. Use the supplied characterId and characterName when available.

- currentAppearance.outfit means clothing currently being worn, not a permanent description of the body.

- currentAppearance.condition stores temporary visible state such as wet hair/clothes, dust, torn clothing, visible exhaustion, or similar non-graphic scene conditions.

- currentAppearance.accessories stores currently worn/carried visible accessories or equipment that matter to continuity.

- currentAppearance.temporaryChanges contains concise temporary visual facts that are still true. Remove them when later messages clearly establish they are no longer true.

- Begin from the existing currentAppearance. Only change a visual detail when the new messages explicitly state it or strongly establish it. Never invent outfit changes.

- For group chats, keep every participant's visual state separate. Do not transfer one character's clothing, condition, or equipment to another.

- Visual information supported by a scene clarification or supplied media may update currentAppearance when it clearly affects continuity. Do not guess the identity of an unidentified real person.

- Keep all appearance memory non-sexual, concise, and age-appropriate.

- Treat these messages as the one true active timeline.

- Return ONLY the structured memory object.
      `.trim();


      let updatedMemory =
        null;


      let lastMemoryError =
        null;


      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {

        try {

          console.log(

            `🧠 Memory generation attempt ${attempt}/2 for ${character.name}`

          );


          const response =
            await openai
              .responses
              .create({

                model:
                  MEMORY_MODEL,

                store:
                  false,

                reasoning: {
                  effort:
                    "none"
                },

                instructions:
                  memoryInstructions,

                input:
                  "Update the automatic memory using the supplied messages.",

                /*
                  More room prevents long memories
                  from being cut off before the JSON
                  object is finished.
                */

                max_output_tokens:
                  6000,

                text: {

                  format: {

                    type:
                      "json_schema",

                    name:
                      "chat_memory",

                    strict:
                      true,

                    schema: {

                      type:
                        "object",

                      additionalProperties:
                        false,

                      properties: {

                        summary: {
                          type:
                            "string"
                        },

                        importantFacts: {

                          type:
                            "array",

                          items: {
                            type:
                              "string"
                          },

                          maxItems:
                            80

                        },

                        currentScene: {
                          type:
                            "string"
                        },

                        currentAppearance: {

                          type:
                            "object",

                          additionalProperties:
                            false,

                          properties: {

                            characters: {

                              type:
                                "array",

                              maxItems:
                                20,

                              items: {

                                type:
                                  "object",

                                additionalProperties:
                                  false,

                                properties: {

                                  characterId: {
                                    type:
                                      "string"
                                  },

                                  characterName: {
                                    type:
                                      "string"
                                  },

                                  outfit: {
                                    type:
                                      "string"
                                  },

                                  condition: {
                                    type:
                                      "string"
                                  },

                                  accessories: {
                                    type:
                                      "string"
                                  },

                                  temporaryChanges: {

                                    type:
                                      "array",

                                    items: {
                                      type:
                                        "string"
                                    },

                                    maxItems:
                                      20

                                  }

                                },

                                required: [
                                  "characterId",
                                  "characterName",
                                  "outfit",
                                  "condition",
                                  "accessories",
                                  "temporaryChanges"
                                ]

                              }

                            }

                          },

                          required: [
                            "characters"
                          ]

                        },

                        relationshipState: {
                          type:
                            "string"
                        },

                        unresolvedThreads: {

                          type:
                            "array",

                          items: {
                            type:
                              "string"
                          },

                          maxItems:
                            30

                        }

                      },

                      required: [

                        "summary",

                        "importantFacts",

                        "currentScene",

                        "currentAppearance",

                        "relationshipState",

                        "unresolvedThreads"

                      ]

                    }

                  }

                }

              });


          if (
            response.status ===
            "incomplete"
          ) {

            const reason =
              response
                .incomplete_details
                ?.reason ||
              "unknown reason";


            throw new Error(

              `Memory response was incomplete: ${reason}`

            );

          }


          if (
            response.status &&
            response.status !==
            "completed"
          ) {

            throw new Error(

              `Memory response status was: ${response.status}`

            );

          }


          const raw =
            response
              .output_text
              ?.trim();


          if (!raw) {

            throw new Error(
              "Memory model returned nothing."
            );

          }


          try {

            updatedMemory =
              JSON.parse(
                raw
              );

          }

          catch (
            parseError
          ) {

            console.warn(

              `⚠️ Invalid memory JSON on attempt ${attempt}:`,
              parseError.message

            );


            throw new Error(
              "Memory JSON was incomplete or invalid."
            );

          }


          console.log(

            `✅ Memory JSON valid on attempt ${attempt}`

          );


          break;

        }

        catch (error) {

          lastMemoryError =
            error;


          console.warn(

            `⚠️ Memory attempt ${attempt} failed:`,
            error.message

          );


          if (
            attempt < 2
          ) {

            await new Promise(

              resolve =>
                setTimeout(
                  resolve,
                  500
                )

            );

          }

        }

      }


      if (
        !updatedMemory
      ) {

        throw (
          lastMemoryError ||
          new Error(
            "Memory update failed after two attempts."
          )
        );

      }


      console.log(

        `🧠 Memory updated for ${character.name}`

      );


      res.json({

        memory:
          updatedMemory

      });

    }

    catch (error) {

      console.error(
        "❌ Memory error:",
        error
      );


      res
        .status(500)
        .json({

          error:
            "Could not update chat memory."

        });

    }

  }

);


// =========================
// START
// =========================

app.listen(

  PORT,

  () => {

    console.log("");

    console.log(
      "================================="
    );

    console.log(
      "🤖 Chati-AI is running"
    );

    console.log(
      `🌐 http://localhost:${PORT}`
    );

    console.log(
      `💬 Chat model: ${MODEL}`
    );

    console.log(
      `🧠 Memory model: ${MEMORY_MODEL}`
    );


    console.log(
      `🎧 Audio model: ${AUDIO_MODEL}`
    );

    console.log(
      "⚡ Streaming enabled"
    );

    console.log(
      "🎬 Cinematic roleplay enabled"
    );

    console.log(
      "🎭 Roleplay levels enabled"
    );

    console.log(
      "🧠 Per-chat memory enabled"
    );

    console.log(
      "📌 Pinned memory enabled"
    );

    console.log(
      "↔ Response variants enabled"
    );

    console.log(
      "⚙ Character editing enabled"
    );

    console.log(
      "🖼 Battle scene image input enabled"
    );

    console.log(
      "================================="
    );

    console.log("");

  }

);