import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPublicUrl,
  buildChatiInstructions,
  extractCharacterDraft,
  extractUrls,
  fetchPageText,
  htmlToText
} from '../chati-assistant.js';

const publicDns = async () => [{ address: '93.184.216.34' }];
const privateDns = async () => [{ address: '10.0.0.5' }];

test('splits the reply text from the character block and sanitizes it', () => {
  const reply = [
    '¡Listo! Aquí está Gojo, versión anime.',
    '```chati-character',
    JSON.stringify({
      name: 'Satoru Gojo', pronouns: 'he', bio: 'El hechicero más fuerte.',
      appearance: { physical: 'Cabello blanco, ojos azules' },
      personality: 'Arrogante y bromista.',
      exampleMessages: ['**Sonríe.** Yo~', { user: 'Hola', character: 'Relájate.' }, { user: 'x', character: '' }],
      sources: ['https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo', 'javascript:alert(1)']
    }),
    '```'
  ].join('\n');
  const { text, draft } = extractCharacterDraft(reply);
  assert.equal(text, '¡Listo! Aquí está Gojo, versión anime.');
  assert.equal(draft.name, 'Satoru Gojo');
  assert.equal(draft.pronouns, 'HE');
  assert.equal(draft.appearance.maintainContinuity, true);
  assert.deepEqual(draft.exampleMessages, [{ user: '', character: '**Sonríe.** Yo~' }, { user: '', character: 'Relájate.' }], 'only character lines are kept');
  assert.deepEqual(draft.sources, ['https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo']);
});

test('replies without a block, or with broken JSON, have no draft', () => {
  assert.equal(extractCharacterDraft('¿Qué versión quieres?').draft, null);
  assert.equal(extractCharacterDraft('ok\n```chati-character\n{nope\n```').draft, null);
});

test('finds up to two links in a message', () => {
  assert.deepEqual(
    extractUrls('mira https://a.fandom.com/wiki/X, y https://b.com/y. y https://c.com'),
    ['https://a.fandom.com/wiki/X', 'https://b.com/y']
  );
});

test('blocks private, local and non-http links', async () => {
  await assert.rejects(assertPublicUrl('http://localhost:3000/', publicDns));
  await assert.rejects(assertPublicUrl('http://127.0.0.1/', publicDns));
  await assert.rejects(assertPublicUrl('http://169.254.169.254/latest/meta-data', publicDns));
  await assert.rejects(assertPublicUrl('http://[::1]/', publicDns));
  await assert.rejects(assertPublicUrl('file:///etc/passwd', publicDns));
  await assert.rejects(assertPublicUrl('https://evil.example/', privateDns), /Private/);
  assert.ok(await assertPublicUrl('https://naruto.fandom.com/wiki/Naruto', publicDns));
});

test('a public link cannot redirect into the private network', async () => {
  const fetchImpl = async () => new Response('', { status: 302, headers: { location: 'http://10.0.0.1/admin' } });
  await assert.rejects(fetchPageText('https://example.com/', { fetchImpl, resolve: publicDns }), /Private/);
});

test('reads page text, keeping wiki infoboxes and dropping scripts', async () => {
  const html = '<html><head><title>Gojo | Wiki</title><script>x()</script></head><body><aside>Age: 28</aside><p>Strongest &amp; cocky.</p></body></html>';
  const fetchImpl = async () => new Response(html, { headers: { 'content-type': 'text/html' } });
  const page = await fetchPageText('https://example.com/gojo', { fetchImpl, resolve: publicDns });
  assert.equal(page.title, 'Gojo | Wiki');
  assert.match(page.text, /Age: 28/);
  assert.match(page.text, /Strongest & cocky\./);
  assert.doesNotMatch(page.text, /x\(\)/);
  assert.equal(htmlToText('<style>a{}</style>Hi'), 'Hi');
});

test('instructions include the app guide and the safety rules', () => {
  const prompt = buildChatiInstructions({ rootDir: '/nonexistent' });
  assert.match(prompt, /CHATI-AI APP GUIDE/);
  assert.match(prompt, /under 18/);
  assert.match(prompt, /policies .* not published yet/i);
});

test('visual analysis always checks age first; mature detail only with 18+ mode', () => {
  const off = buildChatiInstructions({ rootDir: '/nonexistent' });
  const on = buildChatiInstructions({ rootDir: '/nonexistent', matureContent: true });

  for (const text of [off, on]) {
    assert.match(text, /VISUAL ANALYSIS/);
    assert.match(text, /AGE CHECK FIRST/);
    assert.match(text, /ANY doubt about them being an adult/);
    assert.match(text, /under 18/);
  }

  assert.match(off, /18\+ mode is off/);
  assert.doesNotMatch(off, /describe the body frankly/);
  assert.match(on, /describe the body frankly/);
  assert.match(on, /clearly adults/);
  assert.match(on, /clinical/);
});

