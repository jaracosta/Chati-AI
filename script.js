// =========================
// PAGE ELEMENTS
// =========================

const homeView =
  document.getElementById("homeView");

const createView =
  document.getElementById("createView");

const chatView =
  document.getElementById("chatView");


const createBtn =
  document.getElementById("createBtn");

const mainCreateBtn =
  document.getElementById("mainCreateBtn");

const chatsBtn =
  document.getElementById("chatsBtn");

const backBtn =
  document.getElementById("backBtn");


const characterForm =
  document.getElementById("characterForm");

const charactersGrid =
  document.getElementById("charactersGrid");

const emptyState =
  document.getElementById("emptyState");


// =========================
// CHAT ELEMENTS
// =========================

const chatBackBtn =
  document.getElementById("chatBackBtn");

const chatCharacterImage =
  document.getElementById("chatCharacterImage");

const chatCharacterName =
  document.getElementById("chatCharacterName");

const chatCharacterDescription =
  document.getElementById(
    "chatCharacterDescription"
  );

const currentChatTitle =
  document.getElementById(
    "currentChatTitle"
  );

const messages =
  document.getElementById("messages");

const chatForm =
  document.getElementById("chatForm");

const messageInput =
  document.getElementById("messageInput");


// =========================
// CHAT ACTIONS
// =========================

const newChatBtn =
  document.getElementById("newChatBtn");

const chatMenuBtn =
  document.getElementById("chatMenuBtn");

const chatMenu =
  document.getElementById("chatMenu");

const renameChatBtn =
  document.getElementById("renameChatBtn");

const clearChatBtn =
  document.getElementById("clearChatBtn");

const deleteChatBtn =
  document.getElementById("deleteChatBtn");

const chatHistoryList =
  document.getElementById(
    "chatHistoryList"
  );


// =========================
// STATE
// =========================

let characters =
  JSON.parse(
    localStorage.getItem(
      "chatiCharacters"
    )
  ) || [];


let currentCharacter = null;

let currentChatId = null;

let isSending = false;


// =========================
// CHARACTER STORAGE
// =========================

function saveCharacters() {
  localStorage.setItem(
    "chatiCharacters",
    JSON.stringify(characters)
  );
}


// =========================
// STORAGE KEYS
// =========================

function getChatsKey(characterId) {
  return "chatiChats_" + characterId;
}


function getActiveChatKey(characterId) {
  return "chatiActiveChat_" + characterId;
}


function getOldChatKey(characterId) {
  return "chatiChat_" + characterId;
}


// =========================
// CHAT ID
// =========================

