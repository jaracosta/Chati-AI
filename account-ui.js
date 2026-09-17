// ============================================================
// CHATI-AI V4.0.7.3 — ACCOUNT RECOVERY + PASSWORD RESET
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

  const emailField =
    document.getElementById("accountEmailField");

  const passwordInput =
    document.getElementById("accountPasswordInput");

  const passwordField =
    document.getElementById("accountPasswordField");

  const confirmPasswordField =
    document.getElementById("accountConfirmPasswordField");

  const confirmPasswordInput =
    document.getElementById("accountConfirmPasswordInput");

  const forgotPasswordBtn =
    document.getElementById("accountForgotPasswordBtn");

  const backToSignInBtn =
    document.getElementById("accountBackToSignInBtn");

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
      submitBtn,
      forgotPasswordBtn,
      backToSignInBtn
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

    if (
      confirmPasswordInput
    ) {

      confirmPasswordInput.value =
        "";

    }

  }


  function showForm(
    nextMode
  ) {

    if (
      nextMode === "signup"
    ) {

      mode =
        "signup";

    }

    else if (
      nextMode === "recover"
    ) {

      mode =
        "recover";

    }

    else if (
      nextMode === "reset"
    ) {

      mode =
        "reset";

    }

    else {

      mode =
        "signin";

    }


    setMessage("");


    authForm.classList.remove(
      "hidden"
    );


    // Always reset these before configuring the mode.

    emailField?.classList.remove(
      "hidden"
    );

    passwordField?.classList.remove(
      "hidden"
    );

    confirmPasswordField?.classList.add(
      "hidden"
    );

    forgotPasswordBtn?.classList.add(
      "hidden"
    );

    backToSignInBtn?.classList.add(
      "hidden"
    );

    passwordHint.classList.add(
      "hidden"
    );


    emailInput.required =
      true;

    passwordInput.required =
      true;

    if (
      confirmPasswordInput
    ) {

      confirmPasswordInput.required =
        false;

    }


    // --------------------------------------------------------
    // CREATE ACCOUNT
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // SEND PASSWORD RESET EMAIL
    // --------------------------------------------------------

    else if (
      mode === "recover"
    ) {

      formKicker.textContent =
        "Account recovery";

      formTitle.textContent =
        "Reset Password";

      submitBtn.textContent =
        "Send Reset Link";

      passwordInput.value =
        "";

      passwordInput.required =
        false;

      passwordField?.classList.add(
        "hidden"
      );

      backToSignInBtn?.classList.remove(
        "hidden"
      );

    }


    // --------------------------------------------------------
    // CHOOSE NEW PASSWORD
    // --------------------------------------------------------

    else if (
      mode === "reset"
    ) {

      formKicker.textContent =
        "Account recovery";

      formTitle.textContent =
        "Choose a New Password";

      submitBtn.textContent =
        "Update Password";

      emailInput.required =
        false;

      emailField?.classList.add(
        "hidden"
      );

      passwordInput.value =
        "";

      passwordInput.autocomplete =
        "new-password";

      passwordInput.placeholder =
        "At least 8 characters";

      confirmPasswordField?.classList.remove(
        "hidden"
      );

      if (
        confirmPasswordInput
      ) {

        confirmPasswordInput.value =
          "";

        confirmPasswordInput.required =
          true;

      }


      passwordHint.classList.remove(
        "hidden"
      );


      // A recovery session is technically authenticated,
      // but the password form should take visual priority.

      signedOutView.classList.add(
        "hidden"
      );

      signedInView.classList.add(
        "hidden"
      );

    }


    // --------------------------------------------------------
    // SIGN IN
    // --------------------------------------------------------

    else {

      formKicker.textContent =
        "Welcome back";

      formTitle.textContent =
        "Sign In";

      submitBtn.textContent =
        "Sign In";

      passwordInput.autocomplete =
        "current-password";

      passwordInput.placeholder =
        "At least 8 characters";

      forgotPasswordBtn?.classList.remove(
        "hidden"
      );

    }


    requestAnimationFrame(
      () => {

        if (
          mode === "reset"
        ) {

          passwordInput.focus();

        }

        else {

          emailInput.focus();

        }

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

      if (
        typeof window.ChatiAuth
          ?.isPasswordRecovery ===
          "function" &&
        window.ChatiAuth
          .isPasswordRecovery()
      ) {

        showForm(
          "reset"
        );

      }

      else {

        renderUser(
          data?.session?.user ??
            null
        );

      }
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


  forgotPasswordBtn?.addEventListener(
    "click",
    () => {

      if (busy) {
        return;
      }


      showForm(
        "recover"
      );

    }
  );


  backToSignInBtn?.addEventListener(
    "click",
    () => {

      if (busy) {
        return;
      }


      showForm(
        "signin"
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
        mode !== "recover" &&
        password.length < 8
      ) {
        setMessage(
          "Your password must be at least 8 characters.",
          "error"
        );

        passwordInput.focus();
        return;
      }


      if (
        mode === "reset"
      ) {

        const confirmation =
          confirmPasswordInput
            ?.value ??
          "";


        if (
          password !==
          confirmation
        ) {

          setMessage(
            "The passwords do not match.",
            "error"
          );

          confirmPasswordInput
            ?.focus();

          return;

        }

      }

      setBusy(true);
      setMessage("");

      try {

        // ----------------------------------------------------
        // PASSWORD RESET EMAIL
        // ----------------------------------------------------

        if (
          mode === "reset"
        ) {

          if (
            typeof window.ChatiAuth
              .updatePassword !==
              "function"
          ) {

            throw new Error(
              "Password update is unavailable."
            );

          }


          const {
            data,
            error
          } =
            await window.ChatiAuth
              .updatePassword(
                password
              );


          if (error) {
            throw error;
          }


          const user =
            data?.user ??
            (
              await window.ChatiAuth
                .getUser()
            )
              ?.data
              ?.user ??
            null;


          hideForm();

          renderUser(
            user
          );


          setMessage(
            "Password updated successfully. Your account is ready.",
            "success"
          );

        }


        else if (
          mode === "recover"
        ) {

          if (
            typeof window.ChatiAuth
              .sendPasswordReset !==
              "function"
          ) {

            throw new Error(
              "Password recovery is unavailable."
            );

          }


          const {
            error
          } =
            await window.ChatiAuth
              .sendPasswordReset(
                email
              );


          if (error) {
            throw error;
          }


          setMessage(
            "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.",
            "success"
          );

        }


        // ----------------------------------------------------
        // CREATE ACCOUNT
        // ----------------------------------------------------

        else if (
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
    "chati:passwordrecovery",

    () => {

      showForm(
        "reset"
      );

    }
  );


  window.addEventListener(
    "chati:authchange",
    event => {

      if (
        typeof window.ChatiAuth
          ?.isPasswordRecovery ===
          "function" &&
        window.ChatiAuth
          .isPasswordRecovery()
      ) {

        showForm(
          "reset"
        );

        return;

      }


      renderUser(
        event.detail?.user ??
          null
      );

    }
  );


  initialize();

})();