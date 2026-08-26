import express from "express";

import dotenv from "dotenv";

import OpenAI from "openai";

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
      "4mb"
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
// CHARACTER NORMALIZATION
// =========================

function normalizeCharacter(
  character = {}
) {

  return {

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


SAFETY

- Keep the interaction age-appropriate and safe.

- Do not produce sexual or erotic roleplay.


FINAL RULE

Return only what the character says or does.
      `.trim();


      const input =
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

            message => ({

              role:
                message.sender ===
                "character"

                  ? "assistant"

                  : "user",

              content:
                message.text ||
                ""

            })

          );


      const stream =
        await openai
          .responses
          .create({

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
              1000,

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

          throw new Error(
            "The model returned an empty response."
          );

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
                )
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


EXISTING AUTOMATIC MEMORY:

${JSON.stringify(
  {
    summary:
      oldMemory.summary,

    importantFacts:
      oldMemory.importantFacts,

    currentScene:
      oldMemory.currentScene,

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

- Treat these messages as the one true active timeline.

- Return ONLY the structured memory object.
      `.trim();


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

            max_output_tokens:
              1400,

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

                    "relationshipState",

                    "unresolvedThreads"

                  ]

                }

              }

            }

          });


      const raw =
        response
          .output_text
          ?.trim();


      if (!raw) {

        throw new Error(
          "Memory model returned nothing."
        );

      }


      const updatedMemory =
        JSON.parse(
          raw
        );


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
      "⚡ Streaming enabled"
    );

    console.log(
      "🎬 Cinematic roleplay enabled"
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
      "================================="
    );

    console.log("");

  }

);