// ============================================================
// CHATI-AI V6.1.0 — PROFILE HUB
// Sidebar profile, multi-account, security, theme and media.
// ============================================================

(() => {
  "use strict";

  const PROFILE_TABLE = "user_profiles";
  const MEDIA_BUCKET = "character-media";
  const LOCAL_THEME_KEY = "chati-theme-v6";
  const MAX_PROFILE_MEDIA = 30 * 1024 * 1024;

  const ALLOWED_PROFILE_MEDIA = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ]);

  const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };

  let currentUser = null;
  let currentProfile = null;
  let profileChannel = null;
  let busy = false;
  let activeTab = "profile";

  const $ = id => document.getElementById(id);

  function client() {
    if (
      !window.ChatiAuth ||
      typeof window.ChatiAuth.getClient !== "function"
    ) {
      throw new Error("Account service is unavailable.");
    }

    return window.ChatiAuth.getClient();
  }

  function initials(value) {
    const clean = String(value || "").trim();

    if (!clean) {
      return "C";
    }

    return clean
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function looksLikeVideo(source, kind = "") {
    if (kind === "video") {
      return true;
    }

    const value = String(source || "")
      .trim()
      .toLowerCase()
      .split("#")[0]
      .split("?")[0];

    return (
      value.startsWith("data:video/") ||
      /\.(mp4|webm|mov|m4v)$/i.test(value)
    );
  }

  function getThemePreference() {
    const value =
      localStorage.getItem(LOCAL_THEME_KEY) ||
      document.documentElement.getAttribute("data-theme-preference") ||
      "dark";

    return ["dark", "light", "system"].includes(value)
      ? value
      : "dark";
  }

  function resolvedTheme(value) {
    if (value === "system") {
      return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }

    return value === "light" ? "light" : "dark";
  }

  function applyTheme(value, persist = true) {
    const selected = ["dark", "light", "system"].includes(value)
      ? value
      : "dark";

    const resolved = resolvedTheme(selected);

    document.documentElement.setAttribute(
      "data-theme",
      resolved
    );

    document.documentElement.setAttribute(
      "data-theme-preference",
      selected
    );

    if (persist) {
      localStorage.setItem(
        LOCAL_THEME_KEY,
        selected
      );
    }

    const meta = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (meta) {
      meta.content =
        resolved === "light"
          ? "#f4f4f8"
          : "#111116";
    }

    const select = $("profileThemeSelect");

    if (
      select &&
      select.value !== selected
    ) {
      select.value = selected;
    }
  }

  function setMessage(message = "", type = "") {
    const box = $("profileMessage");

    if (!box) {
      return;
    }

    box.textContent = String(message || "");

    box.classList.remove(
      "hidden",
      "is-success",
      "is-error"
    );

    if (!message) {
      box.classList.add("hidden");
      return;
    }

    if (type === "success") {
      box.classList.add("is-success");
    }

    if (type === "error") {
      box.classList.add("is-error");
    }
  }

  function setBusy(value) {
    busy = Boolean(value);

    document
      .querySelectorAll(
        "#profileModal button, #profileModal input, #profileModal select"
      )
      .forEach(element => {
        if (
          element.id === "profileCloseBtn" ||
          element.id === "profileOverlay"
        ) {
          return;
        }

        element.disabled = busy;
      });
  }

  function openProfile(tab = "profile") {
    const modal = $("profileModal");

    if (!modal) {
      return;
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("profile-open");

    setTab(tab);

    void renderAll();
  }

  function closeProfile() {
    const modal = $("profileModal");

    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("profile-open");
    setMessage("");
  }

  function setTab(tab) {
    const valid = [
      "profile",
      "accounts",
      "security",
      "appearance"
    ];

    activeTab = valid.includes(tab)
      ? tab
      : "profile";

    document
      .querySelectorAll("[data-profile-tab]")
      .forEach(button => {
        button.classList.toggle(
          "is-active",
          button.dataset.profileTab === activeTab
        );
      });

    document
      .querySelectorAll("[data-profile-page]")
      .forEach(page => {
        page.classList.toggle(
          "hidden",
          page.dataset.profilePage !== activeTab
        );
      });
  }

  function renderMedia(container, source, kind, fallback) {
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (source) {
      if (looksLikeVideo(source, kind)) {
        const video = document.createElement("video");

        video.src = source;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-hidden", "true");

        container.appendChild(video);

        video.play().catch(() => {});
      }

      else {
        const image = document.createElement("img");

        image.src = source;
        image.alt = "";

        container.appendChild(image);
      }

      return;
    }

    const span = document.createElement("span");

    span.textContent = fallback || "C";

    container.appendChild(span);
  }

  async function signedMediaUrl(profile) {
    if (!profile) {
      return "";
    }

    if (profile.avatar_storage_path) {
      try {
        const result = await client()
          .storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(
            profile.avatar_storage_path,
            86400
          );

        if (result.error) {
          throw result.error;
        }

        return result.data?.signedUrl || "";
      }

      catch (error) {
        console.warn(
          "[Chati-AI Profile] Could not create signed avatar URL.",
          error
        );
      }
    }

    return profile.avatar_url || "";
  }

  async function getOrCreateProfile(user) {
    if (!user) {
      return null;
    }

    const read = await client()
      .from(PROFILE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (read.error) {
      throw read.error;
    }

    if (read.data) {
      return read.data;
    }

    const displayName = String(
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Chati-AI User"
    )
      .trim()
      .slice(0, 60);

    const created = await client()
      .from(PROFILE_TABLE)
      .upsert({
        user_id: user.id,
        display_name: displayName,
        theme: getThemePreference()
      })
      .select()
      .single();

    if (created.error) {
      throw created.error;
    }

    return created.data;
  }

  async function saveProfile(changes = {}) {
    if (!currentUser) {
      throw new Error(
        "Sign in before editing your profile."
      );
    }

    const row = {
      user_id:
        currentUser.id,

      display_name:
        String(
          changes.display_name ??
          currentProfile?.display_name ??
          ""
        )
          .trim()
          .slice(0, 60),

      avatar_url:
        changes.avatar_url !== undefined
          ? changes.avatar_url
          : currentProfile?.avatar_url || null,

      avatar_storage_path:
        changes.avatar_storage_path !== undefined
          ? changes.avatar_storage_path
          : currentProfile?.avatar_storage_path || null,

      avatar_kind:
        changes.avatar_kind ||
        currentProfile?.avatar_kind ||
        "image",

      theme:
        changes.theme ||
        currentProfile?.theme ||
        getThemePreference()
    };

    const result = await client()
      .from(PROFILE_TABLE)
      .upsert(row)
      .select()
      .single();

    if (result.error) {
      throw result.error;
    }

    currentProfile = result.data;

    return currentProfile;
  }

  async function uploadProfileMedia(file) {
    if (!currentUser) {
      throw new Error(
        "Sign in before uploading profile media."
      );
    }

    const mime = String(
      file?.type ||
      ""
    ).toLowerCase();

    if (
      !file ||
      !ALLOWED_PROFILE_MEDIA.has(mime)
    ) {
      throw new Error(
        "Choose a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file."
      );
    }

    if (file.size > MAX_PROFILE_MEDIA) {
      throw new Error(
        "Profile media must be 30 MB or smaller."
      );
    }

    const extension = EXTENSIONS[mime];

    const path =
      currentUser.id +
      "/profile/avatar-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 9) +
      "." +
      extension;

    const bytes = await file.arrayBuffer();

    const result = await client()
      .storage
      .from(MEDIA_BUCKET)
      .upload(
        path,
        bytes,
        {
          cacheControl: "3600",
          contentType: mime,
          upsert: false
        }
      );

    if (result.error) {
      throw result.error;
    }

    return {
      path:
        result.data?.path ||
        path,

      kind:
        mime.startsWith("video/")
          ? "video"
          : "image"
    };
  }

  async function removeProfileRealtime() {
    if (!profileChannel) {
      return;
    }

    try {
      await client().removeChannel(
        profileChannel
      );
    }

    catch {}

    profileChannel = null;
  }

  async function subscribeProfile() {
    await removeProfileRealtime();

    if (!currentUser) {
      return;
    }

    profileChannel = client()
      .channel(
        "chati-profile-" +
        currentUser.id
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: PROFILE_TABLE,
          filter:
            "user_id=eq." +
            currentUser.id
        },
        async () => {
          try {
            currentProfile =
              await getOrCreateProfile(
                currentUser
              );

            applyTheme(
              currentProfile?.theme ||
              getThemePreference()
            );

            await renderAll();
          }

          catch (error) {
            console.warn(
              "[Chati-AI Profile] Realtime refresh failed.",
              error
            );
          }
        }
      )
      .subscribe();
  }

  async function renderNav() {
    const nameNode = $("profileNavName");
    const statusNode = $("profileNavStatus");
    const avatar = $("profileNavAvatar");

    if (!currentUser) {
      if (nameNode) {
        nameNode.textContent = "Profile";
      }

      if (statusNode) {
        statusNode.textContent = "Sign in";
      }

      renderMedia(
        avatar,
        "",
        "image",
        "C"
      );

      return;
    }

    const name =
      currentProfile?.display_name ||
      currentUser.email?.split("@")[0] ||
      "Profile";

    if (nameNode) {
      nameNode.textContent = name;
    }

    if (statusNode) {
      statusNode.textContent = "Synced";
    }

    renderMedia(
      avatar,
      await signedMediaUrl(
        currentProfile
      ),
      currentProfile?.avatar_kind,
      initials(name)
    );
  }

  async function renderProfilePage() {
    const signedOut = $("profileSignedOutCard");
    const signedIn = $("profileSignedInCard");

    signedOut?.classList.toggle(
      "hidden",
      Boolean(currentUser)
    );

    signedIn?.classList.toggle(
      "hidden",
      !currentUser
    );

    const accountsTab = document.querySelector(
      '[data-profile-tab="accounts"]'
    );

    const securityTab = document.querySelector(
      '[data-profile-tab="security"]'
    );

    if (accountsTab) {
      accountsTab.disabled = false;
    }

    if (securityTab) {
      securityTab.disabled = !currentUser;
    }

    if (!currentUser) {
      return;
    }

    const displayName =
      currentProfile?.display_name ||
      currentUser.email?.split("@")[0] ||
      "Chati-AI User";

    const nameInput = $("profileDisplayName");
    const emailInput = $("profileEmail");
    const urlInput = $("profileAvatarUrl");

    if (nameInput) {
      nameInput.value = displayName;
    }

    if (emailInput) {
      emailInput.value =
        currentUser.email ||
        "";
    }

    if (urlInput) {
      urlInput.value =
        currentProfile?.avatar_url ||
        "";
    }

    renderMedia(
      $("profileAvatarPreview"),
      await signedMediaUrl(
        currentProfile
      ),
      currentProfile?.avatar_kind,
      initials(displayName)
    );
  }

  async function renderAccounts() {
    const list = $("profileAccountsList");

    if (!list) {
      return;
    }

    list.innerHTML = "";

    const signOutButton =
      $("profileSignOutBtn");

    signOutButton
      ?.classList
      .toggle(
        "hidden",
        !currentUser
      );

    const accounts =
      await window.ChatiAuth
        .listAccounts();

    const usableAccounts =
      accounts.filter(
        account =>
          account.signedIn
      );

    if (
      !usableAccounts.length
    ) {

      const p =
        document.createElement(
          "p"
        );

      p.className =
        "profile-muted";

      p.textContent =
        "No other signed-in accounts are saved on this device yet.";

      list.appendChild(
        p
      );

    }

    for (const account of accounts) {
      const row = document.createElement("div");

      row.className =
        "profile-account-row" +
        (
          account.active
            ? " is-active"
            : ""
        );

      const avatar =
        document.createElement("span");

      avatar.className =
        "profile-account-avatar";

      avatar.textContent =
        initials(
          account.email
            ?.split("@")[0] ||
          "C"
        );

      const copy =
        document.createElement("span");

      copy.className =
        "profile-account-copy";

      const strong =
        document.createElement("strong");

      strong.textContent =
        account.email ||
        "Account";

      const small =
        document.createElement("small");

      small.textContent =
        account.active
          ? "Current account"
          : (
              account.signedIn
                ? "Ready to switch"
                : "Session expired"
            );

      copy.append(
        strong,
        small
      );

      const actions =
        document.createElement("span");

      actions.className =
        "profile-account-actions";

      if (
        !account.active &&
        account.signedIn
      ) {
        const switchButton =
          document.createElement(
            "button"
          );

        switchButton.type = "button";
        switchButton.className =
          "profile-quiet-btn";
        switchButton.textContent =
          "Switch";

        switchButton.addEventListener(
          "click",
          async () => {
            if (busy) {
              return;
            }

            setBusy(true);
            setMessage(
              "Switching account..."
            );

            try {
              await window.ChatiAuth
                .switchAccount(
                  account.id
                );
            }

            catch (error) {
              setMessage(
                error?.message ||
                "Could not switch account.",
                "error"
              );

              setBusy(false);
            }
          }
        );

        actions.appendChild(
          switchButton
        );
      }

      if (!account.active) {
        const removeButton =
          document.createElement(
            "button"
          );

        removeButton.type = "button";
        removeButton.className =
          "profile-account-remove-btn";
        removeButton.textContent =
          "Remove";

        removeButton.addEventListener(
          "click",
          async () => {
            if (busy) {
              return;
            }

            setBusy(true);

            try {
              await window.ChatiAuth
                .removeAccount(
                  account.id
                );

              await renderAccounts();

              setMessage(
                "Account removed from this device.",
                "success"
              );
            }

            catch (error) {
              setMessage(
                error?.message ||
                "Could not remove that account.",
                "error"
              );
            }

            finally {
              setBusy(false);
            }
          }
        );

        actions.appendChild(
          removeButton
        );
      }

      row.append(
        avatar,
        copy,
        actions
      );

      list.appendChild(row);
    }
  }

  async function renderAll() {
    await renderNav();
    await renderProfilePage();
    await renderAccounts();

    const select =
      $("profileThemeSelect");

    if (select) {
      select.value =
        currentProfile?.theme ||
        getThemePreference();
    }
  }

  async function refreshSession() {
    if (window.ChatiAuthReady) {
      try {
        await window.ChatiAuthReady;
      }

      catch {}
    }

    const result =
      await window.ChatiAuth
        .getSession();

    if (result.error) {
      throw result.error;
    }

    currentUser =
      result.data?.session?.user ||
      null;

    if (currentUser) {
      currentProfile =
        await getOrCreateProfile(
          currentUser
        );

      applyTheme(
        currentProfile?.theme ||
        getThemePreference()
      );

      await subscribeProfile();
    }

    else {
      currentProfile = null;
      await removeProfileRealtime();
    }

    await renderAll();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const email =
      $("profileAuthEmail")
        ?.value
        ?.trim() ||
      "";

    const password =
      $("profileAuthPassword")
        ?.value ||
      "";

    setBusy(true);
    setMessage("Signing in...");

    try {
      const result =
        await window.ChatiAuth
          .signIn(
            email,
            password
          );

      if (result.error) {
        throw result.error;
      }

      setMessage(
        "Signed in. Loading your workspace...",
        "success"
      );
    }

    catch (error) {
      setMessage(
        error?.message ||
        "Could not sign in.",
        "error"
      );

      setBusy(false);
    }
  }

  function bindEvents() {
    $("profileNavBtn")
      ?.addEventListener(
        "click",
        () =>
          openProfile(
            "profile"
          )
      );

    $("profileCloseBtn")
      ?.addEventListener(
        "click",
        closeProfile
      );

    $("profileOverlay")
      ?.addEventListener(
        "click",
        closeProfile
      );

    document
      .querySelectorAll(
        "[data-profile-tab]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            if (button.disabled) {
              return;
            }

            setTab(
              button.dataset.profileTab
            );
          }
        );
      });

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          !$("profileModal")
            ?.classList
            .contains("hidden")
        ) {
          closeProfile();
        }
      }
    );

    $("profileAuthForm")
      ?.addEventListener(
        "submit",
        handleAuthSubmit
      );

    $("profileCreateAccountBtn")
      ?.addEventListener(
        "click",
        async () => {
          if (busy) {
            return;
          }

          const email =
            $("profileAuthEmail")
              ?.value
              ?.trim() ||
            "";

          const password =
            $("profileAuthPassword")
              ?.value ||
            "";

          if (
            !email ||
            password.length < 8
          ) {
            setMessage(
              "Enter an email and a password with at least 8 characters.",
              "error"
            );

            return;
          }

          setBusy(true);
          setMessage(
            "Creating account..."
          );

          try {
            const result =
              await window.ChatiAuth
                .signUp(
                  email,
                  password
                );

            if (result.error) {
              throw result.error;
            }

            if (result.data?.session) {
              setMessage(
                "Account created. Loading your workspace...",
                "success"
              );
            }

            else {
              setMessage(
                "Account created. Check your email to confirm it, then sign in.",
                "success"
              );

              setBusy(false);
            }
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not create account.",
              "error"
            );

            setBusy(false);
          }
        }
      );

    $("profileForgotPasswordBtn")
      ?.addEventListener(
        "click",
        async () => {
          if (busy) {
            return;
          }

          const email =
            $("profileAuthEmail")
              ?.value
              ?.trim() ||
            "";

          if (!email) {
            setMessage(
              "Enter your email first.",
              "error"
            );

            return;
          }

          setBusy(true);

          try {
            const result =
              await window.ChatiAuth
                .sendPasswordReset(
                  email
                );

            if (result.error) {
              throw result.error;
            }

            setMessage(
              "Password reset email sent.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not send reset email.",
              "error"
            );
          }

          finally {
            setBusy(false);
          }
        }
      );

    $("profileDetailsForm")
      ?.addEventListener(
        "submit",
        async event => {
          event.preventDefault();

          if (
            busy ||
            !currentUser
          ) {
            return;
          }

          setBusy(true);
          setMessage(
            "Saving profile..."
          );

          try {
            const displayName =
              $("profileDisplayName")
                ?.value
                ?.trim() ||
              "";

            const avatarUrl =
              $("profileAvatarUrl")
                ?.value
                ?.trim() ||
              "";

            await saveProfile({
              display_name:
                displayName,

              avatar_url:
                avatarUrl ||
                null,

              avatar_storage_path:
                avatarUrl
                  ? null
                  : (
                      currentProfile
                        ?.avatar_storage_path ||
                      null
                    ),

              avatar_kind:
                avatarUrl
                  ? (
                      looksLikeVideo(
                        avatarUrl
                      )
                        ? "video"
                        : "image"
                    )
                  : (
                      currentProfile
                        ?.avatar_kind ||
                      "image"
                    )
            });

            await window.ChatiAuth
              .updateUserMetadata({
                display_name:
                  displayName
              });

            await renderAll();

            setMessage(
              "Profile saved.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not save profile.",
              "error"
            );
          }

          finally {
            setBusy(false);
          }
        }
      );

    $("profileChooseAvatarBtn")
      ?.addEventListener(
        "click",
        () =>
          $("profileAvatarFile")
            ?.click()
      );

    $("profileAvatarFile")
      ?.addEventListener(
        "change",
        async event => {
          const file =
            event.target
              ?.files?.[0];

          if (event.target) {
            event.target.value = "";
          }

          if (
            !file ||
            !currentUser ||
            busy
          ) {
            return;
          }

          setBusy(true);
          setMessage(
            "Uploading profile media..."
          );

          try {
            const uploaded =
              await uploadProfileMedia(
                file
              );

            await saveProfile({
              avatar_url:
                null,

              avatar_storage_path:
                uploaded.path,

              avatar_kind:
                uploaded.kind
            });

            if ($("profileAvatarUrl")) {
              $("profileAvatarUrl").value = "";
            }

            await renderAll();

            setMessage(
              "Profile media updated.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not upload profile media.",
              "error"
            );
          }

          finally {
            setBusy(false);
          }
        }
      );

    $("profileRemoveAvatarBtn")
      ?.addEventListener(
        "click",
        async () => {
          if (
            !currentUser ||
            busy
          ) {
            return;
          }

          setBusy(true);

          try {
            await saveProfile({
              avatar_url:
                null,

              avatar_storage_path:
                null,

              avatar_kind:
                "image"
            });

            if ($("profileAvatarUrl")) {
              $("profileAvatarUrl").value = "";
            }

            await renderAll();

            setMessage(
              "Profile media removed.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not remove profile media.",
              "error"
            );
          }

          finally {
            setBusy(false);
          }
        }
      );

    $("profileShowAddAccountBtn")
      ?.addEventListener(
        "click",
        () => {
          $("profileAddAccountForm")
            ?.classList
            .remove("hidden");

          $("profileAddAccountEmail")
            ?.focus();
        }
      );

    $("profileCancelAddAccountBtn")
      ?.addEventListener(
        "click",
        () =>
          $("profileAddAccountForm")
            ?.classList
            .add("hidden")
      );

    $("profileAddAccountForm")
      ?.addEventListener(
        "submit",
        async event => {
          event.preventDefault();

          if (busy) {
            return;
          }

          const email =
            $("profileAddAccountEmail")
              ?.value
              ?.trim() ||
            "";

          const password =
            $("profileAddAccountPassword")
              ?.value ||
            "";

          if (
            !email ||
            password.length < 8
          ) {
            setMessage(
              "Enter the other account email and password.",
              "error"
            );

            return;
          }

          setBusy(true);
          setMessage(
            "Adding account..."
          );

          try {
            const result =
              await window.ChatiAuth
                .addAccount(
                  email,
                  password
                );

            if (result.error) {
              throw result.error;
            }

            setMessage(
              "Account added. Switching workspace...",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not add account.",
              "error"
            );

            setBusy(false);
          }
        }
      );

    $("profileSignOutBtn")
      ?.addEventListener(
        "click",
        async () => {
          if (busy) {
            return;
          }

          setBusy(true);
          setMessage(
            "Signing out..."
          );

          try {
            const result =
              await window.ChatiAuth
                .signOut();

            if (result.error) {
              throw result.error;
            }
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not sign out.",
              "error"
            );

            setBusy(false);
          }
        }
      );

    $("profilePasswordForm")
      ?.addEventListener(
        "submit",
        async event => {
          event.preventDefault();

          if (
            busy ||
            !currentUser
          ) {
            return;
          }

          const current =
            $("profileCurrentPassword")
              ?.value ||
            "";

          const next =
            $("profileNewPassword")
              ?.value ||
            "";

          const confirm =
            $("profileConfirmPassword")
              ?.value ||
            "";

          if (next.length < 8) {
            setMessage(
              "Your new password must be at least 8 characters.",
              "error"
            );

            return;
          }

          if (next !== confirm) {
            setMessage(
              "The new passwords do not match.",
              "error"
            );

            return;
          }

          setBusy(true);
          setMessage(
            "Updating password..."
          );

          try {
            const result =
              await window.ChatiAuth
                .changePassword(
                  current,
                  next
                );

            if (result.error) {
              throw result.error;
            }

            event.target.reset();

            setMessage(
              "Password changed successfully.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              error?.message ||
              "Could not change password.",
              "error"
            );
          }

          finally {
            setBusy(false);
          }
        }
      );

    $("profileThemeSelect")
      ?.addEventListener(
        "change",
        async event => {
          const theme =
            event.target.value;

          applyTheme(theme);

          if (!currentUser) {
            setMessage(
              "Theme updated on this device.",
              "success"
            );

            return;
          }

          try {
            await saveProfile({
              theme
            });

            setMessage(
              "Theme preference synced.",
              "success"
            );
          }

          catch (error) {
            setMessage(
              "Theme changed locally, but cloud preference sync failed.",
              "error"
            );
          }
        }
      );
  }

  async function initialize() {
    applyTheme(
      getThemePreference(),
      false
    );

    bindEvents();

    if (!window.ChatiAuth) {
      console.warn(
        "[Chati-AI Profile] ChatiAuth is unavailable."
      );

      return;
    }

    await refreshSession();

    window.addEventListener(
      "chati:authchange",
      async event => {
        const kind =
          String(
            event.detail?.event ||
            ""
          );

        if (
          kind === "TOKEN_REFRESHED" ||
          kind === "USER_UPDATED"
        ) {
          return;
        }

        try {
          await refreshSession();
        }

        catch (error) {
          console.warn(
            "[Chati-AI Profile] Auth refresh failed.",
            error
          );
        }
      }
    );

    console.log(
      "[Chati-AI Profile] V6.1.0 profile hub ready."
    );
  }

  window.ChatiProfile =
    Object.freeze({
      open:
        openProfile,

      close:
        closeProfile,

      refresh:
        refreshSession,

      applyTheme,

      getProfile() {
        return currentProfile
          ? {
              ...currentProfile
            }
          : null;
      }
    });

  initialize()
    .catch(error => {
      console.error(
        "[Chati-AI Profile] Initialization failed:",
        error
      );
    });
})();
