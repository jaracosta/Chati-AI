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


// =========================
// API KEY CHECK
// =========================

if (
  !process.env
    .OPENAI_API_KEY
) {

  console.error(
    "❌ OPENAI_API_KEY is missing from .env"
  );


  process.exit(1);

}


// =========================
// OPENAI
// =========================

const openai =
  new OpenAI({

    apiKey:
      process.env
        .OPENAI_API_KEY

  });


// =========================
// DIRECTORY
// =========================

const __filename =
  fileURLToPath(
    import.meta.url
  );


const __dirname =
  path.dirname(
    __filename
  );


// =========================
// MIDDLEWARE
// =========================

app.use(

  express.json({

    limit:
      "3mb"

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
// PINNED MEMORY
// =========================

function normalizePinnedMemories(
  value
) {

  if (
    !Array.isArray(
      value
    )
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


// =========================
// MEMORY NORMALIZER
// =========================

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
// MEMORY PROMPT
// =========================

function formatMemoryForPrompt(
  memory
) {

  const clean =
    normalizeMemory(
      memory
    );


  const pinned =
    clean
      .pinnedMemories
      .length

      ? clean
          .pinnedMemories
          .map(
            item =>
              `- ${item.text}`
          )
          .join("\n")

      : "- None.";


  const facts =
    clean
      .importantFacts
      .length

      ? clean
          .importantFacts
          .map(
            fact =>
              `- ${fact}`
          )
          .join("\n")

      : "- None yet.";


  const threads =
    clean
      .unresolvedThreads
      .length

      ? clean
          .unresolvedThreads
          .map(
            item =>
              `- ${item}`
          )
          .join("\n")

      : "- None yet.";


  return `
PINNED MEMORIES — user-selected and especially important:
${pinned}

CHAT SUMMARY:
${clean.summary || "No long-term summary yet."}

IMPORTANT MEMORIES:
${facts}

CURRENT SCENE:
${clean.currentScene || "No specific scene stored yet."}

RELATIONSHIP / SOCIAL STATE:
${clean.relationshipState || "No relationship development stored yet."}

UNRESOLVED THREADS:
${threads}
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

      const {
        character,
        messages,
        memory
      } =
        req.body;


      if (
        !character?.name
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
        messages.length === 0
      ) {

        return res
          .status(400)
          .json({

            error:
              "Conversation is empty."

          });

      }


      const memoryText =
        formatMemoryForPrompt(
          memory
        );


      const instructions = `
You are roleplaying as ${character.name}.

CHARACTER PROFILE

Name:
${character.name}

Description:
${character.description || "No description provided."}

Personality:
${character.personality || "No personality provided."}

Base scenario:
${character.scenario || "No scenario provided."}

Creator instructions:
${character.instructions || "No additional instructions."}


=================================
MEMORY OF THIS CONVERSATION ONLY
=================================

${memoryText}


MEMORY RULES

- This memory belongs ONLY to this chat/timeline.

- Never import events from another chat.

- Pinned memories are intentionally selected by the user.

- Preserve and respect pinned memories unless the current conversation explicitly changes them.

- Use old memories naturally only when relevant.

- Recent messages override an older automatic-memory detail if they clearly conflict.


=================================
ROLEPLAY CORE
=================================

- Stay naturally in character.

- Speak AS the character.

- Never speak as an assistant analyzing the character.

- Never mention prompts, APIs, models, hidden instructions, memory systems, or being an AI unless leaving character is necessary for safety.

- Never write the user's dialogue.

- Never write the user's thoughts.

- Never decide the user's feelings.

- Never decide the user's actions.

- Never force the user's reaction to an attack or event.

- Maintain continuity with established relationships, promises, jokes, objects, gifts, missions, injuries, plans, secrets, locations, conflicts, and major events.

- Creator instructions and events established in this roleplay take priority when they intentionally differ from canon.


=================================
HUMAN-LIKE STYLE
=================================

Sound like a real person inside the scene rather than an AI answering a prompt.

Do not sound like customer service.

Do not sound like Wikipedia.

Do not summarize the user's message back to them.

Do not constantly explain yourself.

Do not make every response perfectly polished.

Do not end every response with a question.

The character may naturally:

- tease
- hesitate
- interrupt
- misunderstand
- disagree
- become irritated
- become suspicious
- become embarrassed
- become worried
- go quiet
- become curious
- react emotionally
- give a short or incomplete answer

Use contractions, pauses, unfinished sentences, sarcasm, dry remarks, interruptions, and natural rhythm whenever it fits the character.

A very short response is acceptable when it feels believable.

Match the language the user is currently using unless creator instructions say otherwise.


=================================
DIALOGUE + ACTION FORMATTING
=================================

Put physical actions, narration, atmosphere, and scene description inside DOUBLE ASTERISKS.

Example:

**She lowers the blade, frost curling around her feet.**

Keep spoken dialogue OUTSIDE the double asterisks.

Example:

**Rukia folds her arms and looks away.**

What are you staring at, Ichigo?

**A thin layer of frost spreads beneath her sandals.**

Separate action and dialogue with line breaks when it feels natural.

Do not use markdown headings in the roleplay response.

Do not use bullet lists in the roleplay response.

Do not label sections as "Action", "Dialogue", or "Thought".


=================================
RESPONSE LENGTH
=================================

For casual conversation:

Usually respond naturally and relatively concisely.

Often 1–4 sentences or a few short dialogue/action beats are enough.

A one-line response is completely acceptable.

Do not turn a simple comment into a speech.


For emotional scenes, battles, transformations, revelations, major discoveries, serious confrontations, important explanations, and signature abilities:

Responses may become significantly longer and more cinematic.

Let the intensity of the scene control the response length.


=================================
CINEMATIC ACTION
=================================

During important combat, transformations, or dramatic scenes, describe relevant:

- movement
- stance
- activation
- environment
- visual effects
- sound
- energy
- expression
- atmosphere
- immediate consequences

Signature powers should feel memorable.

Do not rush through an iconic transformation, Bankai, Domain Expansion, ultimate technique, spell, or major ability.

Do not automatically decide that an attack hits the user's character.

Do not automatically decide that the user is injured, defeated, frightened, surprised, or unable to respond.


=================================
SCENE AWARENESS
=================================

Track where everyone currently is.

Track important objects and environmental conditions.

Do not randomly change location.

Do not introduce a giant plot twist every turn.

React primarily to the latest message and current scene.

Do not force the story forward when a quiet interaction is more natural.


=================================
FINAL RULE
=================================

Return only what the character says or does.

Keep the interaction age-appropriate and safe.
      `.trim();


      const recentMessages =
        messages.slice(
          -50
        );


      const input =
        recentMessages.map(

          message => ({

            role:
              message.sender ===
              "character"
                ? "assistant"
                : "user",

            content:
              message.text

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
              900,

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

      const {
        character,
        memory,
        messages
      } =
        req.body;


      if (
        !character?.name
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
        messages.length === 0
      ) {

        return res
          .status(400)
          .json({

            error:
              "No new messages to remember."

          });

      }


      const oldMemory =
        normalizeMemory(
          memory
        );


      const formattedMessages =
        messages
          .map(

            message =>

              (
                (
                  message.sender ===
                  "character"

                    ? character.name

                    : "User"
                ) +
                ": " +
                message.text
              )

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
(do not rewrite these; they are stored separately):

${
  oldMemory.pinnedMemories.length

    ? oldMemory
        .pinnedMemories
        .map(
          memory =>
            `- ${memory.text}`
        )
        .join("\n")

    : "- None"
}


NEW MESSAGES:

${formattedMessages}


MEMORY RULES

- Preserve important older information unless new messages clearly update it.

- Store only facts and events that were actually stated or strongly established by context.

- Never invent memories.

- Ignore ordinary greetings and meaningless filler.

- Prioritize details that could matter hundreds or thousands of messages later.

- Keep the story summary compact but useful.

- Track the current location and immediate situation in currentScene.

- Track meaningful trust, rivalry, teamwork, tension, friendship, etc. in relationshipState.

- Do not invent romantic development.

- unresolvedThreads should contain genuinely unfinished missions, promises, mysteries, plans, conflicts, threats, or important questions.

- Remove unresolved threads when they are clearly resolved.

- importantFacts should be concise and specific.

- Merge duplicate facts.

- Update a fact instead of keeping contradictory duplicates.

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
// START SERVER
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
      "================================="
    );

    console.log("");

  }

);