function createChatId() {
  return (
    Date.now().toString() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


// =========================
// MIGRATE OLD CHAT
// =========================

function migrateOldChat(characterId) {

  const newKey =
    getChatsKey(characterId);


  if (
    localStorage.getItem(newKey) !== null
  ) {
    return;
  }


  const oldKey =
    getOldChatKey(characterId);

  const oldRaw =
    localStorage.getItem(oldKey);


  if (!oldRaw) {
    localStorage.setItem(
      newKey,
      JSON.stringify([])
    );

    return;
  }


  try {
    const oldMessages =
      JSON.parse(oldRaw);


    if (
      Array.isArray(oldMessages) &&
      oldMessages.length > 0
    ) {
      const migratedChat = {
        id: createChatId(),

        title: "Previous Chat",

        createdAt:
          oldMessages[0]?.time ||
          Date.now(),

        updatedAt:
          oldMessages[
            oldMessages.length - 1
          ]?.time ||
          Date.now(),

        messages:
          oldMessages
      };


      localStorage.setItem(
        newKey,
        JSON.stringify([
          migratedChat
        ])
      );


      localStorage.setItem(
        getActiveChatKey(
          characterId
        ),

        migratedChat.id
      );
    }

    else {
      localStorage.setItem(
        newKey,
        JSON.stringify([])
      );
    }


    localStorage.removeItem(
      oldKey
    );
  }

  catch (error) {
    console.error(
      "Could not migrate old chat:",
      error
    );


    localStorage.setItem(
      newKey,
      JSON.stringify([])
    );
  }
}


// =========================
// GET CHATS
// =========================

function getCharacterChats(
  characterId
) {
  migrateOldChat(
    characterId
  );


  try {
    return (
      JSON.parse(
        localStorage.getItem(
          getChatsKey(
            characterId
          )
        )
      ) || []
    );
  }

  catch (error) {
    console.error(
      "Could not load chats:",
      error
    );

    return [];
  }
}


// =========================
// SAVE CHATS
// =========================

function saveCharacterChats(
  characterId,
  chats
) {
  localStorage.setItem(
    getChatsKey(characterId),

    JSON.stringify(chats)
  );
}


// =========================
// BUILD NEW CHAT
// =========================

function buildNewChat() {
  const now =
    Date.now();


  return {
    id: createChatId(),

    title: "New Chat",

    createdAt: now,

    updatedAt: now,

    messages: []
  };
}


// =========================
// CREATE NEW CHAT
// =========================

function createNewChat(
  character,
  openImmediately = true
) {
  if (!character) {
    return null;
  }


  const chats =
    getCharacterChats(
      character.id
    );


  const newChat =
    buildNewChat();


  chats.push(
    newChat
  );


  saveCharacterChats(
    character.id,
    chats
  );


  localStorage.setItem(
    getActiveChatKey(
      character.id
    ),

    newChat.id
  );


  if (openImmediately) {
    openChat(
      character,
      newChat.id
    );
  }


  renderChatHistory();


  return newChat;
}


// =========================
// CURRENT CHAT
// =========================

function getCurrentChat() {

  if (
    !currentCharacter ||
    !currentChatId
  ) {
    return null;
  }


  const chats =
    getCharacterChats(
      currentCharacter.id
    );


  return (
    chats.find(
      chat =>
        chat.id ===
        currentChatId
    ) || null
  );
}


// =========================
// UPDATE CHAT
// =========================

function updateCurrentChat(
  callback
) {
  if (
    !currentCharacter ||
    !currentChatId
  ) {
    return null;
  }


  const chats =
    getCharacterChats(
      currentCharacter.id
    );


  const index =
    chats.findIndex(
      chat =>
        chat.id ===
        currentChatId
    );


  if (index === -1) {
    return null;
  }


  callback(
    chats[index]
  );


  chats[index].updatedAt =
    Date.now();


  saveCharacterChats(
    currentCharacter.id,
    chats
  );


  renderChatHistory();


  return chats[index];
}


// =========================
// NAVIGATION
// =========================

function showHomeView() {

  homeView.classList.remove(
    "hidden"
  );

  createView.classList.add(
    "hidden"
  );

  chatView.classList.add(
    "hidden"
  );


  closeChatMenu();

  renderCharacters();

  renderChatHistory();
}


function showCreateView() {

  homeView.classList.add(
    "hidden"
  );

  chatView.classList.add(
    "hidden"
  );

  createView.classList.remove(
    "hidden"
  );


  closeChatMenu();
}


// =========================
// OPEN CHAT
// =========================

function openChat(
  character,
  requestedChatId = null
) {
  currentCharacter =
    character;


  let chats =
    getCharacterChats(
      character.id
    );


  if (chats.length === 0) {

    const firstChat =
      buildNewChat();


    chats.push(
      firstChat
    );


    saveCharacterChats(
      character.id,
      chats
    );
  }


  let selectedChat = null;


  if (requestedChatId) {
    selectedChat =
      chats.find(
        chat =>
          chat.id ===
          requestedChatId
      );
  }


  if (!selectedChat) {

    const activeId =
      localStorage.getItem(
        getActiveChatKey(
          character.id
        )
      );


    selectedChat =
      chats.find(
        chat =>
          chat.id ===
          activeId
      );
  }


  if (!selectedChat) {

    const sorted =
      [...chats].sort(
        (a, b) =>
          b.updatedAt -
          a.updatedAt
      );


    selectedChat =
      sorted[0];
  }


  currentChatId =
    selectedChat.id;


  localStorage.setItem(
    getActiveChatKey(
      character.id
    ),

    currentChatId
  );


  homeView.classList.add(
    "hidden"
  );

  createView.classList.add(
    "hidden"
  );

  chatView.classList.remove(
    "hidden"
  );


  chatCharacterName.textContent =
    character.name;


  chatCharacterDescription.textContent =
    character.description ||
    "AI Character";


  if (character.image) {

    chatCharacterImage.src =
      character.image;

    chatCharacterImage.style.display =
      "block";
  }

  else {
    chatCharacterImage.removeAttribute(
      "src"
    );
  }


  closeChatMenu();

  renderMessages();

  renderChatHistory();


  setTimeout(
    () => messageInput.focus(),
    100
  );
}


// =========================
// NAV BUTTONS
// =========================

createBtn.addEventListener(
  "click",
  showCreateView
);


mainCreateBtn.addEventListener(
  "click",
  showCreateView
);


backBtn.addEventListener(
  "click",
  showHomeView
);


chatsBtn.addEventListener(
  "click",
  showHomeView
);


chatBackBtn.addEventListener(
  "click",
  showHomeView
);


// =========================
// CREATE CHARACTER
// =========================

characterForm.addEventListener(
  "submit",

  function(event) {

    event.preventDefault();


    const character = {
      id:
        Date.now(),

      name:
        document
          .getElementById(
            "characterName"
          )
          .value
          .trim(),

      image:
        document
          .getElementById(
            "characterImage"
          )
          .value
          .trim(),

      description:
        document
          .getElementById(
            "characterDescription"
          )
          .value
          .trim(),

      personality:
        document
          .getElementById(
            "characterPersonality"
          )
          .value
          .trim(),

      scenario:
        document
          .getElementById(
            "characterScenario"
          )
          .value
          .trim(),

      instructions:
        document
          .getElementById(
            "characterInstructions"
          )
          .value
          .trim(),

      createdAt:
        Date.now()
    };


    characters.push(
      character
    );


    saveCharacters();

    characterForm.reset();

    showHomeView();
  }
);


// =========================
// CHARACTER CARDS
// =========================

function renderCharacters() {

  charactersGrid.innerHTML =
    "";


  if (
    characters.length === 0
  ) {
    emptyState.style.display =
      "flex";

    return;
  }


  emptyState.style.display =
    "none";


  characters.forEach(
    function(character) {

      const card =
        document.createElement(
          "div"
        );


      card.classList.add(
        "character-card"
      );


      // IMAGE

      if (character.image) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          character.image;

        image.classList.add(
          "character-image"
        );

        image.alt =
          character.name;


        card.appendChild(
          image
        );
      }

      else {

        const placeholder =
          document.createElement(
            "div"
          );


        placeholder.classList.add(
          "character-placeholder"
        );

        placeholder.textContent =
          "🤖";


        card.appendChild(
          placeholder
        );
      }


      // INFO

      const info =
        document.createElement(
          "div"
        );


      info.classList.add(
        "character-info"
      );


      const name =
        document.createElement(
          "h3"
        );


      name.textContent =
        character.name;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        character.description ||
        "AI Character";


      info.appendChild(
        name
      );

      info.appendChild(
        description
      );

      card.appendChild(
        info
      );


      card.addEventListener(
        "click",

        function() {
          openChat(
            character
          );
        }
      );


      charactersGrid.appendChild(
        card
      );
    }
  );
}


// =========================
// AUTOMATIC CHAT TITLE
// =========================

function makeChatTitle(text) {

  const cleaned =
    text
      .replace(/\s+/g, " ")
      .trim();


  if (cleaned.length <= 28) {
    return cleaned;
  }


  return (
    cleaned.slice(
      0,
      28
    ) +
    "..."
  );
}


// =========================
// CHAT HISTORY
// =========================

function renderChatHistory() {

  chatHistoryList.innerHTML =
    "";


  const allChats = [];


  characters.forEach(
    function(character) {

      const chats =
        getCharacterChats(
          character.id
        );


      chats.forEach(
        function(chat) {

          allChats.push({
            character,
            chat
          });
        }
      );
    }
  );


  allChats.sort(
    (a, b) =>
      b.chat.updatedAt -
      a.chat.updatedAt
  );


  if (
    allChats.length === 0
  ) {

    const empty =
      document.createElement(
        "p"
      );


    empty.classList.add(
      "history-empty"
    );


    empty.textContent =
      "No chats yet";


    chatHistoryList.appendChild(
      empty
    );


    return;
  }


  allChats.forEach(
    function(item) {

      const button =
        document.createElement(
          "button"
        );


      button.classList.add(
        "history-item"
      );


      if (
        currentCharacter &&
        currentChatId &&
        currentCharacter.id ===
          item.character.id &&
        currentChatId ===
          item.chat.id
      ) {
        button.classList.add(
          "active"
        );
      }


      const characterName =
        document.createElement(
          "span"
        );


      characterName.classList.add(
        "history-character"
      );


      characterName.textContent =
        item.character.name;


      const title =
        document.createElement(
          "span"
        );


      title.classList.add(
        "history-title"
      );


      title.textContent =
        item.chat.title ||
        "New Chat";


      button.appendChild(
        characterName
      );

      button.appendChild(
        title
      );


      button.addEventListener(
        "click",

        function() {
          if (isSending) {
            return;
          }

          openChat(
            item.character,
            item.chat.id
          );
        }
      );


      chatHistoryList.appendChild(
        button
      );
    }
  );
}


// =========================
// RENDER MESSAGES
// =========================

function renderMessages() {

  messages.innerHTML = "";


  const chat =
    getCurrentChat();


  if (!chat) {
    return;
  }


  currentChatTitle.textContent =
    chat.title ||
    "New Chat";


  if (
    chat.messages.length === 0
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.classList.add(
      "chat-empty"
    );


    if (currentCharacter.image) {

      const avatar =
        document.createElement(
          "img"
        );


      avatar.classList.add(
        "chat-empty-avatar"
      );


      avatar.src =
        currentCharacter.image;

      avatar.alt =
        currentCharacter.name;


      empty.appendChild(
        avatar
      );
    }


    const title =
      document.createElement(
        "h3"
      );


    title.textContent =
      currentCharacter.name;


    const text =
      document.createElement(
        "p"
      );


    text.textContent =
      `Start a new conversation with ${currentCharacter.name}.`;


    empty.appendChild(
      title
    );

    empty.appendChild(
      text
    );


    messages.appendChild(
      empty
    );


    return;
  }


  chat.messages.forEach(
    function(message) {

      addMessageBubble(
        message.sender,
        message.text
      );
    }
  );


  scrollToBottom();
}


// =========================
// MESSAGE BUBBLE
// =========================

function addMessageBubble(
  sender,
  text
) {

  const bubble =
    document.createElement(
      "div"
    );


  bubble.classList.add(
    "message",
    sender
  );


  bubble.textContent =
    text;


  messages.appendChild(
    bubble
  );


  return bubble;
}


// =========================
// SCROLL
// =========================

function scrollToBottom() {

  messages.scrollTop =
    messages.scrollHeight;
}


// =========================
// TYPING DOTS
// =========================

function showTypingIndicator() {

  removeTypingIndicator();


  const bubble =
    document.createElement(
      "div"
    );


  bubble.classList.add(
    "message",
    "character",
    "typing-bubble"
  );


  bubble.id =
    "typingIndicator";


  const indicator =
    document.createElement(
      "div"
    );


  indicator.classList.add(
    "typing-indicator"
  );


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const dot =
      document.createElement(
        "span"
      );


    indicator.appendChild(
      dot
    );
  }


  bubble.appendChild(
    indicator
  );


  messages.appendChild(
    bubble
  );


  scrollToBottom();
}


