// Mini window (desktop): ⌘/Ctrl + P pops Chati-AI out into a phone-sized
// window that stays on top of every tab and app and can be dragged anywhere.
// Chrome and Edge use Document Picture-in-Picture (always on top); other
// browsers get a normal small popup window.
//
// The mini window loads the app itself (/?mini=1) in an iframe, so it is
// the full phone layout with everything working. The tab behind shows a
// notice meanwhile and reloads when the mini window closes, to pick up
// what was written there.

(function () {
  "use strict";

  const MINI_WIDTH = 400;
  const MINI_HEIGHT = 820;
  const isMini = /[?&]mini=1\b/.test(location.search);
  const es = () => (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("es");
  const mac = /Mac|iP(hone|ad|od)/.test(navigator.platform);
  const shortcut = mac ? "⌘P" : "Ctrl+P";

  let pipWindow = null;
  let popup = null;

  function isShortcut(event) {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey &&
      (event.key?.toLowerCase() === "p" || event.code === "KeyP");
  }

  // ---- Inside the mini window --------------------------------------------
  if (isMini) {
    document.documentElement.classList.add("chati-mini", "splash-skip");
    // ⌘/Ctrl + P again puts the app back in the tab.
    document.addEventListener("keydown", event => {
      if (!isShortcut(event)) return;
      event.preventDefault();
      try {
        if (window.top !== window) window.top.close();
        else window.close();
      } catch (_) {
        window.close();
      }
    });
    return;
  }

  // ---- In the normal tab --------------------------------------------------
  function toast(message) {
    if (typeof window.ChatiToast === "function") window.ChatiToast(message, "info");
  }

  function showNotice() {
    let notice = document.getElementById("chatiMiniNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "chatiMiniNotice";
      notice.className = "chati-mini-notice";
      notice.setAttribute("role", "dialog");
      notice.innerHTML =
        '<div class="chati-mini-notice-card">' +
          '<div class="chati-mini-notice-phone" aria-hidden="true"></div>' +
          "<h2></h2><p></p>" +
          '<button type="button" class="chati-mini-back"></button>' +
        "</div>";
      notice.querySelector(".chati-mini-back").addEventListener("click", closeMini);
      document.body.appendChild(notice);
    }
    notice.querySelector("h2").textContent = es() ? "Chati-AI está en la mini ventana" : "Chati-AI is in the mini window";
    notice.querySelector("p").textContent = es()
      ? `Muévela a donde quieras; se queda encima mientras usas otras pestañas. ${shortcut} otra vez para regresarla.`
      : `Drag it anywhere; it stays on top while you use other tabs. Press ${shortcut} again to bring it back.`;
    notice.querySelector(".chati-mini-back").textContent = es() ? "Traer de vuelta aquí" : "Bring it back here";
    notice.hidden = false;
  }

  function miniClosed() {
    pipWindow = null;
    popup = null;
    // The mini window saved chats on this device; reload to show them here.
    location.reload();
  }

  function closeMini() {
    if (pipWindow) pipWindow.close();
    else if (popup && !popup.closed) popup.close();
    else miniClosed();
  }

  async function openMini() {
    if (pipWindow || (popup && !popup.closed)) {
      closeMini();
      return;
    }
    const url = new URL(location.href);
    url.search = "?mini=1";
    url.hash = "";

    if ("documentPictureInPicture" in window) {
      try {
        pipWindow = await window.documentPictureInPicture.requestWindow({
          width: MINI_WIDTH,
          height: MINI_HEIGHT
        });
        const doc = pipWindow.document;
        doc.title = "Chati-AI";
        const style = doc.createElement("style");
        style.textContent = "html,body{margin:0;height:100%;background:#0f0f17;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}";
        doc.head.appendChild(style);
        const frame = doc.createElement("iframe");
        frame.src = url.href;
        frame.title = "Chati-AI";
        frame.allow = "microphone; camera; autoplay; clipboard-read; clipboard-write; fullscreen";
        doc.body.appendChild(frame);
        pipWindow.addEventListener("pagehide", miniClosed, { once: true });
        // ⌘/Ctrl + P inside the mini window's own frame (outside the iframe).
        pipWindow.addEventListener("keydown", event => {
          if (isShortcut(event)) {
            event.preventDefault();
            pipWindow?.close();
          }
        });
        showNotice();
        return;
      } catch (error) {
        pipWindow = null;
        console.warn("Mini window (Picture-in-Picture) failed:", error);
      }
    }

    const left = Math.max(0, (window.screenX || 0) + (window.outerWidth || 1200) - MINI_WIDTH - 40);
    const top = Math.max(0, (window.screenY || 0) + 60);
    popup = window.open(url.href, "chati-mini", `popup=yes,width=${MINI_WIDTH},height=${MINI_HEIGHT},left=${left},top=${top}`);
    if (!popup) {
      toast(es() ? "Tu navegador bloqueó la mini ventana. Permite ventanas emergentes para chati-ai.com." : "Your browser blocked the mini window. Allow pop-ups for chati-ai.com.");
      return;
    }
    showNotice();
    toast(es() ? "Para que se quede siempre encima, usa Chrome o Edge." : "To keep it always on top, use Chrome or Edge.");
    const watch = setInterval(() => {
      if (popup?.closed) {
        clearInterval(watch);
        miniClosed();
      }
    }, 800);
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 761px) and (hover: hover)").matches;
  }

  document.addEventListener("keydown", event => {
    if (!isShortcut(event) || !isDesktop()) return;
    event.preventDefault(); // instead of the browser's Print dialog
    openMini();
  });

  // A button in the desktop icon rail, under Chats and Create.
  function addButton() {
    const nav = document.querySelector("#sidebar .sidebar-nav");
    if (!nav || document.getElementById("miniWindowBtn")) return;
    const label = es() ? "Mini ventana" : "Mini window";
    const button = document.createElement("button");
    button.type = "button";
    button.id = "miniWindowBtn";
    button.className = "nav-btn chati-mini-btn";
    button.setAttribute("aria-label", `${label} (${shortcut})`);
    button.dataset.tooltip = `${label} (${shortcut})`;
    button.innerHTML =
      '<span class="sidebar-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="13" rx="2.5"></rect><rect x="11.5" y="10.5" width="7" height="6" rx="1.4"></rect></svg></span>' +
      '<span class="sidebar-label"></span>';
    button.querySelector(".sidebar-label").textContent = label;
    button.addEventListener("click", openMini);
    nav.appendChild(button);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton);
  else addButton();

  window.ChatiMiniWindow = { open: openMini, close: closeMini };
})();
