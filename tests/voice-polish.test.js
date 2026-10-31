import test from 'node:test';
import assert from 'node:assert/strict';
import { findOverusedPhrases, buildVoiceAnchor, polishReply } from '../voice-polish.js';

test('finds phrases the character keeps reusing', () => {
  const replies = [
    '**Levi clicks his tongue in annoyance.** Tch. Clean your boots, brat.',
    '**Levi clicks his tongue in annoyance.** You call that a salute?',
    '**He sips his tea.** Tch. Clean your boots before you come in here.',
    '**Stares.** Fine.'
  ];
  const phrases = findOverusedPhrases(replies, { characterName: 'Levi' });
  assert.ok(phrases.some(phrase => /clicks his tongue in annoyance/.test(phrase)), JSON.stringify(phrases));
  assert.ok(phrases.some(phrase => /clean your boots/.test(phrase)), JSON.stringify(phrases));
  assert.deepEqual(findOverusedPhrases(['only one reply here at all']), []);
});

test('voice anchor names the voice, samples and worn-out phrases', () => {
  const anchor = buildVoiceAnchor({
    characterName: 'Levi',
    card: { voice: 'Blunt, crude, few words.', never: 'Gush.', quotes: ['Give up on your dreams and die.'], samples: { es: ['Tch. Llegas tarde.'], en: [] } },
    overused: ['clicks his tongue in annoyance'],
    language: 'es'
  });
  assert.match(anchor, /Stay in character as Levi/);
  assert.match(anchor, /Blunt, crude/);
  assert.match(anchor, /Give up on your dreams/);
  assert.match(anchor, /Llegas tarde/);
  assert.match(anchor, /clicks his tongue in annoyance/);
  assert.match(anchor, /barely above a whisper/);
  const plain = buildVoiceAnchor({ characterName: 'Mia', profile: 'Shy café owner who stutters.', examples: [{ character: 'H-hi!' }] });
  assert.match(plain, /Shy café owner/);
  assert.match(plain, /H-hi!/);
});

test('polish removes sentences copied from earlier replies and loops', () => {
  const earlier = ['**He sips his tea.** You are late again, recruit. Sit down.'];
  assert.equal(
    polishReply('**He sips his tea.** You are late again, recruit. Where were you this time?', earlier),
    '**He sips his tea.** Where were you this time?'
  );
  assert.equal(polishReply('No no no no no no. Stop that right now please.'), 'No no no. Stop that right now please.');
  assert.equal(polishReply('I will not go back there. I will not go back there. Never.'), 'I will not go back there. Never.');
  const keep = 'You are late again, recruit.';
  assert.equal(polishReply(keep, ['You are late again, recruit.']), keep, 'never empties a reply');
  assert.equal(polishReply('Fine.\n\n**Turns away.** Whatever.'), 'Fine.\n\n**Turns away.** Whatever.');
});

test('Chinese characters that slip into a Spanish reply are removed', async () => {
  const { stripForeignScript, hasForeignScript, buildVoiceAnchor } = await import('../voice-polish.js');
  const reply = '**Levi frunce el ceño.** Tch. 你在干什么 ¿Llegas tarde otra vez? Limpia eso（清洁）.';
  const cleaned = stripForeignScript(reply, 'hola capitán');
  assert.equal(cleaned, '**Levi frunce el ceño.** Tch. ¿Llegas tarde otra vez? Limpia eso.');
  assert.equal(hasForeignScript(reply, 'hola'), true);
  // Users who write in Japanese keep their script.
  assert.equal(stripForeignScript('こんにちは、元気？', 'こんにちは'), 'こんにちは、元気？');
  assert.equal(stripForeignScript('Sin cambios.', 'hola'), 'Sin cambios.');
  assert.match(buildVoiceAnchor({ characterName: 'Levi', language: 'es' }), /write only in Spanish/);
});

test('canon cards lose stray Chinese characters', async () => {
  const { sanitizeCanonProfile } = await import('../canon-profile.js');
  assert.equal(sanitizeCanonProfile('VOICE: blunt 冷静 and cold.'), 'VOICE: blunt and cold.');
});

test('replies that went off the rails are recognised as gibberish', async () => {
  const { looksLikeGibberish } = await import('../voice-polish.js');
  const broken = 'Knuckles white, temple pulsing ber aristine caselence. ochrom advicedock Veryconnection నక్ nakhee clinინ Tz dated Monthlyiska Sax∂азанеме tod depended مشکل Ini behavedUtilities moshi व snake';
  assert.equal(looksLikeGibberish(broken, 'hola, ¿cómo estás?'), true);
  assert.equal(looksLikeGibberish('Everything fine <|place_holder_mm_span_0094|> ok', 'hi'), true);
  assert.equal(looksLikeGibberish('**Levi frunce el ceño.** Tch. ¿Llegas tarde otra vez?', 'hola'), false);
  // A character who says one word in Japanese, or a user who writes in Russian, is fine.
  assert.equal(looksLikeGibberish('**Gojo sonríe.** Arigatou… 先生.', 'hola'), false);
  assert.equal(looksLikeGibberish('Привет, как дела?', 'Привет'), false);
});