function removeTypingIndicator() {

  const typing =
    document.getElementById(
      "typingIndicator"
    );


  if (typing) {
    typing.remove();
  }
}


// =========================
// NEW CHAT
// =========================

newChatBtn.addEventListener(
  "click",

  function() {

    if (
      !currentCharacter ||
      isSending
    ) {
      return;
    }


    createNewChat(
      currentCharacter,
      true
    );
  }
);


// =========================
// CHAT MENU
// =========================

chatMenuBtn.addEventListener(
  "click",

  function(event) {

    event.stopPropagation();


    chatMenu.classList.toggle(
      "hidden"
    );
  }
);


function closeChatMenu() {

  chatMenu.classList.add(
    "hidden"
  );
}


document.addEventListener(
  "click",

  function(event) {

    if (
      !event.target.closest(
        ".chat-menu-wrapper"
      )
    ) {
      closeChatMenu();
    }
  }
);


// =========================
// RENAME CHAT
// =========================

renameChatBtn.addEventListener(
  "click",

  function() {

    const chat =
      getCurrentChat();


    if (!chat) {
      return;
    }


    const newName =
      prompt(
        "Rename this chat:",
        chat.title
      );


    if (newName === null) {
      return;
    }


    const cleaned =
      newName.trim();


    if (!cleaned) {
      return;
    }


    updateCurrentChat(
      function(chat) {
        chat.title =
          cleaned;
      }
    );


    closeChatMenu();

    renderMessages();

    renderChatHistory();
  }
);


