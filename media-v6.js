// CHATI-AI V6.0.2 — image/video avatars + responsive chat backgrounds
(() => {
  "use strict";

  const VERSION = "7.0.0";
  const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  const videoFileMap = {
    characterImageFile: "characterImage",
    characterBackgroundFile: "characterBackground",
    groupBackgroundFile: "groupBackground"
  };

  function isVideoSource(src) {
    const value = String(src || "");
    const clean = value.split("?")[0].split("#")[0].toLowerCase();

    return clean.startsWith("data:video/") ||
      clean.startsWith("blob:") && /\.video/i.test(clean) ||
      /\.(mp4|webm|mov|m4v)$/i.test(clean) ||
      /\/video\/(mp4|webm|quicktime)/i.test(value);
  }

  function extractCssUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || raw === "none") return "";

    const match = raw.match(/^url\((['"]?)(.*)\1\)$/i);
    return match ? match[2].replace(/\\"/g, '"') : "";
  }

  function makeVideo(src, className) {
    const video = document.createElement("video");
    video.className = className + " v6-loop-video";
    video.src = src;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = false;
    video.playsInline = true;
    video.preload = "auto";
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");

    const resume = () => {
      if (video.paused) video.play().catch(() => {});
    };

    video.addEventListener("canplay", resume);
    video.addEventListener("loadedmetadata", resume);

    // Callers append the video right after this returns.
    queueMicrotask(() => installSmoothLoop(video));

    return video;
  }

  // Seamless loop: two stacked copies of the same video. Shortly before the
  // visible copy ends, the hidden copy (already decoded and parked on its
  // first frame) starts playing and fades in ON TOP while the old copy keeps
  // playing underneath to its last frame. Nothing is cut early and the
  // picture never dips in brightness, so the seam is a soft dissolve.
  function installSmoothLoop(video) {
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.dataset.v6SmoothLoop === "1") return;

    const parent = video.parentElement;

    // Not in the page yet: native loop for now; the DOM observer installs
    // the seamless loop as soon as the video is attached.
    if (!parent) {
      video.loop = true;
      return;
    }

    video.dataset.v6SmoothLoop = "1";
    video.loop = false;
    video.muted = true;
    video.playsInline = true;

    parent.classList.add("v6-smooth-loop-host");

    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    const twin = video.cloneNode(false);
    twin.removeAttribute("id");
    twin.removeAttribute("autoplay");
    twin.dataset.v6SmoothLoop = "1";
    twin.classList.add("v6-loop-twin");
    twin.loop = false;
    twin.autoplay = false;
    twin.muted = true;
    twin.defaultMuted = true;
    twin.playsInline = true;
    twin.preload = "auto";
    twin.setAttribute("aria-hidden", "true");
    parent.appendChild(twin);

    let active = video;
    let standby = twin;
    let fading = false;
    let stopped = false;
    let fadeTimer = 0;
    let pollTimer = 0;

    const setLayer = (element, opacity, top, fadeMs) => {
      element.style.transition =
        fadeMs > 0 ? "opacity " + fadeMs + "ms ease-in-out" : "none";
      element.style.zIndex = top ? "1" : "0";
      element.style.opacity = String(opacity);
    };

    setLayer(active, 1, false, 0);
    setLayer(standby, 0, false, 0);

    // Fade length scales with the clip: ~12% of it, between 0.25s and 0.8s.
    const fadeSeconds = () => {
      const duration = active.duration;
      if (!Number.isFinite(duration) || duration <= 0) return 0.4;
      return Math.min(0.8, Math.max(0.25, duration * 0.12), duration * 0.3);
    };

    // Keep the hidden copy decoded and waiting on its first frame.
    const park = element => {
      try { element.pause(); } catch {}
      try { element.currentTime = 0; } catch {}
    };

    const playWhenReady = element => new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        element.removeEventListener("playing", finish);
        resolve();
      };
      element.addEventListener("playing", finish);
      // Never wait long; a slow decoder should not stall the loop.
      setTimeout(finish, 350);
      element.play().catch(finish);
    });

    const crossfade = async immediate => {
      if (fading || stopped) return;
      fading = true;

      const incoming = standby;
      const outgoing = active;
      const fadeMs = immediate ? 0 : Math.round(fadeSeconds() * 1000);

      // Something else may have played the hidden copy; always restart it
      // from the first frame.
      if (incoming.currentTime > 0.05) {
        try { incoming.currentTime = 0; } catch {}
      }

      await playWhenReady(incoming);
      if (stopped) return;

      setLayer(outgoing, 1, false, 0);
      setLayer(incoming, 1, true, fadeMs);

      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        setLayer(outgoing, 0, false, 0);
        park(outgoing);
        active = incoming;
        standby = outgoing;
        fading = false;
      }, fadeMs + 40);
    };

    const check = () => {
      if (stopped || fading) return;
      const duration = active.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      // Start a little early so the incoming copy is already moving when
      // the dissolve begins.
      const lead = fadeSeconds() + 0.12;
      if (duration - active.currentTime <= lead) {
        crossfade(false).catch(() => {});
      }
    };

    const onEnded = event => {
      // Missed the window (tab was hidden, slow device): swap right away.
      if (event.target === active) crossfade(true).catch(() => {});
    };

    const onVisibility = () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        try { active.pause(); } catch {}
        return;
      }
      if (active.paused && !fading) active.play().catch(() => {});
    };

    const stop = () => {
      stopped = true;
      clearTimeout(fadeTimer);
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      twin.remove();
    };

    video.addEventListener("ended", onEnded);
    twin.addEventListener("ended", onEnded);
    // iOS only decodes a video once it has played: warm the standby copy up
    // the first time the visible one starts, then park it on frame one.
    video.addEventListener("playing", () => {
      if (twin.dataset.v6Warm === "1") return;
      twin.dataset.v6Warm = "1";
      twin.play()
        .then(() => {
          if (!fading && standby === twin) park(twin);
        })
        .catch(() => {});
    }, { once: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Watch the clock (and clean up when the video leaves the page).
    pollTimer = setInterval(() => {
      if (!parent.isConnected || !video.isConnected) {
        stop();
        return;
      }
      check();
    }, 50);

    park(twin);
    if (active.paused) active.play().catch(() => {});
  }

  function enhanceAvatarImage(img) {
    if (!(img instanceof HTMLImageElement)) return;

    const src = img.currentSrc || img.src || "";
    const parent = img.parentElement;
    if (!parent) return;

    const oldProxy = parent.querySelector(":scope > .v6-avatar-video-proxy");

    if (!isVideoSource(src)) {
      img.classList.remove("v6-video-source-hidden");
      oldProxy?.remove();
      parent.classList.remove("v6-video-avatar-host");
      return;
    }

    parent.classList.add("v6-video-avatar-host");
    img.classList.add("v6-video-source-hidden");

    if (oldProxy && oldProxy.dataset.source === src) return;
    oldProxy?.remove();

    const video = makeVideo(src, "v6-avatar-video-proxy");
    video.dataset.source = src;
    parent.appendChild(video);
  }

  function scanAvatars(root = document) {
    const selectors = [
      ".character-image",
      "#chatCharacterImage",
      ".history-avatar img",
      ".group-member-avatar img",
      ".group-avatar-chip img"
    ].join(",");

    root.querySelectorAll?.(selectors).forEach(enhanceAvatarImage);

    if (root instanceof HTMLImageElement && root.matches(selectors)) {
      enhanceAvatarImage(root);
    }
  }

  function setPreviewMedia(container, source) {
    if (!container) return;

    container.querySelectorAll(":scope > .v6-preview-media").forEach(node => node.remove());

    if (!source || !isVideoSource(source)) {
      // Images are already rendered by the creator's native CSS background.
      // Do not add a second image layer.
      return;
    }

    const video = makeVideo(source, "v6-preview-media v6-preview-video");
    container.appendChild(video);
    container.classList.add("has-image");
  }

  function updateFormPreviews() {
    const charImage = document.getElementById("characterImage")?.value?.trim() || "";
    const charBackground = document.getElementById("characterBackground")?.value?.trim() || "";
    const groupBackground = document.getElementById("groupBackground")?.value?.trim() || "";

    const avatarPreview = document.getElementById("characterAvatarPreview");
    const avatarHost = avatarPreview?.parentElement;

    if (avatarHost) {
      avatarHost.querySelectorAll(":scope > .v6-avatar-editor-video").forEach(node => node.remove());

      if (isVideoSource(charImage)) {
        avatarPreview?.classList.add("v6-video-source-hidden");
        const video = makeVideo(charImage, "v6-avatar-editor-video");
        avatarHost.appendChild(video);
      } else {
        avatarPreview?.classList.remove("v6-video-source-hidden");
      }
    }

    setPreviewMedia(document.getElementById("backgroundPreview"), charBackground);
    setPreviewMedia(document.getElementById("groupBackgroundPreview"), groupBackground);
  }

  function ensureChatBackgroundMedia() {
    const host = document.getElementById("chatBackground");
    if (!host) return;

    const inlineSource = extractCssUrl(host.style.backgroundImage);
    let media = host.querySelector(":scope > .v6-chat-background-media:not(.v6-loop-twin)");

    // Static images use exactly ONE rendering layer: the host background.
    if (inlineSource && !isVideoSource(inlineSource)) {
      media?.remove();
      delete host.dataset.v6VideoSource;
      host.classList.remove("v6-has-video-background");
      return;
    }

    // When script.js gives us a video URL through backgroundImage, capture it
    // once, then remove the invalid CSS background and render a real <video>.
    if (inlineSource && isVideoSource(inlineSource)) {
      host.dataset.v6VideoSource = inlineSource;
    }

    if (!inlineSource && !host.classList.contains("active")) {
      delete host.dataset.v6VideoSource;
    }

    const source = host.dataset.v6VideoSource || "";

    if (!source) {
      media?.remove();
      host.querySelectorAll(":scope > .v6-loop-twin").forEach(node => node.remove());
      host.classList.remove("v6-has-video-background");
      return;
    }

    const same =
      media instanceof HTMLVideoElement &&
      media.dataset.source === source;

    host.classList.add("v6-has-video-background");

    if (host.style.backgroundImage !== "none") {
      host.style.backgroundImage = "none";
    }

    if (same) {
      // The seamless-loop controller owns playback once it is installed.
      if (media.dataset.v6SmoothLoop !== "1" && media.paused) {
        media.play().catch(() => {});
      }
      return;
    }

    media?.remove();
    host.querySelectorAll(":scope > .v6-loop-twin").forEach(node => node.remove());
    media = makeVideo(source, "v6-chat-background-media");
    media.dataset.source = source;
    host.appendChild(media);
  }

  async function handleVideoFileInput(event) {
    const input = event.target;
    const targetId = videoFileMap[input?.id];

    if (!targetId || !input.files?.[0]) return;

    const file = input.files[0];

    if (!VIDEO_TYPES.has(file.type)) return;

    event.stopImmediatePropagation();

    if (file.size > 30 * 1024 * 1024) {
      input.value = "";
      alert("Video must be 30 MB or smaller.");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read video."));
      reader.readAsDataURL(file);
    });

    const target = document.getElementById(targetId);
    if (!target) return;

    target.value = dataUrl;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    updateFormPreviews();
  }

  function prepareInputs() {
    Object.keys(videoFileMap).forEach(id => {
      const input = document.getElementById(id);
      if (input) input.accept = "image/*,video/mp4,video/webm,video/quicktime";
    });

    ["characterImage", "characterBackground", "groupBackground"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", () => {
        requestAnimationFrame(updateFormPreviews);
      });
    });
  }

  const observer = new MutationObserver(records => {
    let backgroundChanged = false;

    records.forEach(record => {
      if (record.type === "childList") {
        record.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          scanAvatars(node);

          if (node.matches?.("video.v6-loop-video")) {
            installSmoothLoop(node);
          }

          node.querySelectorAll?.("video.v6-loop-video").forEach(installSmoothLoop);
        });
      }

      if (record.type === "attributes") {
        if (record.target instanceof HTMLImageElement) {
          enhanceAvatarImage(record.target);
        }

        if (record.target?.id === "chatBackground") {
          backgroundChanged = true;
        }
      }
    });

    if (backgroundChanged) requestAnimationFrame(ensureChatBackgroundMedia);
  });

  document.addEventListener("change", event => {
    handleVideoFileInput(event).catch(error => {
      console.error("[Chati-AI V6 Media] Video selection failed:", error);
    });
  }, true);

  prepareInputs();
  scanAvatars();
  document.querySelectorAll("video.v6-loop-video").forEach(installSmoothLoop);
  updateFormPreviews();
  ensureChatBackgroundMedia();

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "style"]
  });

  window.addEventListener("resize", ensureChatBackgroundMedia);

  window.addEventListener("pageshow", () => {
    document.querySelectorAll("video.v6-loop-video:not(.v6-loop-twin)").forEach(installSmoothLoop);
    ensureChatBackgroundMedia();
  });

  window.ChatiMediaV6 = Object.freeze({
    version: VERSION,
    refresh() {
      scanAvatars();
      document.querySelectorAll("video.v6-loop-video").forEach(installSmoothLoop);
      updateFormPreviews();
      ensureChatBackgroundMedia();
    },
    installSmoothLoop
  });

  console.log("[Chati-AI Media] V" + VERSION + " video + responsive media ready.");
})();