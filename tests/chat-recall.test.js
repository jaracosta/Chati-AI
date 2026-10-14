import test from 'node:test';
import assert from 'node:assert/strict';
import '../chat-recall.js';
import { buildEarlierChatSection } from '../roleplay-guard.js';

const { opening, recall } = globalThis.ChatiRecall;

const chat = [
  { sender: 'character', text: '*Te mira.* ¿Quién eres?' },
  { sender: 'user', text: 'Me llamo Jared y vengo de Monterrey, me encantan los tacos de pastor.' },
  { sender: 'character', text: 'Jared, ¿eh? Raro nombre.' },
  ...Array.from({ length: 60 }, (_, index) => ({ sender: index % 2 ? 'character' : 'user', text: `Seguimos caminando por el bosque, paso ${index}.` })),
  { sender: 'user', text: 'Mi perro se llama Bruno, es un pastor alemán enorme.' },
  ...Array.from({ length: 50 }, (_, index) => ({ sender: index % 2 ? 'character' : 'user', text: `Peleamos contra la bestia, turno ${index}.` })),
  { sender: 'user', text: '¿Te acuerdas de cómo se llama mi perro alemán?' }
];

test('opening is sent only when the start is outside the recent window', () => {
  assert.deepEqual(opening(chat.slice(0, 10), 50), []);
  const first = opening(chat, 50);
  assert.equal(first.length, 6);
  assert.match(first[1].text, /Jared/);
  assert.equal(first[1].sender, 'user');
});

test('recall finds the older line the user is asking about', () => {
  const found = recall(chat, 50, chat.at(-1).text);
  assert.ok(found.some(line => /Bruno/.test(line.text)), JSON.stringify(found));
  assert.ok(found.length <= 4);
  assert.deepEqual(recall(chat, 50, 'hola'), []);
  assert.deepEqual(recall(chat.slice(0, 20), 50, 'perro'), []);
});

test('earlier chat becomes a prompt section', () => {
  const section = buildEarlierChatSection({ characterName: 'Levi', earlierChat: { opening: opening(chat, 50), recall: [{ sender: 'user', text: 'Mi perro se llama Bruno' }] } });
  assert.match(section, /How this chat began/);
  assert.match(section, /User: Me llamo Jared/);
  assert.match(section, /Levi: \*Te mira\.\*/);
  assert.match(section, /Bruno/);
  assert.equal(buildEarlierChatSection({ characterName: 'Levi', earlierChat: {} }), '');
  assert.equal(buildEarlierChatSection({ characterName: 'Levi' }), '');
});

import { buildCharacterLock } from '../roleplay-guard.js';
import { parseCanonCard } from '../canon-profile.js';

test('character lock uses real quotes and the creator lines, and forbids assistant tone', () => {
  const card = parseCanonCard(`SOURCE: Attack on Titan
VOICE: Blunt, crude, few words.
ATTITUDE: Cold to strangers.
SIGNATURE: "Tch."
REAL QUOTES:
- Give up on your dreams and die.
- The only thing we're allowed to do is believe that we won't regret the choice we made.
NEVER: Gush, ramble.
KNOWS: Survey Corps.
SAMPLE LINES (EN):
- Tch. You're late.
SAMPLE LINES (ES):
- Tch. Llegas tarde.`);
  assert.equal(card.quotes.length, 2);
  const lock = buildCharacterLock({ characterName: 'Levi', card, language: 'es', examples: [{ user: '', character: '**Bebe su té.** Limpia eso.' }] });
  assert.match(lock, /Give up on your dreams and die/);
  assert.match(lock, /Llegas tarde/);
  assert.match(lock, /Limpia eso/);
  assert.match(lock, /NOT AS A HELPER/);
  const plain = buildCharacterLock({ characterName: 'Mia', examples: ['**Ríe.** ¡Te gané!'] });
  assert.match(plain, /Te gané/);
});

import { buildCanonProfileMessages, isOriginalCharacterCard } from '../canon-profile.js';

test('original characters get a card written from the creator profile', () => {
  const [system, user] = buildCanonProfileMessages({
    name: 'Ryukawa Fujimori', personality: 'Playful, teasing, never sappy.',
    instructions: 'Always tease. Never confess feelings first.',
    exampleMessages: [{ user: '', character: '**Pouts.** Booooring!' }]
  });
  assert.match(system.content, /ORIGINAL CHARACTER/);
  assert.match(user.content, /Never confess feelings first/);
  assert.match(user.content, /Booooring/);
  assert.equal(isOriginalCharacterCard('SOURCE: Original character (creator\'s profile)\nVOICE: x'), true);
  assert.equal(isOriginalCharacterCard('SOURCE: Attack on Titan\nVOICE: x'), false);
  const lock = buildCharacterLock({ characterName: 'Ryukawa', profile: 'Playful, teasing, never sappy.' });
  assert.match(lock, /from the creator — follow it exactly\): Playful, teasing/);
});