// =========================
// CLEAR CHAT
// =========================

clearChatBtn.addEventListener(
  "click",

  function() {

    if (isSending) {
      return;
    }


    const chat =
      getCurrentChat();


    if (!chat) {
      return;
    }


    const confirmed =
      confirm(
        `Clear all messages from "${chat.title}"?`
      );


    if (!confirmed) {
      return;
    }


    updateCurrentChat(
      function(chat) {

        chat.messages = [];

        chat.title =
          "New Chat";
      }
    );


    closeChatMenu();

    renderMessages();

    renderChatHistory();
  }
);


// =========================
// DELETE CHAT
// =========================

deleteChatBtn.addEventListener(
  "click",

  function() {

    if (
      isSending ||
      !currentCharacter ||
      !currentChatId
    ) {
      return;
    }


    const current =
      getCurrentChat();


    if (!current) {
      return;
    }


    const confirmed =
      confirm(
        `Delete "${current.title}" permanently?`
      );


    if (!confirmed) {
      return;
    }


    const character =
      currentCharacter;


    let chats =
      getCharacterChats(
        character.id
      );


    chats =
      chats.filter(
        chat =>
          chat.id !==
          currentChatId
      );


    saveCharacterChats(
      character.id,
      chats
    );


    if (chats.length > 0) {

      chats.sort(
        (a, b) =>
          b.updatedAt -
          a.updatedAt
      );


      openChat(
        character,
        chats[0].id
      );
    }

    else {
      createNewChat(
        character,
        true
      );
    }


    closeChatMenu();

    renderChatHistory();
  }
);


