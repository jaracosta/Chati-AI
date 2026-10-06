import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageGenerator, falRequestBody, imageProviderName, ImageBlockedError } from '../image-provider.js';

test('picks fal.ai when FAL_KEY is set, unless told otherwise', () => {
  assert.equal(imageProviderName({ FAL_KEY: 'k', OPENROUTER_API_KEY: 'o' }), 'fal');
  assert.equal(imageProviderName({ OPENROUTER_API_KEY: 'o' }), 'openrouter');
  assert.equal(imageProviderName({ FAL_KEY: 'k', OPENROUTER_API_KEY: 'o', IMAGE_PROVIDER: 'openrouter' }), 'openrouter');
  assert.equal(imageProviderName({}), '');
});

test('fal safety checker stays on unless 18+ mode; negative prompt blocks minors on SDXL', () => {
  const off = falRequestBody({ prompt: 'p', aspect: '16:9', model: 'fal-ai/flux/dev' });
  assert.equal(off.enable_safety_checker, true);
  assert.equal(off.image_size, 'landscape_16_9');
  assert.equal(off.negative_prompt, undefined);

  const on = falRequestBody({ prompt: 'p', mature: true, model: 'fal-ai/lora', modelName: 'some/anime-xl' });
  assert.equal(on.enable_safety_checker, false);
  assert.match(on.negative_prompt, /minor/);
  assert.equal(on.model_name, 'some/anime-xl');
  assert.equal(on.image_size, 'portrait_4_3');
});

test('fal.ai result is downloaded and returned as a data URL', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith('https://fal.run/')) {
      return new Response(JSON.stringify({ images: [{ url: 'https://v3.fal.media/x.jpg' }] }), { status: 200 });
    }
    return new Response(Buffer.from('img'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  };
  const generator = createImageGenerator({ FAL_KEY: 'secret' }, fetchImpl);
  const result = await generator.generate({ prompt: 'anime girl', aspect: '3:4', mature: false });

  assert.equal(result, 'data:image/jpeg;base64,' + Buffer.from('img').toString('base64'));
  assert.equal(calls[0].url, 'https://fal.run/fal-ai/flux/dev');
  assert.equal(calls[0].options.headers.Authorization, 'Key secret');
  assert.equal(JSON.parse(calls[0].options.body).enable_safety_checker, true);
});

test('fal.ai errors are reported', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ detail: 'bad key' }), { status: 401 });
  const generator = createImageGenerator({ FAL_KEY: 'x' }, fetchImpl);
  await assert.rejects(generator.generate({ prompt: 'p' }), /fal.ai error 401/);
});

const imageResponse = () => new Response(Buffer.from('img'), { status: 200, headers: { 'content-type': 'image/jpeg' } });

test('a picture flagged by the safety checker is reported, not shown black', async () => {
  const fetchImpl = async url => url.startsWith('https://fal.run/')
    ? new Response(JSON.stringify({ images: [{ url: 'https://v3.fal.media/x.jpg' }], has_nsfw_concepts: [true] }), { status: 200 })
    : imageResponse();
  const generator = createImageGenerator({ FAL_KEY: 'k' }, fetchImpl);
  await assert.rejects(generator.generate({ prompt: 'p' }), ImageBlockedError);
});

test('with a reference picture, the editing model keeps the character; falls back on failure', async () => {
  const seen = [];
  let kontextFails = false;
  const fetchImpl = async (url, options) => {
    if (url.startsWith('https://fal.run/')) {
      seen.push({ url, body: JSON.parse(options.body) });
      if (url.includes('kontext') && kontextFails) return new Response('{}', { status: 422 });
      return new Response(JSON.stringify({ images: [{ url: 'https://v3.fal.media/x.jpg' }] }), { status: 200 });
    }
    return imageResponse();
  };
  const generator = createImageGenerator({ FAL_KEY: 'k' }, fetchImpl);

  await generator.generate({ prompt: 'fighting in a volcano', referenceImages: ['data:image/jpeg;base64,AAAA'], mature: true });
  assert.equal(seen[0].url, 'https://fal.run/fal-ai/flux-kontext/dev');
  assert.equal(seen[0].body.image_url, 'data:image/jpeg;base64,AAAA');
  assert.match(seen[0].body.prompt, /reference image/);
  assert.equal(seen[0].body.enable_safety_checker, false);

  seen.length = 0;
  kontextFails = true;
  const original = console.warn;
  console.warn = () => {};
  await generator.generate({ prompt: 'p', referenceImages: ['data:image/jpeg;base64,AAAA'] });
  console.warn = original;
  assert.deepEqual(seen.map(call => call.url), ['https://fal.run/fal-ai/flux-kontext/dev', 'https://fal.run/fal-ai/flux/dev']);
});
