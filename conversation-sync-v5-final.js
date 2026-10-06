// ============================================================
// CHATI-AI V5.0.10 — CROSS-DEVICE SYNC COORDINATOR
// V5.0.6 Realtime | V5.0.7 Cross-tab | V5.0.8 Recovery
// V5.0.9 Diagnostics | V5.0.10 Stable coordinator | V5.0.11 Realtime self-heal
// Private Chat / Private Group remain local-only.
// ============================================================

(() => {
  "use strict";

  const VERSION = "5.0.11";
  // Realtime delivers changes instantly; this is only a safety net.
  const FALLBACK_MS = 15000;
  const REALTIME_DELAY = 120;
  const LOCAL_DELAY = 180;
  const MAX_BACKOFF = 30000;

  let started = false;
  let busy = false;
  let queued = false;
  let queuedReason = "";
  let delayTimer = null;
  let fallbackTimer = null;
  let realtimeChannel = null;
  let broadcast = null;
  let realtimeStatus = "idle";
  let lastUserId = null;
  let lastRun = null;
  let lastError = null;
  let retryMs = 1000;
  let generation = 0;
  let realtimeReconnectTimer = null;

  function syncApi() {
    const api = window.ChatiConversationSync;
    if (!api || typeof api.syncAutomaticNewChats !== "function") {
      throw new Error("ChatiConversationSync is unavailable.");
    }
    return api;
  }

  function authApi() {
    const api = window.ChatiAuth;
    if (!api || typeof api.getClient !== "function") {
      throw new Error("ChatiAuth is unavailable.");
    }
    return api;
  }

  async function session() {
    const result = await authApi().getSession();
    if (result && result.error) throw result.error;
    return result && result.data ? result.data.session : null;
  }

  function compact(result) {
    result = result || {};
    return {
      ok: result.ok !== false,
      reason: result.reason || null,
      uploadedChats: Number(result.uploadedChats || 0),
      restoredChats: Number(result.restoredChats || 0),
      uploadedMessages: Number(result.uploadedMessages || 0),
      downloadedMessages: Number(result.downloadedMessages || 0),
      uploadedConversationUpdates: Number(result.uploadedConversationUpdates || 0),
      downloadedConversationUpdates: Number(result.downloadedConversationUpdates || 0),
      uploadedMessageUpdates: Number(result.uploadedMessageUpdates || 0),
      downloadedMessageUpdates: Number(result.downloadedMessageUpdates || 0),
      uploadedConversationDeletes: Number(result.uploadedConversationDeletes || 0),
      downloadedConversationDeletes: Number(result.downloadedConversationDeletes || 0),
      uploadedMessageDeletes: Number(result.uploadedMessageDeletes || 0),
      downloadedMessageDeletes: Number(result.downloadedMessageDeletes || 0),
      updateConflicts: Number(result.updateConflicts || 0),
      deleteConflicts: Number(result.deleteConflicts || 0)
    };
  }

  function wakeOtherTabs(reason) {
    try {
      if (broadcast) {
        broadcast.postMessage({
          type: "sync-wake",
          reason: reason,
          at: Date.now()
        });
      }
    } catch (_) {}
  }

  function schedule(reason, delay, announce) {
    if (!started) return;
    queued = true;
    queuedReason = reason || "scheduled";

    if (announce) wakeOtherTabs(queuedReason);

    if (delayTimer) clearTimeout(delayTimer);

    delayTimer = setTimeout(() => {
      delayTimer = null;
      run(queuedReason).catch(error => {
        console.error("[Chati-AI V5.0.11] Scheduled sync failed:", error);
      });
    }, Math.max(0, Number(delay) || 0));
  }

  async function run(reason) {
    reason = reason || "manual";

    if (busy) {
      queued = true;
      queuedReason = reason;
      return { ok: false, reason: "busy-queued" };
    }

    busy = true;
    queued = false;
    const startedAt = Date.now();

    try {
      const currentSession = await session();

      if (!currentSession || !currentSession.user) {
        lastUserId = null;
        lastRun = { ok: false, reason: "signed-out", finishedAt: Date.now() };
        return lastRun;
      }

      const mountedWorkspace = localStorage.getItem("chatiLoadedWorkspaceUidV6");

      if (mountedWorkspace !== currentSession.user.id) {
        lastRun = {
          ok: false,
          reason: "workspace-user-mismatch",
          finishedAt: Date.now()
        };
        return lastRun;
      }

      if (lastUserId !== currentSession.user.id) {
        lastUserId = currentSession.user.id;
        await setupRealtime(lastUserId);
      }

      const result = await syncApi().syncAutomaticNewChats("v5.0.10:" + reason);
      retryMs = 1000;
      lastError = null;
      lastRun = Object.assign(compact(result), {
        startedAt: startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt
      });

      window.dispatchEvent(new CustomEvent("chati:v5sync", {
        detail: { reason: reason, result: lastRun }
      }));

      return lastRun;
    } catch (error) {
      lastError = String((error && error.message) || error);
      lastRun = {
        ok: false,
        reason: reason,
        error: lastError,
        finishedAt: Date.now()
      };

      if (started && navigator.onLine !== false) {
        const wait = retryMs;
        retryMs = Math.min(retryMs * 2, MAX_BACKOFF);
        setTimeout(() => schedule("retry", 0, false), wait);
      }

      throw error;
    } finally {
      busy = false;

      if (queued && started) {
        const next = queuedReason || "queued";
        queued = false;
        queuedReason = "";
        schedule(next, 80, false);
      }
    }
  }

  async function removeRealtime() {
    if (realtimeReconnectTimer) {
      clearTimeout(realtimeReconnectTimer);
      realtimeReconnectTimer = null;
    }

    if (!realtimeChannel) return;

    try {
      await authApi().getClient().removeChannel(realtimeChannel);
    } catch (_) {
      try { realtimeChannel.unsubscribe(); } catch (_) {}
    }

    realtimeChannel = null;
    realtimeStatus = "idle";
  }

  async function setupRealtime(userId) {
    await removeRealtime();
    if (!started || !userId) return;

    const client = authApi().getClient();
    const myGeneration = ++generation;
    const filter = "user_id=eq." + userId;

    realtimeChannel = client
      .channel("chati-v5-" + userId + "-" + myGeneration)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "cloud_conversations",
        filter: filter
      }, () => schedule("realtime-conversation", REALTIME_DELAY, false))
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "cloud_messages",
        filter: filter
      }, () => schedule("realtime-message", REALTIME_DELAY, false))
      .subscribe(status => {
        if (myGeneration !== generation) return;
        realtimeStatus = String(status || "unknown");
        if (status === "SUBSCRIBED") {
          if (realtimeReconnectTimer) {
            clearTimeout(realtimeReconnectTimer);
            realtimeReconnectTimer = null;
          }
          retryMs = 1000;
          schedule("realtime-subscribed", 80, false);
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          if (realtimeReconnectTimer) clearTimeout(realtimeReconnectTimer);

          realtimeReconnectTimer = setTimeout(() => {
            realtimeReconnectTimer = null;

            if (
              started &&
              navigator.onLine !== false &&
              lastUserId === userId &&
              myGeneration === generation
            ) {
              setupRealtime(userId)
                .then(() => schedule("realtime-reconnected", 80, false))
                .catch(error => {
                  lastError = String((error && error.message) || error);
                  console.warn("[Chati-AI V5.0.11] Realtime reconnect failed:", error);
                });
            }
          }, Math.min(Math.max(retryMs, 1000), 8000));

          retryMs = Math.min(retryMs * 2, MAX_BACKOFF);
        }
      });
  }

  function localUiActivity(event) {
    const target = event && event.target;
    if (!target) return;

    const id = String(target.id || "");
    const text = String(target.textContent || "").toLowerCase();
    const button = target.closest && target.closest("button");

    if (
      id === "messageInput" ||
      id === "sendButton" ||
      button ||
      /send|delete|remove|edit|regenerate|new chat/.test(text)
    ) {
      schedule("local-ui", LOCAL_DELAY, true);
    }
  }

  function keydown(event) {
    if (!event || event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (!target) return;

    if (
      String(target.id || "") === "messageInput" ||
      (target.matches && target.matches("textarea, input[type='text']"))
    ) {
      schedule("local-enter", LOCAL_DELAY, true);
    }
  }

  function online() {
    retryMs = 1000;
    schedule("online", 100, false);
  }

  async function authChange() {
    try {
      const currentSession = await session();
      const nextUser = currentSession && currentSession.user ? currentSession.user.id : null;

      if (nextUser !== lastUserId) {
        lastUserId = nextUser;
        if (nextUser) await setupRealtime(nextUser);
        else await removeRealtime();
      }
    } catch (error) {
      console.warn("[Chati-AI V5.0.11] Auth recovery failed:", error);
    }

    schedule("auth-change", 180, false);
  }

  function charactersChange() {
    schedule("characters-change", LOCAL_DELAY, true);
  }

  function visibility() {
    if (document.visibilityState === "visible") {
      schedule("visible", 100, false);
    }
  }

  async function healthCheck() {
    const api = syncApi();
    const currentSession = await session();

    const result = {
      version: VERSION,
      signedIn: Boolean(currentSession && currentSession.user),
      userId: currentSession && currentSession.user ? currentSession.user.id : null,
      online: navigator.onLine !== false,
      started: started,
      busy: busy,
      realtimeStatus: realtimeStatus,
      fallbackMs: FALLBACK_MS,
      updateConflicts: typeof api.getUpdateConflicts === "function" ? api.getUpdateConflicts() : [],
      deleteConflicts: typeof api.getDeleteConflicts === "function" ? api.getDeleteConflicts() : [],
      lastRun: lastRun,
      lastError: lastError
    };

    if (result.signedIn && typeof api.status === "function") {
      try {
        result.cloud = await api.status();
      } catch (error) {
        result.cloudError = String((error && error.message) || error);
      }
    }

    return result;
  }

  async function start() {
    if (started) return { ok: true, alreadyRunning: true, version: VERSION };

    const api = syncApi();
    try { api.stopAutoConversationSync(); } catch (_) {}

    started = true;

    if ("BroadcastChannel" in window) {
      try {
        broadcast = new BroadcastChannel("chati-ai-v5-sync");
        broadcast.onmessage = event => {
          if (event && event.data && event.data.type === "sync-wake") {
            schedule("broadcast-wake", 100, false);
          }
        };
      } catch (_) {
        broadcast = null;
      }
    }

    window.addEventListener("online", online);
    window.addEventListener("chati:authchange", authChange);
    window.addEventListener("chati:characterschange", charactersChange);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("click", localUiActivity, true);
    document.addEventListener("keydown", keydown, true);

    fallbackTimer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        schedule("fallback", 0, false);
      }
    }, FALLBACK_MS);

    const currentSession = await session();
    if (currentSession && currentSession.user) {
      lastUserId = currentSession.user.id;
      await setupRealtime(lastUserId);
    }

    schedule("start", 250, false);
    console.log("[Chati-AI Conversations] V" + VERSION + " cross-device sync coordinator ready.");

    return {
      ok: true,
      version: VERSION,
      realtime: Boolean(currentSession && currentSession.user),
      fallbackMs: FALLBACK_MS
    };
  }

  async function stop() {
    if (!started) return { ok: true, alreadyStopped: true };

    started = false;
    generation += 1;

    if (delayTimer) clearTimeout(delayTimer);
    if (fallbackTimer) clearInterval(fallbackTimer);
    delayTimer = null;
    fallbackTimer = null;

    window.removeEventListener("online", online);
    window.removeEventListener("chati:authchange", authChange);
    window.removeEventListener("chati:characterschange", charactersChange);
    document.removeEventListener("visibilitychange", visibility);
    document.removeEventListener("click", localUiActivity, true);
    document.removeEventListener("keydown", keydown, true);

    try { if (broadcast) broadcast.close(); } catch (_) {}
    broadcast = null;

    await removeRealtime();
    return { ok: true };
  }

  window.ChatiV5Sync = Object.freeze({
    version: VERSION,
    start: start,
    stop: stop,
    syncNow: run,
    schedule: schedule,
    healthCheck: healthCheck,
    getState: () => ({
      version: VERSION,
      started: started,
      busy: busy,
      queued: queued,
      queuedReason: queuedReason,
      realtimeStatus: realtimeStatus,
      userId: lastUserId,
      lastRun: lastRun,
      lastError: lastError,
      fallbackMs: FALLBACK_MS
    })
  });

  Promise.resolve(window.ChatiWorkspaceReady)
    .then(start)
    .catch(error => {
      lastError = String((error && error.message) || error);
      console.error("[Chati-AI V5.0.11] Could not start sync coordinator:", error);
    });
})();