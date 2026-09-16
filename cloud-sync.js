// ============================================================
// CHATI-AI V4.0.5 — CONFLICT-PROTECTED CHARACTER SYNC
//
// Normal characters only:
// - New local -> cloud
// - New cloud -> local
// - Local-only edit -> cloud (version locked)
// - Cloud-only edit -> local
// - Local delete -> cloud tombstone
// - Cloud tombstone -> local delete
// - Both sides changed -> conflict; overwrite neither side
//
// Not synced yet: groups, chats, Private Chat, Private Group.
// data:/blob: media stays local until Cloud Media.
// ============================================================

(() => {
  "use strict";

  const DB_NAME = "chatiMediaDB";
  const APP_STORE = "appData";
  const CHARACTERS_KEY = "chatiCharacters";

  const AUTO_SYNC_INTERVAL_MS = 30_000;
  const AUTO_SYNC_DELAY_MS = 650;
  const UI_SYNC_DELAY_MS = 1_000;

  let syncBusy = false;
  let syncTimer = null;
  let intervalTimer = null;
  let reloadScheduled = false;
  let lastConflicts = [];


  // ------------------------------------------------------------
  // LOCAL DATABASE
  // ------------------------------------------------------------

  function openDb() {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const request =
          indexedDB.open(
            DB_NAME
          );

        request.onsuccess =
          () =>
            resolve(
              request.result
            );

        request.onerror =
          () =>
            reject(
              request.error ||
              new Error(
                "Could not open Chati-AI local database."
              )
            );
      }
    );
  }


  async function readAppData(
    key
  ) {
    try {
      const db =
        await openDb();


      if (
        !db.objectStoreNames
          .contains(
            APP_STORE
          )
      ) {
        db.close();

        return localStorage.getItem(
          key
        );
      }


      const value =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            const tx =
              db.transaction(
                APP_STORE,
                "readonly"
              );


            const request =
              tx
                .objectStore(
                  APP_STORE
                )
                .get(
                  key
                );


            request.onsuccess =
              () =>
                resolve(
                  request.result ??
                  null
                );


            request.onerror =
              () =>
                reject(
                  request.error ||
                  new Error(
                    "Could not read local Chati-AI data."
                  )
                );
          }
        );


      db.close();

      return value;
    }

    catch (
      error
    ) {
      console.warn(
        "[Chati-AI Sync] IndexedDB read failed; using localStorage.",
        error
      );


      return localStorage.getItem(
        key
      );
    }
  }


  async function writeAppData(
    key,
    value
  ) {
    const stringValue =
      String(
        value ?? ""
      );


    try {
      const db =
        await openDb();


      if (
        !db.objectStoreNames
          .contains(
            APP_STORE
          )
      ) {
        db.close();

        localStorage.setItem(
          key,
          stringValue
        );

        return;
      }


      await new Promise(
        (
          resolve,
          reject
        ) => {
          const tx =
            db.transaction(
              APP_STORE,
              "readwrite"
            );


          tx
            .objectStore(
              APP_STORE
            )
            .put(
              stringValue,
              key
            );


          tx.oncomplete =
            () =>
              resolve();


          tx.onerror =
            () =>
              reject(
                tx.error ||
                new Error(
                  "Could not write local Chati-AI data."
                )
              );
        }
      );


      db.close();
    }

    catch (
      error
    ) {
      console.warn(
        "[Chati-AI Sync] IndexedDB write failed; using localStorage.",
        error
      );


      localStorage.setItem(
        key,
        stringValue
      );
    }
  }


  async function getLocalItems() {
    const raw =
      await readAppData(
        CHARACTERS_KEY
      );


    if (
      !raw
    ) {
      return [];
    }


    try {
      const parsed =
        typeof raw ===
        "string"
          ? JSON.parse(
              raw
            )
          : raw;


      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    }

    catch (
      error
    ) {
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

  function isCharacter(
    item
  ) {
    return Boolean(
      item &&
      !item.isGroup &&
      item.id !== null &&
      item.id !== undefined
    );
  }


  function clone(
    value
  ) {
    return (
      typeof structuredClone ===
      "function"
        ? structuredClone(
            value
          )
        : JSON.parse(
            JSON.stringify(
              value
            )
          )
    );
  }


  function isLocalMedia(
    value
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return false;
    }


    const text =
      value
        .trim()
        .toLowerCase();


    return (
      text.startsWith(
        "data:"
      ) ||
      text.startsWith(
        "blob:"
      )
    );
  }


  function prepareForCloud(
    character
  ) {
    const clean =
      clone(
        character
      );


    let deferred =
      false;


    if (
      isLocalMedia(
        clean.image
      )
    ) {
      clean.image =
        "";

      deferred =
        true;
    }


    if (
      isLocalMedia(
        clean.background
      )
    ) {
      clean.background =
        "";

      deferred =
        true;
    }


    return {
      schemaVersion:
        1,

      character:
        clean,

      media: {
        deferred
      }
    };
  }


  function characterFromRow(
    row
  ) {
    const source =
      row
        ?.payload
        ?.character;


    if (
      !source ||
      typeof source !==
        "object" ||
      source.isGroup
    ) {
      return null;
    }


    if (
      row.local_id ===
        null ||
      row.local_id ===
        undefined
    ) {
      return null;
    }


    const character =
      clone(
        source
      );


    if (
      character.id ===
        null ||
      character.id ===
        undefined ||
      String(
        character.id
      ) !==
        String(
          row.local_id
        )
    ) {
      character.id =
        row.local_id;
    }


    character.isGroup =
      false;


    return character;
  }


  function mergeRemoteWithLocalMedia(
    remote,
    local
  ) {
    const merged =
      clone(
        remote
      );


    if (
      local &&
      isLocalMedia(
        local.image
      ) &&
      !merged.image
    ) {
      merged.image =
        local.image;
    }


    if (
      local &&
      isLocalMedia(
        local.background
      ) &&
      !merged.background
    ) {
      merged.background =
        local.background;
    }


    return merged;
  }


  function replaceCharacter(
    items,
    replacement
  ) {
    const id =
      String(
        replacement.id
      );


    return items.map(
      item =>
        (
          isCharacter(
            item
          ) &&
          String(
            item.id
          ) ===
            id
        )
          ? replacement
          : item
    );
  }


  function removeCharacter(
    items,
    id
  ) {
    const target =
      String(
        id
      );


    return items.filter(
      item =>
        (
          !isCharacter(
            item
          ) ||
          String(
            item.id
          ) !==
            target
        )
    );
  }


  // ------------------------------------------------------------
  // STABLE FINGERPRINTS
  // ------------------------------------------------------------

  function stableStringify(
    value
  ) {
    if (
      value === null ||
      typeof value !==
        "object"
    ) {
      return JSON.stringify(
        value
      );
    }


    if (
      Array.isArray(
        value
      )
    ) {
      return (
        "[" +
        value
          .map(
            stableStringify
          )
          .join(
            ","
          ) +
        "]"
      );
    }


    return (
      "{" +
      Object.keys(
        value
      )
        .sort()
        .map(
          key =>
            `${JSON.stringify(
              key
            )}:${stableStringify(
              value[key]
            )}`
        )
        .join(
          ","
        ) +
      "}"
    );
  }


  function fallbackHash(
    text
  ) {
    let hash =
      0x811c9dc5;


    for (
      let i = 0;
      i < text.length;
      i += 1
    ) {
      hash ^=
        text.charCodeAt(
          i
        );


      hash =
        Math.imul(
          hash,
          0x01000193
        ) >>>
        0;
    }


    return hash
      .toString(
        16
      )
      .padStart(
        8,
        "0"
      );
  }


  async function hashText(
    text
  ) {
    if (
      window.crypto
        ?.subtle &&
      typeof TextEncoder !==
        "undefined"
    ) {
      const digest =
        await window.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder()
            .encode(
              text
            )
        );


      return Array.from(
        new Uint8Array(
          digest
        )
      )
        .map(
          byte =>
            byte
              .toString(
                16
              )
              .padStart(
                2,
                "0"
              )
        )
        .join(
          ""
        );
    }


    return fallbackHash(
      text
    );
  }


  async function fingerprintCharacter(
    character
  ) {
    return hashText(
      stableStringify(
        prepareForCloud(
          character
        )
          .character
      )
    );
  }


  async function fingerprintRow(
    row
  ) {
    const character =
      characterFromRow(
        row
      );


    return character
      ? fingerprintCharacter(
          character
        )
      : null;
  }


  // ------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------

  async function getUserId() {
    if (
      !window.ChatiAuth
    ) {
      return null;
    }


    const {
      data,
      error
    } =
      await window.ChatiAuth
        .getSession();


    if (
      error
    ) {
      throw error;
    }


    return (
      data
        ?.session
        ?.user
        ?.id ||
      null
    );
  }


  // ------------------------------------------------------------
  // DEVICE SYNC STATE
  // ------------------------------------------------------------

  function stateKey(
    userId
  ) {
    return (
      `chatiCharacterSyncStateV405_${userId}`
    );
  }


  function loadState(
    userId
  ) {
    if (
      !userId
    ) {
      return {};
    }


    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            stateKey(
              userId
            )
          ) ||
          "{}"
        );


      return (
        parsed &&
        typeof parsed ===
          "object" &&
        !Array.isArray(
          parsed
        )
      )
        ? parsed
        : {};
    }

    catch {
      return {};
    }
  }


  function saveState(
    userId,
    state
  ) {
    if (
      !userId
    ) {
      return;
    }


    try {
      localStorage.setItem(
        stateKey(
          userId
        ),
        JSON.stringify(
          state
        )
      );
    }

    catch (
      error
    ) {
      console.warn(
        "[Chati-AI Sync] Could not save sync state.",
        error
      );
    }
  }


  function setBaseline(
    state,
    id,
    {
      version,
      fingerprint = null,
      deleted = false
    }
  ) {
    state[
      String(
        id
      )
    ] = {
      version:
        Number(
          version
        ) ||
        1,

      fingerprint:
        fingerprint ||
        null,

      deleted:
        Boolean(
          deleted
        )
    };
  }


  // ------------------------------------------------------------
  // CONFLICTS
  // ------------------------------------------------------------

  function makeConflict({
    id,
    name = "Unnamed Character",
    type,
    baseline = null,
    cloudVersion = null
  }) {
    return {
      id:
        String(
          id
        ),

      name,

      type,

      baselineVersion:
        baseline
          ?.version ??
        null,

      cloudVersion
    };
  }


  function publishConflicts(
    conflicts
  ) {
    lastConflicts =
      clone(
        conflicts
      );


    if (
      !conflicts.length
    ) {
      return;
    }


    console.warn(
      `[Chati-AI Sync] ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} protected. Nothing conflicting was overwritten.`,
      conflicts
    );


    window.dispatchEvent(
      new CustomEvent(
        "chati:syncconflict",
        {
          detail: {
            conflicts:
              clone(
                conflicts
              )
          }
        }
      )
    );
  }


  function getConflicts() {
    return clone(
      lastConflicts
    );
  }


  function clearConflictById(
    localId
  ) {
    const id =
      String(
        localId
      );


    lastConflicts =
      lastConflicts.filter(
        item =>
          String(
            item.id
          ) !==
          id
      );
  }


  // ------------------------------------------------------------
  // PREVIEWS / MANUAL HELPERS
  // ------------------------------------------------------------

  async function previewLocalCharacters() {
    return (
      await getLocalItems()
    )
      .filter(
        isCharacter
      )
      .map(
        character => ({
          id:
            String(
              character.id
            ),

          name:
            character.name ||
            "Unnamed Character",

          hasLocalImage:
            isLocalMedia(
              character.image
            ),

          hasLocalBackground:
            isLocalMedia(
              character.background
            )
        })
      );
  }


  async function previewCloudCharacters(
    {
      includeDeleted =
        false
    } = {}
  ) {
    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const rows =
      await window.ChatiCloud
        .getAll(
          "character",
          {
            includeDeleted
          }
        );


    return rows.map(
      row => ({
        id:
          row.id,

        localId:
          row.local_id,

        name:
          row.payload
            ?.character
            ?.name ||
          "Unnamed Character",

        version:
          row.version,

        updatedAt:
          row.updated_at,

        deletedAt:
          row.deleted_at,

        mediaDeferred:
          Boolean(
            row
              .payload
              ?.media
              ?.deferred
          )
      })
    );
  }


  async function previewCharacterPull() {
    const local =
      await getLocalItems();


    const rows =
      await window.ChatiCloud
        .getAll(
          "character",
          {
            includeDeleted:
              true
          }
        );


    const localIds =
      new Set(
        local
          .filter(
            isCharacter
          )
          .map(
            item =>
              String(
                item.id
              )
          )
      );


    const active =
      rows.filter(
        row =>
          !row.deleted_at
      );


    const cloudOnly =
      [];


    const alreadyLocal =
      [];


    for (
      const row of
      active
    ) {
      const character =
        characterFromRow(
          row
        );


      if (
        !character
      ) {
        continue;
      }


      const item = {
        id:
          String(
            character.id
          ),

        name:
          character.name ||
          "Unnamed Character"
      };


      if (
        localIds.has(
          item.id
        )
      ) {
        alreadyLocal.push(
          item
        );
      }

      else {
        cloudOnly.push(
          item
        );
      }
    }


    return {
      localTotal:
        local
          .filter(
            isCharacter
          )
          .length,

      cloudTotal:
        active.length,

      cloudOnly:
        cloudOnly.length,

      alreadyLocal:
        alreadyLocal.length,

      tombstones:
        rows.filter(
          row =>
            Boolean(
              row.deleted_at
            )
        ).length,

      cloudOnlyCharacters:
        cloudOnly,

      alreadyLocalCharacters:
        alreadyLocal
    };
  }


  async function pushCharacters() {
    const local =
      await getLocalItems();


    const characters =
      local.filter(
        isCharacter
      );


    const results =
      [];


    for (
      const character of
      characters
    ) {
      const row =
        await window.ChatiCloud
          .put(
            "character",
            String(
              character.id
            ),
            prepareForCloud(
              character
            )
          );


      results.push({
        id:
          String(
            character.id
          ),

        name:
          character.name ||
          "Unnamed Character",

        cloudId:
          row?.id ||
          null,

        version:
          row?.version ||
          null
      });
    }


    return {
      scanned:
        local.length,

      uploaded:
        results.length,

      skippedGroups:
        local.length -
        characters.length,

      results
    };
  }


  async function pullCharacters() {
    const local =
      await getLocalItems();


    const rows =
      await window.ChatiCloud
        .getAll(
          "character"
        );


    const merged =
      [
        ...local
      ];


    const ids =
      new Set(
        local
          .filter(
            isCharacter
          )
          .map(
            item =>
              String(
                item.id
              )
          )
      );


    const added =
      [];


    for (
      const row of
      rows
    ) {
      const character =
        characterFromRow(
          row
        );


      if (
        !character
      ) {
        continue;
      }


      const id =
        String(
          character.id
        );


      if (
        ids.has(
          id
        )
      ) {
        continue;
      }


      merged.push(
        character
      );


      ids.add(
        id
      );


      added.push({
        id,

        name:
          character.name ||
          "Unnamed Character"
      });
    }


    if (
      added.length
    ) {
      await writeAppData(
        CHARACTERS_KEY,
        JSON.stringify(
          merged
        )
      );
    }


    return {
      localBefore:
        local.length,

      cloudRows:
        rows.length,

      added:
        added.length,

      localAfter:
        merged.length,

      requiresReload:
        added.length > 0,

      addedCharacters:
        added
    };
  }


  // ============================================================
  // EXPLICIT CONFLICT RESOLUTION
  // ============================================================

  async function resolveConflictUseCloud(
    localId
  ) {
    const id =
      String(
        localId ||
        ""
      ).trim();


    if (
      !id
    ) {
      throw new Error(
        "Character ID is required."
      );
    }


    const userId =
      await getUserId();


    if (
      !userId
    ) {
      throw new Error(
        "You must be signed in."
      );
    }


    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const cloudRow =
      await window.ChatiCloud
        .get(
          "character",
          id,
          {
            includeDeleted:
              true
          }
        );


    if (
      !cloudRow
    ) {
      throw new Error(
        "Cloud character could not be found."
      );
    }


    let localItems =
      await getLocalItems();


    const localCharacter =
      localItems.find(
        item =>
          isCharacter(
            item
          ) &&
          String(
            item.id
          ) ===
            id
      ) ||
      null;


    const state =
      loadState(
        userId
      );


    const cloudFingerprint =
      await fingerprintRow(
        cloudRow
      );


    if (
      cloudRow.deleted_at
    ) {
      localItems =
        removeCharacter(
          localItems,
          id
        );


      await writeAppData(
        CHARACTERS_KEY,
        JSON.stringify(
          localItems
        )
      );


      setBaseline(
        state,
        id,
        {
          version:
            cloudRow.version,

          fingerprint:
            cloudFingerprint ||
            state[id]
              ?.fingerprint ||
            null,

          deleted:
            true
        }
      );


      saveState(
        userId,
        state
      );


      clearConflictById(
        id
      );


      console.log(
        "[Chati-AI Sync] Conflict resolved using cloud deletion:",
        id
      );


      scheduleReload();


      return {
        ok:
          true,

        resolution:
          "cloud",

        id,

        deleted:
          true,

        version:
          cloudRow.version
      };
    }


    const remote =
      characterFromRow(
        cloudRow
      );


    if (
      !remote
    ) {
      throw new Error(
        "Cloud character data is invalid."
      );
    }


    const merged =
      mergeRemoteWithLocalMedia(
        remote,
        localCharacter
      );


    if (
      localCharacter
    ) {
      localItems =
        replaceCharacter(
          localItems,
          merged
        );
    }

    else {
      localItems.push(
        merged
      );
    }


    await writeAppData(
      CHARACTERS_KEY,
      JSON.stringify(
        localItems
      )
    );


    setBaseline(
      state,
      id,
      {
        version:
          cloudRow.version,

        fingerprint:
          cloudFingerprint,

        deleted:
          false
      }
    );


    saveState(
      userId,
      state
    );


    clearConflictById(
      id
    );


    console.log(
      "[Chati-AI Sync] Conflict resolved using cloud version:",
      id,
      cloudRow.version
    );


    scheduleReload();


    return {
      ok:
        true,

      resolution:
        "cloud",

      id,

      deleted:
        false,

      version:
        cloudRow.version
    };
  }


  async function resolveConflictKeepLocal(
    localId
  ) {
    const id =
      String(
        localId ||
        ""
      ).trim();


    if (
      !id
    ) {
      throw new Error(
        "Character ID is required."
      );
    }


    const userId =
      await getUserId();


    if (
      !userId
    ) {
      throw new Error(
        "You must be signed in."
      );
    }


    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const localItems =
      await getLocalItems();


    const localCharacter =
      localItems.find(
        item =>
          isCharacter(
            item
          ) &&
          String(
            item.id
          ) ===
            id
      ) ||
      null;


    const cloudRow =
      await window.ChatiCloud
        .get(
          "character",
          id,
          {
            includeDeleted:
              true
          }
        );


    const state =
      loadState(
        userId
      );


    // Local is missing:
    // Keep Local means keep the local deletion.
    if (
      !localCharacter
    ) {
      if (
        !cloudRow
      ) {
        delete state[id];


        saveState(
          userId,
          state
        );


        clearConflictById(
          id
        );


        return {
          ok:
            true,

          resolution:
            "local",

          id,

          deleted:
            true
        };
      }


      if (
        cloudRow.deleted_at
      ) {
        setBaseline(
          state,
          id,
          {
            version:
              cloudRow.version,

            fingerprint:
              await fingerprintRow(
                cloudRow
              ) ||
              state[id]
                ?.fingerprint ||
              null,

            deleted:
              true
          }
        );


        saveState(
          userId,
          state
        );


        clearConflictById(
          id
        );


        return {
          ok:
            true,

          resolution:
            "local",

          id,

          deleted:
            true,

          version:
            cloudRow.version
        };
      }


      const deleted =
        await window.ChatiCloud
          .removeIfVersion(
            "character",
            id,
            cloudRow.version
          );


      if (
        !deleted
      ) {
        throw new Error(
          "Cloud changed again while resolving the conflict. Please sync again."
        );
      }


      setBaseline(
        state,
        id,
        {
          version:
            deleted.version,

          fingerprint:
            await fingerprintRow(
              cloudRow
            ),

          deleted:
            true
        }
      );


      saveState(
        userId,
        state
      );


      clearConflictById(
        id
      );


      console.log(
        "[Chati-AI Sync] Conflict resolved using local deletion:",
        id
      );


      return {
        ok:
          true,

        resolution:
          "local",

        id,

        deleted:
          true,

        version:
          deleted.version
      };
    }


    const payload =
      prepareForCloud(
        localCharacter
      );


    const localFingerprint =
      await fingerprintCharacter(
        localCharacter
      );


    const savedRow =
      cloudRow

        ? await window.ChatiCloud
            .updateIfVersion(
              "character",
              id,
              cloudRow.version,
              payload
            )

        : await window.ChatiCloud
            .put(
              "character",
              id,
              payload
            );


    if (
      !savedRow
    ) {
      throw new Error(
        "Cloud changed again while resolving the conflict. Please sync again."
      );
    }


    setBaseline(
      state,
      id,
      {
        version:
          savedRow.version,

        fingerprint:
          localFingerprint,

        deleted:
          false
      }
    );


    saveState(
      userId,
      state
    );


    clearConflictById(
      id
    );


    console.log(
      "[Chati-AI Sync] Conflict resolved using this device:",
      id,
      savedRow.version
    );


    return {
      ok:
        true,

      resolution:
        "local",

      id,

      deleted:
        false,

      version:
        savedRow.version
    };
  }


  // ============================================================
  // V4.0.5 PROTECTED SYNC
  // ============================================================

  async function syncCharactersProtected(
    reason = "manual"
  ) {
    if (
      syncBusy
    ) {
      return {
        skipped:
          true,

        reason:
          "sync-busy"
      };
    }


    const userId =
      await getUserId();


    if (
      !userId
    ) {
      return {
        signedIn:
          false,

        reason
      };
    }


    if (
      navigator.onLine ===
      false
    ) {
      return {
        signedIn:
          true,

        online:
          false,

        reason
      };
    }


    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    syncBusy =
      true;


    try {
      const state =
        loadState(
          userId
        );


      let localItems =
        await getLocalItems();


      let localChangedByCloud =
        false;


      const localMap =
        new Map(
          localItems
            .filter(
              isCharacter
            )
            .map(
              item => [
                String(
                  item.id
                ),
                item
              ]
            )
        );


      const cloudRows =
        await window.ChatiCloud
          .getAll(
            "character",
            {
              includeDeleted:
                true
            }
          );


      const cloudMap =
        new Map(
          cloudRows.map(
            row => [
              String(
                row.local_id
              ),
              row
            ]
          )
        );


      const ids =
        new Set([
          ...localMap.keys(),
          ...cloudMap.keys(),
          ...Object.keys(
            state
          )
        ]);


      const result = {
        reason,

        createdCloud:
          0,

        downloadedNew:
          0,

        uploadedEdits:
          0,

        downloadedEdits:
          0,

        uploadedDeletes:
          0,

        downloadedDeletes:
          0,

        baselinesCreated:
          0,

        conflicts:
          []
      };


      for (
        const id of
        ids
      ) {
        let local =
          localMap.get(
            id
          ) ||
          null;


        let cloud =
          cloudMap.get(
            id
          ) ||
          null;


        const baseline =
          state[id] ||
          null;


        if (
          !local &&
          !cloud
        ) {
          continue;
        }


        // ======================================================
        // NEW LOCAL CHARACTER
        // ======================================================

        if (
          local &&
          !cloud &&
          !baseline
        ) {
          const created =
            await window.ChatiCloud
              .put(
                "character",
                id,
                prepareForCloud(
                  local
                )
              );


          if (
            created
          ) {
            setBaseline(
              state,
              id,
              {
                version:
                  created.version,

                fingerprint:
                  await fingerprintCharacter(
                    local
                  ),

                deleted:
                  false
              }
            );


            cloudMap.set(
              id,
              created
            );


            result.createdCloud +=
              1;
          }


          continue;
        }


        // ======================================================
        // NEW CLOUD CHARACTER
        // ======================================================

        if (
          !local &&
          cloud &&
          !baseline
        ) {
          const cloudFingerprint =
            await fingerprintRow(
              cloud
            );


          if (
            cloud.deleted_at
          ) {
            setBaseline(
              state,
              id,
              {
                version:
                  cloud.version,

                fingerprint:
                  cloudFingerprint,

                deleted:
                  true
              }
            );


            result.baselinesCreated +=
              1;


            continue;
          }


          const remote =
            characterFromRow(
              cloud
            );


          if (
            !remote
          ) {
            continue;
          }


          localItems.push(
            remote
          );


          localMap.set(
            id,
            remote
          );


          localChangedByCloud =
            true;


          setBaseline(
            state,
            id,
            {
              version:
                cloud.version,

              fingerprint:
                cloudFingerprint,

              deleted:
                false
            }
          );


          result.downloadedNew +=
            1;


          continue;
        }


        // ======================================================
        // CLOUD ROW HARD-DELETED / PURGED
        // ======================================================

        if (
          baseline &&
          !cloud
        ) {
          if (
            local
          ) {
            result.conflicts.push(
              makeConflict({
                id,

                name:
                  local.name,

                type:
                  "cloud-row-missing",

                baseline
              })
            );
          }


          continue;
        }


        const cloudFingerprint =
          await fingerprintRow(
            cloud
          );


        // ======================================================
        // FIRST V4.0.5 BASELINE
        // ======================================================

        if (
          local &&
          cloud &&
          !baseline
        ) {
          const localFingerprint =
            await fingerprintCharacter(
              local
            );


          if (
            !cloud.deleted_at &&
            localFingerprint ===
              cloudFingerprint
          ) {
            setBaseline(
              state,
              id,
              {
                version:
                  cloud.version,

                fingerprint:
                  cloudFingerprint,

                deleted:
                  false
              }
            );


            result.baselinesCreated +=
              1;
          }

          else {
            result.conflicts.push(
              makeConflict({
                id,

                name:
                  local.name ||
                  cloud
                    ?.payload
                    ?.character
                    ?.name ||
                  "Unnamed Character",

                type:
                  cloud.deleted_at
                    ? "untracked-local-vs-cloud-delete"
                    : "untracked-divergence",

                baseline:
                  null,

                cloudVersion:
                  cloud.version
              })
            );
          }


          continue;
        }


        // ======================================================
        // BOTH DELETED
        // ======================================================

        if (
          !local &&
          cloud.deleted_at
        ) {
          setBaseline(
            state,
            id,
            {
              version:
                cloud.version,

              fingerprint:
                cloudFingerprint ||
                baseline
                  ?.fingerprint ||
                null,

              deleted:
                true
            }
          );


          continue;
        }


        // ======================================================
        // LOCAL DELETE
        // ======================================================

        if (
          !local &&
          !cloud.deleted_at &&
          baseline
        ) {
          const cloudChanged =
            (
              Number(
                cloud.version
              ) !==
                Number(
                  baseline.version
                ) ||
              Boolean(
                baseline.deleted
              )
            );


          if (
            baseline.deleted
          ) {
            result.conflicts.push(
              makeConflict({
                id,

                name:
                  cloud
                    ?.payload
                    ?.character
                    ?.name,

                type:
                  "cloud-restored-local-missing",

                baseline,

                cloudVersion:
                  cloud.version
              })
            );


            continue;
          }


          if (
            cloudChanged
          ) {
            result.conflicts.push(
              makeConflict({
                id,

                name:
                  cloud
                    ?.payload
                    ?.character
                    ?.name,

                type:
                  "local-delete-vs-cloud-change",

                baseline,

                cloudVersion:
                  cloud.version
              })
            );


            continue;
          }


          const deleted =
            await window.ChatiCloud
              .removeIfVersion(
                "character",
                id,
                baseline.version
              );


          if (
            !deleted
          ) {
            const latest =
              await window.ChatiCloud
                .get(
                  "character",
                  id,
                  {
                    includeDeleted:
                      true
                  }
                );


            result.conflicts.push(
              makeConflict({
                id,

                name:
                  cloud
                    ?.payload
                    ?.character
                    ?.name,

                type:
                  "stale-delete-blocked",

                baseline,

                cloudVersion:
                  latest
                    ?.version ||
                  cloud.version
              })
            );


            continue;
          }


          setBaseline(
            state,
            id,
            {
              version:
                deleted.version,

              fingerprint:
                cloudFingerprint ||
                baseline.fingerprint,

              deleted:
                true
            }
          );


          result.uploadedDeletes +=
            1;


          continue;
        }


        // ======================================================
        // CLOUD DELETE
        // ======================================================

        if (
          local &&
          cloud.deleted_at &&
          baseline
        ) {
          const localFingerprint =
            await fingerprintCharacter(
              local
            );


          const localChanged =
            (
              localFingerprint !==
              baseline.fingerprint
            );


          if (
            baseline.deleted ||
            localChanged
          ) {
            result.conflicts.push(
              makeConflict({
                id,

                name:
                  local.name,

                type:
                  baseline.deleted
                    ? "local-restored-cloud-deleted"
                    : "local-edit-vs-cloud-delete",

                baseline,

                cloudVersion:
                  cloud.version
              })
            );


            continue;
          }


          localItems =
            removeCharacter(
              localItems,
              id
            );


          localMap.delete(
            id
          );


          localChangedByCloud =
            true;


          setBaseline(
            state,
            id,
            {
              version:
                cloud.version,

              fingerprint:
                cloudFingerprint ||
                baseline.fingerprint,

              deleted:
                true
            }
          );


          result.downloadedDeletes +=
            1;


          continue;
        }


        // ======================================================
        // BOTH ACTIVE — EDIT DETECTION
        // ======================================================

        if (
          local &&
          !cloud.deleted_at &&
          baseline
        ) {
          const localFingerprint =
            await fingerprintCharacter(
              local
            );


          const localChanged =
            (
              localFingerprint !==
              baseline.fingerprint
            );


          const cloudChanged =
            (
              Number(
                cloud.version
              ) !==
                Number(
                  baseline.version
                ) ||
              Boolean(
                baseline.deleted
              )
            );


          // Nothing changed.
          if (
            !localChanged &&
            !cloudChanged
          ) {
            continue;
          }


          // ====================================================
          // ONLY LOCAL CHANGED
          // ====================================================

          if (
            localChanged &&
            !cloudChanged
          ) {
            const updated =
              await window.ChatiCloud
                .updateIfVersion(
                  "character",
                  id,
                  baseline.version,
                  prepareForCloud(
                    local
                  )
                );


            if (
              !updated
            ) {
              const latest =
                await window.ChatiCloud
                  .get(
                    "character",
                    id,
                    {
                      includeDeleted:
                        true
                    }
                  );


              result.conflicts.push(
                makeConflict({
                  id,

                  name:
                    local.name,

                  type:
                    "stale-update-blocked",

                  baseline,

                  cloudVersion:
                    latest
                      ?.version ||
                    cloud.version
                })
              );


              continue;
            }


            setBaseline(
              state,
              id,
              {
                version:
                  updated.version,

                fingerprint:
                  localFingerprint,

                deleted:
                  false
              }
            );


            cloudMap.set(
              id,
              updated
            );


            result.uploadedEdits +=
              1;


            continue;
          }


          // ====================================================
          // ONLY CLOUD CHANGED
          // ====================================================

          if (
            !localChanged &&
            cloudChanged
          ) {
            const remote =
              characterFromRow(
                cloud
              );


            if (
              !remote
            ) {
              continue;
            }


            const merged =
              mergeRemoteWithLocalMedia(
                remote,
                local
              );


            localItems =
              replaceCharacter(
                localItems,
                merged
              );


            localMap.set(
              id,
              merged
            );


            localChangedByCloud =
              true;


            setBaseline(
              state,
              id,
              {
                version:
                  cloud.version,

                fingerprint:
                  cloudFingerprint,

                deleted:
                  false
              }
            );


            result.downloadedEdits +=
              1;


            continue;
          }


          // ====================================================
          // BOTH CHANGED
          // ====================================================

          result.conflicts.push(
            makeConflict({
              id,

              name:
                local.name ||
                cloud
                  ?.payload
                  ?.character
                  ?.name ||
                "Unnamed Character",

              type:
                "both-edited",

              baseline,

              cloudVersion:
                cloud.version
            })
          );
        }
      }


      // ========================================================
      // SAVE CLOUD CHANGES TO LOCAL STORAGE
      // ========================================================

      if (
        localChangedByCloud
      ) {
        await writeAppData(
          CHARACTERS_KEY,
          JSON.stringify(
            localItems
          )
        );
      }


      saveState(
        userId,
        state
      );


      publishConflicts(
        result.conflicts
      );


      result.requiresReload =
        localChangedByCloud;


      result.localCharacters =
        localItems
          .filter(
            isCharacter
          )
          .length;


      result.cloudRows =
        cloudRows.length;


      result.conflictCount =
        result.conflicts.length;


      console.log(
        "[Chati-AI Sync] V4.0.5 protected sync complete:",
        result
      );


      if (
        localChangedByCloud
      ) {
        scheduleReload();
      }


      return result;
    }

    finally {
      syncBusy =
        false;
    }
  }


  // ------------------------------------------------------------
  // AUTO SYNC
  // ------------------------------------------------------------

  function scheduleReload() {
    if (
      reloadScheduled
    ) {
      return;
    }


    reloadScheduled =
      true;


    console.log(
      "[Chati-AI Sync] Cloud changes applied locally. Reloading..."
    );


    window.setTimeout(
      () =>
        window.location.reload(),
      250
    );
  }


  function scheduleAutoSync(
    reason,
    delay =
      AUTO_SYNC_DELAY_MS
  ) {
    window.clearTimeout(
      syncTimer
    );


    syncTimer =
      window.setTimeout(
        async () => {
          try {
            await syncCharactersProtected(
              reason
            );
          }

          catch (
            error
          ) {
            console.warn(
              "[Chati-AI Sync] Automatic protected sync failed:",
              error
            );
          }
        },

        Math.max(
          0,
          Number(
            delay
          ) ||
          0
        )
      );
  }


  function startAutoSync() {
    if (
      intervalTimer
    ) {
      return;
    }


    intervalTimer =
      window.setInterval(
        () => {
          if (
            document.visibilityState !==
              "visible"
          ) {
            return;
          }


          if (
            navigator.onLine ===
              false
          ) {
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
    window.clearTimeout(
      syncTimer
    );


    syncTimer =
      null;


    if (
      intervalTimer
    ) {
      window.clearInterval(
        intervalTimer
      );


      intervalTimer =
        null;
    }
  }


  // ------------------------------------------------------------
  // STATUS
  // ------------------------------------------------------------

  async function status() {
    const local =
      await previewLocalCharacters();


    let cloud =
      [];


    let signedIn =
      false;


    try {
      signedIn =
        Boolean(
          await getUserId()
        );


      if (
        signedIn
      ) {
        cloud =
          await previewCloudCharacters({
            includeDeleted:
              true
          });
      }
    }

    catch {
      signedIn =
        false;
    }


    return {
      localCharacters:
        local.length,

      cloudRows:
        cloud.length,

      activeCloudCharacters:
        cloud.filter(
          row =>
            !row.deletedAt
        ).length,

      cloudTombstones:
        cloud.filter(
          row =>
            Boolean(
              row.deletedAt
            )
        ).length,

      signedIn,

      autoSyncRunning:
        Boolean(
          intervalTimer
        ),

      autoSyncBusy:
        syncBusy,

      conflicts:
        getConflicts()
    };
  }


  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------

  window.addEventListener(
    "chati:authchange",

    event => {
      if (
        !event
          ?.detail
          ?.user
      ) {
        window.clearTimeout(
          syncTimer
        );

        return;
      }


      scheduleAutoSync(
        `auth:${event.detail?.event || "change"}`,
        500
      );
    }
  );


  window.addEventListener(
    "chati:characterschange",

    () => {
      scheduleAutoSync(
        "characters-change",
        UI_SYNC_DELAY_MS
      );
    }
  );


  document
    .getElementById(
      "characterForm"
    )
    ?.addEventListener(
      "submit",

      () => {
        scheduleAutoSync(
          "character-form",
          UI_SYNC_DELAY_MS
        );
      }
    );


  // Extra safety for delete/remove UI flows.
  document.addEventListener(
    "click",

    event => {
      const button =
        event
          .target
          ?.closest?.(
            "button"
          );


      if (
        !button
      ) {
        return;
      }


      const marker =
        `${
          button.id ||
          ""
        } ${
          button.className ||
          ""
        } ${
          button.textContent ||
          ""
        }`
          .toLowerCase();


      if (
        marker.includes(
          "delete"
        ) ||
        marker.includes(
          "remove"
        )
      ) {
        scheduleAutoSync(
          "delete-or-remove-ui",
          UI_SYNC_DELAY_MS
        );
      }
    }
  );


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
  // V4.0.4 COMPATIBILITY NAMES
  // ------------------------------------------------------------

  const syncNewCharacters =
    reason =>
      syncCharactersProtected(
        reason ||
        "manual"
      );


  const pushMissingCharacters =
    () =>
      syncCharactersProtected(
        "push-missing"
      );


  const pullNewCharacters =
    () =>
      syncCharactersProtected(
        "pull-new"
      );


  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------

  window.ChatiSync =
    Object.freeze({
      status,

      previewLocalCharacters,

      previewCloudCharacters,

      previewCharacterPull,

      pushCharacters,

      pullCharacters,

      syncCharactersProtected,

      getConflicts,

      resolveConflictUseCloud,

      resolveConflictKeepLocal,

      syncNewCharacters,

      pushMissingCharacters,

      pullNewCharacters,

      startAutoSync,

      stopAutoSync
    });


  startAutoSync();


  console.log(
    "[Chati-AI Sync] V4.0.5 conflict resolution ready."
  );

})();