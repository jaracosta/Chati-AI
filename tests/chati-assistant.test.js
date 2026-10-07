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
      exampleMessages: [{ user: 'Hola', character: '**Sonríe.** Yo~' }, { user: '', character: 'x' }],
      sources: ['https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo', 'javascript:alert(1)']
    }),
    '```'
  ].join('\n');
  const { text, draft } = extractCharacterDraft(reply);
  assert.equal(text, '¡Listo! Aquí está Gojo, versión anime.');
  assert.equal(draft.name, 'Satoru Gojo');
  assert.equal(draft.pronouns, 'HE');
  assert.equal(draft.appearance.maintainContinuity, true);
  assert.equal(draft.exampleMessages.length, 1, 'incomplete examples are dropped');
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
  assert.doesNotMatch(off, /clinical/);
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
  assert.match(buildChatiInstructions({ rootDir: '/nonexistent' }), /replyLength: how much the character talks/);
});
