// CHATI-AI V6.0.2 — image/video avatars + responsive chat backgrounds
(() => {
  "use strict";

  const VERSION = "6.0.2";
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
    video.className = className;
    video.src = src;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-hidden", "true");
    video.addEventListener("canplay", () => video.play().catch(() => {}), { once: true });
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

  function setPreviewMedia(container, source, mode) {
    if (!container) return;

    container.querySelectorAll(":scope > .v6-preview-media").forEach(node => node.remove());

    if (!source) return;

    if (isVideoSource(source)) {
      const video = makeVideo(source, "v6-preview-media v6-preview-video");
      container.appendChild(video);
      container.classList.add("has-image");
      return;
    }

    if (mode === "background") {
      const img = document.createElement("img");
      img.className = "v6-preview-media v6-preview-image";
      img.src = source;
      img.alt = "";
      container.appendChild(img);
    }
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

    setPreviewMedia(document.getElementById("backgroundPreview"), charBackground, "background");
    setPreviewMedia(document.getElementById("groupBackgroundPreview"), groupBackground, "background");
  }

  function ensureChatBackgroundMedia() {
    const host = document.getElementById("chatBackground");
    if (!host) return;

    const source = extractCssUrl(host.style.backgroundImage);
    let media = host.querySelector(":scope > .v6-chat-background-media");

    if (!source) {
      media?.remove();
      host.classList.remove("v6-has-video-background");
      return;
    }

    const video = isVideoSource(source);
    const same = media && media.dataset.source === source && (
      (video && media.tagName === "VIDEO") ||
      (!video && media.tagName === "IMG")
    );

    if (same) return;
    media?.remove();

    if (video) {
      media = makeVideo(source, "v6-chat-background-media");
      host.classList.add("v6-has-video-background");
    } else {
      media = document.createElement("img");
      media.className = "v6-chat-background-media";
      media.src = source;
      media.alt = "";
      media.setAttribute("aria-hidden", "true");
      host.classList.remove("v6-has-video-background");
    }

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