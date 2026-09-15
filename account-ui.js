// ============================================================
// CHATI-AI V4.0.1 — ACCOUNT UI
// Uses window.ChatiAuth from supabase-auth.js.
// Does not sync chats or local data.
// ============================================================

(() => {
  "use strict";

  const signedOutView =
    document.getElementById("accountSignedOutView");

  const signedInView =
    document.getElementById("accountSignedInView");

  const authForm =
    document.getElementById("accountAuthForm");

  const signInBtn =
    document.getElementById("accountSignInBtn");

  const createBtn =
    document.getElementById("accountCreateBtn");

  const signOutBtn =
    document.getElementById("accountSignOutBtn");

  const formCloseBtn =
    document.getElementById("accountFormCloseBtn");

  const emailInput =
    document.getElementById("accountEmailInput");

  const passwordInput =
    document.getElementById("accountPasswordInput");

  const formKicker =
    document.getElementById("accountFormKicker");

  const formTitle =
    document.getElementById("accountFormTitle");

  const passwordHint =
    document.getElementById("accountPasswordHint");

  const submitBtn =
    document.getElementById("accountSubmitBtn");

  const statusBadge =
    document.getElementById("accountStatusBadge");

  const userEmail =
    document.getElementById("accountUserEmail");

  const avatarInitial =
    document.getElementById("accountAvatarInitial");

  const messageBox =
    document.getElementById("accountMessage");


  if (
    !signedOutView ||
    !signedInView ||
    !authForm
  ) {
    console.warn(
      "[Chati-AI Account UI] Account markup is missing."
    );

    return;
  }


  let mode =
    "signin";

  let busy =
    false;


  function setMessage(
    message = "",
    type = ""
  ) {
    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      message;

    messageBox.classList.remove(
      "is-success",
      "is-error"
    );

    if (!message) {
      messageBox.classList.add(
        "hidden"
      );

      return;
    }

    messageBox.classList.remove(
      "hidden"
    );

    if (
      type === "success" ||
      type === "error"
    ) {
      messageBox.classList.add(
        `is-${type}`
      );
    }
  }


  function setBusy(
    nextBusy
  ) {
    busy =
      Boolean(nextBusy);

    [
      signInBtn,
      createBtn,
      signOutBtn,
      submitBtn
    ]
      .filter(Boolean)
      .forEach(
        button => {
          button.disabled =
            busy;
        }
      );
  }


  function hideForm() {
    authForm.classList.add(
      "hidden"
    );

    passwordInput.value =
      "";
  }


  function showForm(
    nextMode
  ) {
    mode =
      nextMode === "signup"
        ? "signup"
        : "signin";

    setMessage("");

    authForm.classList.remove(
      "hidden"
    );

    if (
      mode === "signup"
    ) {
      formKicker.textContent =
        "New account";

      formTitle.textContent =
        "Create Account";

      submitBtn.textContent =
        "Create Account";

      passwordInput.autocomplete =
        "new-password";

      passwordHint.classList.remove(
        "hidden"
      );
    }

    else {
      formKicker.textContent =
        "Welcome back";

      formTitle.textContent =
        "Sign In";

      submitBtn.textContent =
        "Sign In";

      passwordInput.autocomplete =
        "current-password";

      passwordHint.classList.add(
        "hidden"
      );
    }

    requestAnimationFrame(
      () => {
        emailInput.focus();
      }
    );
  }


  function renderUser(
    user
  ) {
    const isSignedIn =
      Boolean(user);

    signedOutView.classList.toggle(
      "hidden",
      isSignedIn
    );

    signedInView.classList.toggle(
      "hidden",
      !isSignedIn
    );

    if (
      statusBadge
    ) {
      statusBadge.textContent =
        isSignedIn
          ? "Connected"
          : "Local";

      statusBadge.classList.toggle(
        "is-connected",
        isSignedIn
      );

      statusBadge.classList.toggle(
        "is-local",
        !isSignedIn
      );
    }

    if (
      isSignedIn
    ) {
      hideForm();

      const email =
        user.email ||
        "Chati-AI user";

      if (
        userEmail
      ) {
        userEmail.textContent =
          email;
      }

      if (
        avatarInitial
      ) {
        avatarInitial.textContent =
          email
            .trim()
            .charAt(0)
            .toUpperCase() ||
          "C";
      }
    }
  }


  async function initialize() {
    if (
      !window.ChatiAuth
    ) {
      setMessage(
        "Account services are unavailable. Chati-AI will continue in local mode.",
        "error"
      );

      [
        signInBtn,
        createBtn
      ]
        .filter(Boolean)
        .forEach(
          button => {
            button.disabled =
              true;
          }
        );

      console.warn(
        "[Chati-AI Account UI] ChatiAuth is unavailable."
      );

      return;
    }

    try {
      const {
        data,
        error
      } =
        await window.ChatiAuth
          .getSession();

      if (error) {
        throw error;
      }

      renderUser(
        data?.session?.user ??
          null
      );
    }

    catch (error) {
      console.warn(
        "[Chati-AI Account UI] Initial session check failed:",
        error
      );

      renderUser(null);
    }
  }


  signInBtn?.addEventListener(
    "click",
    () => {
      showForm(
        "signin"
      );
    }
  );


  createBtn?.addEventListener(
    "click",
    () => {
      showForm(
        "signup"
      );
    }
  );


  formCloseBtn?.addEventListener(
    "click",
    () => {
      if (busy) {
        return;
      }

      hideForm();
      setMessage("");
    }
  );


  authForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (
        busy ||
        !window.ChatiAuth
      ) {
        return;
      }

      const email =
        emailInput.value
          .trim();

      const password =
        passwordInput.value;

      if (!email) {
        setMessage(
          "Enter your email address.",
          "error"
        );

        emailInput.focus();
        return;
      }

      if (
        password.length < 8
      ) {
        setMessage(
          "Your password must be at least 8 characters.",
          "error"
        );

        passwordInput.focus();
        return;
      }

      setBusy(true);
      setMessage("");

      try {
        if (
          mode === "signup"
        ) {
          const {
            data,
            error
          } =
            await window.ChatiAuth
              .signUp(
                email,
                password
              );

          if (error) {
            throw error;
          }

          if (
            data?.session
          ) {
            renderUser(
              data.user
            );

            setMessage(
              "Account created and signed in.",
              "success"
            );
          }

          else {
            passwordInput.value =
              "";

            setMessage(
              "Account created. Check your email to confirm your address, then return to Chati-AI and sign in.",
              "success"
            );
          }
        }

        else {
          const {
            data,
            error
          } =
            await window.ChatiAuth
              .signIn(
                email,
                password
              );

          if (error) {
            throw error;
          }

          renderUser(
            data?.user ??
              null
          );

          setMessage(
            "Signed in successfully.",
            "success"
          );
        }
      }

      catch (error) {
        console.warn(
          "[Chati-AI Account UI] Authentication failed:",
          error
        );

        setMessage(
          error?.message ||
            "Authentication failed. Please try again.",
          "error"
        );
      }

      finally {
        setBusy(false);
      }
    }
  );


  signOutBtn?.addEventListener(
    "click",
    async () => {
      if (
        busy ||
        !window.ChatiAuth
      ) {
        return;
      }

      setBusy(true);
      setMessage("");

      try {
        const {
          error
        } =
          await window.ChatiAuth
            .signOut();

        if (error) {
          throw error;
        }

        renderUser(null);

        setMessage(
          "Signed out. Chati-AI is back in local-only mode.",
          "success"
        );
      }

      catch (error) {
        console.warn(
          "[Chati-AI Account UI] Sign out failed:",
          error
        );

        setMessage(
          error?.message ||
            "Could not sign out. Please try again.",
          "error"
        );
      }

      finally {
        setBusy(false);
      }
    }
  );


  window.addEventListener(
    "chati:authchange",
    event => {
      renderUser(
        event.detail?.user ??
          null
      );
    }
  );


  initialize();

})();