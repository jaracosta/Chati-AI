// ============================================================
// CHATI-AI V4.0.4 — SAFE MULTI-DEVICE CHARACTER SYNC
//
// - Manual Local -> Cloud character push
// - Manual Cloud -> Local safe pull
// - Automatic NEW character sync between devices
//
// Safety:
// - Existing characters are NOT overwritten automatically.
// - Character deletions are NOT propagated yet.
// - Groups/chats are NOT synced yet.
// - Private Chat / Private Group are NEVER synced.
// - data:/blob: media is deferred until Cloud Media.
// ============================================================

(() => {
  "use strict";

  const LOCAL_DB_NAME = "chatiMediaDB";
  const LOCAL_APP_STORE = "appData";
  const CHARACTERS_KEY = "chatiCharacters";

  const AUTO_SYNC_INTERVAL_MS = 30_000;
  const AUTO_SYNC_DELAY_MS = 650;
  const CHARACTER_FORM_SYNC_DELAY_MS = 1_000;

  let autoSyncBusy = false;
  let autoSyncTimer = null;
  let periodicSyncTimer = null;
  let reloadScheduled = false;

  // ------------------------------------------------------------
  // LOCAL DATABASE
  // ------------------------------------------------------------

  function openLocalDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_DB_NAME);

      request.onsuccess = () => resolve(request.result);

      request.onerror = () => {
        reject(
          request.error ||
            new Error("Could not open local Chati-AI database.")
        );
      };
    });
  }

  async function readLocalAppData(key) {
    try {
      const database = await openLocalDatabase();

      if (!database.objectStoreNames.contains(LOCAL_APP_STORE)) {
        database.close();
        return localStorage.getItem(key);
      }

      const value = await new Promise((resolve, reject) => {
        const transaction = database.transaction(
          LOCAL_APP_STORE,
          "readonly"
        );

        const request = transaction
          .objectStore(LOCAL_APP_STORE)
          .get(key);

        request.onsuccess = () => resolve(request.result ?? null);

        request.onerror = () => {
          reject(
            request.error ||
              new Error("Could not read local Chati-AI data.")
          );
        };
      });

      database.close();
      return value;
    } catch (error) {
      console.warn(
        "[Chati-AI Sync] IndexedDB read failed. Trying localStorage.",
        error
      );

      return localStorage.getItem(key);
    }
  }

  async function writeLocalAppData(key, value) {
    const stringValue = String(value ?? "");

    try {
      const database = await openLocalDatabase();

      if (!database.objectStoreNames.contains(LOCAL_APP_STORE)) {
        database.close();
        localStorage.setItem(key, stringValue);
        return;
      }

      await new Promise((resolve, reject) => {
        const transaction = database.transaction(
          LOCAL_APP_STORE,
          "readwrite"
        );

        transaction
          .objectStore(LOCAL_APP_STORE)
          .put(stringValue, key);

        transaction.oncomplete = () => resolve();

        transaction.onerror = () => {
          reject(
            transaction.error ||
              new Error("Could not write local Chati-AI data.")
          );
        };
      });

      database.close();
    } catch (error) {
      console.warn(
        "[Chati-AI Sync] IndexedDB write failed. Using localStorage.",
        error
      );

      localStorage.setItem(key, stringValue);
    }
  }

  async function getLocalCharacters() {
    const raw = await readLocalAppData(CHARACTERS_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed =
        typeof raw === "string"
          ? JSON.parse(raw)
          : raw;

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(
        "[Chati-AI Sync] Could not parse local characters.",
        error
      );

      return [];
    }
  }

  // ------------------------------------------------------------
  // CHARACTER HELPERS
  // ------------------------------------------------------------

  function isStandaloneCharacter(character) {
    return Boolean(
      character &&
        !character.isGroup &&
        character.id !== null &&
        character.id !== undefined
    );
  }

  function isLocalMediaValue(value) {
    if (typeof value !== "string") {
      return false;
    }

    const normalized = value.trim().toLowerCase();

    return (
      normalized.startsWith("data:") ||
      normalized.startsWith("blob:")
    );
  }

  function safeClone(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function prepareCharacterForCloud(character) {
    const clone = safeClone(character);
    let mediaDeferred = false;

    if (isLocalMediaValue(clone.image)) {
      clone.image = "";
      mediaDeferred = true;
    }

    if (isLocalMediaValue(clone.background)) {
      clone.background = "";
      mediaDeferred = true;
    }

    return {
      schemaVersion: 1,
      character: clone,
      media: {
        deferred: mediaDeferred
      }
    };
  }

  function getCharacterFromCloudRow(row) {
    const source = row?.payload?.character;

    if (!source || typeof source !== "object") {
      return null;
    }

    if (source.isGroup) {
      return null;
    }

    if (row.local_id === null || row.local_id === undefined) {
      return null;
    }

    const character = safeClone(source);

    if (
      character.id === null ||
      character.id === undefined ||
      String(character.id) !== String(row.local_id)
    ) {
      character.id = row.local_id;
    }

    character.isGroup = false;

    return character;
  }

  // ------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------

  async function getSignedInUserId() {
    if (!window.ChatiAuth) {
      return null;
    }

    const { data, error } = await window.ChatiAuth.getSession();

    if (error) {
      throw error;
    }

    return data?.session?.user?.id || null;
  }

  // ------------------------------------------------------------
  // KNOWN CLOUD IDS
  // ------------------------------------------------------------

  function getKnownCharacterIdsKey(userId) {
    return `chatiCloudKnownCharacterIds_${userId}`;
  }

  function loadKnownCharacterIds(userId) {
    if (!userId) {
      return new Set();
    }

    try {
      const raw = localStorage.getItem(
        getKnownCharacterIdsKey(userId)
      );

      const parsed = raw ? JSON.parse(raw) : [];

      return new Set(
        Array.isArray(parsed)
          ? parsed.map(String)
          : []
      );
    } catch {
      return new Set();
    }
  }

  function saveKnownCharacterIds(userId, ids) {
    if (!userId) {
      return;
    }

    try {
      localStorage.setItem(
        getKnownCharacterIdsKey(userId),
        JSON.stringify([...ids])
      );
    } catch (error) {
      console.warn(
        "[Chati-AI Sync] Could not save sync metadata.",
        error
      );
    }
  }

  // ------------------------------------------------------------
  // PREVIEWS
  // ------------------------------------------------------------

  async function previewLocalCharacters() {
    const characters = (await getLocalCharacters()).filter(
      isStandaloneCharacter
    );

    return characters.map((character) => ({
      id: String(character.id),
      name: character.name || "Unnamed Character",
      hasLocalImage: isLocalMediaValue(character.image),
      hasLocalBackground: isLocalMediaValue(
        character.background
      )
    }));
  }

  async function previewCloudCharacters() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const rows = await window.ChatiCloud.getAll("character");

    return rows.map((row) => ({
      id: row.id,
      localId: row.local_id,
      name:
        row.payload?.character?.name ||
        "Unnamed Character",
      version: row.version,
      updatedAt: row.updated_at,
      mediaDeferred: Boolean(
        row.payload?.media?.deferred
      )
    }));
  }

  async function previewCharacterPull() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const localCharacters = await getLocalCharacters();
    const cloudRows = await window.ChatiCloud.getAll(
      "character"
    );

    const localIds = new Set(
      localCharacters
        .filter(
          (item) =>
            item &&
            item.id !== null &&
            item.id !== undefined
        )
        .map((item) => String(item.id))
    );

    const cloudOnly = [];
    const alreadyLocal = [];
    const invalid = [];

    for (const row of cloudRows) {
      const character = getCharacterFromCloudRow(row);

      if (!character) {
        invalid.push(row.local_id);
        continue;
      }

      const id = String(character.id);

      if (localIds.has(id)) {
        alreadyLocal.push({
          id,
          name:
            character.name ||
            "Unnamed Character"
        });

        continue;
      }

      cloudOnly.push({
        id,
        name:
          character.name ||
          "Unnamed Character"
      });
    }

    return {
      localTotal: localCharacters.length,
      cloudTotal: cloudRows.length,
      cloudOnly: cloudOnly.length,
      alreadyLocal: alreadyLocal.length,
      invalid: invalid.length,
      cloudOnlyCharacters: cloudOnly,
      alreadyLocalCharacters: alreadyLocal,
      invalidRows: invalid
    };
  }

  // ------------------------------------------------------------
  // MANUAL PUSH ALL
  // ------------------------------------------------------------

  async function pushCharacters() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const localCharacters = await getLocalCharacters();

    const standaloneCharacters =
      localCharacters.filter(isStandaloneCharacter);

    const results = [];

    for (const character of standaloneCharacters) {
      const localId = String(character.id);

      const payload =
        prepareCharacterForCloud(character);

      const cloudRow = await window.ChatiCloud.put(
        "character",
        localId,
        payload
      );

      results.push({
        id: localId,
        name:
          character.name ||
          "Unnamed Character",
        cloudId: cloudRow?.id || null,
        version: cloudRow?.version || null,
        mediaDeferred: Boolean(
          payload.media.deferred
        )
      });

      console.log(
        "[Chati-AI Sync] Character uploaded:",
        character.name,
        localId
      );
    }

    return {
      scanned: localCharacters.length,
      uploaded: results.length,
      skippedGroups:
        localCharacters.length -
        standaloneCharacters.length,
      results
    };
  }

  // ------------------------------------------------------------
  // MANUAL SAFE PULL
  // ------------------------------------------------------------

  async function pullCharacters() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const localCharacters = await getLocalCharacters();

    const cloudRows = await window.ChatiCloud.getAll(
      "character"
    );

    const merged = [...localCharacters];

    const existingIds = new Set(
      localCharacters
        .filter(
          (item) =>
            item &&
            item.id !== null &&
            item.id !== undefined
        )
        .map((item) => String(item.id))
    );

    const added = [];
    let skippedExisting = 0;
    let skippedInvalid = 0;

    for (const row of cloudRows) {
      const character = getCharacterFromCloudRow(row);

      if (!character) {
        skippedInvalid += 1;
        continue;
      }

      const id = String(character.id);

      if (existingIds.has(id)) {
        skippedExisting += 1;
        continue;
      }

      merged.push(character);
      existingIds.add(id);

      added.push({
        id,
        name:
          character.name ||
          "Unnamed Character"
      });
    }

    if (added.length) {
      await writeLocalAppData(
        CHARACTERS_KEY,
        JSON.stringify(merged)
      );
    }

    const result = {
      localBefore: localCharacters.length,
      cloudRows: cloudRows.length,
      added: added.length,
      skippedExisting,
      skippedInvalid,
      localAfter: merged.length,
      requiresReload: added.length > 0,
      addedCharacters: added
    };

    console.log(
      "[Chati-AI Sync] Cloud pull complete:",
      result
    );

    return result;
  }

  // ------------------------------------------------------------
  // PUSH ONLY NEW LOCAL CHARACTERS
  // ------------------------------------------------------------

  async function pushMissingCharacters() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const userId = await getSignedInUserId();

    if (!userId) {
      return {
        signedIn: false,
        uploaded: 0,
        skippedExisting: 0
      };
    }

    const localCharacters = await getLocalCharacters();

    const standaloneCharacters =
      localCharacters.filter(isStandaloneCharacter);

    const cloudRows = await window.ChatiCloud.getAll(
      "character"
    );

    const cloudIds = new Set(
      cloudRows.map((row) => String(row.local_id))
    );

    const knownIds =
      loadKnownCharacterIds(userId);

    const uploaded = [];
    let skippedExisting = 0;

    for (const character of standaloneCharacters) {
      const localId = String(character.id);

      if (cloudIds.has(localId)) {
        knownIds.add(localId);
        skippedExisting += 1;
        continue;
      }

      const payload =
        prepareCharacterForCloud(character);

      const cloudRow = await window.ChatiCloud.put(
        "character",
        localId,
        payload
      );

      cloudIds.add(localId);
      knownIds.add(localId);

      uploaded.push({
        id: localId,
        name:
          character.name ||
          "Unnamed Character",
        cloudId: cloudRow?.id || null
      });

      console.log(
        "[Chati-AI Sync] New character auto-uploaded:",
        character.name,
        localId
      );
    }

    saveKnownCharacterIds(
      userId,
      knownIds
    );

    return {
      signedIn: true,
      scanned: standaloneCharacters.length,
      uploaded: uploaded.length,
      skippedExisting,
      uploadedCharacters: uploaded
    };
  }

  // ------------------------------------------------------------
  // PULL ONLY NEW CLOUD CHARACTERS
  // ------------------------------------------------------------

  async function pullNewCharacters() {
    if (!window.ChatiCloud) {
      throw new Error("ChatiCloud is unavailable.");
    }

    const userId = await getSignedInUserId();

    if (!userId) {
      return {
        signedIn: false,
        added: 0
      };
    }

    const localCharacters = await getLocalCharacters();

    const cloudRows = await window.ChatiCloud.getAll(
      "character"
    );

    const merged = [...localCharacters];

    const localIds = new Set(
      localCharacters
        .filter(
          (item) =>
            item &&
            item.id !== null &&
            item.id !== undefined
        )
        .map((item) => String(item.id))
    );

    const knownIds =
      loadKnownCharacterIds(userId);

    const added = [];

    let alreadyLocal = 0;
    let protectedMissing = 0;
    let invalid = 0;

    for (const row of cloudRows) {
      const character = getCharacterFromCloudRow(row);

      if (!character) {
        invalid += 1;
        continue;
      }

      const id = String(character.id);

      if (localIds.has(id)) {
        knownIds.add(id);
        alreadyLocal += 1;
        continue;
      }

      if (knownIds.has(id)) {
        protectedMissing += 1;
        continue;
      }

      merged.push(character);
      localIds.add(id);
      knownIds.add(id);

      added.push({
        id,
        name:
          character.name ||
          "Unnamed Character"
      });

      console.log(
        "[Chati-AI Sync] New cloud character downloaded:",
        character.name,
        id
      );
    }

    if (added.length) {
      await writeLocalAppData(
        CHARACTERS_KEY,
        JSON.stringify(merged)
      );
    }

    saveKnownCharacterIds(
      userId,
      knownIds
    );

    return {
      signedIn: true,
      localBefore: localCharacters.length,
      cloudRows: cloudRows.length,
      added: added.length,
      alreadyLocal,
      protectedMissing,
      invalid,
      localAfter: merged.length,
      requiresReload: added.length > 0,
      addedCharacters: added
    };
  }

  // ------------------------------------------------------------
  // AUTO SYNC
  // ------------------------------------------------------------

  function scheduleReloadAfterSync() {
    if (reloadScheduled) {
      return;
    }

    reloadScheduled = true;

    console.log(
      "[Chati-AI Sync] New cloud characters received. Reloading..."
    );

    window.setTimeout(
      () => window.location.reload(),
      220
    );
  }

  async function syncNewCharacters(
    reason = "manual"
  ) {
    if (autoSyncBusy) {
      return {
        skipped: true,
        reason: "sync-busy"
      };
    }

    const userId = await getSignedInUserId();

    if (!userId) {
      return {
        signedIn: false,
        reason
      };
    }

    if (navigator.onLine === false) {
      return {
        signedIn: true,
        online: false,
        reason
      };
    }

    autoSyncBusy = true;

    try {
      const pullResult =
        await pullNewCharacters();

      if (pullResult.added > 0) {
        scheduleReloadAfterSync();

        return {
          reason,
          pull: pullResult,
          push: null
        };
      }

      const pushResult =
        await pushMissingCharacters();

      return {
        reason,
        pull: pullResult,
        push: pushResult
      };
    } finally {
      autoSyncBusy = false;
    }
  }

  function scheduleAutoSync(
    reason,
    delay = AUTO_SYNC_DELAY_MS
  ) {
    window.clearTimeout(autoSyncTimer);

    autoSyncTimer = window.setTimeout(
      async () => {
        try {
          await syncNewCharacters(reason);
        } catch (error) {
          console.warn(
            "[Chati-AI Sync] Automatic sync failed:",
            error
          );
        }
      },
      Math.max(
        0,
        Number(delay) || 0
      )
    );
  }

  function startAutoSync() {
    if (periodicSyncTimer) {
      return;
    }

    periodicSyncTimer = window.setInterval(
      () => {
        if (
          document.visibilityState !== "visible"
        ) {
          return;
        }

        if (navigator.onLine === false) {
          return;
        }

        scheduleAutoSync(
          "interval",
          0
        );
      },
      AUTO_SYNC_INTERVAL_MS
    );

    scheduleAutoSync(
      "start",
      0
    );
  }

  function stopAutoSync() {
    window.clearTimeout(autoSyncTimer);
    autoSyncTimer = null;

    if (periodicSyncTimer) {
      window.clearInterval(periodicSyncTimer);
      periodicSyncTimer = null;
    }
  }

  // ------------------------------------------------------------
  // STATUS
  // ------------------------------------------------------------

  async function status() {
    const local =
      await previewLocalCharacters();

    let cloud = [];

    try {
      cloud =
        await previewCloudCharacters();
    } catch {
      // Signed-out/local mode is allowed.
    }

    let signedIn = false;

    try {
      signedIn = Boolean(
        await getSignedInUserId()
      );
    } catch {
      signedIn = false;
    }

    return {
      localCharacters: local.length,
      cloudCharacters: cloud.length,
      signedIn,
      autoSyncRunning: Boolean(
        periodicSyncTimer
      ),
      autoSyncBusy
    };
  }

  // ------------------------------------------------------------
  // AUTH EVENTS
  // ------------------------------------------------------------

  window.addEventListener(
    "chati:authchange",
    (event) => {
      const user =
        event?.detail?.user;

      if (!user) {
        window.clearTimeout(
          autoSyncTimer
        );
        return;
      }

      scheduleAutoSync(
        `auth:${event.detail?.event || "change"}`,
        500
      );
    }
  );

  // ------------------------------------------------------------
  // CHARACTER FORM
  //
  // No script.js modification required.
  // script.js saves the character first.
  // Then this delayed sync uploads only new IDs.
  // ------------------------------------------------------------

  const characterForm =
    document.getElementById(
      "characterForm"
    );

  characterForm?.addEventListener(
    "submit",
    () => {
      scheduleAutoSync(
        "character-form",
        CHARACTER_FORM_SYNC_DELAY_MS
      );
    }
  );

  // ------------------------------------------------------------
  // NETWORK / TAB EVENTS
  // ------------------------------------------------------------

  window.addEventListener(
    "online",
    () => {
      scheduleAutoSync(
        "online",
        250
      );
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        scheduleAutoSync(
          "visible",
          250
        );
      }
    }
  );

  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------

  window.ChatiSync = Object.freeze({
    status,
    previewLocalCharacters,
    previewCloudCharacters,
    previewCharacterPull,
    pushCharacters,
    pullCharacters,
    pushMissingCharacters,
    pullNewCharacters,
    syncNewCharacters,
    startAutoSync,
    stopAutoSync
  });

  startAutoSync();

  console.log(
    "[Chati-AI Sync] V4.0.4 safe multi-device sync ready."
  );
})();