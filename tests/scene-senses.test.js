import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSensesRules, buildSightMessages, frameSensoryInput, modelSeesImages } from '../scene-senses.js';

test('knows which roleplay models can look at images', () => {
  assert.equal(modelSeesImages('sao10k/l3.3-euryale-70b'), false);
  assert.equal(modelSeesImages('cognitivecomputations/dolphin-mistral-24b-venice-edition'), false);
  assert.equal(modelSeesImages('openai/gpt-4o'), true);
  assert.equal(modelSeesImages('qwen/qwen2.5-vl-72b-instruct'), true);
  assert.equal(modelSeesImages('google/gemini-2.5-flash'), true);
  assert.equal(modelSeesImages('sao10k/l3.3-euryale-70b', { CHAT_MODEL_VISION: 'true' }), true);
  assert.equal(modelSeesImages('openai/gpt-4o', { CHAT_MODEL_VISION: 'false' }), false);
});

test('the vision prompt describes the scene from the character\'s eyes', () => {
  const messages = buildSightMessages({ images: ['data:image/png;base64,AA', 'data:image/png;base64,BB'], note: 'Es Rem', isVideo: true, characterName: 'Subaru' });
  assert.match(messages[0].content, /You are the eyes of Subaru/);
  assert.match(messages[0].content, /Never say photo, picture, image, frame, video/);
  assert.match(messages[0].content, /one continuous event/);
  assert.equal(messages[1].content.filter(part => part.type === 'image_url').length, 2);
  assert.match(messages[1].content[0].text, /Es Rem/);
});

test('media is framed as something perceived live in the scene', () => {
  const audio = frameSensoryInput({ type: 'audio', characterName: 'Light', sound: 'A woman screams "Light!" from the street.' });
  assert.match(audio, /A SOUND IN THE SCENE — Light hears this live/);
  assert.match(audio, /not a recording/);
  assert.doesNotMatch(audio, /audio|attachment|upload/i);
  const video = frameSensoryInput({ type: 'video', characterName: 'Light', sight: 'A black notebook falls.', sound: 'Wind.', note: 'Ryuk' });
  assert.match(video, /WHAT LIGHT SEES HAPPENING RIGHT NOW/);
  assert.match(video, /WHAT Light HEARS AT THE SAME TIME/);
  assert.match(video, /Scene note: Ryuk/);
  assert.match(frameSensoryInput({ type: 'image', characterName: 'Gojo', sight: '' }), /Something appears in front of Gojo/);
});

test('senses rules forbid talking about files and recordings', () => {
  const rules = buildSensesRules({ characterName: 'Light', type: 'audio' });
  assert.match(rules, /Light hears with their own ears/);
  assert.match(rules, /NEVER mention or imply audio, recordings, voice notes, videos/);
  assert.match(rules, /user's character speaking to Light in person/);
  assert.match(buildSensesRules({ characterName: 'Light', type: 'video' }), /sees and hears/);
});
