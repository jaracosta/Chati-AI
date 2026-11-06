import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatProvider } from '../chat-provider.js';

test('OpenAI remains the default when no OpenRouter secret is configured', () => {
  const original = {};
  assert.equal(createChatProvider({}, original), original);
});

test('OpenRouter maps images and streaming chunks into existing app events', async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-secret');
    payload = JSON.parse(options.body);
    const chunks = ['Hello', ' there'].map(content =>
      'data: ' + JSON.stringify({ choices: [{ delta: { content } }] }) + '\n\n').join('');
    return new Response(chunks + 'data: [DONE]\n\n', {headers:{'content-type':'text/event-stream'}});
  };
  try {
    const provider = createChatProvider({OPENROUTER_API_KEY:'test-secret'}, {});
    const events = [];
    for await (const event of await provider.responses.create({
      model:'openai/gpt-4o', instructions:'Stay in character.', max_output_tokens:100, stream:true, sampling:{temperature:0.9, repetition_penalty:1.08},
      input:[{role:'user',content:[{type:'input_text',text:'Hi'},{type:'input_image',image_url:'data:image/png;base64,AA',detail:'high'}]}]
    })) events.push(event);
    assert.equal(payload.messages[0].content, 'Stay in character.');
    assert.equal(payload.messages[1].content[1].image_url.detail, 'high');
    assert.equal(payload.max_tokens, 100);
    assert.equal(payload.repetition_penalty, 1.08);
    assert.equal(payload.temperature, 0.9);
    assert.ok(payload.stop.includes('\nUser:'), 'stops before writing the user turn');
    assert.equal(events.at(-1).response.output_text, 'Hello there');
    assert.equal(events[0].type, 'response.output_text.delta');
    globalThis.fetch = async () => new Response(JSON.stringify({choices:[{message:{content:'Fallback'}}]}), {headers:{'content-type':'application/json'}});
    const fallbackProvider = createChatProvider({OPENROUTER_API_KEY:"test-secret"}, {});
    assert.equal((await fallbackProvider.responses.create({model:'openai/gpt-4o',instructions:'',input:[],stream:false})).output_text, 'Fallback');
  } finally { globalThis.fetch = originalFetch; }
});

import { extractJsonObject } from '../chat-provider.js';

test('pulls the JSON object out of a chatty or fenced model reply', () => {
  assert.equal(extractJsonObject('Here it is:\n```json\n{"a":1,"b":{"c":2}}\n```\nDone!'), '{"a":1,"b":{"c":2}}');
  assert.equal(extractJsonObject('no json here'), '');
});

test('roleplay requests name the fallback model when one is configured', async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const request = { model: 'sao10k/l3.3-euryale-70b', instructions: '', input: [], stream: false };
    await createChatProvider({ OPENROUTER_API_KEY: 'k', OPENROUTER_FALLBACK_MODEL: 'dolphin' }, {}).responses.create(request);
    await createChatProvider({ OPENROUTER_API_KEY: 'k', OPENROUTER_FALLBACK_MODEL: 'sao10k/l3.3-euryale-70b' }, {}).responses.create(request);
    await createChatProvider({ OPENROUTER_API_KEY: 'k' }, {}).responses.create(request);
    assert.deepEqual(payloads[0].models, ['sao10k/l3.3-euryale-70b', 'dolphin']);
    assert.equal(payloads[0].model, 'sao10k/l3.3-euryale-70b');
    assert.equal(payloads[1].models, undefined);
    assert.equal(payloads[2].models, undefined);
    assert.deepEqual(payloads[0].provider, { sort: 'latency' }, 'fastest-starting providers first');
    await createChatProvider({ OPENROUTER_API_KEY: 'k', OPENROUTER_PROVIDER_SORT: 'off' }, {}).responses.create(request);
    assert.equal(payloads[3].provider, undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('a model that does not start writing in time is replaced by the fallback', async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    models.push(body.model);
    if (body.model === 'slow-model') {
      // Never sends a word; errors out once the request is aborted.
      const stream = new ReadableStream({
        start(controller) {
          options.signal?.addEventListener('abort', () => controller.error(new Error('aborted')));
        }
      });
      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
    }
    const chunk = 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Fast hello' } }] }) + '\n\ndata: [DONE]\n\n';
    return new Response(chunk, { headers: { 'content-type': 'text/event-stream' } });
  };
  try {
    const provider = createChatProvider({ OPENROUTER_API_KEY: 'k', OPENROUTER_FALLBACK_MODEL: 'fast-model', CHAT_FIRST_TOKEN_TIMEOUT_MS: '50' }, {});
    const events = [];
    for await (const event of await provider.responses.create({ model: 'slow-model', instructions: '', input: [], stream: true })) events.push(event);
    assert.deepEqual(models, ['slow-model', 'fast-model']);
    assert.equal(events.at(-1).response.output_text, 'Fast hello');

    // A model that answers in time keeps its own stream.
    models.length = 0;
    const quick = [];
    for await (const event of await provider.responses.create({ model: 'quick-model', instructions: '', input: [], stream: true })) quick.push(event);
    assert.deepEqual(models, ['quick-model']);
    assert.equal(quick.at(-1).response.output_text, 'Fast hello');
  } finally { globalThis.fetch = originalFetch; }
});

