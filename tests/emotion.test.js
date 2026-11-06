import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wornBeats, dropWornBeats, detectMoment, buildVoiceAnchor, appearanceCues } from '../voice-polish.js';
import { buildPersonaPrompt } from '../persona-prompt.js';

// Real replies from a long Astrid chat that felt flat and repetitive.
const astrid = JSON.parse(fs.readFileSync(new URL('./fixtures/astrid-replies.json', import.meta.url), 'utf8'));

test('beats a character keeps repeating are found and taken out of its history', () => {
  const worn = wornBeats(astrid, { characterName: 'Astrid' });
  assert.ok(worn.some(beat => /grip my battle axe/.test(beat)), JSON.stringify(worn));
  assert.ok(worn.some(beat => /my voice a fierce growl/.test(beat)), JSON.stringify(worn));
  // The history the model sees no longer teaches it the loop.
  const funeral = dropWornBeats(astrid[13], worn, { minKeep: 0 });
  assert.doesNotMatch(funeral, /battle axe|fierce growl|watch in horror/);
  assert.match(funeral, /he can't be gone/);
  // A new reply keeps its meaning: never cut below 40%.
  assert.equal(dropWornBeats('I grip my battle axe, my voice a fierce growl.', worn), 'I grip my battle axe, my voice a fierce growl.');
  assert.equal(dropWornBeats('Hola.', []), 'Hola.');
});

test('big moments are recognised and get a full emotional reaction', () => {
  assert.equal(detectMoment('Valka shakes her head... Stoick has died.')?.kind, 'death');
  assert.equal(detectMoment('Hiccup kisses you—and it’s a proper kiss, too.')?.kind, 'kiss');
  assert.equal(detectMoment('Te amo, Levi.')?.kind, 'love');
  assert.equal(detectMoment('Está sangrando mucho, está herido')?.kind, 'hurt');
  assert.equal(detectMoment('Gobber: your wedding, have you decided?')?.kind, 'proposal');
  assert.equal(detectMoment('You had four sheep in your basket.'), null);
  const anchor = buildVoiceAnchor({ characterName: 'Astrid', moment: detectMoment('Stoick has died.'), shape: 'Mostly speech — 1 to 3 spoken sentences' });
  assert.match(anchor, /BIG MOMENT — Someone Astrid cares about may have just died/);
  assert.doesNotMatch(anchor, /1 to 3 spoken sentences/, 'a big moment overrides the short shape');
  assert.match(anchor, /Don't retell what the user just described/);
  assert.match(anchor, /only hold a weapon or prop when the scene calls for it/);
  assert.match(anchor, /Don't narrate their own body/);
});

test('looks are shown through clothes and gear, never by narrating the body', () => {
  const cues = appearanceCues({
    physical: '[Figure("athletic hourglass")] [Measurements("34C-26-36")] [Hair("long blonde braid")] [Eyes("ocean-blue eyes")] Large chest, athletic thighs, toned arms',
    outfit: 'spiked leather skirt, fur-trimmed boots',
    accessories: 'double-bladed battle axe, leather arm wraps'
  });
  assert.deepEqual(cues, ['spiked leather skirt', 'fur-trimmed boots', 'double-bladed battle axe', 'leather arm wraps', 'long blonde braid']);
});

test('the base prompt asks for emotion that matches the moment and no retelling', () => {
  const prompt = buildPersonaPrompt({ character: { name: 'Astrid' } });
  assert.match(prompt, /Match the weight of the moment/);
  assert.match(prompt, /Never retell what the user just described/);
  assert.match(prompt, /don't narrate their own body or features out of nowhere/);
  assert.match(prompt, /in an intimate scene their body and how it reacts do belong in the moment, kept non-explicit/);
  assert.match(buildPersonaPrompt({ character: { name: 'Astrid' }, matureContent: true }), /do belong in the moment, described openly/);
  assert.match(prompt, /met for the first time, not "heard of"/);
});

test('in intimate scenes the body belongs in the reply (openly only with 18+ on)', () => {
  const moment = detectMoment('She slowly undresses and pulls him into bed.');
  assert.equal(moment?.kind, 'intimate');
  assert.equal(detectMoment('Se quita la ropa y se acerca a la cama.')?.kind, 'intimate');
  const mature = buildVoiceAnchor({ characterName: 'Yennefer', moment, matureContent: true });
  assert.match(mature, /body, touch and how they react belong in it — describe them openly/);
  assert.doesNotMatch(mature, /Don't narrate their own body/);
  const standard = buildVoiceAnchor({ characterName: 'Yennefer', moment, matureContent: false });
  assert.match(standard, /kept non-explicit/);
  // Outside intimate scenes the "no body narration" line stays.
  assert.match(buildVoiceAnchor({ characterName: 'Astrid', moment: detectMoment('Stoick has died.') }), /Don't narrate their own body or features out of nowhere/);
  assert.match(buildVoiceAnchor({ characterName: 'Astrid' }), /Don't narrate their own body or features out of nowhere/);
});

test('voice calls: spoken lines only, short, with the feeling in the voice', async () => {
  const { buildCallRules } = await import('../roleplay-guard.js');
  const rules = buildCallRules('Draven');
  assert.match(rules, /VOICE CALL \(overrides the reply length and format rules above\)/);
  assert.match(rules, /Write ONLY what Draven says out loud/);
  assert.match(rules, /usually 1 to 3 sentences/);
  assert.match(rules, /\*\*laughs\*\*, \*\*sighs\*\*/);
  const anchor = buildVoiceAnchor({ characterName: 'Draven', voiceCall: true, shape: 'Open with a short action, then what they say; 2-3 short paragraphs.', moment: detectMoment('Stoick has died') });
  assert.match(anchor, /VOICE CALL: write only what Draven says out loud/);
  assert.doesNotMatch(anchor, /2-3 short paragraphs|up to 5 short paragraphs/, 'no paragraph shapes on a call');
  assert.match(anchor, /BIG MOMENT — Someone Draven cares about/);
});

test('a reply stuck in a loop is cut where the loop starts, on a finished sentence', async () => {
  const { cutLoop } = await import('../voice-polish.js');
  const loop = fs.readFileSync(new URL('./fixtures/loop-reply.txt', import.meta.url), 'utf8');
  const cut = cutLoop(loop);
  assert.ok(cut.split(/\s+/).length <= 235, String(cut.split(/\s+/).length));
  assert.match(cut, /[.!?…]$/);
  assert.doesNotMatch(cut, /I need us/);
  // Short lines repeated over and over.
  assert.equal(cutLoop('Please. I need that. I need you. Please. I need that. I need you. Please. I need that.'), 'Please. I need that. I need you. Please.');
  // A normal reply is untouched.
  const normal = '**Astrid se cruza de brazos.** ¿En serio? Bueno… está bien. Pero la próxima vez me avisas.';
  assert.equal(cutLoop(normal), normal);
  // A call line stays short.
  assert.ok(cutLoop(loop.slice(loop.indexOf('You...')), { maxWords: 90 }).split(/\s+/).length <= 92);
});
