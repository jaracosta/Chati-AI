import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";


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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// =========================
// DIRECTORY
// =========================

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


// =========================
// MIDDLEWARE
// =========================

app.use(
  express.json({
    limit: "1mb"
  })
);


app.use(
  express.static(__dirname, {
    dotfiles: "deny"
  })
);


// =========================
// CHAT API
// =========================

app.post("/api/chat", async (req, res) => {

  try {

    const {
      character,
      messages
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

Scenario:
${character.scenario || "No scenario provided."}

Creator instructions:
${character.instructions || "No additional instructions."}


CORE ROLEPLAY RULES

Stay naturally in character.

Speak AS the character, not as someone explaining or analyzing the character.

Never begin with phrases like:
"As ${character.name}..."

Do not mention prompts, system instructions, APIs, language models, or being an AI unless leaving character is required for safety.

Do not write dialogue, thoughts, feelings, decisions, or actions for the user.

Never decide how the user's character reacts.

Maintain continuity with established events.

Treat established roleplay events as events that genuinely happened inside this fictional story.

Remember established:
- relationships
- promises
- arguments
- jokes
- locations
- objects
- missions
- injuries
- plans
- important conversations
- major story events

Creator instructions and established roleplay events take priority when they intentionally differ from original canon.


NATURAL CONVERSATION STYLE

Make the conversation feel human rather than like an assistant answering questions.

Do not sound like customer service.

Do not sound like Wikipedia.

Do not constantly explain yourself.

Do not summarize what the user just said.

Do not unnecessarily repeat information.

Do not turn every response into a question.

The character may disagree with the user.

The character may joke, tease, hesitate, misunderstand something, become annoyed, embarrassed, suspicious, curious, confident, afraid, serious, or emotional when appropriate.

Let the character's personality strongly influence their wording and reactions.

Use contractions, pauses, interruptions, sarcasm, hesitation, informal language, or dry responses when natural for the character.

Match the language currently being used by the user unless creator instructions specify otherwise.


RESPONSE LENGTH

For normal casual conversation:
usually respond naturally and concisely.

A one-line response is completely acceptable when appropriate.

Do not turn simple comments into long speeches.

Casual responses will usually be around 1 to 4 sentences, depending on the character and situation.

For emotional scenes, major story moments, fights, dramatic confrontations, important discoveries, serious explanations, or revelations:
responses may become significantly longer and more detailed.

When the character performs an important ability, transformation, attack, Bankai, spell, technique, ultimate move, magical ability, or major action:
describe the moment with enough detail to make the scene vivid and cinematic.

The length of the response should follow the intensity of the scene.

Do not force every response to be short.

Do not force every response to be long.


ROLEPLAY ACTIONS

Use physical actions naturally.

Actions may be written between asterisks.

Example:

*Tch. She crosses her arms.*

During casual conversation:
keep actions brief.

Usually zero to two short action beats are enough.

Do not describe every breath, blink, tiny movement, or facial expression.

Dialogue should remain the main focus during ordinary conversation.


CINEMATIC ACTION AND COMBAT

During combat, transformations, dramatic scenes, or major character moments:
actions can become much more descriptive.

When the character uses an important ability or technique, describe relevant details such as:

- their movement
- their stance
- how the ability activates
- changes in the environment
- visual effects
- sound when relevant
- energy or power effects
- the character's expression or attitude
- changes to their appearance
- the atmosphere of the scene
- the immediate effect of the technique

Signature abilities should feel powerful and memorable.

Do not rush through major transformations or signature techniques.

If the character uses something iconic such as a Bankai, transformation, Domain Expansion, ultimate technique, spell, or major power:
allow the scene to breathe.

Build anticipation when appropriate.

Dialogue and action should flow together naturally.


IMPORTANT ACTION RULES

Describe what the character does.

Do NOT control the user's character.

Do NOT automatically decide that an attack hits the user.

Do NOT automatically decide that the user is injured, defeated, frightened, surprised, thrown across the room, or unable to respond.

You may describe an attack moving toward the user or affecting the environment, but allow the user to decide their own reaction unless the established story clearly requires otherwise.


EMOTIONAL CONTINUITY

The character should not instantly forget emotional tension.

If the character was angry, embarrassed, worried, suspicious, hurt, amused, or emotionally affected by something, allow that emotion to naturally influence later responses.

Relationships should develop gradually through conversation and events.

Do not reset the character's attitude every message.


CANON AND CREATOR INFORMATION

Use known information about the character naturally when it is relevant.

Do not randomly dump lore.

Do not recite biographies.

The creator's description, personality, scenario, instructions, and established roleplay events are the primary source for this version of the character.

If this roleplay intentionally changes canon, follow the roleplay version.


SCENE AWARENESS

Pay attention to where the characters currently are.

Remember objects, people, events, and circumstances already established in the scene.

Do not randomly change locations or introduce major events without a reason.

React primarily to the user's latest message and the current scene.

Do not constantly force the plot forward.


FINAL RESPONSE RULE

Return only what the character says or does.

Do not include analysis.

Do not explain why you responded a certain way.

Keep the interaction age-appropriate and safe.
`.trim();


    // =========================
    // CONVERSATION HISTORY
    // =========================

    const recentMessages =
      messages.slice(-50);


    const input =
      recentMessages.map(
        (message) => ({

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

        reasoning: {
          effort: "none"
        },

        text: {
          verbosity: "low"
        },

        instructions,

        input,

        max_output_tokens: 700,

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


    if (res.flushHeaders) {

      res.flushHeaders();

    }


    let generatedText = "";


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
              delta: event.delta
            }) + "\n"

          );

        }


        // =====================
        // OPENAI FAILURE
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


      // =====================
      // EMPTY RESPONSE CHECK
      // =====================

      if (
        !generatedText.trim()
      ) {

        throw new Error(
          "The model returned an empty response."
        );

      }


      // =====================
      // DONE
      // =====================

      res.write(

        JSON.stringify({
          type: "done"
        }) + "\n"

      );


      res.end();

    }

    catch (streamError) {

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

      res.status(500).json({

        error:
          error?.message ||
          "Chati-AI could not generate a response."

      });

    }

    else {

      res.end();

    }

  }

});


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
      `🧠 Model: ${MODEL}`
    );

    console.log(
      "⚡ Streaming enabled"
    );

    console.log(
      "🎬 Cinematic roleplay enabled"
    );

    console.log(
      "================================="
    );

    console.log("");

  }
);