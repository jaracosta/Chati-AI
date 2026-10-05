// ============================================================
// CHATI-AI V6.0.1 — MULTI-ACCOUNT AUTH
//
// Keeps the existing primary Supabase session compatible.
// Supports additional signed-in account slots without storing
// passwords. Switching accounts swaps the active Supabase client.
// ============================================================

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://pqnebvtbxwpizhzvrisu.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Ywt13f_gR40wYhFANM76-A_RFc4BkHS";

  const EMAIL_REDIRECT_URL =
    "https://chati-ai.com/";

  const SLOTS_KEY =
    "chati-ai-account-slots-v6";

  const ACTIVE_SLOT_KEY =
    "chati-ai-active-account-slot-v6";

  const PRIMARY_SLOT_ID =
    "primary";

  const PRIMARY_STORAGE_KEY =
    "chati-ai-auth";

  let passwordRecoveryActive =
    false;

  let activeSlotId =
    localStorage.getItem(
      ACTIVE_SLOT_KEY
    ) ||
    PRIMARY_SLOT_ID;

  const clients =
    new Map();

  const subscribers =
    new Set();


  function randomId() {

    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {

      return (
        "acct_" +
        window.crypto
          .randomUUID()
          .replace(
            /-/g,
            ""
          )
          .slice(
            0,
            18
          )
      );

    }


    return (
      "acct_" +
      Date.now()
        .toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .slice(
          2,
          10
        )
    );

  }


  function readSavedSlots() {

    try {

      const value =
        JSON.parse(
          localStorage.getItem(
            SLOTS_KEY
          ) ||
          "[]"
        );


      return Array.isArray(
        value
      )
        ? value
            .filter(
              slot =>
                slot &&
                typeof slot ===
                  "object" &&
                slot.id &&
                slot.storageKey
            )
        : [];

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Auth] Could not read saved account slots.",
        error
      );


      return [];

    }

  }


  let slots =
    readSavedSlots();


  if (
    !slots.some(
      slot =>
        slot.id ===
        PRIMARY_SLOT_ID
    )
  ) {

    slots.unshift({
      id:
        PRIMARY_SLOT_ID,

      storageKey:
        PRIMARY_STORAGE_KEY,

      email:
        null,

      userId:
        null,

      lastUsedAt:
        Date.now()
    });

  }


  if (
    !slots.some(
      slot =>
        slot.id ===
        activeSlotId
    )
  ) {

    activeSlotId =
      PRIMARY_SLOT_ID;

  }


  function saveSlots() {

    try {

      localStorage.setItem(
        SLOTS_KEY,
        JSON.stringify(
          slots.map(
            slot => ({
              id:
                slot.id,

              storageKey:
                slot.storageKey,

              email:
                slot.email ||
                null,

              userId:
                slot.userId ||
                null,

              lastUsedAt:
                Number(
                  slot.lastUsedAt
                ) ||
                Date.now()
            })
          )
        )
      );


      localStorage.setItem(
        ACTIVE_SLOT_KEY,
        activeSlotId
      );

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Auth] Could not persist account slots.",
        error
      );

    }

  }


  function getSlot(
    slotId = activeSlotId
  ) {

    return (
      slots.find(
        slot =>
          slot.id ===
          slotId
      ) ||
      null
    );

  }


  function notify(
    event,
    session,
    extra = {}
  ) {

    const user =
      session?.user ||
      null;


    const detail = {
      event,
      user,
      session,
      slotId:
        activeSlotId,
      ...extra
    };


    window.dispatchEvent(
      new CustomEvent(
        "chati:authchange",
        {
          detail
        }
      )
    );


    for (
      const callback
      of subscribers
    ) {

      try {

        callback(
          event,
          session
        );

      }

      catch (
        error
      ) {

        console.error(
          "[Chati-AI Auth] Subscriber failed:",
          error
        );

      }

    }

  }


  function updateSlotFromSession(
    slotId,
    session
  ) {

    const slot =
      getSlot(
        slotId
      );


    if (
      !slot
    ) {
      return;
    }


    const user =
      session?.user ||
      null;


    slot.userId =
      user?.id ||
      null;

    slot.email =
      user?.email ||
      slot.email ||
      null;

    slot.lastUsedAt =
      Date.now();


    saveSlots();

  }


  function createClientForSlot(
    slot
  ) {

    if (
      clients.has(
        slot.id
      )
    ) {

      return clients.get(
        slot.id
      );

    }


    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {

      throw new Error(
        "Supabase JS library did not load."
      );

    }


    const client =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession:
              true,

            autoRefreshToken:
              true,

            detectSessionInUrl:
              slot.id ===
              activeSlotId,

            storageKey:
              slot.storageKey
          }
        }
      );


    client.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        updateSlotFromSession(
          slot.id,
          session
        );


        if (
          slot.id !==
          activeSlotId
        ) {

          return;

        }


        if (
          event ===
          "PASSWORD_RECOVERY"
        ) {

          passwordRecoveryActive =
            true;


          window.dispatchEvent(
            new CustomEvent(
              "chati:passwordrecovery",
              {
                detail: {
                  user:
                    session?.user ||
                    null,
                  slotId:
                    slot.id
                }
              }
            )
          );

        }


        notify(
          event,
          session
        );

      }
    );


    clients.set(
      slot.id,
      client
    );


    return client;

  }


  function getClient() {

    const slot =
      getSlot();


    if (
      !slot
    ) {

      throw new Error(
        "Active account slot is unavailable."
      );

    }


    return createClientForSlot(
      slot
    );

  }


  async function getSession() {

    return getClient()
      .auth
      .getSession();

  }


  async function getUser() {

    return getClient()
      .auth
      .getUser();

  }


  async function signUp(
    email,
    password
  ) {

    return getClient()
      .auth
      .signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            EMAIL_REDIRECT_URL
        }
      });

  }


  async function signIn(
    email,
    password
  ) {

    const result =
      await getClient()
        .auth
        .signInWithPassword({
          email,
          password
        });


    if (
      !result.error
    ) {

      updateSlotFromSession(
        activeSlotId,
        result.data?.session ||
        null
      );

    }


    return result;

  }


  async function addAccount(
    email,
    password
  ) {

    const slotId =
      randomId();


    const slot = {
      id:
        slotId,

      storageKey:
        "chati-ai-auth-" +
        slotId,

      email:
        String(
          email ||
          ""
        ).trim() ||
        null,

      userId:
        null,

      lastUsedAt:
        Date.now()
    };


    slots.push(
      slot
    );


    saveSlots();


    const client =
      createClientForSlot(
        slot
      );


    const result =
      await client.auth
        .signInWithPassword({
          email,
          password
        });


    if (
      result.error
    ) {

      slots =
        slots.filter(
          item =>
            item.id !==
            slotId
        );


      clients.delete(
        slotId
      );


      saveSlots();


      return {
        ...result,
        slot:
          null
      };

    }


    updateSlotFromSession(
      slotId,
      result.data?.session ||
      null
    );


    activeSlotId =
      slotId;


    saveSlots();


    notify(
      "ACCOUNT_SWITCHED",
      result.data?.session ||
      null,
      {
        previousSlotId:
          null
      }
    );


    return {
      ...result,
      slot:
        getSlot(
          slotId
        )
    };

  }


  async function switchAccount(
    slotId
  ) {

    const target =
      getSlot(
        slotId
      );


    if (
      !target
    ) {

      throw new Error(
        "That saved account is unavailable."
      );

    }


    const previousSlotId =
      activeSlotId;


    const client =
      createClientForSlot(
        target
      );


    const {
      data,
      error
    } =
      await client.auth
        .getSession();


    if (error) {
      throw error;
    }


    if (
      !data?.session?.user
    ) {

      throw new Error(
        "That account session expired. Sign in to it again."
      );

    }


    activeSlotId =
      target.id;

    passwordRecoveryActive =
      false;


    updateSlotFromSession(
      target.id,
      data.session
    );


    saveSlots();


    notify(
      "ACCOUNT_SWITCHED",
      data.session,
      {
        previousSlotId
      }
    );


    return {
      data,
      error:
        null,
      slot:
        target
    };

  }


  async function removeAccount(
    slotId
  ) {

    const target =
      getSlot(
        slotId
      );


    if (
      !target
    ) {

      return {
        ok:
          true
      };

    }


    const client =
      createClientForSlot(
        target
      );


    try {

      await client.auth
        .signOut({
          scope:
            "local"
        });

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Auth] Could not clear removed account session.",
        error
      );

    }


    if (
      target.id ===
      PRIMARY_SLOT_ID
    ) {

      target.email =
        null;

      target.userId =
        null;

      target.lastUsedAt =
        Date.now();

    }

    else {

      slots =
        slots.filter(
          slot =>
            slot.id !==
            target.id
        );


      clients.delete(
        target.id
      );

    }


    if (
      activeSlotId ===
      target.id
    ) {

      activeSlotId =
        PRIMARY_SLOT_ID;

    }


    saveSlots();


    const {
      data
    } =
      await getClient()
        .auth
        .getSession();


    notify(
      "ACCOUNT_REMOVED",
      data?.session ||
      null,
      {
        removedSlotId:
          target.id
      }
    );


    return {
      ok:
        true
    };

  }


  async function listAccounts() {

    const result = [];


    for (
      const slot
      of slots
    ) {

      try {

        const client =
          createClientForSlot(
            slot
          );


        const {
          data
        } =
          await client.auth
            .getSession();


        const user =
          data?.session?.user ||
          null;


        if (
          user
        ) {

          updateSlotFromSession(
            slot.id,
            data.session
          );

        }


        result.push({
          id:
            slot.id,

          email:
            user?.email ||
            slot.email ||
            "Signed-out account",

          userId:
            user?.id ||
            slot.userId ||
            null,

          signedIn:
            Boolean(
              user
            ),

          active:
            slot.id ===
            activeSlotId,

          lastUsedAt:
            slot.lastUsedAt ||
            0
        });

      }

      catch (
        error
      ) {

        result.push({
          id:
            slot.id,

          email:
            slot.email ||
            "Unavailable account",

          userId:
            slot.userId ||
            null,

          signedIn:
            false,

          active:
            slot.id ===
            activeSlotId,

          lastUsedAt:
            slot.lastUsedAt ||
            0
        });

      }

    }


    return result.sort(
      (
        a,
        b
      ) =>
        (
          Number(
            b.active
          ) -
          Number(
            a.active
          )
        ) ||
        (
          b.lastUsedAt -
          a.lastUsedAt
        )
    );

  }


  async function signOut() {

    return getClient()
      .auth
      .signOut({
        scope:
          "local"
      });

  }


  async function sendPasswordReset(
    email
  ) {

    const cleanEmail =
      String(
        email ||
        ""
      ).trim();


    if (
      !cleanEmail
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Email address is required."
          )
      };

    }


    return getClient()
      .auth
      .resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo:
            EMAIL_REDIRECT_URL
        }
      );

  }


  async function updatePassword(
    newPassword
  ) {

    const password =
      String(
        newPassword ||
        ""
      );


    if (
      password.length <
      8
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Your password must be at least 8 characters."
          )
      };

    }


    const result =
      await getClient()
        .auth
        .updateUser({
          password
        });


    if (
      !result.error
    ) {

      passwordRecoveryActive =
        false;

    }


    return result;

  }


  async function changePassword(
    currentPassword,
    newPassword
  ) {

    const current =
      String(
        currentPassword ||
        ""
      );

    const next =
      String(
        newPassword ||
        ""
      );


    if (
      current.length <
      1
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Enter your current password."
          )
      };

    }


    if (
      next.length <
      8
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Your new password must be at least 8 characters."
          )
      };

    }


    const userResult =
      await getClient()
        .auth
        .getUser();


    const email =
      userResult?.data?.user?.email;


    if (
      !email
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Your account email is unavailable."
          )
      };

    }


    const verify =
      await getClient()
        .auth
        .signInWithPassword({
          email,
          password:
            current
        });


    if (
      verify.error
    ) {

      return {
        data:
          null,

        error:
          new Error(
            "Current password is incorrect."
          )
      };

    }


    return updatePassword(
      next
    );

  }


  async function updateUserMetadata(
    data
  ) {

    return getClient()
      .auth
      .updateUser({
        data:
          data ||
          {}
      });

  }


  function isPasswordRecovery() {

    return passwordRecoveryActive;

  }


  function getActiveAccountSlot() {

    return {
      ...getSlot()
    };

  }


  function onAuthStateChange(
    callback
  ) {

    subscribers.add(
      callback
    );


    return {
      data: {
        subscription: {
          unsubscribe() {

            subscribers.delete(
              callback
            );

          }
        }
      }
    };

  }


  async function initialize() {

    saveSlots();


    for (
      const slot
      of slots
    ) {

      createClientForSlot(
        slot
      );

    }


    try {

      const {
        data,
        error
      } =
        await getSession();


      if (error) {
        throw error;
      }


      updateSlotFromSession(
        activeSlotId,
        data?.session ||
        null
      );


      notify(
        "INITIAL_SESSION",
        data?.session ||
        null
      );


      console.log(
        "[Chati-AI Auth] V6.0.1 ready.",
        data?.session?.user
          ? "User: " +
            data.session.user.id
          : "Signed out"
      );

    }

    catch (
      error
    ) {

      console.error(
        "[Chati-AI Auth] Initialization failed:",
        error
      );

    }

  }


  window.ChatiAuth =
    Object.freeze({
      signUp,
      signIn,
      signOut,
      addAccount,
      switchAccount,
      removeAccount,
      listAccounts,
      getActiveAccountSlot,
      sendPasswordReset,
      updatePassword,
      changePassword,
      updateUserMetadata,
      isPasswordRecovery,
      getSession,
      getUser,
      getClient,
      onAuthStateChange
    });


  window.ChatiAuthReady =
    initialize();

})();
