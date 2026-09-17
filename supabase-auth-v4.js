// ============================================================
// CHATI-AI V4.0.1 — ACCOUNT FOUNDATION
// Supabase Auth
// ============================================================

(() => {
  "use strict";

  console.log("[Chati-AI Auth] Starting...");


  // =========================
  // SUPABASE CONFIG
  // =========================

  const SUPABASE_URL =
    "https://pqnebvtbxwpizhzvrisu.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Ywt13f_gR40wYhFANM76-A_RFc4BkHS";

  const EMAIL_REDIRECT_URL =
    "https://chati-ai.com/";


  // =========================
  // CHECK SUPABASE LIBRARY
  // =========================

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "[Chati-AI Auth] Supabase JS library did not load."
    );

    return;
  }

  console.log(
    "[Chati-AI Auth] Supabase library loaded."
  );


  // =========================
  // CREATE CLIENT
  // =========================

  const client =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "chati-ai-auth"
        }
      }
    );

  console.log(
    "[Chati-AI Auth] Client created."
  );


  // =========================
  // PASSWORD RECOVERY STATE
  // =========================

  let passwordRecoveryActive =
    false;


  function isPasswordRecovery() {

    return passwordRecoveryActive;

  }


  // =========================
  // AUTH METHODS
  // =========================

  async function signUp(
    email,
    password
  ) {
    return client.auth.signUp({
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
    return client.auth.signInWithPassword({
      email,
      password
    });
  }


  async function signOut() {
    return client.auth.signOut({
      scope: "local"
    });
  }


  // =========================
  // PASSWORD RECOVERY
  // =========================

  async function sendPasswordReset(
    email
  ) {

    const cleanEmail =
      String(
        email ?? ""
      )
        .trim();


    if (!cleanEmail) {

      return {
        data:
          null,

        error:
          new Error(
            "Email address is required."
          )
      };

    }


    return client.auth
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
        newPassword ?? ""
      );


    if (
      password.length < 8
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
      await client.auth
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


  async function getSession() {
    return client.auth.getSession();
  }


  async function getUser() {
    return client.auth.getUser();
  }


  function getClient() {
    return client;
  }


  function onAuthStateChange(
    callback
  ) {
    return client.auth.onAuthStateChange(
      callback
    );
  }


  // =========================
  // PUBLIC CHATI-AI AUTH API
  // =========================

  window.ChatiAuth =
    Object.freeze({
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      isPasswordRecovery,
      getSession,
      getUser,
      getClient,
      onAuthStateChange
    });

  console.log(
    "[Chati-AI Auth] V4.0.7.1 recovery auth ready."
  );


  // =========================
  // AUTH EVENTS
  // =========================

  client.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      if (
        event ===
        "PASSWORD_RECOVERY"
      ) {

        passwordRecoveryActive =
          true;

      }


      const user =
        session?.user ?? null;

      window.dispatchEvent(
        new CustomEvent(
          "chati:authchange",
          {
            detail: {
              event,
              user
            }
          }
        )
      );

      if (
        event ===
        "PASSWORD_RECOVERY"
      ) {

        window.dispatchEvent(
          new CustomEvent(
            "chati:passwordrecovery",
            {
              detail: {
                user
              }
            }
          )
        );

        console.log(
          "[Chati-AI Auth] Password recovery session detected."
        );

      }


      console.log(
        "[Chati-AI Auth]",
        event,
        user
          ? `User: ${user.id}`
          : "No active user"
      );
    }
  );


  // =========================
  // INITIAL SESSION
  // =========================

  client.auth
    .getSession()
    .then(
      ({
        data,
        error
      }) => {
        if (error) {
          console.error(
            "[Chati-AI Auth] Session error:",
            error.message
          );

          return;
        }

        console.log(
          "[Chati-AI Auth] Ready.",
          data.session
            ? "Session restored."
            : "Local mode / signed out."
        );
      }
    )
    .catch(
      error => {
        console.error(
          "[Chati-AI Auth] Initialization failed:",
          error
        );
      }
    );

})();