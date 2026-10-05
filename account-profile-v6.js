// CHATI-AI V6.0.1 — profile, multi-account, security, theme
(() => {
  "use strict";

  const VERSION = "6.2.0";
  const PROFILE_TABLE = "user_profiles";
  const MEDIA_BUCKET = "character-media";
  const VAULT_KEY = "chatiAccountVaultV6";
  const ACTIVE_WORKSPACE_KEY = "chatiLoadedWorkspaceUidV6";
  const WORKSPACE_PREFIX = "chatiAccountWorkspaceV6_";
  const LEGACY_OWNER_KEY = "chatiLegacyWorkspaceOwnerV6";
  const LEGACY_UNCLAIMED = "__legacy_unclaimed__";
  const ANON_WORKSPACE_ID = "__anonymous__";
  const DB_NAME = "chatiMediaDB";
  const APP_STORE = "appData";

  let currentUser = null;
  let currentProfile = null;
  let avatarDisplayUrl = "";
  let panelOpen = false;
  let busy = false;

  const sidebar = document.querySelector(".sidebar");
  const settingsBtn = document.getElementById("settingsBtn");
  const legacySignOut = document.getElementById("accountSignOutBtn");

  let profileButton = null;
  let panel = null;
  let signedOutShell = null;

  function auth() {
    if (!window.ChatiAuth) throw new Error("ChatiAuth is unavailable.");
    return window.ChatiAuth;
  }

  function client() {
    return auth().getClient();
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }

  function readVault() {
    const value = parse(localStorage.getItem(VAULT_KEY), {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function writeVault(value) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(value || {}));
  }

  function isVideo(src, mime) {
    const clean = String(src || "").split("?")[0].split("#")[0].toLowerCase();
    return String(mime || "") === "video" || String(mime || "").startsWith("video/") ||
      clean.startsWith("data:video/") ||
      /\.(mp4|webm|mov|m4v)$/i.test(clean);
  }

  function mediaHtml(src, mime, cls) {
    cls = cls || "v6-profile-avatar-media";

    if (!src) {
      const base = currentProfile?.display_name || currentUser?.email || "C";
      const initial = String(base).trim().charAt(0).toUpperCase() || "C";
      return '<span class="v6-profile-initial">' + esc(initial) + '</span>';
    }

    if (isVideo(src, mime)) {
      return '<video class="' + cls + ' v6-loop-video" src="' + esc(src) +
        '" autoplay muted loop playsinline preload="auto" disablepictureinpicture></video>';
    }

    return '<img class="' + cls + '" src="' + esc(src) + '" alt="">';
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local database."));
    });
  }

  function isWorkspaceDbKey(key) {
    const value = String(key || "");
    return value === "chatiCharacters" ||
      value.startsWith("chatiChats_") ||
      value.startsWith("chatiChat_");
  }

  function isWorkspaceLocalKey(key) {
    const value = String(key || "");
    return value.startsWith("chatiActiveChat_") ||
      value.startsWith("chatiGroupResponder_");
  }

  async function snapshotWorkspace(userId) {
    if (!userId) return;

    const db = await openDb();
    if (!db.objectStoreNames.contains(APP_STORE)) {
      db.close();
      return;
    }

    const data = {};

    await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_STORE, "readonly");
      const store = tx.objectStore(APP_STORE);
      const req = store.openCursor();

      req.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (isWorkspaceDbKey(cursor.key)) data[String(cursor.key)] = cursor.value;
        cursor.continue();
      };

      req.onerror = () => reject(req.error);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    const local = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (isWorkspaceLocalKey(key)) local[key] = localStorage.getItem(key);
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_STORE, "readwrite");
      tx.objectStore(APP_STORE).put(
        JSON.stringify({ version: 1, savedAt: Date.now(), data, local }),
        WORKSPACE_PREFIX + userId
      );
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  }

  async function clearWorkspace() {
    const db = await openDb();

    if (db.objectStoreNames.contains(APP_STORE)) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE, "readwrite");
        const store = tx.objectStore(APP_STORE);
        const req = store.openCursor();

        req.onsuccess = event => {
          const cursor = event.target.result;
          if (!cursor) return;
          if (isWorkspaceDbKey(cursor.key)) cursor.delete();
          cursor.continue();
        };

        req.onerror = () => reject(req.error);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    db.close();

    const remove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (isWorkspaceLocalKey(key)) remove.push(key);
    }
    remove.forEach(key => localStorage.removeItem(key));
  }

  async function restoreWorkspace(userId) {
    await clearWorkspace();

    if (!userId) {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      return;
    }

    const db = await openDb();
    let snapshot = null;

    if (db.objectStoreNames.contains(APP_STORE)) {
      snapshot = await new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE, "readonly");
        const req = tx.objectStore(APP_STORE).get(WORKSPACE_PREFIX + userId);
        req.onsuccess = () => resolve(parse(req.result, null));
        req.onerror = () => reject(req.error);
      });

      await new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE, "readwrite");
        const store = tx.objectStore(APP_STORE);

        if (snapshot?.data) {
          Object.entries(snapshot.data).forEach(pair => store.put(pair[1], pair[0]));
        } else {
          store.put(JSON.stringify([]), "chatiCharacters");
        }

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    db.close();

    if (snapshot?.local) {
      Object.entries(snapshot.local).forEach(pair => {
        if (pair[1] != null) localStorage.setItem(pair[0], pair[1]);
      });
    }

    localStorage.setItem(ACTIVE_WORKSPACE_KEY, userId);
  }

  async function workspaceHasMeaningfulData() {
    const db = await openDb();

    if (!db.objectStoreNames.contains(APP_STORE)) {
      db.close();
      return false;
    }

    const hasData = await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_STORE, "readonly");
      const store = tx.objectStore(APP_STORE);
      const req = store.openCursor();
      let found = false;

      req.onsuccess = event => {
        const cursor = event.target.result;

        if (!cursor || found) {
          resolve(found);
          return;
        }

        if (isWorkspaceDbKey(cursor.key)) {
          const parsed = parse(cursor.value, null);

          if (
            (Array.isArray(parsed) && parsed.length > 0) ||
            (
              parsed &&
              typeof parsed === "object" &&
              Object.keys(parsed).length > 0
            )
          ) {
            found = true;
            resolve(true);
            return;
          }
        }

        cursor.continue();
      };

      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });

    db.close();
    return Boolean(hasData);
  }

  async function hasWorkspaceSnapshot(userId) {
    if (!userId) return false;

    const db = await openDb();

    if (!db.objectStoreNames.contains(APP_STORE)) {
      db.close();
      return false;
    }

    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_STORE, "readonly");
      const req = tx.objectStore(APP_STORE).get(WORKSPACE_PREFIX + userId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    db.close();
    return Boolean(value);
  }

  async function deleteWorkspaceSnapshot(workspaceId) {
    if (!workspaceId) return;

    const db = await openDb();

    if (db.objectStoreNames.contains(APP_STORE)) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE, "readwrite");
        tx.objectStore(APP_STORE).delete(WORKSPACE_PREFIX + workspaceId);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    db.close();
  }

  async function ensureWorkspace(user) {
    const loaded = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    const next = user?.id || ANON_WORKSPACE_ID;

    if (loaded === next) return false;

    // Save whatever workspace is currently mounted under its OWN identity.
    // Anonymous data is never adopted into an authenticated account.
    if (loaded && loaded !== next) {
      try {
        await snapshotWorkspace(loaded);
      } catch (error) {
        console.warn("[Chati-AI V6.2] Workspace snapshot failed.", error);
      }
    }

    // Migration from pre-V6.2 browsers that have local data mounted without
    // an ownership marker. Preserve it safely, but never merge it into login.
    if (!loaded) {
      const hasMountedData = await workspaceHasMeaningfulData();

      if (hasMountedData) {
        const safeOwner = user ? LEGACY_UNCLAIMED : ANON_WORKSPACE_ID;

        try {
          await snapshotWorkspace(safeOwner);

          if (!user) {
            localStorage.setItem(ACTIVE_WORKSPACE_KEY, ANON_WORKSPACE_ID);
            return false;
          }
        } catch (error) {
          console.warn("[Chati-AI V6.2] Legacy workspace snapshot failed.", error);
        }
      }
    }

    // Exact Botify-style separation:
    // signed out -> anonymous workspace
    // signed in  -> only that account workspace
    await restoreWorkspace(next);
    return true;
  }

  function defaultProfile(user) {
    const base = String(user?.email || "Chati User").split("@")[0] || "Chati User";

    return {
      user_id: user.id,
      display_name: base,
      avatar_url: null,
      avatar_storage_path: null,
      avatar_kind: "image",
      theme: localStorage.getItem("chatiThemeV6") || "dark"
    };
  }

  async function ensureProfile(user) {
    const found = await client()
      .from(PROFILE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (found.error) throw found.error;
    if (found.data) return found.data;

    const created = await client()
      .from(PROFILE_TABLE)
      .insert(defaultProfile(user))
      .select()
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  async function resolveAvatar(profile) {
    if (!profile) return "";

    if (profile.avatar_storage_path) {
      const signed = await client()
        .storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(profile.avatar_storage_path, 86400);

      if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
    }

    return profile.avatar_url || "";
  }

  function applyTheme(theme) {
    const safe = ["dark", "light", "system"].includes(theme) ? theme : "dark";
    localStorage.setItem("chatiThemeV6", safe);

    const resolved = safe === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : safe;

    document.documentElement.dataset.chatiTheme = resolved;
    document.documentElement.dataset.chatiThemePreference = safe;
  }

  async function saveProfile(changes) {
    if (!currentUser) throw new Error("Sign in first.");

    const result = await client()
      .from(PROFILE_TABLE)
      .upsert(Object.assign({ user_id: currentUser.id }, changes), { onConflict: "user_id" })
      .select()
      .single();

    if (result.error) throw result.error;

    currentProfile = result.data;
    avatarDisplayUrl = await resolveAvatar(currentProfile);
    applyTheme(currentProfile.theme || "dark");
    await rememberCurrentSession();
    render();
    return currentProfile;
  }

  async function rememberCurrentSession() {
    const result = await auth().getSession();
    const session = result?.data?.session;
    const user = session?.user;

    if (!user?.id || !session?.access_token || !session?.refresh_token) return;

    const vault = readVault();

    vault[user.id] = {
      userId: user.id,
      email: user.email || "",
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      lastUsedAt: Date.now(),
      displayName: currentProfile?.display_name || vault[user.id]?.displayName || "",
      avatarUrl: avatarDisplayUrl || vault[user.id]?.avatarUrl || ""
    };

    writeVault(vault);
  }

  async function uploadProfileMedia(file) {
    if (!currentUser) throw new Error("Sign in first.");

    const allowed = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/quicktime"
    ]);

    if (!file || !allowed.has(file.type)) {
      throw new Error("Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV.");
    }

    if (file.size > 30 * 1024 * 1024) {
      throw new Error("Profile media must be 30 MB or smaller.");
    }

    const extMap = {
      "image/jpeg":"jpg",
      "image/png":"png",
      "image/webp":"webp",
      "image/gif":"gif",
      "video/mp4":"mp4",
      "video/webm":"webm",
      "video/quicktime":"mov"
    };

    const path = currentUser.id + "/profile/avatar-" + Date.now() + "." + extMap[file.type];

    const upload = await client()
      .storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upload.error) throw upload.error;

    const oldPath = currentProfile?.avatar_storage_path || null;

    await saveProfile({
      display_name: currentProfile?.display_name || defaultProfile(currentUser).display_name,
      avatar_url: null,
      avatar_storage_path: path,
      avatar_kind: file.type.startsWith("video/") ? "video" : "image",
      theme: currentProfile?.theme || "dark"
    });

    if (oldPath && oldPath !== path) {
      client().storage.from(MEDIA_BUCKET).remove([oldPath]).catch(() => {});
    }
  }

  function buildUi() {
    if (!sidebar || !settingsBtn || profileButton) return;

    profileButton = document.createElement("button");
    profileButton.type = "button";
    profileButton.id = "v6ProfileButton";
    profileButton.className = "v6-profile-button";
    sidebar.insertBefore(profileButton, settingsBtn);

    panel = document.createElement("div");
    panel.id = "v6ProfilePanel";
    panel.className = "v6-profile-panel hidden";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Account profile");
    document.body.appendChild(panel);

    signedOutShell = document.createElement("section");
    signedOutShell.id = "v6SignedOutShell";
    signedOutShell.className = "v6-signed-out-shell hidden";
    signedOutShell.innerHTML =
      '<div class="v6-signed-out-card">' +
        '<div class="v6-signed-out-mark">CA</div>' +
        '<h1>Welcome to Chati-AI</h1>' +
        '<p>Your characters belong to your account. Sign in to restore them on this device.</p>' +
        '<div class="v6-signed-out-actions">' +
          '<button type="button" data-v6-action="signin">Sign In</button>' +
          '<button type="button" class="primary" data-v6-action="create">Create Account</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(signedOutShell);

    profileButton.addEventListener("click", event => {
      event.stopPropagation();
      setPanelOpen(!panelOpen);
    });

    document.addEventListener("click", event => {
      if (!panelOpen) return;
      if (panel.contains(event.target) || profileButton.contains(event.target)) return;
      setPanelOpen(false);
    });

    panel.addEventListener("click", handlePanelClick);
    panel.addEventListener("change", handlePanelChange);
    panel.addEventListener("submit", handlePanelSubmit);

    signedOutShell.addEventListener("click", event => {
      const action = event.target.closest("[data-v6-action]")?.dataset.v6Action;
      if (action === "signin" || action === "create") {
        document.body.classList.add("v6-auth-flow");
        signedOutShell?.classList.add("hidden");
        settingsBtn?.click();

        setTimeout(() => {
          document.getElementById(action === "signin" ? "accountSignInBtn" : "accountCreateBtn")?.click();
        }, 80);
      }
    });
  }

  function setPanelOpen(next) {
    panelOpen = Boolean(next);
    panel?.classList.toggle("hidden", !panelOpen);
    if (!panelOpen) panel?.classList.remove("v6-account-space-mode");
    profileButton?.setAttribute("aria-expanded", panelOpen ? "true" : "false");
    if (panelOpen) renderPanel();
  }

  function renderProfileButton() {
    if (!profileButton) return;

    if (!currentUser) {
      profileButton.innerHTML =
        '<span class="v6-profile-avatar"><span class="v6-profile-initial">?</span></span>' +
        '<span class="v6-profile-button-copy"><strong>Sign in</strong><small>Account</small></span>' +
        '<span class="v6-profile-chevron">⋯</span>';
      return;
    }

    profileButton.innerHTML =
      '<span class="v6-profile-avatar">' + mediaHtml(avatarDisplayUrl, currentProfile?.avatar_kind) + '</span>' +
      '<span class="v6-profile-button-copy">' +
        '<strong>' + esc(currentProfile?.display_name || currentUser.email || "Chati User") + '</strong>' +
        '<small>' + esc(currentUser.email || "") + '</small>' +
      '</span>' +
      '<span class="v6-profile-chevron">⋯</span>';
  }

  function renderPanel() {
    if (!panel) return;

    if (!currentUser) {
      panel.innerHTML =
        '<div class="v6-panel-head"><strong>Account</strong><button type="button" data-v6-action="close">×</button></div>' +
        '<p class="v6-muted">Sign in to sync your characters, chats, profile, and media.</p>' +
        '<button class="v6-wide primary" type="button" data-v6-action="signin">Sign In</button>' +
        '<button class="v6-wide" type="button" data-v6-action="create">Create Account</button>';
      return;
    }

    const accounts = Object.values(readVault())
      .sort((a,b) => Number(b.lastUsedAt || 0) - Number(a.lastUsedAt || 0))
      .map(item => {
        const current = item.userId === currentUser.id;
        const mini = item.avatarUrl
          ? mediaHtml(item.avatarUrl, "", "v6-mini-avatar-media")
          : esc((item.displayName || item.email || "C").charAt(0).toUpperCase());

        return '<button class="v6-account-row ' + (current ? "active" : "") + '" type="button" data-v6-switch="' + esc(item.userId) + '">' +
          '<span class="v6-mini-avatar">' + mini + '</span>' +
          '<span><strong>' + esc(item.displayName || item.email || "Account") + '</strong><small>' + esc(item.email || "") + '</small></span>' +
          (current ? '<em>Current</em>' : '') +
        '</button>';
      })
      .join("");

    panel.innerHTML =
      '<div class="v6-panel-head">' +
        '<div class="v6-panel-identity">' +
          '<span class="v6-profile-avatar large">' + mediaHtml(avatarDisplayUrl, currentProfile?.avatar_kind) + '</span>' +
          '<span><strong>' + esc(currentProfile?.display_name || "Chati User") + '</strong><small>' + esc(currentUser.email || "") + '</small></span>' +
        '</div>' +
        '<button type="button" data-v6-action="close">×</button>' +
      '</div>' +

      '<div class="v6-profile-tabs">' +
        '<button type="button" data-v6-section="profile" class="active">Profile</button>' +
        '<button type="button" data-v6-section="accounts">Accounts</button>' +
        '<button type="button" data-v6-section="security">Security</button>' +
        '<button type="button" data-v6-section="appearance">Appearance</button>' +
      '</div>' +

      '<div class="v6-panel-section" data-v6-panel-section="profile">' +
        '<form data-v6-form="profile">' +
          '<label>Display name<input name="displayName" maxlength="60" value="' + esc(currentProfile?.display_name || "") + '" required></label>' +
          '<label>Profile media URL<input name="avatarUrl" type="url" placeholder="https://..." value="' + esc(currentProfile?.avatar_url || "") + '"></label>' +
          '<div class="v6-inline-actions">' +
            '<label class="v6-file-btn">Choose from gallery<input name="avatarFile" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden></label>' +
            '<button type="button" data-v6-action="remove-avatar">Remove</button>' +
          '</div>' +
          '<button class="v6-wide primary" type="submit">Save Profile</button>' +
        '</form>' +
      '</div>' +

      '<div class="v6-panel-section hidden v6-account-space" data-v6-panel-section="accounts">' +
        '<div class="v6-account-space-head"><strong>Account spaces</strong><p>Each account has its own characters, chats, profile and cloud sync. Nothing is merged between accounts.</p></div>' +
        '<div class="v6-account-list">' + (accounts || '<p class="v6-muted">No remembered accounts yet.</p>') + '</div>' +
        '<button class="v6-wide" type="button" data-v6-action="add-account">+ Add another account</button>' +
        '<div class="v6-add-account hidden" id="v6AddAccountBox">' +
          '<form data-v6-form="add-account">' +
            '<label>Email<input name="email" type="email" autocomplete="username" required></label>' +
            '<label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>' +
            '<button class="v6-wide primary" type="submit">Add & Switch</button>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="v6-panel-section hidden" data-v6-panel-section="security">' +
        '<form data-v6-form="password">' +
          '<label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>' +
          '<label>Confirm password<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label>' +
          '<button class="v6-wide primary" type="submit">Change Password</button>' +
        '</form>' +
        '<div class="v6-danger-zone">' +
          '<div><strong>Delete account</strong><p>Permanently deletes this account, its cloud characters, chats, profile and uploaded media.</p></div>' +
          '<button type="button" class="v6-danger-outline" data-v6-action="delete-account">Delete Account</button>' +
          '<form class="hidden" id="v6DeleteAccountConfirm" data-v6-form="delete-account">' +
            '<label>Type DELETE to confirm<input name="confirmDelete" autocomplete="off" spellcheck="false" required></label>' +
            '<button class="v6-wide danger" type="submit">Permanently Delete Account</button>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="v6-panel-section hidden" data-v6-panel-section="appearance">' +
        '<div class="v6-theme-grid">' +
          themeButton("dark", "Dark") +
          themeButton("light", "Light") +
          themeButton("system", "System") +
        '</div>' +
      '</div>' +

      '<div class="v6-panel-footer">' +
        '<button class="danger" type="button" data-v6-action="signout">Sign Out</button>' +
        '<span id="v6PanelStatus" class="v6-panel-status"></span>' +
      '</div>';
  }

  function themeButton(theme, label) {
    const active = currentProfile?.theme === theme ? "active" : "";
    return '<button type="button" class="' + active + '" data-v6-theme="' + theme + '">' +
      '<span class="v6-theme-swatch ' + theme + '"></span><strong>' + label + '</strong></button>';
  }

  function setStatus(message, error) {
    const node = document.getElementById("v6PanelStatus");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("error", Boolean(error));
  }

  async function switchAccount(userId) {
    if (busy || !userId || userId === currentUser?.id) return;

    const entry = readVault()[userId];
    if (!entry?.accessToken || !entry?.refreshToken) {
      setStatus("This account needs to sign in again.", true);
      return;
    }

    busy = true;
    setStatus("Switching account…", false);

    try {
      if (currentUser?.id) await snapshotWorkspace(currentUser.id);
      try { await window.ChatiV5Sync?.stop?.(); } catch {}

      const result = await client().auth.setSession({
        access_token: entry.accessToken,
        refresh_token: entry.refreshToken
      });

      if (result.error) throw result.error;

      await restoreWorkspace(userId);
      location.reload();
    } catch (error) {
      setStatus(error?.message || "Could not switch account.", true);
    } finally {
      busy = false;
    }
  }

  async function signOutCurrent() {
    if (busy) return;
    busy = true;

    try {
      if (currentUser?.id) {
        await snapshotWorkspace(currentUser.id);
        const vault = readVault();
        delete vault[currentUser.id];
        writeVault(vault);
      }

      try { await window.ChatiV5Sync?.stop?.(); } catch {}
      await restoreWorkspace(ANON_WORKSPACE_ID);

      const result = await auth().signOut();
      if (result?.error) throw result.error;

      location.reload();
    } catch (error) {
      setStatus(error?.message || "Could not sign out.", true);
    } finally {
      busy = false;
    }
  }

  async function handlePanelClick(event) {
    const action = event.target.closest("[data-v6-action]")?.dataset.v6Action;
    const section = event.target.closest("[data-v6-section]")?.dataset.v6Section;
    const switchId = event.target.closest("[data-v6-switch]")?.dataset.v6Switch;
    const theme = event.target.closest("[data-v6-theme]")?.dataset.v6Theme;

    if (section) {
      panel.querySelectorAll("[data-v6-section]").forEach(btn => btn.classList.toggle("active", btn.dataset.v6Section === section));
      panel.querySelectorAll("[data-v6-panel-section]").forEach(node => node.classList.toggle("hidden", node.dataset.v6PanelSection !== section));
      panel.classList.toggle("v6-account-space-mode", section === "accounts");
      return;
    }

    if (switchId) return switchAccount(switchId);

    if (theme) {
      applyTheme(theme);
      await saveProfile({
        display_name: currentProfile?.display_name || defaultProfile(currentUser).display_name,
        avatar_url: currentProfile?.avatar_url || null,
        avatar_storage_path: currentProfile?.avatar_storage_path || null,
        avatar_kind: currentProfile?.avatar_kind || null,
        theme
      });
      renderPanel();
      return;
    }

    if (action === "close") return setPanelOpen(false);
    if (action === "signout") return signOutCurrent();

    if (action === "delete-account") {
      const confirmBox = document.getElementById("v6DeleteAccountConfirm");
      confirmBox?.classList.toggle("hidden");
      confirmBox?.querySelector("input")?.focus();
      return;
    }

    if (action === "signin" || action === "create") {
      setPanelOpen(false);
      settingsBtn?.click();
      setTimeout(() => {
        document.getElementById(action === "signin" ? "accountSignInBtn" : "accountCreateBtn")?.click();
      }, 80);
      return;
    }

    if (action === "add-account") {
      document.getElementById("v6AddAccountBox")?.classList.toggle("hidden");
      return;
    }

    if (action === "remove-avatar") {
      const oldPath = currentProfile?.avatar_storage_path || null;

      await saveProfile({
        display_name: currentProfile?.display_name || defaultProfile(currentUser).display_name,
        avatar_url: null,
        avatar_storage_path: null,
        avatar_kind: "image",
        theme: currentProfile?.theme || "dark"
      });

      if (oldPath) client().storage.from(MEDIA_BUCKET).remove([oldPath]).catch(() => {});
      renderPanel();
    }
  }

  async function handlePanelChange(event) {
    if (event.target?.name !== "avatarFile" || !event.target.files?.[0]) return;

    try {
      setStatus("Uploading…", false);
      await uploadProfileMedia(event.target.files[0]);
      setStatus("Profile media updated.", false);
      renderPanel();
    } catch (error) {
      setStatus(error?.message || "Upload failed.", true);
    }
  }

  async function handlePanelSubmit(event) {
    const form = event.target.closest("form[data-v6-form]");
    if (!form) return;

    event.preventDefault();
    if (busy) return;

    busy = true;
    setStatus("", false);

    try {
      const kind = form.dataset.v6Form;
      const data = new FormData(form);

      if (kind === "profile") {
        const url = String(data.get("avatarUrl") || "").trim();

        await saveProfile({
          display_name: String(data.get("displayName") || "").trim().slice(0, 60),
          avatar_url: url || null,
          avatar_storage_path: url ? null : currentProfile?.avatar_storage_path || null,
          avatar_kind: url ? (isVideo(url, "") ? "video" : "image") : currentProfile?.avatar_kind || "image",
          theme: currentProfile?.theme || "dark"
        });

        setStatus("Profile saved.", false);
      }

      if (kind === "password") {
        const password = String(data.get("password") || "");
        const confirm = String(data.get("confirm") || "");

        if (password.length < 8) throw new Error("Use at least 8 characters.");
        if (password !== confirm) throw new Error("Passwords do not match.");

        const result = await auth().updatePassword(password);
        if (result?.error) throw result.error;

        form.reset();
        setStatus("Password changed.", false);
      }

      if (kind === "delete-account") {
        const confirmation = String(data.get("confirmDelete") || "").trim();

        if (confirmation !== "DELETE") {
          throw new Error("Type DELETE exactly to confirm.");
        }

        setStatus("Deleting account…", false);
        try { await window.ChatiV5Sync?.stop?.(); } catch {}

        const sessionResult = await auth().getSession();
        const session = sessionResult?.data?.session;
        const deletingUserId = session?.user?.id;

        if (!deletingUserId) throw new Error("No active account.");

        const response = await client().functions.invoke("delete-account", {
          body: { confirm: true }
        });

        if (response.error) throw response.error;
        if (!response.data?.ok) throw new Error(response.data?.error || "Account deletion failed.");

        const vault = readVault();
        delete vault[deletingUserId];
        writeVault(vault);

        await deleteWorkspaceSnapshot(deletingUserId);
        await restoreWorkspace(ANON_WORKSPACE_ID);

        try { await auth().signOut(); } catch {}
        location.reload();
        return;
      }

      if (kind === "add-account") {
        const email = String(data.get("email") || "").trim();
        const password = String(data.get("password") || "");

        if (currentUser?.id) await snapshotWorkspace(currentUser.id);
        try { await window.ChatiV5Sync?.stop?.(); } catch {}

        const result = await auth().signIn(email, password);
        if (result?.error) throw result.error;
        if (!result?.data?.session?.user) throw new Error("This account could not be activated.");

        const next = result.data.session;
        const vault = readVault();
        vault[next.user.id] = {
          userId: next.user.id,
          email: next.user.email || "",
          accessToken: next.access_token,
          refreshToken: next.refresh_token,
          lastUsedAt: Date.now(),
          displayName: "",
          avatarUrl: ""
        };
        writeVault(vault);

        await restoreWorkspace(next.user.id);
        location.reload();
      }
    } catch (error) {
      setStatus(error?.message || "Something went wrong.", true);
    } finally {
      busy = false;
    }
  }

  function render() {
    renderProfileButton();

    const signedOut = !currentUser;
    document.body.classList.toggle("v6-signed-out", signedOut);

    if (!signedOut) {
      document.body.classList.remove("v6-auth-flow");
    }

    // Guest/local mode stays usable while signed out. The profile button opens
    // Sign In / Create Account, but anonymous characters and chats remain in
    // their own isolated workspace.
    signedOutShell?.classList.add("hidden");

    if (panelOpen) renderPanel();
  }

  async function syncSignedInAccount() {
    if (!currentUser) return;

    try {
      await window.ChatiSync?.syncCharactersProtected?.("account-session");
    } catch (error) {
      console.warn("[Chati-AI V6.2] Character account sync failed.", error);
    }

    try {
      await window.ChatiV5Sync?.start?.();
      await window.ChatiV5Sync?.syncNow?.("account-session");
    } catch (error) {
      console.warn("[Chati-AI V6.2] Chat account sync failed.", error);
    }
  }

  async function refreshAccount() {
    const result = await auth().getSession();
    if (result?.error) throw result.error;

    const session = result?.data?.session || null;
    const user = session?.user || null;

    const workspaceChanged = await ensureWorkspace(user);
    if (workspaceChanged) {
      location.reload();
      return;
    }

    currentUser = user;

    if (!user) {
      currentProfile = null;
      avatarDisplayUrl = "";
      applyTheme(localStorage.getItem("chatiThemeV6") || "dark");
      render();
      return;
    }

    currentProfile = await ensureProfile(user);
    avatarDisplayUrl = await resolveAvatar(currentProfile);
    applyTheme(currentProfile.theme || "dark");
    await rememberCurrentSession();
    render();

    setTimeout(() => {
      syncSignedInAccount().catch(error => {
        console.warn("[Chati-AI V6.2] Post-login sync failed.", error);
      });
    }, 250);
  }

  async function captureLegacySignOut() {
    try {
      const result = await auth().getSession();
      const uid = result?.data?.session?.user?.id;
      if (uid) await snapshotWorkspace(uid);
    } catch {}
  }

  function initialize() {
    buildUi();
    legacySignOut?.addEventListener("click", captureLegacySignOut, true);

    document.getElementById("accountFormCloseBtn")?.addEventListener("click", () => {
      if (!currentUser) {
        document.body.classList.remove("v6-auth-flow");
        signedOutShell?.classList.remove("hidden");
      }
    });

    window.addEventListener("chati:authchange", () => {
      document.body.classList.add("v6-account-switching");

      setTimeout(() => {
        refreshAccount()
          .catch(error => {
            console.warn("[Chati-AI V6.1] Account refresh failed.", error);
          })
          .finally(() => {
            document.body.classList.remove("v6-account-switching");
          });
      }, 80);
    });

    matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
      if ((currentProfile?.theme || localStorage.getItem("chatiThemeV6")) === "system") applyTheme("system");
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;

      document.querySelectorAll("video.v6-loop-video").forEach(video => {
        if (video.paused) video.play().catch(() => {});
      });
    });

    refreshAccount().catch(error => {
      console.error("[Chati-AI V6] Profile system failed:", error);
      currentUser = null;
      render();
    });

    console.log("[Chati-AI Account] V" + VERSION + " profile + multi-account ready.");
  }

  window.ChatiProfileV6 = Object.freeze({
    version: VERSION,
    refresh: refreshAccount,
    open: () => setPanelOpen(true),
    snapshotWorkspace,
    restoreWorkspace,
    switchAccount,
    signOutCurrent,
    deleteWorkspaceSnapshot,
    syncSignedInAccount,
    getProfile: () => currentProfile ? Object.assign({}, currentProfile) : null
  });

  initialize();
})();