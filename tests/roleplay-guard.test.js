import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoreRoleplayRules,
  cleanRoleplayReply,
  createReplyGuard,
  fitInputToContext,
  getModelContextTokens
} from '../roleplay-guard.js';

// Feed text the way a model streams it: in small uneven pieces.
function stream(text, characterName, size = 3) {
  const guard = createReplyGuard({ characterName });
  let out = '';
  for (let i = 0; i < text.length; i += size) {
    out += guard.push(text.slice(i, i + size));
    if (guard.done()) break;
  }
  return { text: out + guard.flush(), stopped: guard.done() };
}

test('stops when the model starts writing the user turn', () => {
  const reply = '**Luna sonríe.** Hola, viajero.\nUser: Hola Luna, ¿qué haces?\nLuna: Nada.';
  const result = stream(reply, 'Luna');
  assert.equal(result.text, '**Luna sonríe.** Hola, viajero.\n');
  assert.equal(result.stopped, true);
});

test('catches Spanish, template and bracket user headers', () => {
  for (const header of ['Usuario: hola', 'You: hi', '{{user}}: hi', '### Instruction:', '[User] hi', '<|user|>', '**User:** hi']) {
    const result = stream('Line one.\n' + header + '\nmore', 'Kai');
    assert.equal(result.text, 'Line one.\n', header);
  }
});

test('removes the character name label at the start of lines', () => {
  assert.equal(stream('Luna: **Se ríe.** ¡Claro!', 'Luna').text, '**Se ríe.** ¡Claro!');
  assert.equal(stream('**Luna:** Hola', 'Luna').text, 'Hola');
});

test('leaves normal replies untouched, including colons in prose', () => {
  const reply = '**Kai mira el mapa.** Nota: el puerto cierra a las diez.\n\nUser interface? No sé de qué hablas.';
  assert.equal(stream(reply, 'Kai', 1).text, reply);
  assert.equal(stream(reply, 'Kai', 7).text, reply);
});

test('cleans complete (non-streamed) replies too', () => {
  assert.equal(cleanRoleplayReply('Aria: Hola.\nYou: adiós', 'Aria'), 'Hola.');
});

test('core rules name the character and require double asterisks', () => {
  const rules = buildCoreRoleplayRules('Luna');
  assert.match(rules, /You are ONLY Luna/);
  assert.match(rules, /\*\*Luna crosses/);
});

test('small models get their real context window', () => {
  assert.equal(getModelContextTokens('gryphe/mythomax-l2-13b'), 4096);
  assert.equal(getModelContextTokens('gpt-5.6-terra'), 128000);
  assert.equal(getModelContextTokens('gryphe/mythomax-l2-13b', { OPENROUTER_CONTEXT_TOKENS: '8192' }), 8192);
});

test('history is trimmed from the oldest side to fit, starting on a user turn', () => {
  const input = Array.from({ length: 40 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: 'mensaje ' + i + ' ' + 'x'.repeat(400)
  }));
  const kept = fitInputToContext(input, { instructions: 'y'.repeat(3500), contextTokens: 4096, maxOutputTokens: 500 });
  assert.ok(kept.length < input.length && kept.length >= 2);
  assert.equal(kept.at(-1), input.at(-1));
  assert.equal(kept[0].role, 'user');
});
