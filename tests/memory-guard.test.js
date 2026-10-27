import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUserDetails, protectFacts, relevantDetails } from '../memory-guard.js';

test('details the user told are never silently dropped', () => {
  const before = ["User's name is Ana", 'User loves strawberry ice cream', "User's favorite color is blue", 'User has a cat called Mochi'];
  // The model rewrote the list and forgot two items, and updated the colour.
  const after = ["User's favorite color is red", "User's name is Ana"];
  const merged = mergeUserDetails(before, after);
  assert.ok(merged.includes('User loves strawberry ice cream'));
  assert.ok(merged.includes('User has a cat called Mochi'));
  assert.ok(merged.includes("User's favorite color is red"));
  assert.ok(!merged.includes("User's favorite color is blue"), 'updated detail replaces the old one');
  assert.equal(merged.filter(item => /name is Ana/.test(item)).length, 1, 'no duplicates');
});

test('a rewrite that loses most facts keeps the old ones', () => {
  const old = ['a1 fact one', 'b2 fact two', 'c3 fact three', 'd4 fact four', 'e5 fact five', 'f6 fact six'];
  assert.deepEqual(protectFacts(old, ['a1 fact one']).length, 6);
  // A normal update (a merge of two facts) is respected.
  const normal = ['a1 fact one', 'b2 fact two', 'c3 fact three', 'd4 + e5 facts', 'f6 fact six'];
  assert.deepEqual(protectFacts(old, normal), normal);
});

test('picks the remembered details that match what the user just wrote', () => {
  const details = ["User's name is Ana", 'User has a cat called Mochi', 'User works as a nurse at night', 'User hates thunderstorms'];
  assert.deepEqual(relevantDetails(details, '¿Te acuerdas de cómo se llama mi gato Mochi?'), ['User has a cat called Mochi']);
  assert.deepEqual(relevantDetails(details, 'hola'), []);
});
