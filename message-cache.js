// Incremental message download for cloud sync.
//
// Every sync used to download every message of every chat, one query per
// chat (~140 reads per message sent). The database stamps updated_at on
// every insert and update (soft deletes included), so after a chat has been
// downloaded once, only rows changed since then are needed — and one query
// for the whole account finds them.
//
// How it stays correct:
// - The change cursor starts at the newest updated_at in the account BEFORE
//   any chat is downloaded, and only moves forward with change results, so a
//   change made after a chat was downloaded is always picked up.
// - Each change query overlaps the previous one by a few seconds (rows are
//   merged by id, newest version wins), so rows committed slightly out of
//   order are not missed.
// - Empty chats are not cached, and every chat is fully re-downloaded every
//   15 minutes, which also clears messages purged on another device.
//
// Plain script for the browser (window.ChatiMessageCache); tests import it.
(function (root) {
  "use strict";

  function toMs(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return value;
    // Postgres sends microseconds; keep milliseconds for every browser.
    const text = String(value).replace(/(\.\d{3})\d+/, "$1");
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? ms : 0;
  }

  function copy(row) {
    try {
      return typeof structuredClone === "function" ? structuredClone(row) : JSON.parse(JSON.stringify(row));
    } catch (_) {
      return Object.assign({}, row);
    }
  }

  function byOrder(a, b) {
    return (Number(a.sort_index) || 0) - (Number(b.sort_index) || 0) ||
      toMs(a.created_at) - toMs(b.created_at);
  }

  function isNewer(incoming, existing) {
    if (!existing) return true;
    const a = Number(incoming.version);
    const b = Number(existing.version);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a > b;
    return toMs(incoming.updated_at) >= toMs(existing.updated_at);
  }

  function createMessageCache({
    fetchConversation,
    fetchChangedSince,
    fetchNewestUpdatedAt,
    now = () => Date.now(),
    deltaIntervalMs = 1500,
    fullRefreshMs = 15 * 60 * 1000,
    overlapMs = 5000
  } = {}) {
    let userId = null;
    let cursor = null; // ms; null until the starting point is known
    let lastDeltaAt = 0;
    let deltaPromise = null;
    const chats = new Map(); // conversationId -> { rows: Map(id -> row), loadedAt }
    const stats = { fullLoads: 0, deltaQueries: 0, deltaRows: 0, cacheHits: 0 };

    function reset(nextUserId = null) {
      userId = nextUserId;
      cursor = null;
      lastDeltaAt = 0;
      deltaPromise = null;
      chats.clear();
    }

    async function ensureCursor() {
      if (cursor != null) return;
      cursor = toMs(await fetchNewestUpdatedAt());
    }

    function merge(row) {
      const entry = chats.get(row.conversation_id);
      if (!entry) return;
      if (isNewer(row, entry.rows.get(row.id))) entry.rows.set(row.id, row);
    }

    async function runDelta() {
      const since = new Date(Math.max(0, cursor - overlapMs)).toISOString();
      const rows = await fetchChangedSince(since);
      stats.deltaQueries += 1;
      stats.deltaRows += rows.length;
      for (const row of rows) {
        merge(row);
        cursor = Math.max(cursor, toMs(row.updated_at));
      }
      lastDeltaAt = now();
    }

    async function refreshChanges() {
      if (now() - lastDeltaAt < deltaIntervalMs) return;
      if (!deltaPromise) {
        deltaPromise = runDelta().finally(() => {
          deltaPromise = null;
        });
      }
      await deltaPromise;
    }

    async function getMessages(conversationId, { includeDeleted = false, since = null, currentUserId = null } = {}) {
      if (currentUserId && currentUserId !== userId) reset(currentUserId);
      await ensureCursor();

      let entry = chats.get(conversationId);
      if (entry && now() - entry.loadedAt > fullRefreshMs) {
        chats.delete(conversationId);
        entry = null;
      }

      if (entry) {
        await refreshChanges();
        entry = chats.get(conversationId) || null;
        if (entry) stats.cacheHits += 1;
      }

      if (!entry) {
        const rows = await fetchConversation(conversationId);
        stats.fullLoads += 1;
        if (rows.length) {
          entry = { rows: new Map(rows.map(row => [row.id, row])), loadedAt: now() };
          chats.set(conversationId, entry);
        } else {
          entry = { rows: new Map(), loadedAt: now() };
        }
      }

      const sinceMs = since == null ? null : toMs(since);
      return [...entry.rows.values()]
        .filter(row => includeDeleted || row.deleted_at == null)
        .filter(row => sinceMs == null || toMs(row.updated_at) > sinceMs)
        .sort(byOrder)
        .map(copy);
    }

    // A row this device just wrote: keep the cache current right away.
    function remember(row) {
      if (row && row.id && row.conversation_id) merge(row);
    }

    // Hard deletes leave no row behind to sync, so drop them here.
    function forgetMessage(conversationId, localId) {
      const entry = chats.get(conversationId);
      if (!entry) return;
      for (const [id, row] of entry.rows) if (row.local_id === localId) entry.rows.delete(id);
    }

    function forgetConversation(conversationId) {
      if (conversationId) chats.delete(conversationId);
      else chats.clear();
    }

    return {
      getMessages,
      remember,
      forgetMessage,
      forgetConversation,
      reset,
      stats: () => Object.assign({ cachedChats: chats.size, cursor }, stats)
    };
  }

  root.ChatiMessageCache = { createMessageCache, toMs };
})(typeof window !== "undefined" ? window : globalThis);