// =========================
// ADD MESSAGE TO CHAT
// =========================

function addMessageToStoredChat(
  characterId,
  chatId,
  message
) {

  const chats =
    getCharacterChats(
      characterId
    );


  const index =
    chats.findIndex(
      chat =>
        chat.id ===
        chatId
    );


  if (index === -1) {
    return;
  }


  chats[index]
    .messages
    .push(message);


  chats[index].updatedAt =
    Date.now();


  saveCharacterChats(
    characterId,
    chats
  );
}


// =========================
// READ STREAM
// =========================

async function readAIStream(
  response
) {

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }


  const reader =
    response.body.getReader();


  const decoder =
    new TextDecoder();


  let buffer = "";

  let finalText = "";

  let streamingBubble = null;


  while (true) {

    const {
      value,
      done
    } =
      await reader.read();


    if (done) {
      break;
    }


    buffer +=
      decoder.decode(
        value,
        {
          stream: true
        }
      );


    const lines =
      buffer.split("\n");


    buffer =
      lines.pop() || "";


    for (const line of lines) {

      if (!line.trim()) {
        continue;
      }


      let packet;


      try {
        packet =
          JSON.parse(line);
      }

      catch {
        continue;
      }


      // =====================
      // TEXT DELTA
      // =====================

      if (
        packet.type ===
        "delta"
      ) {

        if (!streamingBubble) {

          removeTypingIndicator();


          streamingBubble =
            addMessageBubble(
              "character",
              ""
            );


          streamingBubble.classList.add(
            "streaming"
          );
        }


        finalText +=
          packet.delta;


        streamingBubble.textContent =
          finalText;


        scrollToBottom();
      }


      // =====================
      // STREAM ERROR
      // =====================

      if (
        packet.type ===
        "error"
      ) {
        throw new Error(
          packet.message ||
          "Streaming failed."
        );
      }
    }
  }


  // Parse anything remaining
  // after the final newline.

  if (buffer.trim()) {

    try {

      const packet =
        JSON.parse(buffer);


      if (
        packet.type ===
        "delta"
      ) {

        if (!streamingBubble) {

          removeTypingIndicator();


          streamingBubble =
            addMessageBubble(
              "character",
              ""
            );
        }


        finalText +=
          packet.delta;


        streamingBubble.textContent =
          finalText;
      }
    }

    catch {
      // Ignore incomplete leftovers.
    }
  }


  if (streamingBubble) {
    streamingBubble.classList.remove(
      "streaming"
    );
  }


  return finalText.trim();
}


