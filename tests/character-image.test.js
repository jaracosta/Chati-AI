import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonObject } from '../chat-provider.js';
import {
  buildImagePromptMessages,
  buildSaferRetryMessages,
  parseImagePlan,
  sheetSaysMinor,
  usableReferenceImage
} from '../character-image.js';

test('spots explicit under-18 ages in a character sheet', () => {
  assert.equal(sheetSaysMinor('She is 16 years old and loves cats.'), true);
  assert.equal(sheetSaysMinor('Tiene 15 años y estudia.'), true);
  assert.equal(sheetSaysMinor('Age: 12'), true);
  assert.equal(sheetSaysMinor('A 25-year-old detective.'), false);
  assert.equal(sheetSaysMinor('Trained for 10 years in the mountains.'), false);
  assert.equal(sheetSaysMinor('A 1000 years old vampire.'), false);
});

test('NSFW only with the 18+ switch, never for a minor; age rule always present', () => {
  const adult = { name: 'Draven', description: 'A vampire prince.' };
  const off = buildImagePromptMessages({ character: adult, request: 'a selfie' });
  const on = buildImagePromptMessages({ character: adult, request: 'a selfie', matureContent: true });
  const minor = buildImagePromptMessages({
    character: { name: 'Kid', description: 'She is 14 years old.' },
    request: 'a selfie',
    matureContent: true
  });

  assert.equal(off.mature, false);
  assert.equal(on.mature, true);
  assert.equal(minor.minor, true);
  assert.equal(minor.mature, false);

  for (const plan of [off, on, minor]) {
    assert.match(plan.messages[0].content, /AGE RULE/);
    assert.match(plan.messages[0].content, /ANY doubt/);
  }
  assert.match(on.messages[0].content, /NSFW \(18\+\) on/);
  assert.match(off.messages[0].content, /NSFW is off/);
  assert.match(minor.messages[0].content, /NSFW is off/);
  assert.match(on.messages[1].content, /Draven/);
});

test('parses the plan, including a declined one', () => {
  const good = parseImagePlan('```json\n{"ok":true,"prompt":"anime portrait","caption":"**smiles**","aspect":"16:9"}\n```', extractJsonObject);
  assert.deepEqual(good, { ok: true, prompt: 'anime portrait', caption: '**smiles**', aspect: '16:9' });

  const declined = parseImagePlan('{"ok":false,"caption":"No."}', extractJsonObject);
  assert.equal(declined.ok, false);

  assert.equal(parseImagePlan('no json here', extractJsonObject), null);
  assert.equal(parseImagePlan('{"ok":true,"prompt":""}', extractJsonObject), null);
  assert.equal(parseImagePlan('{"ok":true,"prompt":"x","aspect":"7:1"}', extractJsonObject).aspect, '3:4');
});

test('inline images and https links are used as a reference', () => {
  assert.equal(usableReferenceImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(usableReferenceImage('https://example.com/a.png'), 'https://example.com/a.png');
  assert.equal(usableReferenceImage('http://example.com/a.png'), '');
  assert.equal(usableReferenceImage('blob:https://chati-ai.com/x'), '');
  assert.equal(usableReferenceImage('data:image/svg+xml,<svg/>'), '');
});

test('adult content only when asked for; a blocked prompt gets one safer rewrite', () => {
  const plan = buildImagePromptMessages({ character: { name: 'Lenore' }, request: 'a selfie', matureContent: true });
  assert.match(plan.messages[0].content, /ONLY when the user's request explicitly asks for it/);

  const retry = buildSaferRetryMessages(plan.messages, 'old prompt');
  assert.equal(retry.length, plan.messages.length + 2);
  assert.match(retry.at(-2).content, /old prompt/);
  assert.match(retry.at(-1).content, /fully safe-for-work/);
});

test('captions describe the character sending the picture, not an order', () => {
  const es = buildImagePromptMessages({ character: { name: 'Lenore' }, request: 'x', lang: 'es' });
  assert.match(es.messages[0].content, /te manda una foto/);
  assert.match(es.messages[0].content, /never "\*\*Envía una foto\*\*"/);
});
