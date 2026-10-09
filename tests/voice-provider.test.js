import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceProvider, spokenText, prepareSpeech, actionCue, isValidVoiceId, VoiceError } from '../voice-provider.js';

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

test('actions become pauses and emotion cues instead of being dropped', () => {
  const reply = '**Light sonríe con frialdad.** Así que lo descubriste.\n**Se inclina y susurra.** Pero nadie te creerá. **Ríe en voz baja.** Yo soy la justicia';
  assert.equal(prepareSpeech(reply), '[coldly] Así que lo descubriste. … [whispers] Pero nadie te creerá. … [laughs] Yo soy la justicia.');
  assert.equal(prepareSpeech(reply, { expressive: false }), 'Así que lo descubriste. <break time="0.6s" /> Pero nadie te creerá. <break time="0.6s" /> Yo soy la justicia.');
  assert.equal(prepareSpeech('**Waits.** Fine.'), 'Fine.');
  assert.equal(prepareSpeech('**Only an action.**'), '');
  assert.equal(actionCue('He smirks'), '[mischievously]');
  assert.equal(actionCue('Suspira con cansancio'), '[sighs]');
  assert.equal(actionCue('Walks to the window'), '');
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
  assert.equal(body.voice_settings.style, 0.45);
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
  await assert.rejects(unauthorized.listVoices(), /rejected the API key/);
  const limited = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, async () =>
    new Response(JSON.stringify({ detail: { status: 'missing_permissions', message: 'The API key you used is missing the permission voices_read to execute this operation.' } }), { status: 401 }));
  await assert.rejects(limited.listVoices(), /missing permissions \(voices_read\)/);
});

test('designs a voice from a description and saves the chosen preview', async () => {
  const { impl, calls } = fakeFetch(url => url.endsWith('/text-to-voice/design')
    ? new Response(JSON.stringify({ text: 'x'.repeat(120), previews: [
        { generated_voice_id: 'gen_1', audio_base_64: 'AAA=', media_type: 'audio/mpeg', duration_secs: 6.2 },
        { generated_voice_id: 'gen_2', audio_base_64: 'BBB=', media_type: 'audio/mpeg', duration_secs: 6.0 }
      ] }), { headers: { 'content-type': 'application/json' } })
    : new Response(JSON.stringify({ voice_id: 'DesignedVoice0001' }), { headers: { 'content-type': 'application/json' } }));
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, impl);
  const result = await provider.designVoice({ description: 'Teenage boy, energetic and joking, slightly high voice', text: 'Hola '.repeat(25), language: 'es' });
  assert.equal(result.previews.length, 2);
  assert.equal(result.previews[0].audio, 'data:audio/mpeg;base64,AAA=');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model_id, 'eleven_ttv_v3');
  assert.equal(body.language, 'es');
  const saved = await provider.saveDesignedVoice({ name: 'Subaru (diseñada)', description: 'Teenage boy, energetic', generatedVoiceId: 'gen_2' });
  assert.deepEqual(saved, { id: 'DesignedVoice0001', name: 'Subaru (diseñada)' });
  assert.match(calls[1].url, /\/v1\/text-to-voice$/);
  assert.equal(JSON.parse(calls[1].options.body).generated_voice_id, 'gen_2');
  await assert.rejects(provider.designVoice({ description: 'short', text: 'x'.repeat(120) }), /more detail/);
  await assert.rejects(provider.designVoice({ description: 'a long enough description', text: 'short' }), /100 characters/);
});

test('uses Eleven v3 by default and falls back to multilingual v2', async () => {
  const bodies = [];
  const provider = createVoiceProvider({ ELEVENLABS_API_KEY: 'k' }, async (url, options) => {
    const body = JSON.parse(options.body);
    bodies.push(body);
    if (body.model_id === 'eleven_v3') return new Response(JSON.stringify({ detail: { message: 'Model eleven_v3 is not available for this voice.' } }), { status: 400 });
    return new Response(new Uint8Array([9]), { headers: { 'content-type': 'audio/mpeg' } });
  });
  const audio = await provider.speak({ voiceId: '21m00Tcm4TlvDq8ikWAM', text: '**Susurra.** Ven aquí.' });
  assert.deepEqual([...audio], [9]);
  assert.equal(bodies[0].model_id, 'eleven_v3');
  assert.equal(bodies[0].text, '[whispers] Ven aquí.');
  assert.equal(bodies[0].voice_settings.stability, 0.5);
  assert.equal(bodies[1].model_id, 'eleven_multilingual_v2');
  assert.equal(bodies[1].text, 'Ven aquí.');
});
