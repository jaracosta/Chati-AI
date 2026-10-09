import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceProvider, spokenText, isValidVoiceId, VoiceError } from '../voice-provider.js';

function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  return { impl, calls };
}

test('no key means no provider', () => {
  assert.equal(createVoiceProvider({}), null);
});

test('only the spoken words are read aloud', () => {
  assert.equal(spokenText('**Gojo stretches.** Yo! *grins* "Did you miss me?"'), 'Yo! Did you miss me?');
  assert.equal(spokenText('**Only an action.**'), '');
  assert.equal(spokenText('a'.repeat(5000)).length, 1200);
  assert.ok(isValidVoiceId('21m00Tcm4TlvDq8ikWAM'));
  assert.ok(!isValidVoiceId('../voices'));
});

test('lists voices with the key in the header and caches them', async () => {
  const { impl, calls } = fakeFetch(() => new Response(JSON.stringify({ voices: [
    { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade', labels: { gender: 'female' }, preview_url: 'https://x/p.mp3' },
    { voice_id: 'bad id', name: 'Broken' }
  ] }), { headers: { 'content-type': 'application/json' } }));
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'sk_test' }, impl);
  const voices = await provider.listVoices();
  await provider.listVoices();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.elevenlabs.io/v1/voices');
  assert.equal(calls[0].options.headers['xi-api-key'], 'sk_test');
  assert.deepEqual(voices.map(v => v.name), ['Rachel']);
});

test('speaks with the voice and model, without the actions', async () => {
  const { impl, calls } = fakeFetch(() => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }));
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'k', ELEVENLABS_MODEL: 'eleven_flash_v2_5' }, impl);
  const audio = await provider.speak({ voiceId: '21m00Tcm4TlvDq8ikWAM', text: '**Waves.** Hola.' });
  assert.deepEqual([...audio], [1, 2, 3]);
  assert.match(calls[0].url, /\/text-to-speech\/21m00Tcm4TlvDq8ikWAM\?output_format=mp3_44100_128$/);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.text, 'Hola.');
  assert.equal(body.model_id, 'eleven_flash_v2_5');
  await assert.rejects(provider.speak({ voiceId: 'x', text: 'hi' }), VoiceError);
});

test('clones a voice from samples as multipart files', async () => {
  const { impl, calls } = fakeFetch(() => new Response(JSON.stringify({ voice_id: 'abcdefgh12345678' }), { headers: { 'content-type': 'application/json' } }));
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, impl);
  const voice = await provider.cloneVoice({ name: 'Mi voz', samples: [{ mimeType: 'audio/webm', buffer: Buffer.from('abc') }] });
  assert.deepEqual(voice, { id: 'abcdefgh12345678', name: 'Mi voz' });
  const form = calls[0].options.body;
  assert.equal(form.get('name'), 'Mi voz');
  assert.equal(form.getAll('files').length, 1);
  await assert.rejects(provider.cloneVoice({ name: 'x', samples: [] }), /at least one audio sample/);
});

test('turns ElevenLabs errors into clear messages', async () => {
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, async () =>
    new Response(JSON.stringify({ detail: { status: 'can_not_use_instant_voice_cloning', message: 'Your subscription does not include instant voice cloning.' } }), { status: 403 }));
  await assert.rejects(provider.cloneVoice({ name: 'x', samples: [{ buffer: Buffer.from('a') }] }), /paid ElevenLabs plan/);
  const unauthorized = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, async () => new Response('{}', { status: 401 }));
  await assert.rejects(unauthorized.listVoices(), /API key was rejected/);
});
