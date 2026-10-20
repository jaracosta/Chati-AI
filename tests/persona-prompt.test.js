import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonaPrompt } from '../persona-prompt.js';
import { recentGestures, replyShape, pickReplyShape, buildVoiceAnchor, appearanceCues, pickAppearanceCue } from '../voice-polish.js';
import { getSamplingSettings } from '../roleplay-guard.js';

test('persona prompt is short, complete and conversation-first', () => {
  const prompt = buildPersonaPrompt({
    character: { name: 'Levi Ackerman', pronouns: 'HE', bio: 'Captain.', personality: 'Blunt, clean freak.', instructions: 'Never smile.', scenario: 'You arrive late.' },
    appearance: 'Short black hair.', powers: 'This character has no special powers profile enabled.',
    examples: 'Levi Ackerman: Tch. Late.', memory: 'CHAT SUMMARY:\nThey met.', contentRules: 'CONTENT RULES\n- Keep it PG-13.',
    levelLabel: 'ADVANCED', levelInstructions: '- Weight big moments.'
  });
  assert.match(prompt, /^You are Levi Ackerman \(HE\)/);
  assert.match(prompt, /Never smile/);
  assert.match(prompt, /You arrive late/);
  assert.match(prompt, /HOW A REPLY WORKS/);
  assert.match(prompt, /Tch\. Late/);
  assert.match(prompt, /CONTENT RULES/);
  assert.doesNotMatch(prompt, /no special powers/i, 'empty sections are left out');
  assert.ok(prompt.split(/\s+/).length < 900, 'stays short: ' + prompt.split(/\s+/).length);
  assert.match(buildPersonaPrompt({ character: { name: 'Mia' }, groupContinuation: true }), /GROUP TURN CONTROL/);
});

test('director tracks gestures and varies the reply shape', () => {
  const replies = ['**Levi crosses his arms.** Late again.', '**He sips his tea, eyes narrowed.** Sit.', 'Tch. Whatever.'];
  assert.deepEqual(recentGestures(replies), ['levi crosses his arms', 'he sips his tea eyes narrowed']);
  assert.deepEqual(replies.map(replyShape), ['action-first', 'action-first', 'speech']);
  for (let index = 0; index < 20; index += 1) {
    assert.doesNotMatch(pickReplyShape(['Hi.', 'Hello there.'], Math.random), /Mostly speech/, 'no third speech-only reply in a row');
  }
  const anchor = buildVoiceAnchor({ characterName: 'Levi', gestures: ['crosses his arms'], shape: 'Just speak this time.', userAsked: true });
  assert.match(anchor, /Gestures already used.*crosses his arms/);
  assert.match(anchor, /answer it first/);
  assert.match(anchor, /This reply: Just speak/);
});

test('sampling keeps penalties light so ordinary words are not punished', () => {
  const sampling = getSamplingSettings({});
  assert.ok(sampling.frequency_penalty <= 0.15);
  assert.equal(sampling.min_p, 0.1);
  assert.equal(getSamplingSettings({ CHAT_TEMPERATURE: '0.8' }).temperature, 0.8);
});

test('every reply is asked to show the character physically, with a fresh look detail', () => {
  const cues = appearanceCues({ physical: 'Short black hair, grey eyes', outfit: 'Survey Corps jacket, white cravat', accessories: 'Not specified.', condition: 'mud on his boots' });
  assert.deepEqual(cues, ['mud on his boots', 'Survey Corps jacket', 'white cravat', 'Short black hair', 'grey eyes']);
  assert.notEqual(pickAppearanceCue(cues, ['**He fixes his white cravat.**', 'Tch.'], () => 0.5), 'white cravat', 'skips what was just shown');
  assert.equal(pickAppearanceCue([], []), '');
  const anchor = buildVoiceAnchor({ characterName: 'Levi', appearanceCue: 'white cravat' });
  assert.match(anchor, /Show Levi physically: a facial expression or body language.*white cravat/);
  assert.match(buildVoiceAnchor({ characterName: 'Mia' }), /Show Mia physically/);
  assert.match(buildPersonaPrompt({ character: { name: 'Levi' } }), /Show Levi physically in every reply/);
});
