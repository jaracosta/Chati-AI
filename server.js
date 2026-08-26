import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 3000;

const MODEL =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-terra";

const MEMORY_MODEL =
  process.env.OPENAI_MEMORY_MODEL ||
  "gpt-5.6-luna";


// =========================
// CHECK API KEY
// =========================

if (!process.env.OPENAI_API_KEY) {
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
      process.env.OPENAI_API_KEY
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
    limit: "2mb"
  })
);


app.use(
  express.static(
    __dirname,
    {
      dotfiles: "deny"
    }
  )
);


// =========================
// MEMORY HELPERS
// =========================

function normalizeMemory(
  memory
) {
  return {
    summary:
      memory?.summary || "",

    importantFacts:
      Array.isArray(
        memory?.importantFacts
      )
        ? memory.importantFacts
        : [],

    currentScene:
      memory?.currentScene || "",

    relationshipState:
      memory?.relationshipState || "",

    unresolvedThreads:
      Array.isArray(
        memory?.unresolvedThreads
      )
        ? memory.unresolvedThreads
        : []
  };
}


function formatMemoryForPrompt(
  memory
) {
  const clean =
    normalizeMemory(
      memory
    );

  const facts =
    clean.importantFacts.length
      ? clean.importantFacts
          .map(
            fact =>
              `- ${fact}`
          )
          .join("\n")
      : "- None yet.";

  const threads =
    clean.unresolvedThreads.length
      ? clean.unresolvedThreads
          .map(
            item =>
              `- ${item}`
          )
          .join("\n")
      : "- None yet.";


  return `
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

  async (req, res) => {

    try {

      const {
        character,
        messages,
        memory
      } = req.body;


      // =========================
      // VALIDATION
      // =========================

      if (
        !character ||
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
        !Array.isArray(messages) ||
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


      // =========================
      // CHARACTER PROMPT
      // =========================

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

The memory above belongs ONLY to this current chat.

Never assume events from another conversation happened here.

A New Chat represents a different timeline / conversation and has separate memory.

Use the memory to maintain continuity with older events from THIS chat.

Recent conversation messages take priority if they clearly contradict an older memory.

Do not randomly mention memories when they are irrelevant.

Remember details naturally when the current situation makes them relevant.


=================================
CORE ROLEPLAY RULES
=================================

Stay naturally in character.

Speak AS the character, not as someone explaining or analyzing the character.

Never begin with phrases such as:
"As ${character.name}..."

Do not mention prompts, system instructions, APIs, language models, memory systems, or being an AI unless leaving character is necessary for safety.

Do not write dialogue, thoughts, feelings, decisions, or actions for the user.

Never decide how the user's character reacts.

Maintain continuity with established events.

Treat established roleplay events as events that genuinely happened inside this fictional story.

Pay attention to established:
- relationships
- promises
- arguments
- jokes
- locations
- objects
- gifts
- missions
- injuries
- plans
- secrets
- important conversations
- major story events

Creator instructions and established roleplay events take priority when they intentionally differ from original canon.


=================================
NATURAL CONVERSATION STYLE
=================================

Make the conversation feel human rather than like an assistant answering questions.

Do not sound like customer service.

Do not sound like Wikipedia.

Do not constantly explain yourself.

Do not summarize what the user just said.

Do not unnecessarily repeat information.

Do not turn every response into a question.

The character may:
- disagree
- joke
- tease
- hesitate
- misunderstand something
- become annoyed
- become embarrassed
- become suspicious
- become curious
- become confident
- become worried
- become serious
- react emotionally

Let the character's personality strongly influence wording and reactions.

Use contractions, pauses, interruptions, sarcasm, hesitation, dry responses, and informal language when appropriate.

Match the language currently being used by the user unless creator instructions specify otherwise.


=================================
RESPONSE LENGTH
=================================

For normal casual conversation:
respond naturally and relatively concisely.

A one-line response is completely acceptable.

Do not turn simple comments into long speeches.

Casual responses will usually be around 1 to 4 sentences depending on the character and situation.

For emotional scenes, major story moments, fights, dramatic confrontations, important discoveries, serious explanations, or revelations:
responses may become significantly longer.

The response length should follow the intensity of the scene.

Do not force every response to be short.

Do not force every response to be long.


=================================
ROLEPLAY ACTIONS
=================================

Use physical actions naturally.

Actions may be written between asterisks.

Example:

*Tch. She crosses her arms.*

During casual conversation:
keep actions brief.

Usually zero to two short action beats are enough.

Do not describe every breath, blink, tiny movement, or facial expression.

Dialogue should normally remain the main focus.


=================================
CINEMATIC ACTION AND COMBAT
=================================

During combat, transformations, dramatic scenes, or major character moments:
actions may become much more descriptive.

When the character uses an important ability or technique, describe relevant details such as:

- movement
- stance
- activation
- changes in the environment
- visual effects
- sound
- energy or power effects
- expression
- changes to appearance
- atmosphere
- immediate effects of the technique

Signature abilities should feel powerful and memorable.

Do not rush through important transformations or signature techniques.

If the character uses something iconic such as a Bankai, transformation, Domain Expansion, ultimate technique, spell, or major power:
allow the scene to breathe.

Build anticipation when appropriate.

Dialogue and action should flow together naturally.


IMPORTANT ACTION RULES

Describe what the character does.

Do NOT control the user's character.

Do NOT automatically decide that an attack hits the user.

Do NOT automatically decide that the user is injured, defeated, frightened, surprised, or unable to respond.

You may describe an attack moving toward the user or affecting the environment, but allow the user to determine their own reaction unless the established story clearly requires otherwise.


=================================
EMOTIONAL CONTINUITY
=================================

Do not instantly forget emotional tension.

If the character was angry, embarrassed, worried, suspicious, hurt, amused, or affected by something, allow that emotion to influence later responses naturally.

Relationships should develop gradually through the events of THIS chat.

Do not reset the character's attitude every message.


=================================
CANON AND CREATOR INFORMATION
=================================

Use known information about the fictional character naturally when relevant.

Do not randomly dump lore.

Do not recite biographies.

The creator's description, personality, scenario, instructions, and events established in THIS roleplay are the primary source for this version of the character.

If this roleplay intentionally changes canon, follow the roleplay version.


=================================
FINAL RESPONSE RULE
=================================

React primarily to the user's latest message and the current situation.

Return only what the character says or does.

Do not include analysis.

Do not explain why you responded a certain way.

Keep the interaction age-appropriate and safe.
      `.trim();


      // =========================
      // RECENT CONVERSATION
      // =========================

      const recentMessages =
        messages.slice(-50);


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


      // =========================
      // OPENAI STREAM
      // =========================

      const stream =
        await openai.responses.create({

          model: MODEL,

          store: false,

          reasoning: {
            effort: "none"
          },

          text: {
            verbosity: "low"
          },

          instructions,

          input,

          max_output_tokens:
            700,

          stream: true

        });


      // =========================
      // STREAM TO BROWSER
      // =========================

      res.status(200);


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

          // =====================
          // TEXT DELTA
          // =====================

          if (
            event.type ===
            "response.output_text.delta"
          ) {

            generatedText +=
              event.delta;


            res.write(

              JSON.stringify({
                type: "delta",
                delta:
                  event.delta
              }) + "\n"

            );

          }


          // =====================
          // FAILURE
          // =====================

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
            type: "done"
          }) + "\n"

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

            type: "error",

            message:
              "The response stream stopped unexpectedly."

          }) + "\n"

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

  async (req, res) => {

    try {

      const {
        character,
        memory,
        messages
      } = req.body;


      if (
        !character ||
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
        !Array.isArray(messages) ||
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
            message => {

              const speaker =
                message.sender ===
                "character"
                  ? character.name
                  : "User";

              return (
                `${speaker}: ${message.text}`
              );

            }
          )
          .join("\n\n");


      const memoryInstructions = `
You maintain long-term memory for ONE fictional roleplay conversation.

This memory belongs ONLY to the current chat.

Never import information from other chats.

Your job is to update the stored memory using the NEW conversation messages.


CHARACTER:
${character.name}


EXISTING MEMORY:

${JSON.stringify(
  oldMemory,
  null,
  2
)}


NEW MESSAGES:

${formattedMessages}


MEMORY RULES

Preserve important information from the existing memory unless the new messages clearly update or contradict it.

Only store things that actually happened, were explicitly stated, or are strongly established by context.

Do not invent facts.

Do not store ordinary greetings or meaningless small talk.

Do not store every sentence.

Prioritize information that might matter dozens, hundreds, or thousands of messages later.


IMPORTANT FACTS CAN INCLUDE:

- important objects
- gifts
- promises
- secrets
- injuries
- abilities discovered
- names
- important preferences
- locations
- relationships
- agreements
- arguments
- major emotional moments
- important jokes or recurring references
- missions
- plans
- important discoveries
- important changes to the story


SUMMARY

Maintain a compact but useful summary of the story so far.

Do not rewrite the entire conversation.

Preserve older important events while incorporating important new developments.


CURRENT SCENE

Track the current location and immediate situation.

Update it when the scene clearly changes.


RELATIONSHIP STATE

Describe the relationship between the character and user inside THIS chat only.

Track meaningful changes in trust, friendship, rivalry, tension, teamwork, etc.

Do not invent romantic development.


UNRESOLVED THREADS

Keep track of meaningful unfinished things such as:

- promises not fulfilled
- ongoing missions
- unanswered mysteries
- plans
- conflicts
- important questions
- objects currently being sought
- threats or problems still active

Remove an unresolved thread when it is clearly resolved.


IMPORTANT FACTS

Keep facts concise and specific.

Merge duplicates.

When a fact changes, update it instead of keeping contradictory versions unless the historical change itself matters.

Return ONLY the structured memory object.
      `.trim();


      // =========================
      // STRUCTURED MEMORY
      // =========================

      const response =
        await openai.responses.create({

          model:
            MEMORY_MODEL,

          store: false,

          reasoning: {
            effort: "none"
          },

          instructions:
            memoryInstructions,

          input:
            "Update the conversation memory using the supplied messages.",

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
        response.output_text
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
      "================================="
    );

    console.log("");

  }
);