test('the app guide covers pictures, NSFW (18+) and Explore', () => {
  const text = buildChatiInstructions({ rootDir: '/nonexistent' });
  assert.match(text, /Character pictures/);
  assert.match(text, /Crea una imagen/);
  assert.match(text, /NSFW \(18\+\)\n- A switch in Settings/);
  assert.match(text, /never allowed, in any mode/);
  assert.match(text, /Featured/);
  assert.match(text, /Surprise me/);
});

test('character drafts carry a reply length', () => {
  const block = (extra) => 'ok\n```chati-character\n' + JSON.stringify({ name: 'Sukuna', ...extra }) + '\n```';
  assert.equal(extractCharacterDraft(block({ replyLength: 'short' })).draft.replyLength, 'short');
  assert.equal(extractCharacterDraft(block({ replyLength: 'giant' })).draft.replyLength, 'auto');
  assert.match(buildChatiInstructions({ rootDir: '/nonexistent' }), /replyLength: "short" for terse/);
});

import { sanitizeCharacterDraft, buildChatiInstructions as buildInstructionsV2, isMinorAge } from '../chati-assistant.js';

test('drafts carry research fields; only fandom wiki links are kept', () => {
  const draft = sanitizeCharacterDraft({ name: 'Daki', series: 'Demon Slayer', age: 'adult', wiki: 'https://kimetsu-no-yaiba.fandom.com/wiki/Daki', backgroundQuery: 'Entertainment District', appearance: { physical: 'Height 167 cm, approx. 88-58-90 cm. Long black hair.' } });
  assert.equal(draft.series, 'Demon Slayer');
  assert.equal(draft.wiki, 'https://kimetsu-no-yaiba.fandom.com/wiki/Daki');
  assert.equal(draft.backgroundQuery, 'Entertainment District');
  assert.match(draft.appearance.physical, /88-58-90/, 'adults keep their measurements');
  assert.equal(sanitizeCharacterDraft({ name: 'X', wiki: 'https://evil.example/wiki/X' }).wiki, '');
});

test('minors never keep figure or measurement descriptions', () => {
  assert.equal(isMinorAge(16), true);
  assert.equal(isMinorAge('16 years'), true);
  assert.equal(isMinorAge('adult'), false);
  const draft = sanitizeCharacterDraft({ name: 'Yuka', age: 16, appearance: {
    physical: 'Yuka is 1.68 m with an athletic build. She has a highly curvaceous hourglass figure. Measurements 88-58-90. Black hair to her shoulders.',
    defaultOutfit: 'A mint-green tunic vest. It shows off her cleavage.'
  } });
  assert.equal(draft.appearance.physical, 'Yuka is 1.68 m with an athletic build. Black hair to her shoulders.');
  assert.equal(draft.appearance.defaultOutfit, 'A mint-green tunic vest.');
});

test('the creator prompt asks for deep, specific, canon detail', () => {
  const prompt = buildInstructionsV2({});
  assert.match(prompt, /UNDER 18, looks young, or age unknown: NO figure, NO measurements, NO cup size/);
  assert.match(prompt, /\[PERSONALITY\]/);
  assert.match(prompt, /\[BACKSTORY\]/);
  assert.match(prompt, /\[Severe Anger\]/);
  assert.match(prompt, /\[Variable\("Data"\)\]/);
  assert.match(prompt, /in ENGLISH unless the user asks/);
  assert.match(prompt, /"wiki"/);
});

test('tagline goes on the card; bot bio and aliases open the personality', () => {
  const draft = sanitizeCharacterDraft({ name: 'Daki', aliases: 'Ume, Warabihime', tagline: 'Upper Rank Six, queen of the Entertainment District.', botBio: 'A vain, cruel demon oiran.', personality: '[PERSONALITY]\nVain.\n\n[BACKSTORY]\nBorn Ume.', exampleMessages: ['[Severe Anger] *Her obi snap taut.* You ugly little worm!'] });
  assert.equal(draft.bio, 'Upper Rank Six, queen of the Entertainment District.');
  assert.match(draft.personality, /^\[BIO\]\nA vain, cruel demon oiran\.\nAlso known as: Ume, Warabihime\n\n\[PERSONALITY\]/);
  assert.match(draft.exampleMessages[0].character, /^\[Severe Anger\]/);
});

test('minors lose cup sizes and figure attributes too', () => {
  const draft = sanitizeCharacterDraft({ name: 'Kid', age: 15, appearance: { physical: '[Height("160 cm")]. [Figure("hourglass")]. [Measurements("32C, waist 24 in")]. Short brown hair.' } });
  assert.equal(draft.appearance.physical, '[Height("160 cm")]. Short brown hair.');
});

test('minor scrub works on one-attribute-per-line sheets', () => {
  const draft = sanitizeCharacterDraft({ name: 'Kid', age: 16, appearance: { physical: '[Height("168 cm")]\n[Figure("highly curvaceous hourglass")]\n[Measurements("34D-24-36")]\n[Hair("black, shoulder length")] [Bust("large")]\nShe moves like a trained fighter.' } });
  assert.equal(draft.appearance.physical, '[Height("168 cm")]\n[Hair("black, shoulder length")]\nShe moves like a trained fighter.');
});
