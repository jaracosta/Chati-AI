import OpenAI from "openai";

// Keep the provider secret on the server. The app consumes the same response
// events regardless of whether chat uses OpenAI or OpenRouter.
// Thinking budget for Claude (Anthropic's minimum is 1024).
const CLAUDE_THINKING_TOKENS = 1024;

const ROLEPLAY_STOP_SEQUENCES = ["\nUser:", "\nYou:", "\nUsuario:", "\n### Instruction"];

export function createChatProvider(env, openai) {
  if (!env.OPENROUTER_API_KEY) return openai;
  const router = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://chati-ai.com",
      "X-OpenRouter-Title": "Chati-AI"
    }
  });
  return {
    // Structured JSON (chat memory) through OpenRouter. Not every provider
    // supports strict JSON schemas, so the schema goes in the instructions
    // and the JSON object is pulled out of the reply.
    // Chati assistant: plain chat completion, optionally with OpenRouter's
    // web search plugin. Returns the reply text and the cited web pages.
    async assistant({ model, messages, max_output_tokens, web }) {
      const result = await router.chat.completions.create({
        model,
        messages,
        max_tokens: max_output_tokens,
        temperature: 0.6,
        ...(web ? { plugins: [{ id: "web", max_results: 6 }] } : {})
      });
      const message = result.choices?.[0]?.message || {};
      const citations = (Array.isArray(message.annotations) ? message.annotations : [])
        .filter(annotation => annotation?.type === "url_citation" && annotation.url_citation?.url)
        .map(annotation => ({
          url: annotation.url_citation.url,
          title: annotation.url_citation.title || ""
        }));
      return { text: message.content || "", citations };
    },
    // Same as assistant(), streamed: onDelta(text) gets each piece as the
    // model writes it. Returns the full text and the cited web pages.
    async assistantStream({ model, messages, max_output_tokens, web, onDelta }) {
      const stream = await router.chat.completions.create({
        model,
        messages,
        max_tokens: max_output_tokens,
        temperature: 0.6,
        stream: true,
        ...(web ? { plugins: [{ id: "web", max_results: 6 }] } : {})
      });
      let text = "";
      const citations = [];
      for await (const chunk of stream) {
        if (chunk.error) throw new Error(chunk.error.message || "OpenRouter stream failed.");
        const delta = chunk.choices?.[0]?.delta || {};
        for (const annotation of Array.isArray(delta.annotations) ? delta.annotations : []) {
          if (annotation?.type === "url_citation" && annotation.url_citation?.url) {
            citations.push({ url: annotation.url_citation.url, title: annotation.url_citation.title || "" });
          }
        }
        if (delta.content) {
          text += delta.content;
          onDelta?.(delta.content);
        }
      }
      return { text, citations };
    },
    async completeJson({ model, instructions, input, schema, max_output_tokens }) {
      const result = await router.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              instructions +
              "\n\nReply with ONLY one JSON object (no markdown, no commentary) that matches this JSON schema:\n" +
              JSON.stringify(schema)
          },
          { role: "user", content: input }
        ],
        max_tokens: max_output_tokens,
        temperature: 0.2
      });
      return extractJsonObject(result.choices?.[0]?.message?.content || "");
    },
    responses: {
      async create(request) {
        const messages = [{ role: "system", content: request.instructions || "" },
          ...request.input.map(message => ({
            role: message.role,
            content: typeof message.content === "string" ? message.content :
              message.content.map(part => {
                if (part.type === "input_image") return {
                  type: "image_url", image_url: { url: part.image_url, detail: part.detail || "auto" }
                };
                if (part.type === "input_text" || part.type === "output_text") {
                  return { type: "text", text: part.text };
                }
                throw new Error("Unsupported chat attachment content.");
              })
          }))];
        // OPENROUTER_FALLBACK_MODEL: if the main model is down or busy (e.g.
        // its only provider fails), OpenRouter answers with this one instead.
        const fallback = String(env.OPENROUTER_FALLBACK_MODEL || "").trim();
        const call = (model, withFallback, signal) => router.chat.completions.create({
          model,
          ...(withFallback && fallback && fallback !== model ? { models: [model, fallback] } : {}),
          messages: isClaude(model) ? claudeMessages(messages) : messages,
          // Claude Sonnet 5.5 always thinks first (OpenRouter rejects turning it
          // off). Give the thinking its own small budget on top of the reply's,
          // so it neither cuts the reply short nor delays it for long.
          max_tokens: request.max_output_tokens + (isClaude(model) ? CLAUDE_THINKING_TOKENS : 0),
          ...(isClaude(model) ? { reasoning: { max_tokens: CLAUDE_THINKING_TOKENS } } : {}),
          // With thinking on, Claude accepts no sampling settings (temperature
          // must stay at its default).
          ...(isClaude(model) ? {} : request.sampling || {}),
          // Prefer the providers that start answering soonest (OpenRouter's
          // default leans on price). OPENROUTER_PROVIDER_SORT=price|throughput
          // changes it; "off" leaves OpenRouter's default.
          ...(providerSort(env) ? { provider: { sort: providerSort(env) } } : {}),
          // DeepSeek, GLM and Kimi can "think" before answering, which only
          // adds seconds and cost to a chat reply. CHAT_REASONING=on keeps it.
          ...(/deepseek|glm|kimi|moonshot/i.test(model) && String(env.CHAT_REASONING || "").toLowerCase() !== "on"
            ? { reasoning: { enabled: false } }
            : {}),
          // Stop if the model starts writing the user's turn.
          stop: ROLEPLAY_STOP_SEQUENCES,
          stream: Boolean(request.stream)
        }, signal ? { signal } : undefined);
        if (!request.stream) {
          const result = await call(request.model, true);
          return { output_text: result.choices?.[0]?.message?.content || "" };
        }
        const result = await openFastStream(call, request.model, fallback, firstTokenTimeout(env));
        return (async function* () {
          let text = "";
          let finishReason = null;
          let servedModel = "";
          for await (const chunk of result) {
            if (!servedModel && chunk?.model) servedModel = String(chunk.model);
            if (chunk.error) throw new Error(chunk.error.message || "OpenRouter stream failed.");
            const choice = chunk.choices?.[0];
            if (choice?.finish_reason === "error") throw new Error("OpenRouter generation failed.");
            if (choice?.finish_reason) finishReason = choice.finish_reason;
            const delta = choice?.delta?.content || "";
            if (delta) {
              text += delta;
              yield { type: "response.output_text.delta", delta };
            }
            const refusal = choice?.delta?.refusal;
            if (refusal) yield { type: "response.refusal.delta", delta: refusal };
          }
          if (servedModel && !sameModel(servedModel, request.model)) {
            console.warn("⚠️ Reply written by " + servedModel + " instead of " + request.model);
          }
          // finish_reason "length": the reply hit max_tokens and ends mid-sentence.
          yield { type: "response.completed", response: { output_text: text, finish_reason: finishReason } };
        })();
      }
    }
  };
}

