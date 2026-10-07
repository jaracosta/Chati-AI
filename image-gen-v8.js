// CHATI-AI V8 — Characters send pictures of themselves.
// "Create image" in the chat's + menu, or a message that starts with
// "Crea una imagen…", "Create an image…", "/imagine …", asks the character
// for a picture. The server writes the prompt from the character sheet and
// the story, then an image model draws it. NSFW follows the 18+ switch and
// is never allowed for minors (checked on the server).
(() => {
  "use strict";

  const MAX_SIDE = 1280;

  const REQUEST_PATTERN = new RegExp(
    "^\\s*(?:" +
      "\\/(?:imagine|image|img|imagen|foto)\\b" +
      "|" +
      "(?:crea|créame|creame|genera|genérame|generame|haz|hazme|dibuja|dibújame|dibujame|manda|mándame|mandame|envía|envia|envíame|enviame|create|generate|make|draw|send|show)" +
      "(?:\\s+me)?\\s+(?:una?\\s+|an?\\s+|otra\\s+|another\\s+)?(?:nueva\\s+|new\\s+)?" +
      "(?:imagen|image|foto|picture|pic|selfie|photo|dibujo|drawing)" +
    ")",
    "i"
  );

  const lang = () => (window.ChatiI18n?.lang === "es" ? "es" : "en");
  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  const isImageRequest = text => REQUEST_PATTERN.test(String(text || ""));

  function canUseApp() {
    return (
      typeof currentCharacter !== "undefined" &&
      typeof mutateStoredChat === "function" &&
      typeof normalizeMessage === "function" &&
      typeof renderMessages === "function"
    );
  }

  // The profile picture as shown in the chat header (works for inline,
  // cloud-stored and linked pictures), shrunk to a small JPEG.
  function referencePicture(character) {
    const fallback = typeof character.image === "string" &&
      (character.image.startsWith("data:image/") || character.image.startsWith("https://"))
      ? character.image
      : "";
    const shown = document.getElementById("chatCharacterImage");
    if (!shown || !shown.complete || !shown.naturalWidth || shown.style.display === "none") return fallback;
    try {
      const ratio = Math.min(768 / shown.naturalWidth, 768 / shown.naturalHeight, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(shown.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(shown.naturalHeight * ratio));
      canvas.getContext("2d").drawImage(shown, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.88);
    } catch {
      // Cross-origin picture without CORS: use the link itself.
      return fallback || (shown.src.startsWith("https://") ? shown.src : "");
    }
  }

  function characterPayload(character) {
    const appearance = character.appearance || {};
    return {
      name: character.name || "",
      pronouns: character.pronouns || "",
      description: character.description || character.bio || "",
      personality: character.personality || "",
      scenario: character.scenario || "",
      appearance: [
        appearance.physical,
        appearance.startingOutfit || appearance.defaultOutfit,
        appearance.accessories
      ].filter(Boolean).join("\n"),
      image: referencePicture(character)
    };
  }

  function recentStory(characterId, chatId) {
    try {
      const chat = getStoredChat(characterId, chatId);
      return (chat?.messages || [])
        .filter(message => message.sender !== "system")
        .slice(-9, -1)
        .map(message => ({
          sender: message.sender,
          text: typeof getMessageText === "function" ? getMessageText(normalizeMessage(message)) : message.text || ""
        }));
    } catch {
      return [];
    }
  }

  async function toDataUrl(url) {
    if (url.startsWith("data:image/")) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Smaller JPEG so chats stay light and sync quickly.
  async function shrink(dataUrl) {
    if (typeof loadImageFromDataUrl !== "function") return dataUrl;
    const image = await loadImageFromDataUrl(dataUrl);
    const ratio = Math.min(MAX_SIDE / image.width, MAX_SIDE / image.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  async function createImage(text) {
    if (!canUseApp() || !currentCharacter || !currentChatId || isSending) return;

    const character = { ...currentCharacter };
    const chatId = currentChatId;

    mutateStoredChat(character.id, chatId, chat => {
      chat.messages.push(normalizeMessage({ sender: "user", text, time: Date.now() }));
      if (chat.title === "New Chat" && chat.messages.length === 1 && typeof makeChatTitle === "function") {
        chat.title = makeChatTitle(text);
      }
    });

    messageInput.value = "";
    if (typeof autoGrowMessageInput === "function") autoGrowMessageInput();
    renderMessages();
    if (typeof renderChatHistory === "function") renderChatHistory();

    setSendingState(true);
    if (typeof showTypingIndicator === "function") showTypingIndicator();

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: characterPayload(character),
          request: text,
          recent: recentStory(character.id, chatId),
          lang: lang(),
          matureContent: typeof isMatureContentEnabled === "function" && isMatureContentEnabled() === true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ? t(data.error) : t("Couldn't create the image right now. Please try again."));

      let attachment = null;
      if (data.image) {
        const dataUrl = await shrink(await toDataUrl(data.image));
        attachment = { type: "image", dataUrl, mimeType: "image/jpeg", name: "character-image", note: "" };
      }

      const caption = String(data.caption || "").trim() || (attachment ? "**" + t("sends a picture") + "**" : "…");

      mutateStoredChat(character.id, chatId, chat => {
        chat.messages.push(normalizeMessage({ sender: "character", text: caption, attachment, time: Date.now() }));
      });
    } catch (error) {
      if (typeof removeTypingIndicator === "function") removeTypingIndicator();
      if (currentChatId === chatId && typeof addSystemMessage === "function") {
        addSystemMessage(error?.message || t("Couldn't create the image right now. Please try again."));
      }
      return;
    } finally {
      if (typeof removeTypingIndicator === "function") removeTypingIndicator();
      setSendingState(false);
    }

    if (currentChatId === chatId) renderMessages();
    if (typeof renderChatHistory === "function") renderChatHistory();
  }

  function onSubmit(event) {
    if (!canUseApp() || !currentCharacter) return;
    if (typeof isGroupCharacter === "function" && isGroupCharacter(currentCharacter)) return;
    if (typeof pendingAttachment !== "undefined" && pendingAttachment) return;

    const text = messageInput?.value?.trim() || "";
    if (!isImageRequest(text)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    createImage(text);
  }

  function addMenuOption() {
    const menu = document.getElementById("mediaAttachMenu");
    if (!menu || document.getElementById("createImageOption")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "createImageOption";
    button.className = "media-option";
    button.innerHTML =
      '<span class="media-option-icon">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"></path>' +
          '<path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"></path>' +
        '</svg>' +
      '</span>' +
      '<span><strong></strong><small></small></span>';

    const label = () => {
      button.querySelector("strong").textContent = t("Create image");
      button.querySelector("small").textContent = t("The character sends you a picture");
    };
    label();
    window.addEventListener("chati:languagechange", label);

    button.addEventListener("click", () => {
      if (typeof closeMediaAttachMenu === "function") closeMediaAttachMenu();
      openPrompt();
    });

    menu.prepend(button);
  }

  // Uses what is typed as the request, or starts one for the user to finish.
  function openPrompt() {
      const typed = messageInput?.value?.trim() || "";
      if (typed && !isImageRequest(typed)) {
        createImage((lang() === "es" ? "Crea una imagen: " : "Create an image: ") + typed);
        return;
      }
      if (typed) {
        createImage(typed);
        return;
      }
      messageInput.value = lang() === "es" ? "Crea una imagen de " : "Create an image of ";
      messageInput.focus();
      if (typeof autoGrowMessageInput === "function") autoGrowMessageInput();
  }

  function initialize() {
    addMenuOption();
    // Capture phase so this runs before the normal chat send.
    document.getElementById("chatForm")?.addEventListener("submit", onSubmit, true);
  }

  window.ChatiImages = Object.freeze({ isImageRequest, createImage, openPrompt });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
