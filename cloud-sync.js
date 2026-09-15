// ============================================================
// CHATI-AI V4.0.3 — FIRST CLOUD SYNC
//
// Controlled character sync:
//
// Local standalone characters -> Supabase
// Supabase characters -> Local safe merge
//
// IMPORTANT:
// - Local characters are NOT overwritten yet.
// - Existing local characters win.
// - Groups are preserved locally.
// - Groups are NOT synced yet.
// - Chats are NOT synced yet.
// - Private Chat / Private Group are NEVER synced.
// - Local media/base64 is NOT uploaded yet.
// ============================================================

(() => {
  "use strict";


  // =========================
  // LOCAL STORAGE CONFIG
  // =========================

  const LOCAL_DB_NAME =
    "chatiMediaDB";

  const LOCAL_APP_STORE =
    "appData";

  const CHARACTERS_KEY =
    "chatiCharacters";


  // =========================
  // OPEN LOCAL DATABASE
  // =========================

  function openLocalDatabase() {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const request =
          indexedDB.open(
            LOCAL_DB_NAME
          );


        request.onsuccess =
          () => {
            resolve(
              request.result
            );
          };


        request.onerror =
          () => {
            reject(
              request.error ||
              new Error(
                "Could not open local Chati-AI database."
              )
            );
          };
      }
    );
  }


  // =========================
  // READ LOCAL APP DATA
  // =========================

  async function readLocalAppData(
    key
  ) {
    try {
      const database =
        await openLocalDatabase();


      if (
        !database
          .objectStoreNames
          .contains(
            LOCAL_APP_STORE
          )
      ) {
        database.close();

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
            const transaction =
              database.transaction(
                LOCAL_APP_STORE,
                "readonly"
              );


            const request =
              transaction
                .objectStore(
                  LOCAL_APP_STORE
                )
                .get(
                  key
                );


            request.onsuccess =
              () => {
                resolve(
                  request.result ??
                  null
                );
              };


            request.onerror =
              () => {
                reject(
                  request.error ||
                  new Error(
                    "Could not read local Chati-AI data."
                  )
                );
              };
          }
        );


      database.close();

      return value;
    }

    catch (
      error
    ) {
      console.warn(
        "[Chati-AI Sync] IndexedDB read failed. Trying localStorage.",
        error
      );


      return localStorage.getItem(
        key
      );
    }
  }


  // =========================
  // WRITE LOCAL APP DATA
  // =========================

  async function writeLocalAppData(
    key,
    value
  ) {
    const stringValue =
      String(
        value ?? ""
      );


    try {
      const database =
        await openLocalDatabase();


      if (
        !database
          .objectStoreNames
          .contains(
            LOCAL_APP_STORE
          )
      ) {
        database.close();


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
          const transaction =
            database.transaction(
              LOCAL_APP_STORE,
              "readwrite"
            );


          transaction
            .objectStore(
              LOCAL_APP_STORE
            )
            .put(
              stringValue,
              key
            );


          transaction.oncomplete =
            () => {
              resolve();
            };


          transaction.onerror =
            () => {
              reject(
                transaction.error ||
                new Error(
                  "Could not write local Chati-AI data."
                )
              );
            };
        }
      );


      database.close();
    }

    catch (
      error
    ) {
      console.warn(
        "[Chati-AI Sync] IndexedDB write failed. Using localStorage.",
        error
      );


      localStorage.setItem(
        key,
        stringValue
      );
    }
  }


  // =========================
  // LOAD LOCAL CHARACTERS
  // =========================

  async function getLocalCharacters() {
    const raw =
      await readLocalAppData(
        CHARACTERS_KEY
      );


    if (!raw) {
      return [];
    }


    try {
      const parsed =
        typeof raw === "string"
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


  // =========================
  // CHARACTER FILTER
  // =========================

  function isStandaloneCharacter(
    character
  ) {
    return Boolean(
      character &&
      !character.isGroup &&
      character.id !== null &&
      character.id !== undefined
    );
  }


  // =========================
  // MEDIA DETECTION
  // =========================

  function isLocalMediaValue(
    value
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return false;
    }


    const normalized =
      value
        .trim()
        .toLowerCase();


    return (
      normalized.startsWith(
        "data:"
      ) ||
      normalized.startsWith(
        "blob:"
      )
    );
  }


  // =========================
  // CLONE HELPER
  // =========================

  function safeClone(
    value
  ) {
    if (
      typeof structuredClone ===
      "function"
    ) {
      return structuredClone(
        value
      );
    }


    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }


  // =========================
  // PREPARE CHARACTER
  // FOR CLOUD
  // =========================

  function prepareCharacterForCloud(
    character
  ) {
    const clone =
      safeClone(
        character
      );


    let mediaDeferred =
      false;


    // Avatar stored locally.
    if (
      isLocalMediaValue(
        clone.image
      )
    ) {
      clone.image =
        "";

      mediaDeferred =
        true;
    }


    // Background stored locally.
    if (
      isLocalMediaValue(
        clone.background
      )
    ) {
      clone.background =
        "";

      mediaDeferred =
        true;
    }


    return {
      schemaVersion:
        1,

      character:
        clone,

      media: {
        deferred:
          mediaDeferred
      }
    };
  }


  // =========================
  // PREVIEW LOCAL CHARACTERS
  // =========================

  async function previewLocalCharacters() {
    const characters =
      (
        await getLocalCharacters()
      )
        .filter(
          isStandaloneCharacter
        );


    return characters.map(
      character => ({
        id:
          String(
            character.id
          ),

        name:
          character.name ||
          "Unnamed Character",

        hasLocalImage:
          isLocalMediaValue(
            character.image
          ),

        hasLocalBackground:
          isLocalMediaValue(
            character.background
          )
      })
    );
  }


  // =========================
  // PUSH LOCAL CHARACTERS
  // TO CLOUD
  // =========================

  async function pushCharacters() {
    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const localCharacters =
      await getLocalCharacters();


    const standaloneCharacters =
      localCharacters.filter(
        isStandaloneCharacter
      );


    const results =
      [];


    for (
      const character of
      standaloneCharacters
    ) {
      const localId =
        String(
          character.id
        );


      const payload =
        prepareCharacterForCloud(
          character
        );


      const cloudRow =
        await window.ChatiCloud.put(
          "character",
          localId,
          payload
        );


      results.push({
        id:
          localId,

        name:
          character.name ||
          "Unnamed Character",

        cloudId:
          cloudRow?.id ||
          null,

        version:
          cloudRow?.version ||
          null,

        mediaDeferred:
          Boolean(
            payload
              .media
              .deferred
          )
      });


      console.log(
        "[Chati-AI Sync] Character uploaded:",
        character.name,
        localId
      );
    }


    return {
      scanned:
        localCharacters.length,

      uploaded:
        results.length,

      skippedGroups:
        localCharacters.length -
        standaloneCharacters.length,

      results
    };
  }


  // =========================
  // PREVIEW CLOUD CHARACTERS
  // =========================

  async function previewCloudCharacters() {
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
          "character"
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

        mediaDeferred:
          Boolean(
            row.payload
              ?.media
              ?.deferred
          )
      })
    );
  }


  // =========================
  // GET CHARACTER
  // FROM CLOUD ROW
  // =========================

  function getCharacterFromCloudRow(
    row
  ) {
    const source =
      row
        ?.payload
        ?.character;


    if (
      !source ||
      typeof source !==
        "object"
    ) {
      return null;
    }


    // Cloud character rows must
    // never contain groups.
    if (
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
      safeClone(
        source
      );


    // local_id is the cloud identity.
    //
    // Preserve the original local ID
    // type when it already matches.
    if (
      character.id === null ||
      character.id === undefined ||
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


  // =========================
  // PREVIEW CLOUD -> LOCAL
  // =========================

  async function previewCharacterPull() {
    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const localCharacters =
      await getLocalCharacters();


    const cloudRows =
      await window.ChatiCloud
        .getAll(
          "character"
        );


    const localIds =
      new Set(
        localCharacters
          .filter(
            item =>
              item &&
              item.id !== null &&
              item.id !== undefined
          )
          .map(
            item =>
              String(
                item.id
              )
          )
      );


    const cloudOnly =
      [];

    const alreadyLocal =
      [];

    const invalid =
      [];


    for (
      const row of
      cloudRows
    ) {
      const character =
        getCharacterFromCloudRow(
          row
        );


      if (
        !character
      ) {
        invalid.push(
          row.local_id
        );

        continue;
      }


      const id =
        String(
          character.id
        );


      if (
        localIds.has(
          id
        )
      ) {
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
      localTotal:
        localCharacters.length,

      cloudTotal:
        cloudRows.length,

      cloudOnly:
        cloudOnly.length,

      alreadyLocal:
        alreadyLocal.length,

      invalid:
        invalid.length,

      cloudOnlyCharacters:
        cloudOnly,

      alreadyLocalCharacters:
        alreadyLocal,

      invalidRows:
        invalid
    };
  }


  // =========================
  // SAFE CLOUD -> LOCAL MERGE
  // =========================

  async function pullCharacters() {
    if (
      !window.ChatiCloud
    ) {
      throw new Error(
        "ChatiCloud is unavailable."
      );
    }


    const localCharacters =
      await getLocalCharacters();


    const cloudRows =
      await window.ChatiCloud
        .getAll(
          "character"
        );


    // Preserve ALL local entities,
    // including groups.
    const merged =
      [
        ...localCharacters
      ];


    const existingIds =
      new Set(
        localCharacters
          .filter(
            item =>
              item &&
              item.id !== null &&
              item.id !== undefined
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

    let skippedExisting =
      0;

    let skippedInvalid =
      0;


    for (
      const row of
      cloudRows
    ) {
      const character =
        getCharacterFromCloudRow(
          row
        );


      if (
        !character
      ) {
        skippedInvalid +=
          1;

        continue;
      }


      const id =
        String(
          character.id
        );


      // =========================
      // V4.0.3 CONFLICT RULE
      //
      // LOCAL WINS.
      //
      // Existing local characters
      // are NEVER overwritten here.
      // =========================

      if (
        existingIds.has(
          id
        )
      ) {
        skippedExisting +=
          1;

        continue;
      }


      merged.push(
        character
      );


      existingIds.add(
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
      await writeLocalAppData(
        CHARACTERS_KEY,

        JSON.stringify(
          merged
        )
      );
    }


    const result = {
      localBefore:
        localCharacters.length,

      cloudRows:
        cloudRows.length,

      added:
        added.length,

      skippedExisting,

      skippedInvalid,

      localAfter:
        merged.length,

      requiresReload:
        added.length > 0,

      addedCharacters:
        added
    };


    console.log(
      "[Chati-AI Sync] Cloud pull complete:",
      result
    );


    return result;
  }


  // =========================
  // CONNECTION SUMMARY
  // =========================

  async function status() {
    const local =
      await previewLocalCharacters();


    let cloud =
      [];


    try {
      cloud =
        await previewCloudCharacters();
    }

    catch {
      // Signed-out mode is allowed.
    }


    let signedIn =
      false;


    try {
      const authResult =
        await window.ChatiAuth
          ?.getSession?.();


      signedIn =
        Boolean(
          authResult
            ?.data
            ?.session
        );
    }

    catch {
      signedIn =
        false;
    }


    return {
      localCharacters:
        local.length,

      cloudCharacters:
        cloud.length,

      signedIn
    };
  }


  // =========================
  // PUBLIC SYNC API
  // =========================

  window.ChatiSync =
    Object.freeze({
      status,

      previewLocalCharacters,

      previewCloudCharacters,

      previewCharacterPull,

      pushCharacters,

      pullCharacters
    });


  console.log(
    "[Chati-AI Sync] V4.0.3 character push/pull ready."
  );

})();