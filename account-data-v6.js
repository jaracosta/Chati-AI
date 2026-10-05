// ============================================================
// CHATI-AI V6.0.2 — ACCOUNT-SCOPED LOCAL DATA
//
// Chati-AI keeps its existing active IndexedDB keys so V4/V5 sync
// code remains compatible. When the active account changes, this
// module archives the current active dataset under that user and
// restores the target user's dataset.
//
// Signed-out mode intentionally exposes an empty character/chat
// workspace and does not restore anonymous leftovers. Private Chat / Private Group remain temporary.
// ============================================================

(() => {
  "use strict";

  const DB_NAME =
    "chatiMediaDB";

  const APP_STORE =
    "appData";

  const OWNER_KEY =
    "chatiActiveDataOwnerV6";

  const ARCHIVE_PREFIX =
    "chatiAccountData::";

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

    return (
      key ===
        "chatiCharacters" ||
      String(
        key ||
        ""
      ).startsWith(
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
      ARCHIVE_PREFIX +
      safeOwner(
        owner
      ) +
      "::" +
      key
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
      key
    );

  }


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


        request.onupgradeneeded =
          () => {
            // script.js owns the database schema. We intentionally
            // do not create stores here.
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
                "Could not open local Chati-AI database."
              )
            );

      }
    );

  }


  async function readAllAppEntries() {

    let db;


    try {

      db =
        await openDb();


      if (
        !db.objectStoreNames
          .contains(
            APP_STORE
          )
      ) {

        db.close();

        return [];

      }


      return await new Promise(
        (
          resolve,
          reject
        ) => {

          const entries =
            [];


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


          tx.oncomplete =
            () => {

              db.close();

              resolve(
                entries
              );

            };


          tx.onerror =
            () => {

              db.close();

              reject(
                tx.error ||
                new Error(
                  "Could not read local account data."
                )
              );

            };

        }
      );

    }

    catch (
      error
    ) {

      try {
        db?.close();
      }
      catch {}


      console.warn(
        "[Chati-AI Account Data] IndexedDB read unavailable.",
        error
      );


      return [];

    }

  }


  async function mutateAppEntries(
    mutations
  ) {

    if (
      !mutations.length
    ) {
      return;
    }


    const db =
      await openDb();


    if (
      !db.objectStoreNames
        .contains(
          APP_STORE
        )
    ) {

      db.close();

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


        const store =
          tx.objectStore(
            APP_STORE
          );


        for (
          const mutation
          of mutations
        ) {

          if (
            mutation.type ===
            "delete"
          ) {

            store.delete(
              mutation.key
            );

          }

          else {

            store.put(
              mutation.value,
              mutation.key
            );

          }

        }


        tx.oncomplete =
          () => {

            db.close();
            resolve();

          };


        tx.onerror =
          () => {

            db.close();

            reject(
              tx.error ||
              new Error(
                "Could not switch local account data."
              )
            );

          };

      }
    );

  }


  function archiveLocalStorage(
    owner
  ) {

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


    for (
      const key
      of keys
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
        null
      ) {

        localStorage.setItem(
          key,
          value
        );

      }

    }

  }


  async function swapDataset(
    fromOwner,
    toOwner
  ) {

    const entries =
      await readAllAppEntries();


    const mutations =
      [];


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

        mutations.push({
          type:
            "put",

          key:
            archiveKey(
              fromOwner,
              key
            ),

          value
        });


        mutations.push({
          type:
            "delete",

          key
        });

      }

    }


    if (
      toOwner !==
      SIGNED_OUT_OWNER
    ) {

      const targetPrefix =
        ARCHIVE_PREFIX +
        safeOwner(
          toOwner
        ) +
        "::";


      for (
        const [
          key,
          value
        ]
        of entries
      ) {

        if (
          key.startsWith(
            targetPrefix
          )
        ) {

          const activeKey =
            key.slice(
              targetPrefix.length
            );


          if (
            isActiveAppKey(
              activeKey
            )
          ) {

            mutations.push({
              type:
                "put",

              key:
                activeKey,

              value
            });

          }

        }

      }

    }


    await mutateAppEntries(
      mutations
    );


    archiveLocalStorage(
      fromOwner
    );


    if (
      toOwner !==
      SIGNED_OUT_OWNER
    ) {

      restoreLocalStorage(
        toOwner
      );

    }


    localStorage.setItem(
      OWNER_KEY,
      toOwner
    );

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


    let currentOwner =
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


      currentOwner =
        LEGACY_OWNER;

    }


    if (
      currentOwner ===
      desiredOwner
    ) {

      if (
        desiredOwner ===
        SIGNED_OUT_OWNER
      ) {

        const entries =
          await readAllAppEntries();


        await mutateAppEntries(
          entries
            .filter(
              entry =>
                isActiveAppKey(
                  entry[0]
                )
            )
            .map(
              entry => ({
                type:
                  "delete",

                key:
                  entry[0]
              })
            )
        );


        const localKeys =
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

            localKeys.push(
              key
            );

          }

        }


        localKeys.forEach(
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


    await swapDataset(
      currentOwner,
      desiredOwner
    );


    return {
      changed:
        true,

      from:
        currentOwner,

      owner:
        desiredOwner
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
        (
          desiredOwner ===
            SIGNED_OUT_OWNER
            ? LEGACY_OWNER
            : desiredOwner
        );


      if (
        currentOwner ===
        desiredOwner
      ) {

        return {
          changed:
            false,

          owner:
            desiredOwner
        };

      }


      await swapDataset(
        currentOwner,
        desiredOwner
      );


      const result = {
        changed:
          true,

        from:
          currentOwner,

        owner:
          desiredOwner
      };


      window.dispatchEvent(
        new CustomEvent(
          "chati:accountdataswitched",
          {
            detail:
              result
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


      return result;

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

      }
    });


  window.ChatiAccountDataReady =
    ready;


  window.addEventListener(
    "chati:authchange",
    event => {

      const userId =
        event.detail?.user?.id ||
        null;


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
    "[Chati-AI Account Data] V6.0.2 account isolation ready."
  );

})();
