// CHATI-AI V8 — native app feel on phones: compact header on scroll,
// hardware/gesture back for chats, and iOS edge-swipe back when installed.
(() => {
  "use strict";

  const PHONE_QUERY = "(max-width: 760px)";
  const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isIOS = () =>
    /iP(hone|od|ad)/.test(navigator.platform) ||
    (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

  const visible = id => {
    const node = document.getElementById(id);
    return Boolean(node && !node.classList.contains("hidden"));
  };

  // ---------------------------------------------------------------------
  // Compact header: the big "Your Characters" title scrolls away and a
  // small blurred bar with the same title fades in, like iOS/Android.
  // ---------------------------------------------------------------------

  function setupCompactHeader() {
    const scroller = document.querySelector(".main-content");
    const title = document.querySelector("#homeView .top-bar h2");
    if (!scroller || !title) return;

    const bar = document.createElement("div");
    bar.className = "v8-compact-header";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<span class="v8-compact-title"></span>';
    document.body.appendChild(bar);

    const label = bar.querySelector(".v8-compact-title");

    let ticking = false;
    const update = () => {
      ticking = false;
      label.textContent = title.textContent.trim();
      const show =
        isPhone() &&
        visible("homeView") &&
        !document.body.classList.contains("mobile-sidebar-open") &&
        scroller.scrollTop > title.offsetTop + title.offsetHeight - 8;
      document.body.classList.toggle("v8-header-compact", show);
    };

    scroller.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    const observer = new MutationObserver(() => requestAnimationFrame(update));
    observer.observe(document.getElementById("homeView"), { attributes: true, attributeFilter: ["class"] });
    // Hide it while the Chats tab or another overlay is open.
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    update();
  }

  // ---------------------------------------------------------------------
  // Back navigation: opening a chat adds a history entry, so the Android
  // back button / back gesture (and the browser's) closes the chat instead
  // of leaving the app.
  // ---------------------------------------------------------------------

  function setupBackNavigation() {
    const chatView = document.getElementById("chatView");
    const backButton = document.getElementById("chatBackBtn");
    if (!chatView || !backButton) return;

    let pushed = false;
    let ignoreNextPop = false;
    let closingFromPop = false;

    new MutationObserver(() => {
      const open = visible("chatView");

      if (open && !pushed && isPhone()) {
        history.pushState({ chatiView: "chat" }, "");
        pushed = true;
        return;
      }

      // Closed with the on-screen back arrow: drop our history entry too.
      if (!open && pushed && !closingFromPop) {
        pushed = false;
        ignoreNextPop = true;
        history.back();
      }
    }).observe(chatView, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("popstate", () => {
      if (ignoreNextPop) {
        ignoreNextPop = false;
        return;
      }

      if (pushed && visible("chatView")) {
        pushed = false;
        closingFromPop = true;
        backButton.click();
        closingFromPop = false;
      }
    });
  }

  // ---------------------------------------------------------------------
  // iOS home-screen apps have no system back gesture: swipe from the left
  // edge to leave a chat, with the page following the finger.
  // ---------------------------------------------------------------------

  function setupEdgeSwipeBack() {
    const chatView = document.getElementById("chatView");
    const backButton = document.getElementById("chatBackBtn");
    if (!chatView || !backButton) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    let dragging = false;

    const reset = () => {
      chatView.style.transition = "";
      chatView.style.transform = "";
      chatView.style.boxShadow = "";
    };

    chatView.addEventListener("touchstart", event => {
      if (!isPhone() || !isIOS() || !isStandalone()) return;
      const touch = event.touches[0];
      if (!touch || touch.clientX > 24) return;
      tracking = true;
      dragging = false;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = performance.now();
    }, { passive: true });

    chatView.addEventListener("touchmove", event => {
      if (!tracking) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!dragging) {
        if (Math.abs(dy) > Math.abs(dx)) {
          tracking = false;
          return;
        }
        dragging = dx > 6;
      }

      if (dragging) {
        chatView.style.transition = "none";
        chatView.style.transform = "translateX(" + Math.max(0, dx) + "px)";
        chatView.style.boxShadow = "-12px 0 32px rgba(0, 0, 0, .35)";
      }
    }, { passive: true });

    chatView.addEventListener("touchend", event => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const speed = dx / Math.max(1, performance.now() - startTime);
      const leave = dx > window.innerWidth * 0.35 || speed > 0.6;

      chatView.style.transition = "transform .22s cubic-bezier(.2, .8, .2, 1)";
      chatView.style.transform = leave ? "translateX(100%)" : "translateX(0)";

      setTimeout(() => {
        if (leave) backButton.click();
        reset();
      }, 220);
    }, { passive: true });

    chatView.addEventListener("touchcancel", () => {
      tracking = false;
      reset();
    }, { passive: true });
  }

  function initialize() {
    setupCompactHeader();
    setupBackNavigation();
    setupEdgeSwipeBack();
    document.body.classList.toggle("v8-standalone", isStandalone());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
