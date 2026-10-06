// CHATI-AI V6.2 — native-feeling mobile shell and UI polish
(() => {
  "use strict";

  const VERSION = "6.2.4";
  let dock = null;

  function icon(path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
  }

  function buildDock() {
    if (dock || document.getElementById("v6MobileDock")) return;

    dock = document.createElement("nav");
    dock.id = "v6MobileDock";
    dock.className = "v6-mobile-dock";
    dock.setAttribute("aria-label", "Primary navigation");

    dock.innerHTML =
      '<button type="button" data-v6-nav="chats">' +
        icon('<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"/>') +
        '<span>Home</span>' +
      '</button>' +
      '<button type="button" data-v6-nav="history">' +
        icon('<path d="M5.2 5.5h13.6a2.2 2.2 0 0 1 2.2 2.2v7.5a2.2 2.2 0 0 1-2.2 2.2h-6.9L7.2 21v-3.6h-2A2.2 2.2 0 0 1 3 15.2V7.7a2.2 2.2 0 0 1 2.2-2.2Z"/><path d="M7.5 9.5h9M7.5 13h6"/>') +
        '<span>Chats</span>' +
      '</button>' +
      '<button type="button" data-v6-nav="create">' +
        icon('<circle cx="10" cy="8" r="3"/><path d="M4.8 19c.7-3.7 2.6-5.6 5.2-5.6 1.4 0 2.6.5 3.5 1.5M18 13.5v7M14.5 17h7"/>') +
        '<span>Create</span>' +
      '</button>' +
      '<button type="button" data-v6-nav="profile">' +
        icon('<circle cx="12" cy="8" r="3.2"/><path d="M5.4 19c.8-3.8 3-5.7 6.6-5.7s5.8 1.9 6.6 5.7"/>') +
        '<span>Profile</span>' +
      '</button>';

    document.body.appendChild(dock);

    dock.addEventListener("click", event => {
      const action = event.target.closest("[data-v6-nav]")?.dataset.v6Nav;
      if (!action) return;
      event.stopPropagation();
      if (action !== "create") document.getElementById("closeCreateChoiceBtn")?.click();
      if (action !== "profile") window.ChatiProfileV6?.close?.();

      // "Chats" shows the recent-chats list (the sidebar) as a full page.
      if (action === "history") {
        window.setMobileSidebarOpen?.(true);
      } else {
        window.closeMobileSidebar?.();
      }

      if (action === "chats") {
        document.getElementById("chatsBtn")?.click();
      }

      if (action === "create") {
        document.getElementById("createBtn")?.click();
      }

      if (action === "profile") {
        window.ChatiProfileV6?.open?.();
      }

      setActive(action);
    });

    updateActive();
  }

  function setActive(name) {
    dock?.querySelectorAll("[data-v6-nav]").forEach(button => {
      button.classList.toggle("active", button.dataset.v6Nav === name);
      button.setAttribute("aria-current", button.dataset.v6Nav === name ? "page" : "false");
    });
  }

  function visible(id) {
    const node = document.getElementById(id);
    return Boolean(node && !node.classList.contains("hidden"));
  }

  function updateActive() {
    if (!dock) return;
    const editing = visible("characterCreateView") || visible("groupCreateView");
    document.body.classList.toggle("v6-creator-active", editing);
    if (document.body.classList.contains("v6-profile-open")) { setActive("profile"); return; }
    if (document.body.classList.contains("mobile-sidebar-open")) { setActive("history"); return; }

    if (
      visible("characterCreateView") ||
      visible("groupCreateView") ||
      visible("createChoiceModal")
    ) {
      setActive("create");
      return;
    }

    setActive("chats");
  }

  const observer = new MutationObserver(records => {
    if (records.some(record =>
      record.type === "attributes" &&
      record.attributeName === "class" &&
      (record.target?.classList?.contains("view") || record.target?.id === "createChoiceModal")
    )) {
      updateActive();
    }
  });

  function keepLoopingVideosAlive() {
    window.ChatiMediaV6?.refresh?.();
  }

  function initialize() {
    buildDock();
    new MutationObserver(updateActive).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("chati:profiletoggle", updateActive);

    document.querySelectorAll(".view, #createChoiceModal").forEach(view => {
      observer.observe(view, { attributes: true, attributeFilter: ["class"] });
    });

    document.addEventListener("visibilitychange", keepLoopingVideosAlive);
    window.addEventListener("pageshow", keepLoopingVideosAlive);
    document.addEventListener("pointerdown", event => {
      if (event.target.closest("video.v6-loop-video")) keepLoopingVideosAlive();
    }, { passive: true });

    console.log("[Chati-AI UI] V" + VERSION + " mobile app shell ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
