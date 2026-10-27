import test from 'node:test';
import assert from 'node:assert/strict';
import '../message-cache.js';

const { createMessageCache } = globalThis.ChatiMessageCache;

// A tiny fake of the cloud_messages table with server-side updated_at.
function fakeTable() {
  let clock = Date.parse('2026-10-27T10:00:00Z');
  const rows = new Map();
  const calls = { full: 0, delta: 0, newest: 0 };
  const stamp = () => new Date((clock += 1000)).toISOString().replace('Z', '123+00:00');
  return {
    calls,
    insert(conversation_id, id, text, sort_index) {
      rows.set(id, { id, local_id: 'l-' + id, conversation_id, text, sort_index, created_at: stamp(), updated_at: stamp(), version: 1, deleted_at: null });
    },
    update(id, changes) {
      const row = rows.get(id);
      rows.set(id, { ...row, ...changes, version: row.version + 1, updated_at: stamp() });
    },
    purge(id) { rows.delete(id); },
    api: {
      fetchConversation: async id => { calls.full += 1; return [...rows.values()].filter(r => r.conversation_id === id).map(r => ({ ...r })); },
      fetchChangedSince: async iso => { calls.delta += 1; return [...rows.values()].filter(r => Date.parse(r.updated_at.replace(/(\.\d{3})\d+/, '$1')) >= Date.parse(iso)).map(r => ({ ...r })); },
      fetchNewestUpdatedAt: async () => { calls.newest += 1; return [...rows.values()].map(r => r.updated_at).sort().at(-1) || null; }
    }
  };
}

test('after the first download, a sync only asks for what changed', async () => {
  const db = fakeTable();
  for (let c = 1; c <= 5; c += 1) for (let m = 1; m <= 20; m += 1) db.insert('c' + c, `c${c}m${m}`, 'hola', m);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });

  for (let c = 1; c <= 5; c += 1) assert.equal((await cache.getMessages('c' + c)).length, 20);
  assert.equal(db.calls.full, 5);

  // A second full sync of all 5 chats: one change query instead of 5 downloads.
  time += 2000;
  db.insert('c3', 'c3m21', 'nuevo', 21);
  db.update('c1m1', { text: 'editado' });
  for (let c = 1; c <= 5; c += 1) await cache.getMessages('c' + c);
  assert.equal(db.calls.full, 5, 'no chat downloaded again');
  assert.equal(db.calls.delta, 1, 'one query for the whole account');
  assert.equal((await cache.getMessages('c3')).at(-1).text, 'nuevo');
  assert.equal((await cache.getMessages('c1'))[0].text, 'editado');
});

test('soft deletes sync and are hidden unless asked for', async () => {
  const db = fakeTable();
  db.insert('c1', 'a', 'uno', 1); db.insert('c1', 'b', 'dos', 2);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  await cache.getMessages('c1');
  time += 2000;
  db.update('b', { deleted_at: '2026-10-27T11:00:00Z' });
  assert.deepEqual((await cache.getMessages('c1')).map(r => r.id), ['a']);
  time += 2000;
  assert.deepEqual((await cache.getMessages('c1', { includeDeleted: true })).map(r => r.id), ['a', 'b']);
});

test('a change made right after a chat was downloaded is never missed', async () => {
  const db = fakeTable();
  db.insert('c1', 'a', 'uno', 1);
  db.insert('c2', 'x', 'otro', 1);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  await cache.getMessages('c1');          // c1 downloaded
  db.insert('c1', 'b', 'tarde', 2);       // another device writes to c1
  db.update('x', { text: 'otro2' });      // and later to c2
  await cache.getMessages('c2');          // c2 downloaded with a newer timestamp
  time += 2000;
  assert.deepEqual((await cache.getMessages('c1')).map(r => r.text), ['uno', 'tarde']);
});

test('changes are fetched at most once per interval; cached rows are copies', async () => {
  const db = fakeTable();
  db.insert('c1', 'a', 'uno', 1);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  await cache.getMessages('c1');
  time += 2000;
  const [first] = await cache.getMessages('c1');
  await cache.getMessages('c1');
  assert.equal(db.calls.delta, 1);
  first.text = 'mutated';
  assert.equal((await cache.getMessages('c1'))[0].text, 'uno');
});

test('purges, the 15-minute refresh and switching accounts', async () => {
  const db = fakeTable();
  db.insert('c1', 'a', 'uno', 1); db.insert('c1', 'b', 'dos', 2);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  await cache.getMessages('c1', { currentUserId: 'u1' });
  cache.forgetMessage('c1', 'l-b');
  assert.deepEqual((await cache.getMessages('c1', { currentUserId: 'u1' })).map(r => r.id), ['a']);
  // Purged on another device: gone after the periodic full refresh.
  db.purge('a');
  time += 16 * 60 * 1000;
  assert.deepEqual((await cache.getMessages('c1', { currentUserId: 'u1' })).map(r => r.id), ['b']);
  const before = db.calls.full;
  await cache.getMessages('c1', { currentUserId: 'u2' });
  assert.equal(db.calls.full, before + 1, 'another account starts from scratch');
});

test('empty chats are not cached, so their first messages are not missed', async () => {
  const db = fakeTable();
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  assert.deepEqual(await cache.getMessages('c1'), []);
  db.insert('c1', 'a', 'hola', 1);
  time += 2000;
  assert.equal((await cache.getMessages('c1')).length, 1);
});

test('a message that arrives right after a sync shows up on the next sync (no "one behind")', async () => {
  const db = fakeTable();
  db.insert('c1', 'a', 'hola', 1);
  let time = 0;
  const cache = createMessageCache({ ...db.api, now: () => time });
  await cache.getMessages('c1');
  // Phone sends a message: realtime -> sync on the computer.
  time += 5000;
  db.insert('c1', 'b', 'mensaje del teléfono', 2);
  cache.markStale();
  assert.equal((await cache.getMessages('c1')).length, 2);
  // Half a second later the character's reply lands: another realtime event.
  time += 500;
  db.insert('c1', 'c', 'respuesta del personaje', 3);
  cache.markStale();
  assert.deepEqual((await cache.getMessages('c1')).map(r => r.id), ['a', 'b', 'c']);
});
