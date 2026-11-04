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
  assert.match(prompt, /never describe their own body or features like a narrator/);
  assert.match(prompt, /met for the first time, not "heard of"/);
});
