// ============================================================
// CHATI-AI V6.0.3 — ACCOUNT-SCOPED LOCAL WORKSPACES
//
// Active Chati-AI data stays in the original chatiMediaDB/appData
// store so the existing V4/V5 sync engine remains compatible.
//
// Per-account archives live in a SEPARATE IndexedDB database. This
// prevents another account's archived characters/chats from leaking
// into Backup & Restore snapshots or the normal app-data cache.
//
// Signed-out mode always mounts an empty character/chat workspace.
// Private Chat / Private Group remain page-memory only.
// ============================================================

(() => {
  "use strict";

  const ACTIVE_DB_NAME =
    "chatiMediaDB";

  const ACTIVE_DB_VERSION =
    2;

  const ACTIVE_MEDIA_STORE =
    "media";

  const ACTIVE_APP_STORE =
    "appData";

  const ARCHIVE_DB_NAME =
    "chatiAccountDB";

  const ARCHIVE_DB_VERSION =
    1;

  const ARCHIVE_STORE =
    "accountData";

  const OWNER_KEY =
    "chatiActiveDataOwnerV6";

  const LOCAL_ARCHIVE_PREFIX =
    "chatiAccountLocal::";

  const SIGNED_OUT_OWNER =
    "__signed_out__";

  const LEGACY_OWNER =
    "__legacy__";

  let switching =
    false;


  function isActiveAppKey(
    key
  ) {

    const value =
      String(
        key ||
        ""
      );


    return (
      value ===
        "chatiCharacters" ||
      value.startsWith(
        "chatiChats_"
      )
    );

  }


  function isAccountLocalKey(
    key
  ) {

    const value =
      String(
        key ||
        ""
      );


    return (
      value.startsWith(
        "chatiActiveChat_"
      ) ||
      value.startsWith(
        "chatiGroupResponder_"
      ) ||
      value.startsWith(
        "chatiChat_"
      )
    );

  }


  function safeOwner(
    value
  ) {

    return String(
      value ||
      SIGNED_OUT_OWNER
    )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )
      .slice(
        0,
        160
      );

  }


  function archiveKey(
    owner,
    key
  ) {

    return (
      safeOwner(
        owner
      ) +
      "::" +
      String(
        key
      )
    );

  }


  function archivePrefix(
    owner
  ) {

    return (
      safeOwner(
        owner
      ) +
      "::"
    );

  }


  function localArchiveKey(
    owner,
    key
  ) {

    return (
      LOCAL_ARCHIVE_PREFIX +
      safeOwner(
        owner
      ) +
      "::" +
      String(
        key
      )
    );

  }


  function openActiveDb() {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const request =
          indexedDB.open(
            ACTIVE_DB_NAME,
            ACTIVE_DB_VERSION
          );


        request.onupgradeneeded =
          () => {

            const database =
              request.result;


            if (
              !database
                .objectStoreNames
                .contains(
                  ACTIVE_MEDIA_STORE
                )
            ) {

              database.createObjectStore(
                ACTIVE_MEDIA_STORE
              );

            }


            if (
              !database
                .objectStoreNames
                .contains(
                  ACTIVE_APP_STORE
                )
            ) {

              database.createObjectStore(
                ACTIVE_APP_STORE
              );

            }

          };


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
                "Could not open Chati-AI active storage."
              )
            );

      }
    );

  }


  function openArchiveDb() {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const request =
          indexedDB.open(
            ARCHIVE_DB_NAME,
            ARCHIVE_DB_VERSION
          );


        request.onupgradeneeded =
          () => {

            const database =
              request.result;


            if (
              !database
                .objectStoreNames
                .contains(
                  ARCHIVE_STORE
                )
            ) {

              database.createObjectStore(
                ARCHIVE_STORE
              );

            }

          };


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
                "Could not open Chati-AI account archive."
              )
            );

      }
    );

  }


  async function readStoreEntries(
    openDatabase,
    storeName
  ) {

    const database =
      await openDatabase();


    if (
      !database
        .objectStoreNames
        .contains(
          storeName
        )
    ) {

      database.close();

      return [];

    }


    return new Promise(
      (
        resolve,
        reject
      ) => {

        const entries =
          [];


        const transaction =
          database.transaction(
            storeName,
            "readonly"
          );


        const request =
          transaction
            .objectStore(
              storeName
            )
            .openCursor();


        request.onsuccess =
          () => {

            const cursor =
              request.result;


            if (
              !cursor
            ) {
              return;
            }


            entries.push([
              String(
                cursor.key
              ),
              cursor.value
            ]);


            cursor.continue();

          };


        transaction.oncomplete =
          () => {

            database.close();

            resolve(
              entries
            );

          };


        transaction.onerror =
          () => {

            database.close();

            reject(
              transaction.error ||
              new Error(
                "Could not read Chati-AI account storage."
              )
            );

          };

      }
    );

  }


  async function readActiveEntries() {

    const entries =
      await readStoreEntries(
        openActiveDb,
        ACTIVE_APP_STORE
      );


    return entries.filter(
      entry =>
        isActiveAppKey(
          entry[0]
        )
    );

  }


  async function clearActiveEntries() {

    const database =
      await openActiveDb();


    await new Promise(
      (
        resolve,
        reject
      ) => {

        const transaction =
          database.transaction(
            ACTIVE_APP_STORE,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            ACTIVE_APP_STORE
          );


        const request =
          store.openCursor();


        request.onsuccess =
          () => {

            const cursor =
              request.result;


            if (
              !cursor
            ) {
              return;
            }


            if (
              isActiveAppKey(
                cursor.key
              )
            ) {

              cursor.delete();

            }


            cursor.continue();

          };


        transaction.oncomplete =
          () => {

            database.close();

            resolve();

          };


        transaction.onerror =
          () => {

            database.close();

            reject(
              transaction.error ||
              new Error(
                "Could not clear active Chati-AI workspace."
              )
            );

          };

      }
    );

  }


  async function writeActiveEntries(
    entries
  ) {

    if (
      !entries.length
    ) {
      return;
    }


    const database =
      await openActiveDb();


    await new Promise(
      (
        resolve,
        reject
      ) => {

        const transaction =
          database.transaction(
            ACTIVE_APP_STORE,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            ACTIVE_APP_STORE
          );


        for (
          const [
            key,
            value
          ]
          of entries
        ) {

          if (
            isActiveAppKey(
              key
            )
          ) {

            store.put(
              value,
              key
            );

          }

        }


        transaction.oncomplete =
          () => {

            database.close();

            resolve();

          };


        transaction.onerror =
          () => {

            database.close();

            reject(
              transaction.error ||
              new Error(
                "Could not restore active Chati-AI workspace."
              )
            );

          };

      }
    );

  }


  async function replaceArchiveSnapshot(
    owner,
    entries
  ) {

    const database =
      await openArchiveDb();


    const prefix =
      archivePrefix(
        owner
      );


    await new Promise(
      (
        resolve,
        reject
      ) => {

        const transaction =
          database.transaction(
            ARCHIVE_STORE,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            ARCHIVE_STORE
          );


        const cursorRequest =
          store.openCursor();


        cursorRequest.onsuccess =
          () => {

            const cursor =
              cursorRequest.result;


            if (
              !cursor
            ) {
              return;
            }


            if (
              String(
                cursor.key
              ).startsWith(
                prefix
              )
            ) {

              cursor.delete();

            }


            cursor.continue();

          };


        for (
          const [
            key,
            value
          ]
          of entries
        ) {

          if (
            isActiveAppKey(
              key
            )
          ) {

            store.put(
              value,
              archiveKey(
                owner,
                key
              )
            );

          }

        }


        transaction.oncomplete =
          () => {

            database.close();

            resolve();

          };


        transaction.onerror =
          () => {

            database.close();

            reject(
              transaction.error ||
              new Error(
                "Could not archive Chati-AI workspace."
              )
            );

          };

      }
    );

  }


  async function readArchiveSnapshot(
    owner
  ) {

    const entries =
      await readStoreEntries(
        openArchiveDb,
        ARCHIVE_STORE
      );


    const prefix =
      archivePrefix(
        owner
      );


    return entries
      .filter(
        entry =>
          entry[0]
            .startsWith(
              prefix
            )
      )
      .map(
        entry => [
          entry[0]
            .slice(
              prefix.length
            ),
          entry[1]
        ]
      )
      .filter(
        entry =>
          isActiveAppKey(
            entry[0]
          )
      );

  }


  function getActiveLocalStorageKeys() {

    const keys =
      [];


    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {

      const key =
        localStorage.key(
          index
        );


      if (
        key &&
        isAccountLocalKey(
          key
        )
      ) {

        keys.push(
          key
        );

      }

    }


    return keys;

  }


  function archiveLocalStorage(
    owner
  ) {

    if (
      owner ===
      SIGNED_OUT_OWNER
    ) {

      getActiveLocalStorageKeys()
        .forEach(
          key =>
            localStorage.removeItem(
              key
            )
        );


      return;

    }


    for (
      const key
      of getActiveLocalStorageKeys()
    ) {

      const value =
        localStorage.getItem(
          key
        );


      if (
        value !==
        null
      ) {

        localStorage.setItem(
          localArchiveKey(
            owner,
            key
          ),
          value
        );

      }


      localStorage.removeItem(
        key
      );

    }

  }


  function restoreLocalStorage(
    owner
  ) {

    getActiveLocalStorageKeys()
      .forEach(
        key =>
          localStorage.removeItem(
            key
          )
      );


    if (
      owner ===
      SIGNED_OUT_OWNER
    ) {
      return;
    }


    const prefix =
      LOCAL_ARCHIVE_PREFIX +
      safeOwner(
        owner
      ) +
      "::";


    const restore =
      [];


    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {

      const key =
        localStorage.key(
          index
        );


      if (
        key &&
        key.startsWith(
          prefix
        )
      ) {

        restore.push([
          key.slice(
            prefix.length
          ),
          localStorage.getItem(
            key
          )
        ]);

      }

    }


    for (
      const [
        key,
        value
      ]
      of restore
    ) {

      if (
        value !==
        null &&
        isAccountLocalKey(
          key
        )
      ) {

        localStorage.setItem(
          key,
          value
        );

      }

    }

  }


  async function restoreSnapshotForOwner(
    owner
  ) {

    if (
      owner ===
      SIGNED_OUT_OWNER
    ) {

      return [];

    }


    let target =
      await readArchiveSnapshot(
        owner
      );


    if (
      !target.length &&
      owner !==
        LEGACY_OWNER
    ) {

      const legacy =
        await readArchiveSnapshot(
          LEGACY_OWNER
        );


      if (
        legacy.length
      ) {

        target =
          legacy;


        await replaceArchiveSnapshot(
          owner,
          legacy
        );

      }

    }


    return target;

  }


  async function swapDataset(
    fromOwner,
    toOwner
  ) {

    const currentEntries =
      await readActiveEntries();


    if (
      fromOwner !==
      SIGNED_OUT_OWNER
    ) {

      await replaceArchiveSnapshot(
        fromOwner,
        currentEntries
      );

    }


    await clearActiveEntries();


    const targetEntries =
      await restoreSnapshotForOwner(
        toOwner
      );


    await writeActiveEntries(
      targetEntries
    );


    archiveLocalStorage(
      fromOwner
    );


    restoreLocalStorage(
      toOwner
    );


    localStorage.setItem(
      OWNER_KEY,
      toOwner
    );


    return {
      from:
        fromOwner,

      owner:
        toOwner,

      restoredKeys:
        targetEntries.length
    };

  }


  async function getDesiredOwner() {

    if (
      window.ChatiAuthReady
    ) {

      try {

        await window.ChatiAuthReady;

      }

      catch {}

    }


    if (
      !window.ChatiAuth
    ) {

      return SIGNED_OUT_OWNER;

    }


    const {
      data
    } =
      await window.ChatiAuth
        .getSession();


    return (
      data?.session?.user?.id ||
      SIGNED_OUT_OWNER
    );

  }


  async function prepareInitialDataset() {

    const desiredOwner =
      await getDesiredOwner();


    const currentOwner =
      localStorage.getItem(
        OWNER_KEY
      );


    if (
      !currentOwner
    ) {

      if (
        desiredOwner !==
        SIGNED_OUT_OWNER
      ) {

        // Upgrade path: the legacy global active workspace belonged
        // to the currently signed-in user. Keep it mounted so there
        // is no first-upgrade data loss.
        localStorage.setItem(
          OWNER_KEY,
          desiredOwner
        );


        return {
          changed:
            false,

          owner:
            desiredOwner,

          migrated:
            true
        };

      }


      const legacyEntries =
        await readActiveEntries();


      if (
        legacyEntries.length
      ) {

        await replaceArchiveSnapshot(
          LEGACY_OWNER,
          legacyEntries
        );

      }


      await clearActiveEntries();


      getActiveLocalStorageKeys()
        .forEach(
          key =>
            localStorage.removeItem(
              key
            )
        );


      localStorage.setItem(
        OWNER_KEY,
        SIGNED_OUT_OWNER
      );


      return {
        changed:
          Boolean(
            legacyEntries.length
          ),

        owner:
          SIGNED_OUT_OWNER,

        archivedLegacy:
          legacyEntries.length
      };

    }


    if (
      currentOwner ===
      desiredOwner
    ) {

      if (
        desiredOwner ===
        SIGNED_OUT_OWNER
      ) {

        await clearActiveEntries();


        getActiveLocalStorageKeys()
          .forEach(
            key =>
              localStorage.removeItem(
                key
              )
          );

      }


      return {
        changed:
          false,

        owner:
          desiredOwner
      };

    }


    const result =
      await swapDataset(
        currentOwner,
        desiredOwner
      );


    return {
      changed:
        true,

      ...result
    };

  }


  async function activateUser(
    userId,
    {
      reload =
        true
    } = {}
  ) {

    if (
      switching
    ) {

      return {
        changed:
          false,

        busy:
          true
      };

    }


    switching =
      true;


    try {

      const desiredOwner =
        userId ||
        SIGNED_OUT_OWNER;


      const currentOwner =
        localStorage.getItem(
          OWNER_KEY
        ) ||
        SIGNED_OUT_OWNER;


      if (
        currentOwner ===
        desiredOwner
      ) {

        if (
          desiredOwner ===
          SIGNED_OUT_OWNER
        ) {

          await clearActiveEntries();


          getActiveLocalStorageKeys()
            .forEach(
              key =>
                localStorage.removeItem(
                  key
                )
            );

        }


        return {
          changed:
            false,

          owner:
            desiredOwner
        };

      }


      const result =
        await swapDataset(
          currentOwner,
          desiredOwner
        );


      const detail = {
        changed:
          true,

        ...result
      };


      window.dispatchEvent(
        new CustomEvent(
          "chati:accountdataswitched",
          {
            detail
          }
        )
      );


      if (
        reload
      ) {

        window.setTimeout(
          () =>
            window.location.reload(),
          50
        );

      }


      return detail;

    }

    finally {

      switching =
        false;

    }

  }


  const ready =
    prepareInitialDataset()
      .catch(
        error => {

          console.error(
            "[Chati-AI Account Data] Initial account isolation failed:",
            error
          );


          return {
            changed:
              false,

            error:
              String(
                error?.message ||
                error
              )
          };

        }
      );


  window.ChatiAccountData =
    Object.freeze({
      ready,

      activateUser,

      getOwner() {

        return localStorage.getItem(
          OWNER_KEY
        ) ||
        null;

      },

      async status() {

        return {
          owner:
            localStorage.getItem(
              OWNER_KEY
            ) ||
            null,

          activeKeys:
            (
              await readActiveEntries()
            )
              .map(
                entry =>
                  entry[0]
              ),

          archiveDatabase:
            ARCHIVE_DB_NAME
        };

      }
    });


  window.ChatiAccountDataReady =
    ready;


  window.addEventListener(
    "chati:authchange",
    event => {

      const authEvent =
        String(
          event.detail?.event ||
          ""
        );


      if (
        authEvent ===
          "TOKEN_REFRESHED" ||
        authEvent ===
          "USER_UPDATED"
      ) {

        return;

      }


      const userId =
        event.detail?.user?.id ||
        null;


      activateUser(
        userId,
        {
          reload:
            authEvent !==
            "INITIAL_SESSION"
        }
      )
        .catch(
          error => {

            console.error(
              "[Chati-AI Account Data] Account switch failed:",
              error
            );

          }
        );

    }
  );


  console.log(
    "[Chati-AI Account Data] V6.0.3 separate account workspace archive ready."
  );

})();
