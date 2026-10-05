// CHATI-AI V6.0.2 — image/video avatars + responsive chat backgrounds
(() => {
  "use strict";

  const VERSION = "6.1.0";
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
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");

    const resume = () => {
      if (video.paused) video.play().catch(() => {});
    };

    video.addEventListener("canplay", resume);
    video.addEventListener("loadedmetadata", resume);
    video.addEventListener("ended", () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });

    return video;
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
    let media = host.querySelector(":scope > .v6-chat-background-media");

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

    const source = host.dataset.v6VideoSource || "";

    if (!source) {
      media?.remove();
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
      if (media.paused) media.play().catch(() => {});
      return;
    }

    media?.remove();
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
          if (node.nodeType === 1) scanAvatars(node);
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
  updateFormPreviews();
  ensureChatBackgroundMedia();

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "style"]
  });

  window.addEventListener("resize", ensureChatBackgroundMedia);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;

    document.querySelectorAll("video.v6-loop-video").forEach(video => {
      if (video.paused) video.play().catch(() => {});
    });
  });

  window.addEventListener("pageshow", () => {
    document.querySelectorAll("video.v6-loop-video").forEach(video => {
      if (video.paused) video.play().catch(() => {});
    });
    ensureChatBackgroundMedia();
  });

  window.ChatiMediaV6 = Object.freeze({
    version: VERSION,
    refresh() {
      scanAvatars();
      updateFormPreviews();
      ensureChatBackgroundMedia();
    }
  });

  console.log("[Chati-AI Media] V" + VERSION + " video + responsive media ready.");
})();