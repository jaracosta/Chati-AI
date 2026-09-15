// ============================================================
// CHATI-AI V4.0.3 — FIRST CLOUD SYNC
//
// First controlled sync:
// Local standalone characters -> Supabase
//
// Does NOT:
// - overwrite local data
// - sync chats
// - sync groups
// - sync Private Chat / Private Group
// - upload local media/base64
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
  // READ APP DATA VALUE
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
          ? JSON.parse(raw)
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
  // PRIVATE / GROUP FILTER
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
  // PREPARE CHARACTER FOR CLOUD
  // =========================

  function prepareCharacterForCloud(
    character
  ) {
    const clone =
      typeof structuredClone ===
      "function"

        ? structuredClone(
            character
          )

        : JSON.parse(
            JSON.stringify(
              character
            )
          );


    let mediaDeferred =
      false;


    // Character avatar
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


    // Character background
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
  // PUSH CHARACTERS TO CLOUD
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


    const results = [];


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
            payload.media
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


    return {
      localCharacters:
        local.length,

      cloudCharacters:
        cloud.length,

      signedIn:
        Boolean(
          (
            await window.ChatiAuth
              ?.getSession?.()
          )
            ?.data
            ?.session
        )
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
      pushCharacters
    });


  console.log(
    "[Chati-AI Sync] V4.0.3 character sync ready."
  );

})();