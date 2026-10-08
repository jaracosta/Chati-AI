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
  } finally { globalThis.fetch = originalFetch; }
});
