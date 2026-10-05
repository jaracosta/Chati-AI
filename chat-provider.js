import OpenAI from "openai";

// Keep the provider secret on the server. The app consumes the same response
// events regardless of whether chat uses OpenAI or OpenRouter.
export function createChatProvider(env, openai) {
  if (!env.OPENROUTER_API_KEY) return openai;
  const router = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://chati-ai.com",
      "X-OpenRouter-Title": "Chati-AI"
    }
  });
  return {
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
        const result = await router.chat.completions.create({
          model: request.model,
          messages,
          max_tokens: request.max_output_tokens,
          stream: Boolean(request.stream)
        });
        if (!request.stream) return { output_text: result.choices?.[0]?.message?.content || "" };
        return (async function* () {
          let text = "";
          for await (const chunk of result) {
            if (chunk.error) throw new Error(chunk.error.message || "OpenRouter stream failed.");
            const choice = chunk.choices?.[0];
            if (choice?.finish_reason === "error") throw new Error("OpenRouter generation failed.");
            const delta = choice?.delta?.content || "";
            if (delta) {
              text += delta;
              yield { type: "response.output_text.delta", delta };
            }
            const refusal = choice?.delta?.refusal;
            if (refusal) yield { type: "response.refusal.delta", delta: refusal };
          }
          yield { type: "response.completed", response: { output_text: text } };
        })();
      }
    }
  };
}