// Claude (Anthropic) through OpenRouter.
export function isClaude(model) {
  return /anthropic\/|claude/i.test(String(model || ""));
}

// Claude takes one system prompt, at the top. The per-turn note the server
// puts right before the user's last message (voice-polish.js anchor) goes
// into that message instead, marked as a note, so it keeps its place at the
// end. The system prompt is marked for prompt caching: the long character
// sheet is billed at a fraction of the price while it doesn't change.
export function claudeMessages(messages) {
  const out = [];
  let pendingNote = "";
  messages.forEach((message, index) => {
    if (message.role === "system" && index > 0) {
      pendingNote += (pendingNote ? "\n\n" : "") + String(message.content || "");
      return;
    }
    if (index === 0 && message.role === "system") {
      out.push({ role: "system", content: [{ type: "text", text: String(message.content || ""), cache_control: { type: "ephemeral" } }] });
      return;
    }
    if (pendingNote && message.role === "user") {
      const note = "(Director's note for this reply — not written by the user:)\n" + pendingNote + "\n\n(The user's message:)\n";
      pendingNote = "";
      if (typeof message.content === "string") {
        out.push({ ...message, content: note + message.content });
      } else {
        out.push({ ...message, content: [{ type: "text", text: note }, ...message.content] });
      }
      return;
    }
    out.push(message);
  });
  return out;
}