// =========================
// SEND MESSAGE
// =========================

chatForm.addEventListener(
  "submit",

  async function(event) {

    event.preventDefault();


    if (
      !currentCharacter ||
      !currentChatId ||
      isSending
    ) {
      return;
    }


    const text =
      messageInput
        .value
        .trim();


    if (!text) {
      return;
    }


    const requestCharacter = {
      ...currentCharacter
    };


    const requestCharacterId =
      currentCharacter.id;


    const requestChatId =
      currentChatId;


    // =====================
    // SAVE USER MESSAGE
    // =====================

    let chats =
      getCharacterChats(
        requestCharacterId
      );


    const chatIndex =
      chats.findIndex(
        chat =>
          chat.id ===
          requestChatId
      );


    if (chatIndex === -1) {
      return;
    }


    const chat =
      chats[chatIndex];


    chat.messages.push({
      sender: "user",

      text,

      time:
        Date.now()
    });


    // Automatically title
    // the first message.

    if (
      chat.title ===
        "New Chat" &&
      chat.messages.length === 1
    ) {

      chat.title =
        makeChatTitle(
          text
        );
    }


    chat.updatedAt =
      Date.now();


    chats[chatIndex] =
      chat;


    saveCharacterChats(
      requestCharacterId,
      chats
    );


    const requestMessages =
      chat.messages.map(
        message => ({
          ...message
        })
      );


    // =====================
    // UPDATE UI
    // =====================

    messageInput.value = "";

    renderMessages();

    renderChatHistory();


    isSending = true;

    messageInput.disabled =
      true;


    showTypingIndicator();


    try {

      // =====================
      // ASK BACKEND
      // =====================

      const response =
        await fetch(
          "/api/chat",

          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                character:
                  requestCharacter,

                messages:
                  requestMessages
              })
          }
        );


      // Normal server error
      // before streaming starts.

      if (!response.ok) {

        let errorMessage =
          "Something went wrong.";


        try {
          const data =
            await response.json();


          errorMessage =
            data.error ||
            errorMessage;
        }

        catch {
          // Ignore JSON error.
        }


        throw new Error(
          errorMessage
        );
      }


      // =====================
      // READ LIVE RESPONSE
      // =====================

      const finalReply =
        await readAIStream(
          response
        );


      removeTypingIndicator();


      if (!finalReply) {
        throw new Error(
          "The character returned an empty response."
        );
      }


      // =====================
      // SAVE AI RESPONSE
      // =====================

      addMessageToStoredChat(
        requestCharacterId,

        requestChatId,

        {
          sender:
            "character",

          text:
            finalReply,

          time:
            Date.now()
        }
      );


      renderChatHistory();
    }

    catch (error) {

      removeTypingIndicator();


      console.error(
        "Chat error:",
        error
      );


      // Remove unfinished
      // streamed bubble.

      const unfinished =
        messages.querySelector(
          ".message.streaming"
        );


      if (unfinished) {
        unfinished.remove();
      }


      addMessageBubble(
        "system",

        "Could not generate a response right now."
      );


      scrollToBottom();
    }

    finally {

      isSending = false;


      messageInput.disabled =
        false;


      if (
        !chatView.classList.contains(
          "hidden"
        )
      ) {
        messageInput.focus();
      }
    }
  }
);


// =========================
// START APP
// =========================

renderCharacters();

renderChatHistory();