test('DeepSeek answers without thinking first; other models are left alone', async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const provider = createChatProvider({ OPENROUTER_API_KEY: 'k' }, {});
    await provider.responses.create({ model: 'deepseek/deepseek-v4.1-flash-1017', instructions: '', input: [], stream: false });
    await provider.responses.create({ model: 'sao10k/l3.3-euryale-70b', instructions: '', input: [], stream: false });
    await provider.responses.create({ model: 'z-ai/glm-5.3-prime', instructions: '', input: [], stream: false });
    assert.deepEqual(payloads[0].reasoning, { enabled: false });
    assert.equal(payloads[1].reasoning, undefined);
    assert.deepEqual(payloads[2].reasoning, { enabled: false });
  } finally { globalThis.fetch = originalFetch; }
});

test('Claude gets one cached system prompt, the per-turn note inside the last message, and only a temperature', async () => {
  const { isClaude, claudeMessages, claudeSampling } = await import('../chat-provider.js');
  assert.equal(isClaude('anthropic/claude-sonnet-5.5'), true);
  assert.equal(isClaude('~anthropic/claude-sonnet-latest'), true);
  assert.equal(isClaude('z-ai/glm-5.3'), false);
  const out = claudeMessages([
    { role: 'system', content: 'You are Astrid.' },
    { role: 'user', content: 'Hola' },
    { role: 'assistant', content: 'Hey.' },
    { role: 'system', content: '[Stay in character as Astrid.]' },
    { role: 'user', content: 'Stoick has died.' }
  ]);
  assert.equal(out.filter(m => m.role === 'system').length, 1);
  assert.deepEqual(out[0].content[0].cache_control, { type: 'ephemeral' });
  assert.match(out.at(-1).content, /^\(Director's note[\s\S]*Stay in character as Astrid[\s\S]*Stoick has died\.$/);
  assert.deepEqual(claudeSampling({ temperature: 1.3, top_p: 1, min_p: 0.1, repetition_penalty: 1.04 }), { temperature: 1 });

  // The request OpenRouter receives.
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { headers: { 'content-type': 'application/json' } }); };
  try {
    await createChatProvider({ OPENROUTER_API_KEY: 'k' }, {}).responses.create({ model: 'anthropic/claude-sonnet-5.5', instructions: 'You are Astrid.', input: [{ role: 'system', content: 'note' }, { role: 'user', content: 'hi' }], stream: false, sampling: { temperature: 0.7, top_p: 1, min_p: 0.1 } });
    assert.equal(payload.temperature, undefined);
    assert.equal(payload.top_p, undefined);
    assert.equal(payload.min_p, undefined);
    assert.deepEqual(payload.reasoning, { max_tokens: 1024 });
    assert.equal(payload.messages.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('a streamed reply reports finish_reason so a reply cut by max_tokens can be trimmed', async () => {
  const originalFetch = globalThis.fetch;
  const sse = [
    { choices: [{ delta: { content: 'Not now, Heather. Hunters' } }] },
    { choices: [{ delta: {}, finish_reason: 'length' }] }
  ].map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n';
  globalThis.fetch = async () => new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
  try {
    const stream = await createChatProvider({ OPENROUTER_API_KEY: 'k' }, {}).responses.create({ model: 'anthropic/claude-sonnet-5.5', instructions: 'x', input: [{ role: 'user', content: 'hi' }], stream: true });
    let completed;
    for await (const event of stream) if (event.type === 'response.completed') completed = event.response;
    assert.equal(completed.output_text, 'Not now, Heather. Hunters');
    assert.equal(completed.finish_reason, 'length');
  } finally { globalThis.fetch = originalFetch; }
});