// Claude rejects temperature and top_p together and has no min_p or
// repetition penalties: only the temperature (0-1) is sent.
export function claudeSampling(sampling = {}) {
  const temperature = Number(sampling?.temperature);
  return Number.isFinite(temperature) ? { temperature: Math.max(0, Math.min(1, temperature)) } : {};
}

function firstTokenTimeout(env = {}) {
  const value = Number(env.CHAT_FIRST_TOKEN_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 0 ? value : 12000;
}

// A busy provider can sit for 30+ seconds before the first word, which reads
// as "the character takes forever to type". If the main model has not started
// writing within the timeout, drop it and stream the fallback model instead.
// Returns an async iterable of chunks (the ones already read come first).
async function openFastStream(call, model, fallback, timeoutMs) {
  if (!fallback || fallback === model || !timeoutMs) return call(model, true);
  const controller = new AbortController();
  const started = (async () => {
    const stream = await call(model, false, controller.signal);
    const iterator = stream[Symbol.asyncIterator]();
    const early = [];
    while (true) {
      const next = await iterator.next();
      if (next.done) return { early, iterator, done: true };
      early.push(next.value);
      // Thinking counts as started: the model is working, not stuck.
      const delta = next.value?.choices?.[0]?.delta;
      if (delta?.content || delta?.reasoning || delta?.reasoning_details?.length || next.value?.error) return { early, iterator, done: false };
    }
  })();
  // Say why the main model did not answer: the fallback answering in its
  // place is otherwise invisible (a different style, nothing in the logs).
  started.catch(error => {
    if (error?.name === "AbortError" || controller.signal.aborted) return;
    console.warn("⚠️ Main chat model failed (" + model + "): " + describeProviderError(error) + " — answering with " + fallback);
  });
  let timer;
  let timedOutFirst = false;
  const timedOut = new Promise(resolve => { timer = setTimeout(() => { timedOutFirst = true; resolve(null); }, timeoutMs); });
  let first;
  try {
    first = await Promise.race([started, timedOut]);
  } catch {
    first = null;
  } finally {
    clearTimeout(timer);
  }
  if (!first) {
    if (!controller.signal.aborted && timedOutFirst) {
      console.warn("⚠️ Main chat model (" + model + ") did not start within " + timeoutMs + " ms — answering with " + fallback);
    }
    controller.abort();
    return call(fallback, false);
  }
  return (async function* () {
    yield* first.early;
    if (first.done) return;
    while (true) {
      const next = await first.iterator.next();
      if (next.done) return;
      yield next.value;
    }
  })();
}

// "anthropic/claude-sonnet-5.5" and a dated "anthropic/claude-sonnet-5.5-20261001"
// are the same model.
function sameModel(served, requested) {
  const a = String(served || "").toLowerCase().replace(/^~/, "");
  const b = String(requested || "").toLowerCase().replace(/^~/, "").replace(/:.*$/, "");
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function describeProviderError(error) {
  const status = error?.status ? error.status + " " : "";
  const detail = error?.error?.message || error?.message || String(error);
  return (status + detail).slice(0, 400);
}

function providerSort(env = {}) {
  const value = String(env.OPENROUTER_PROVIDER_SORT || "latency").trim().toLowerCase();
  return ["latency", "throughput", "price"].includes(value) ? value : "";
}

// Returns the JSON object text inside a model reply (handles ```json fences
// and leading/trailing chatter), or "" when there is none.
export function extractJsonObject(text) {
  const value = String(text || "").replace(/```(?:json)?/gi, "");
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end <= start) return "";
  return value.slice(start, end + 1).trim();
}
