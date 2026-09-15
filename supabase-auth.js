// ============================================================
// CHATI-AI V4.0.1 — ACCOUNT FOUNDATION
// Supabase Auth
//
// This module handles authentication only.
// It does NOT sync chats, characters, saved data, or private chats.
// Chati-AI remains local-first.
// ============================================================

(() => {
  "use strict";


  // =========================
  // SUPABASE CONFIG
  // =========================

  const SUPABASE_URL =
    "https://pqnebvtbxwpizhzvrisu.supabase.co";


  const SUPABASE_PUBLISHABLE_KEY =
    "PASTE_YOUR_PUBLISHABLE_KEY_HERE";


  const EMAIL_REDIRECT_URL =
    "https://chati-ai.com/";


  // =========================
  // SAFETY CHECKS
  // =========================

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.warn(
      "[Chati-AI Auth] Supabase library is unavailable. Local mode will continue normally."
    );

    return;
  }


  if (
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_PUBLISHABLE_KEY ===
      "sb_publishable_Ywt13f_gR40wYhFANM76-A_RFc4BkHS"
  ) {
    console.warn(
      "[Chati-AI Auth] Publishable key has not been configured. Local mode will continue normally."
    );

    return;
  }


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


  async function getSession() {
    return client.auth.getSession();
  }


  async function getUser() {
    return client.auth.getUser();
  }


  function onAuthStateChange(
    callback
  ) {
    return client.auth.onAuthStateChange(
      callback
    );
  }


  // =========================
  // GLOBAL AUTH INTERFACE
  // =========================

  window.ChatiAuth =
    Object.freeze({
      signUp,
      signIn,
      signOut,
      getSession,
      getUser,
      onAuthStateChange
    });


  // =========================
  // AUTH STATE EVENTS
  // =========================

  client.auth.onAuthStateChange(
    (
      event,
      session
    ) => {
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
  // INITIAL SESSION CHECK
  // =========================

  client.auth
    .getSession()
    .then(
      ({
        data,
        error
      }) => {
        if (error) {
          console.warn(
            "[Chati-AI Auth] Session check failed:",
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
        console.warn(
          "[Chati-AI Auth] Initialization failed:",
          error
        );
      }
    );

})();