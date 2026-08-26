const CHAT_RECENT_LIMIT = 50;
const MEMORY_BATCH_THRESHOLD = 10;
const MEMORY_MAX_BATCH_MESSAGES = 80;


// =========================
// DOM
// =========================

const homeView =
  document.getElementById("homeView");

const createView =
  document.getElementById("createView");

const chatView =
  document.getElementById("chatView");

const chatBackground =
  document.getElementById("chatBackground");


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


const chatBackBtn =
  document.getElementById("chatBackBtn");

const chatCharacterImage =
  document.getElementById("chatCharacterImage");

const chatCharacterName =
  document.getElementById("chatCharacterName");

const chatCharacterDescription =
  document.getElementById("chatCharacterDescription");

const currentChatTitle =
  document.getElementById("currentChatTitle");

const messages =
  document.getElementById("messages");

const chatForm =
  document.getElementById("chatForm");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");


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
  document.getElementById("chatHistoryList");


const memoryBtn =
  document.getElementById("memoryBtn");

const memoryModal =
  document.getElementById("memoryModal");

const memoryOverlay =
  document.getElementById("memoryOverlay");

const closeMemoryBtn =
  document.getElementById("closeMemoryBtn");

const memoryCharacterLabel =
  document.getElementById("memoryCharacterLabel");

const memoryStatusText =
  document.getElementById("memoryStatusText");

const memoryMessageCount =
  document.getElementById("memoryMessageCount");

const memoryPinned =
  document.getElementById("memoryPinned");

const memorySummary =
  document.getElementById("memorySummary");

const memoryFacts =
  document.getElementById("memoryFacts");

const memoryScene =
  document.getElementById("memoryScene");

const memoryRelationship =
  document.getElementById("memoryRelationship");

const memoryThreads =
  document.getElementById("memoryThreads");

const memoryUpdatedAt =
  document.getElementById("memoryUpdatedAt");


const messageContextMenu =
  document.getElementById("messageContextMenu");

const ctxCopy =
  document.getElementById("ctxCopy");

const ctxEdit =
  document.getElementById("ctxEdit");

const ctxRewind =
  document.getElementById("ctxRewind");

const ctxPin =
  document.getElementById("ctxPin");

const ctxDelete =
  document.getElementById("ctxDelete");


// =========================
// STATE
// =========================

let characters =
  JSON.parse(
    localStorage.getItem(
      "chatiCharacters"
    )
  ) || [];

let currentCharacter =
  null;

let currentChatId =
  null;

let isSending =
  false;

let contextMessageId =
  null;

const memoryUpdateLocks =
  new Set();


// =========================
// IDS
// =========================

function createChatId() {

  return (
    `${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );

}


function createMessageId() {

  return (
    `msg_${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );

}


function createPinId() {

  return (
    `pin_${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );

}


// =========================
// MEMORY
// =========================

function createEmptyMemory() {

  return {

    summary: "",

    importantFacts: [],

    currentScene: "",

    relationshipState: "",

    unresolvedThreads: [],

    pinnedMemories: [],

    lastProcessedMessageCount: 0,

    updatedAt: null,

    needsFullRebuild: false

  };

}


function normalizePinnedMemories(
  value
) {

  if (
    !Array.isArray(value)
  ) {

    return [];

  }


  return value
    .map(

      item => {

        if (
          typeof item ===
          "string"
        ) {

          return {

            id:
              createPinId(),

            text:
              item,

            sourceMessageId:
              null,

            createdAt:
              Date.now()

          };

        }


        if (
          !item ||
          typeof item !==
            "object" ||
          typeof item.text !==
            "string"
        ) {

          return null;

        }


        return {

          id:
            item.id ||
            createPinId(),

          text:
            item.text,

          sourceMessageId:
            item.sourceMessageId ||
            null,

          createdAt:
            item.createdAt ||
            Date.now()

        };

      }

    )
    .filter(Boolean);

}


function normalizeMemory(
  memory
) {

  const empty =
    createEmptyMemory();


  if (
    !memory ||
    typeof memory !==
      "object"
  ) {

    return empty;

  }


  return {

    summary:
      typeof memory.summary ===
      "string"
        ? memory.summary
        : "",


    importantFacts:
      Array.isArray(
        memory.importantFacts
      )
        ? memory
            .importantFacts
            .filter(
              item =>
                typeof item ===
                "string"
            )
        : [],


    currentScene:
      typeof memory.currentScene ===
      "string"
        ? memory.currentScene
        : "",


    relationshipState:
      typeof memory.relationshipState ===
      "string"
        ? memory.relationshipState
        : "",


    unresolvedThreads:
      Array.isArray(
        memory.unresolvedThreads
      )
        ? memory
            .unresolvedThreads
            .filter(
              item =>
                typeof item ===
                "string"
            )
        : [],


    pinnedMemories:
      normalizePinnedMemories(
        memory.pinnedMemories
      ),


    lastProcessedMessageCount:
      Number.isFinite(
        memory.lastProcessedMessageCount
      )
        ? memory.lastProcessedMessageCount
        : 0,


    updatedAt:
      memory.updatedAt ||
      null,


    needsFullRebuild:
      Boolean(
        memory.needsFullRebuild
      )

  };

}


// =========================
// MESSAGES
// =========================

function normalizeMessage(
  message
) {

  return {

    ...message,

    id:
      message?.id ||
      createMessageId(),

    sender:
      message?.sender ===
      "character"
        ? "character"
        : "user",

    text:
      typeof message?.text ===
      "string"
        ? message.text
        : "",

    time:
      message?.time ||
      Date.now()

  };

}


// =========================
// CHAT
// =========================

function normalizeChat(
  chat
) {

  return {

    ...chat,

    id:
      chat?.id ||
      createChatId(),

    title:
      chat?.title ||
      "New Chat",

    createdAt:
      chat?.createdAt ||
      Date.now(),

    updatedAt:
      chat?.updatedAt ||
      Date.now(),

    messages:
      Array.isArray(
        chat?.messages
      )
        ? chat.messages.map(
            normalizeMessage
          )
        : [],

    memory:
      normalizeMemory(
        chat?.memory
      )

  };

}


// =========================
// CHARACTER
// =========================

function normalizeCharacter(
  character
) {

  return {

    ...character,

    background:
      typeof character?.background ===
      "string"
        ? character.background
        : ""

  };

}


characters =
  characters.map(
    normalizeCharacter
  );


// =========================
// STORAGE
// =========================

function saveCharacters() {

  localStorage.setItem(

    "chatiCharacters",

    JSON.stringify(
      characters
    )

  );

}


function getChatsKey(
  characterId
) {

  return (
    "chatiChats_" +
    characterId
  );

}


function getActiveChatKey(
  characterId
) {

  return (
    "chatiActiveChat_" +
    characterId
  );

}


function getOldChatKey(
  characterId
) {

  return (
    "chatiChat_" +
    characterId
  );

}


// =========================
// OLD CHAT MIGRATION
// =========================

function migrateOldChat(
  characterId
) {

  const newKey =
    getChatsKey(
      characterId
    );


  if (
    localStorage.getItem(
      newKey
    ) !== null
  ) {

    return;

  }


  const oldRaw =
    localStorage.getItem(
      getOldChatKey(
        characterId
      )
    );


  if (!oldRaw) {

    localStorage.setItem(

      newKey,

      JSON.stringify([])

    );

    return;

  }


  try {

    const oldMessages =
      JSON.parse(
        oldRaw
      );


    if (
      Array.isArray(
        oldMessages
      ) &&
      oldMessages.length > 0
    ) {

      const migratedChat =
        normalizeChat({

          id:
            createChatId(),

          title:
            "Previous Chat",

          createdAt:
            oldMessages[0]
              ?.time ||
            Date.now(),

          updatedAt:
            oldMessages[
              oldMessages.length - 1
            ]?.time ||
            Date.now(),

          messages:
            oldMessages,

          memory:
            createEmptyMemory()

        });


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
      getOldChatKey(
        characterId
      )
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

    const raw =
      JSON.parse(

        localStorage.getItem(
          getChatsKey(
            characterId
          )
        )

      ) || [];


    const normalized =
      raw.map(
        normalizeChat
      );


    if (
      JSON.stringify(raw) !==
      JSON.stringify(normalized)
    ) {

      localStorage.setItem(

        getChatsKey(
          characterId
        ),

        JSON.stringify(
          normalized
        )

      );

    }


    return normalized;

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

    getChatsKey(
      characterId
    ),

    JSON.stringify(
      chats.map(
        normalizeChat
      )
    )

  );

}


// =========================
// GET CHAT
// =========================

function getStoredChat(
  characterId,
  chatId
) {

  return (

    getCharacterChats(
      characterId
    )
      .find(
        chat =>
          chat.id ===
          chatId
      ) ||
    null

  );

}


function getCurrentChat() {

  if (
    !currentCharacter ||
    !currentChatId
  ) {

    return null;

  }


  return getStoredChat(

    currentCharacter.id,

    currentChatId

  );

}


// =========================
// MUTATE CHAT
// =========================

function mutateStoredChat(
  characterId,
  chatId,
  callback
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


  if (
    index === -1
  ) {

    return null;

  }


  callback(
    chats[index]
  );


  chats[index].updatedAt =
    Date.now();


  saveCharacterChats(
    characterId,
    chats
  );


  return chats[index];

}


function updateCurrentChat(
  callback
) {

  if (
    !currentCharacter ||
    !currentChatId
  ) {

    return null;

  }


  const updated =
    mutateStoredChat(

      currentCharacter.id,

      currentChatId,

      callback

    );


  renderChatHistory();


  return updated;

}


// =========================
// NEW CHAT
// =========================

function buildNewChat() {

  const now =
    Date.now();


  return {

    id:
      createChatId(),

    title:
      "New Chat",

    createdAt:
      now,

    updatedAt:
      now,

    messages:
      [],

    memory:
      createEmptyMemory()

  };

}


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


  if (
    openImmediately
  ) {

    openChat(
      character,
      newChat.id
    );

  }


  renderChatHistory();


  return newChat;

}


// =========================
// BACKGROUND
// =========================

function applyCharacterBackground(
  character
) {

  const url =
    character
      ?.background
      ?.trim();


  if (!url) {

    chatBackground
      .style
      .backgroundImage =
      "none";


    chatBackground
      .classList
      .remove(
        "active"
      );


    return;

  }


  const safeUrl =
    url.replace(
      /"/g,
      "\\\""
    );


  chatBackground
    .style
    .backgroundImage =
    `url("${safeUrl}")`;


  chatBackground
    .classList
    .add(
      "active"
    );

}


// =========================
// NAVIGATION
// =========================

function closeAllFloatingUi() {

  closeChatMenu();

  closeMessageContextMenu();

}


function showHomeView() {

  if (isSending) {

    return;

  }


  closeMemoryViewer();

  closeAllFloatingUi();


  homeView
    .classList
    .remove(
      "hidden"
    );


  createView
    .classList
    .add(
      "hidden"
    );


  chatView
    .classList
    .add(
      "hidden"
    );


  renderCharacters();

  renderChatHistory();

}


function showCreateView() {

  if (isSending) {

    return;

  }


  closeMemoryViewer();

  closeAllFloatingUi();


  homeView
    .classList
    .add(
      "hidden"
    );


  chatView
    .classList
    .add(
      "hidden"
    );


  createView
    .classList
    .remove(
      "hidden"
    );

}


// =========================
// OPEN CHAT
// =========================

function openChat(
  character,
  requestedChatId = null
) {

  if (isSending) {

    return;

  }


  closeMemoryViewer();

  closeAllFloatingUi();


  currentCharacter =
    normalizeCharacter(
      character
    );


  let chats =
    getCharacterChats(
      character.id
    );


  if (
    chats.length === 0
  ) {

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


  let selectedChat =
    requestedChatId

      ? chats.find(
          chat =>
            chat.id ===
            requestedChatId
        )

      : null;


  if (
    !selectedChat
  ) {

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


  if (
    !selectedChat
  ) {

    selectedChat =
      [...chats]
        .sort(

          (a, b) =>
            b.updatedAt -
            a.updatedAt

        )[0];

  }


  currentChatId =
    selectedChat.id;


  localStorage.setItem(

    getActiveChatKey(
      character.id
    ),

    currentChatId

  );


  homeView
    .classList
    .add(
      "hidden"
    );


  createView
    .classList
    .add(
      "hidden"
    );


  chatView
    .classList
    .remove(
      "hidden"
    );


  chatCharacterName
    .textContent =
    currentCharacter.name;


  chatCharacterDescription
    .textContent =
    currentCharacter.description ||
    "AI Character";


  if (
    currentCharacter.image
  ) {

    chatCharacterImage.src =
      currentCharacter.image;


    chatCharacterImage
      .style
      .display =
      "block";

  }

  else {

    chatCharacterImage
      .removeAttribute(
        "src"
      );

  }


  applyCharacterBackground(
    currentCharacter
  );


  renderMessages();

  renderChatHistory();


  setTimeout(

    () =>
      messageInput.focus(),

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

  event => {

    event.preventDefault();


    const character =
      normalizeCharacter({

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

        background:
          document
            .getElementById(
              "characterBackground"
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

      });


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

    emptyState
      .style
      .display =
      "flex";


    return;

  }


  emptyState
    .style
    .display =
    "none";


  characters.forEach(

    character => {

      const card =
        document.createElement(
          "div"
        );


      card
        .classList
        .add(
          "character-card"
        );


      if (
        character.image
      ) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          character.image;


        image
          .classList
          .add(
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


        placeholder
          .classList
          .add(
            "character-placeholder"
          );


        placeholder
          .textContent =
          "🤖";


        card.appendChild(
          placeholder
        );

      }


      const info =
        document.createElement(
          "div"
        );


      info
        .classList
        .add(
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

        () =>
          openChat(
            character
          )

      );


      charactersGrid
        .appendChild(
          card
        );

    }

  );

}


// =========================
// CHAT TITLE
// =========================

function makeChatTitle(
  text
) {

  const cleaned =
    text
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return (
    cleaned.length <= 28

      ? cleaned

      : (
          cleaned.slice(
            0,
            28
          ) +
          "..."
        )
  );

}


// =========================
// CHAT HISTORY
// =========================

function renderChatHistory() {

  chatHistoryList.innerHTML =
    "";


  const allChats =
    [];


  characters.forEach(

    character => {

      getCharacterChats(
        character.id
      )
        .forEach(

          chat =>

            allChats.push({

              character,

              chat

            })

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


    empty
      .classList
      .add(
        "history-empty"
      );


    empty.textContent =
      "No chats yet";


    chatHistoryList
      .appendChild(
        empty
      );


    return;

  }


  allChats.forEach(

    ({
      character,
      chat
    }) => {

      const button =
        document.createElement(
          "button"
        );


      button
        .classList
        .add(
          "history-item"
        );


      if (
        currentCharacter &&
        currentChatId &&
        currentCharacter.id ===
          character.id &&
        currentChatId ===
          chat.id
      ) {

        button
          .classList
          .add(
            "active"
          );

      }


      const characterName =
        document.createElement(
          "span"
        );


      characterName
        .classList
        .add(
          "history-character"
        );


      characterName.textContent =
        character.name;


      const title =
        document.createElement(
          "span"
        );


      title
        .classList
        .add(
          "history-title"
        );


      title.textContent =
        chat.title ||
        "New Chat";


      button.appendChild(
        characterName
      );


      button.appendChild(
        title
      );


      button.addEventListener(

        "click",

        () => {

          if (
            !isSending
          ) {

            openChat(
              character,
              chat.id
            );

          }

        }

      );


      chatHistoryList
        .appendChild(
          button
        );

    }

  );

}


// =========================
// RICH MESSAGE TEXT
// =========================

function renderRichText(
  element,
  text
) {

  element.replaceChildren();


  const pattern =
    /(\*\*[\s\S]*?\*\*|\*(?!\*)[\s\S]*?\*)/g;


  let lastIndex =
    0;


  let match;


  while (
    (
      match =
        pattern.exec(
          text
        )
    ) !== null
  ) {

    if (
      match.index >
      lastIndex
    ) {

      element
        .appendChild(

          document
            .createTextNode(

              text.slice(
                lastIndex,
                match.index
              )

            )

        );

    }


    const token =
      match[0];


    const isDouble =
      token.startsWith(
        "**"
      );


    const strip =
      isDouble
        ? 2
        : 1;


    const action =
      document.createElement(
        "span"
      );


    action.className =
      "action-text";


    action.textContent =
      token.slice(
        strip,
        token.length - strip
      );


    element.appendChild(
      action
    );


    lastIndex =
      pattern.lastIndex;

  }


  if (
    lastIndex <
    text.length
  ) {

    element.appendChild(

      document
        .createTextNode(

          text.slice(
            lastIndex
          )

        )

    );

  }

}


// =========================
// MESSAGE ROW
// =========================

function createMessageRow(
  message,
  options = {}
) {

  const row =
    document.createElement(
      "div"
    );


  row
    .classList
    .add(
      "message-row",
      message.sender
    );


  row.dataset.messageId =
    message.id;


  const bubble =
    document.createElement(
      "div"
    );


  bubble
    .classList
    .add(
      "message",
      message.sender
    );


  bubble.dataset.messageId =
    message.id;


  if (
    message.sender ===
    "character"
  ) {

    renderRichText(
      bubble,
      message.text
    );

  }

  else {

    bubble.textContent =
      message.text;

  }


  if (
    message.sender ===
    "character"
  ) {

    bubble.addEventListener(

      "contextmenu",

      event =>
        openMessageContextMenu(
          event,
          message.id
        )

    );

  }


  row.appendChild(
    bubble
  );


  if (
    message.sender ===
      "character" &&
    !options.hideRegenerate
  ) {

    const regenerate =
      document.createElement(
        "button"
      );


    regenerate.type =
      "button";


    regenerate.className =
      "message-regenerate";


    regenerate.title =
      "Regenerate response";


    regenerate
      .setAttribute(
        "aria-label",
        "Regenerate response"
      );


    regenerate.textContent =
      "↻";


    regenerate.disabled =
      isSending;


    regenerate
      .addEventListener(

        "click",

        () =>
          regenerateMessage(
            message.id
          )

      );


    row.appendChild(
      regenerate
    );

  }


  return {
    row,
    bubble
  };

}


// =========================
// RENDER MESSAGES
// =========================

function renderMessages() {

  messages.innerHTML =
    "";


  const chat =
    getCurrentChat();


  if (!chat) {

    return;

  }


  currentChatTitle
    .textContent =
    chat.title ||
    "New Chat";


  if (
    chat.messages.length === 0
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty
      .classList
      .add(
        "chat-empty"
      );


    if (
      currentCharacter.image
    ) {

      const avatar =
        document.createElement(
          "img"
        );


      avatar
        .classList
        .add(
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
      (
        "Start a new conversation with " +
        currentCharacter.name +
        "."
      );


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

    message => {

      messages.appendChild(

        createMessageRow(
          message
        ).row

      );

    }

  );


  scrollToBottom();

}


// =========================
// SCROLL
// =========================

function scrollToBottom() {

  messages.scrollTop =
    messages.scrollHeight;

}


// =========================
// TYPING
// =========================

function showTypingIndicator() {

  removeTypingIndicator();


  const row =
    document.createElement(
      "div"
    );


  row.id =
    "typingIndicator";


  row.className =
    "message-row character";


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "message character typing-bubble";


  const indicator =
    document.createElement(
      "div"
    );


  indicator.className =
    "typing-indicator";


  for (
    let i = 0;
    i < 3;
    i += 1
  ) {

    indicator.appendChild(

      document.createElement(
        "span"
      )

    );

  }


  bubble.appendChild(
    indicator
  );


  row.appendChild(
    bubble
  );


  messages.appendChild(
    row
  );


  scrollToBottom();

}


function removeTypingIndicator() {

  document
    .getElementById(
      "typingIndicator"
    )
    ?.remove();

}


// =========================
// READ AI STREAM
// =========================

async function readAIStream(
  response
) {

  if (
    !response.body
  ) {

    throw new Error(
      "Streaming is not supported by this browser."
    );

  }


  const reader =
    response.body
      .getReader();


  const decoder =
    new TextDecoder();


  let buffer =
    "";


  let finalText =
    "";


  let streamingBubble =
    null;


  let streamingRow =
    null;


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
          stream:
            true
        }
      );


    const lines =
      buffer.split(
        "\n"
      );


    buffer =
      lines.pop() ||
      "";


    for (
      const line of lines
    ) {

      if (
        !line.trim()
      ) {

        continue;

      }


      let packet;


      try {

        packet =
          JSON.parse(
            line
          );

      }

      catch {

        continue;

      }


      if (
        packet.type ===
        "delta"
      ) {

        if (
          !streamingBubble
        ) {

          removeTypingIndicator();


          streamingRow =
            document.createElement(
              "div"
            );


          streamingRow.className =
            "message-row character";


          streamingBubble =
            document.createElement(
              "div"
            );


          streamingBubble.className =
            "message character streaming";


          streamingRow.appendChild(
            streamingBubble
          );


          messages.appendChild(
            streamingRow
          );

        }


        finalText +=
          packet.delta;


        renderRichText(
          streamingBubble,
          finalText
        );


        scrollToBottom();

      }


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


  if (
    buffer.trim()
  ) {

    try {

      const packet =
        JSON.parse(
          buffer
        );


      if (
        packet.type ===
        "delta"
      ) {

        if (
          !streamingBubble
        ) {

          removeTypingIndicator();


          streamingRow =
            document.createElement(
              "div"
            );


          streamingRow.className =
            "message-row character";


          streamingBubble =
            document.createElement(
              "div"
            );


          streamingBubble.className =
            "message character streaming";


          streamingRow.appendChild(
            streamingBubble
          );


          messages.appendChild(
            streamingRow
          );

        }


        finalText +=
          packet.delta;


        renderRichText(
          streamingBubble,
          finalText
        );

      }

    }

    catch {

      // ignore incomplete packet

    }

  }


  streamingBubble
    ?.classList
    .remove(
      "streaming"
    );


  return {

    text:
      finalText.trim(),

    row:
      streamingRow

  };

}


// =========================
// MEMORY PAYLOAD
// =========================

function createMemoryPayload(
  memory
) {

  const clean =
    normalizeMemory(
      memory
    );


  return {

    summary:
      clean.summary,

    importantFacts:
      clean.importantFacts,

    currentScene:
      clean.currentScene,

    relationshipState:
      clean.relationshipState,

    unresolvedThreads:
      clean.unresolvedThreads,

    pinnedMemories:
      clean.pinnedMemories

  };

}


// =========================
// RESET AUTO MEMORY
// =========================

function resetAutomaticMemory(
  characterId,
  chatId,
  {
    fullRebuild = true
  } = {}
) {

  mutateStoredChat(

    characterId,

    chatId,

    chat => {

      const memory =
        normalizeMemory(
          chat.memory
        );


      chat.memory = {

        ...createEmptyMemory(),

        pinnedMemories:
          memory.pinnedMemories,

        needsFullRebuild:
          fullRebuild

      };

    }

  );

}


// =========================
// REMOVE INVALID PINS
// =========================

function removePinsForMissingMessages(
  chat
) {

  const validIds =
    new Set(

      chat.messages.map(
        message =>
          message.id
      )

    );


  const memory =
    normalizeMemory(
      chat.memory
    );


  memory.pinnedMemories =
    memory
      .pinnedMemories
      .filter(

        pin =>
          !pin.sourceMessageId ||
          validIds.has(
            pin.sourceMessageId
          )

      );


  chat.memory =
    memory;

}


// =========================
// UPDATE MEMORY
// =========================

async function updateMemoryForChat(
  character,
  chatId,
  force = false
) {

  if (
    !character ||
    !chatId
  ) {

    return;

  }


  const lockKey =
    (
      character.id +
      "_" +
      chatId
    );


  if (
    memoryUpdateLocks.has(
      lockKey
    )
  ) {

    return;

  }


  let chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (!chat) {

    return;

  }


  let memory =
    normalizeMemory(
      chat.memory
    );


  const totalMessages =
    chat.messages.length;


  const processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      totalMessages

    );


  const unprocessedCount =
    totalMessages -
    processed;


  const fullRebuild =
    memory.needsFullRebuild;


  if (
    !force &&
    !fullRebuild &&
    unprocessedCount <
      MEMORY_BATCH_THRESHOLD
  ) {

    return;

  }


  if (
    unprocessedCount <= 0
  ) {

    if (
      fullRebuild
    ) {

      mutateStoredChat(

        character.id,

        chatId,

        stored => {

          stored.memory = {

            ...normalizeMemory(
              stored.memory
            ),

            needsFullRebuild:
              false

          };

        }

      );

    }


    return;

  }


  memoryUpdateLocks.add(
    lockKey
  );


  try {

    let start =
      processed;


    if (
      !fullRebuild &&
      processed === 0 &&
      totalMessages >
        MEMORY_MAX_BATCH_MESSAGES
    ) {

      start =
        totalMessages -
        MEMORY_MAX_BATCH_MESSAGES;

    }


    const end =
      Math.min(

        totalMessages,

        start +
        MEMORY_MAX_BATCH_MESSAGES

      );


    const batch =
      chat.messages.slice(
        start,
        end
      );


    console.log(
      `🧠 Updating memory: ${character.name} (${batch.length} messages)`
    );


    const response =
      await fetch(

        "/api/memory",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              character,

              memory:
                createMemoryPayload(
                  memory
                ),

              messages:
                batch

            })

        }

      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Memory request failed."
      );

    }


    const data =
      await response.json();


    if (
      !data.memory
    ) {

      throw new Error(
        "Memory response was empty."
      );

    }


    mutateStoredChat(

      character.id,

      chatId,

      latestChat => {

        const latestMemory =
          normalizeMemory(
            latestChat.memory
          );


        latestChat.memory = {

          summary:
            data.memory.summary ||
            "",

          importantFacts:
            Array.isArray(
              data.memory
                .importantFacts
            )
              ? data.memory
                  .importantFacts
              : [],

          currentScene:
            data.memory
              .currentScene ||
            "",

          relationshipState:
            data.memory
              .relationshipState ||
            "",

          unresolvedThreads:
            Array.isArray(
              data.memory
                .unresolvedThreads
            )
              ? data.memory
                  .unresolvedThreads
              : [],

          pinnedMemories:
            latestMemory
              .pinnedMemories,

          lastProcessedMessageCount:
            Math.max(

              latestMemory
                .lastProcessedMessageCount,

              end

            ),

          updatedAt:
            Date.now(),

          needsFullRebuild:
            latestMemory
              .needsFullRebuild

        };

      }

    );


    console.log(
      `✅ Memory saved for ${character.name}`
    );


    if (
      !memoryModal
        .classList
        .contains(
          "hidden"
        ) &&
      currentCharacter
        ?.id ===
        character.id &&
      currentChatId ===
        chatId
    ) {

      renderMemoryViewer();

    }

  }

  catch (error) {

    console.error(
      "Memory update failed:",
      error
    );

  }

  finally {

    memoryUpdateLocks.delete(
      lockKey
    );

  }


  chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (!chat) {

    return;

  }


  memory =
    normalizeMemory(
      chat.memory
    );


  const waiting =
    chat.messages.length -
    memory
      .lastProcessedMessageCount;


  if (
    memory.needsFullRebuild &&
    waiting <= 0
  ) {

    mutateStoredChat(

      character.id,

      chatId,

      stored => {

        stored.memory = {

          ...normalizeMemory(
            stored.memory
          ),

          needsFullRebuild:
            false

        };

      }

    );


    if (
      !memoryModal
        .classList
        .contains(
          "hidden"
        )
    ) {

      renderMemoryViewer();

    }


    return;

  }


  if (
    waiting >=
      MEMORY_BATCH_THRESHOLD ||
    (
      memory.needsFullRebuild &&
      waiting > 0
    )
  ) {

    setTimeout(

      () =>
        updateMemoryForChat(

          character,

          chatId,

          memory
            .needsFullRebuild

        ),

      450

    );

  }

}


// =========================
// REBUILD MEMORY
// =========================

function rebuildMemoryAfterHistoryChange(
  character,
  chatId
) {

  resetAutomaticMemory(

    character.id,

    chatId,

    {
      fullRebuild:
        true
    }

  );


  const chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (
    chat
      ?.messages
      .length
  ) {

    setTimeout(

      () =>
        updateMemoryForChat(
          character,
          chatId,
          true
        ),

      100

    );

  }

}


// =========================
// MEMORY VIEWER
// =========================

function createMemoryListItem(
  text,
  empty = false
) {

  const item =
    document.createElement(
      "li"
    );


  item.textContent =
    text;


  if (
    empty
  ) {

    item
      .classList
      .add(
        "memory-empty-item"
      );

  }


  return item;

}


function fillMemoryList(
  element,
  items,
  emptyText
) {

  element.innerHTML =
    "";


  if (
    !items.length
  ) {

    element.appendChild(

      createMemoryListItem(
        emptyText,
        true
      )

    );


    return;

  }


  items.forEach(

    item =>

      element.appendChild(

        createMemoryListItem(
          item
        )

      )

  );

}


function renderMemoryViewer() {

  const chat =
    getCurrentChat();


  if (
    !chat ||
    !currentCharacter
  ) {

    return;

  }


  const memory =
    normalizeMemory(
      chat.memory
    );


  memoryCharacterLabel
    .textContent =
    (
      currentCharacter.name +
      " • " +
      chat.title
    );


  const total =
    chat.messages.length;


  const processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      total

    );


  memoryMessageCount
    .textContent =
    (
      processed +
      " / " +
      total +
      " processed"
    );


  const hasAutoMemory =
    Boolean(

      memory.summary.trim() ||

      memory
        .importantFacts
        .length ||

      memory
        .currentScene
        .trim() ||

      memory
        .relationshipState
        .trim() ||

      memory
        .unresolvedThreads
        .length

    );


  if (
    memory.needsFullRebuild
  ) {

    memoryStatusText
      .textContent =
      "Rebuilding memory...";

  }

  else if (
    hasAutoMemory ||
    memory
      .pinnedMemories
      .length
  ) {

    memoryStatusText
      .textContent =
      "Memory active";

  }

  else if (
    total >=
    MEMORY_BATCH_THRESHOLD
  ) {

    memoryStatusText
      .textContent =
      "Waiting for memory update";

  }

  else {

    memoryStatusText
      .textContent =
      "Not enough messages yet";

  }


  fillMemoryList(

    memoryPinned,

    memory
      .pinnedMemories
      .map(
        pin =>
          pin.text
      ),

    "No pinned memories yet."

  );


  memorySummary
    .textContent =
    memory.summary.trim() ||
    "No summary yet.";


  fillMemoryList(

    memoryFacts,

    memory
      .importantFacts,

    "No important memories stored yet."

  );


  memoryScene
    .textContent =
    memory
      .currentScene
      .trim() ||
    "No current scene stored.";


  memoryRelationship
    .textContent =
    memory
      .relationshipState
      .trim() ||
    "No relationship development stored.";


  fillMemoryList(

    memoryThreads,

    memory
      .unresolvedThreads,

    "No unresolved threads."

  );


  memoryUpdatedAt
    .textContent =
    memory.updatedAt

      ? (
          "Last updated: " +
          new Date(
            memory.updatedAt
          )
            .toLocaleString()
        )

      : "Memory has not been updated yet.";

}


function openMemoryViewer() {

  if (
    !currentCharacter ||
    !currentChatId
  ) {

    return;

  }


  closeAllFloatingUi();


  renderMemoryViewer();


  memoryModal
    .classList
    .remove(
      "hidden"
    );

}


function closeMemoryViewer() {

  memoryModal
    .classList
    .add(
      "hidden"
    );

}


memoryBtn.addEventListener(

  "click",

  openMemoryViewer

);


closeMemoryBtn.addEventListener(

  "click",

  closeMemoryViewer

);


memoryOverlay.addEventListener(

  "click",

  closeMemoryViewer

);


// =========================
// RIGHT CLICK HELPERS
// =========================

function findCurrentMessage(
  messageId
) {

  return (

    getCurrentChat()
      ?.messages
      .find(
        message =>
          message.id ===
          messageId
      ) ||
    null

  );

}


function isMessagePinned(
  chat,
  messageId
) {

  return normalizeMemory(
    chat.memory
  )
    .pinnedMemories
    .some(
      pin =>
        pin.sourceMessageId ===
        messageId
    );

}


// =========================
// OPEN RIGHT CLICK MENU
// =========================

function openMessageContextMenu(
  event,
  messageId
) {

  event.preventDefault();


  if (
    isSending
  ) {

    return;

  }


  contextMessageId =
    messageId;


  const chat =
    getCurrentChat();


  if (!chat) {

    return;

  }


  ctxPin
    .lastChild
    .textContent =
    isMessagePinned(
      chat,
      messageId
    )
      ? "Unpin Memory"
      : "Pin Memory";


  messageContextMenu
    .classList
    .remove(
      "hidden"
    );


  const rect =
    messageContextMenu
      .getBoundingClientRect();


  let x =
    event.clientX;


  let y =
    event.clientY;


  if (
    x +
      rect.width >
    window.innerWidth -
      8
  ) {

    x =
      window.innerWidth -
      rect.width -
      8;

  }


  if (
    y +
      rect.height >
    window.innerHeight -
      8
  ) {

    y =
      window.innerHeight -
      rect.height -
      8;

  }


  messageContextMenu
    .style
    .left =
    `${Math.max(8, x)}px`;


  messageContextMenu
    .style
    .top =
    `${Math.max(8, y)}px`;

}


function closeMessageContextMenu() {

  messageContextMenu
    .classList
    .add(
      "hidden"
    );


  contextMessageId =
    null;

}


// =========================
// COPY
// =========================

ctxCopy.addEventListener(

  "click",

  async () => {

    const message =
      findCurrentMessage(
        contextMessageId
      );


    if (!message) {

      return closeMessageContextMenu();

    }


    try {

      await navigator
        .clipboard
        .writeText(
          message.text
        );

    }

    catch {

      const area =
        document.createElement(
          "textarea"
        );


      area.value =
        message.text;


      document.body
        .appendChild(
          area
        );


      area.select();


      document.execCommand(
        "copy"
      );


      area.remove();

    }


    closeMessageContextMenu();

  }

);


// =========================
// EDIT
// =========================

ctxEdit.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const message =
      findCurrentMessage(
        id
      );


    if (!message) {

      return closeMessageContextMenu();

    }


    const edited =
      prompt(

        "Edit this message:",

        message.text

      );


    if (
      edited === null ||
      !edited.trim() ||
      edited.trim() ===
        message.text
    ) {

      return closeMessageContextMenu();

    }


    updateCurrentChat(

      chat => {

        const target =
          chat.messages.find(
            item =>
              item.id ===
              id
          );


        if (!target) {

          return;

        }


        target.text =
          edited.trim();


        const memory =
          normalizeMemory(
            chat.memory
          );


        memory.pinnedMemories =
          memory
            .pinnedMemories
            .map(

              pin =>
                pin.sourceMessageId ===
                id

                  ? {
                      ...pin,

                      text:
                        edited.trim()
                    }

                  : pin

            );


        chat.memory =
          memory;

      }

    );


    closeMessageContextMenu();


    renderMessages();


    rebuildMemoryAfterHistoryChange(
      currentCharacter,
      currentChatId
    );

  }

);


// =========================
// REWIND
// =========================

ctxRewind.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const chat =
      getCurrentChat();


    if (!chat) {

      return closeMessageContextMenu();

    }


    const index =
      chat.messages
        .findIndex(
          message =>
            message.id ===
            id
        );


    if (
      index === -1
    ) {

      return closeMessageContextMenu();

    }


    const afterCount =
      chat.messages.length -
      index -
      1;


    if (
      afterCount > 0
    ) {

      const confirmed =
        confirm(

          (
            "Rewind to this message? " +
            afterCount +
            " later message" +
            (
              afterCount === 1
                ? ""
                : "s"
            ) +
            " will be removed."
          )

        );


      if (
        !confirmed
      ) {

        return closeMessageContextMenu();

      }

    }


    updateCurrentChat(

      stored => {

        stored.messages =
          stored.messages.slice(
            0,
            index + 1
          );


        removePinsForMissingMessages(
          stored
        );

      }

    );


    closeMessageContextMenu();


    renderMessages();


    rebuildMemoryAfterHistoryChange(
      currentCharacter,
      currentChatId
    );

  }

);


// =========================
// PIN MEMORY
// =========================

ctxPin.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const message =
      findCurrentMessage(
        id
      );


    if (!message) {

      return closeMessageContextMenu();

    }


    updateCurrentChat(

      chat => {

        const memory =
          normalizeMemory(
            chat.memory
          );


        const pinIndex =
          memory
            .pinnedMemories
            .findIndex(
              pin =>
                pin.sourceMessageId ===
                id
            );


        if (
          pinIndex >= 0
        ) {

          memory
            .pinnedMemories
            .splice(
              pinIndex,
              1
            );

        }

        else {

          memory
            .pinnedMemories
            .push({

              id:
                createPinId(),

              text:
                message.text,

              sourceMessageId:
                id,

              createdAt:
                Date.now()

            });

        }


        chat.memory =
          memory;

      }

    );


    closeMessageContextMenu();


    if (
      !memoryModal
        .classList
        .contains(
          "hidden"
        )
    ) {

      renderMemoryViewer();

    }

  }

);


// =========================
// DELETE MESSAGE
// =========================

ctxDelete.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const chat =
      getCurrentChat();


    if (!chat) {

      return closeMessageContextMenu();

    }


    const message =
      chat.messages
        .find(
          item =>
            item.id ===
            id
        );


    if (!message) {

      return closeMessageContextMenu();

    }


    const confirmed =
      confirm(
        "Delete this character message?"
      );


    if (
      !confirmed
    ) {

      return closeMessageContextMenu();

    }


    updateCurrentChat(

      stored => {

        stored.messages =
          stored
            .messages
            .filter(
              item =>
                item.id !==
                id
            );


        removePinsForMissingMessages(
          stored
        );

      }

    );


    closeMessageContextMenu();


    renderMessages();


    rebuildMemoryAfterHistoryChange(
      currentCharacter,
      currentChatId
    );

  }

);


// =========================
// NEW CHAT
// =========================

newChatBtn.addEventListener(

  "click",

  () => {

    if (
      !currentCharacter ||
      isSending
    ) {

      return;

    }


    closeMemoryViewer();


    createNewChat(
      currentCharacter,
      true
    );

  }

);


// =========================
// THREE DOT MENU
// =========================

chatMenuBtn.addEventListener(

  "click",

  event => {

    event.stopPropagation();


    closeMessageContextMenu();


    chatMenu
      .classList
      .toggle(
        "hidden"
      );

  }

);


function closeChatMenu() {

  chatMenu
    .classList
    .add(
      "hidden"
    );

}


// =========================
// RENAME CHAT
// =========================

renameChatBtn.addEventListener(

  "click",

  () => {

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


    if (
      newName === null ||
      !newName.trim()
    ) {

      return;

    }


    updateCurrentChat(

      stored => {

        stored.title =
          newName.trim();

      }

    );


    closeChatMenu();


    renderMessages();

  }

);


// =========================
// CLEAR CHAT
// =========================

clearChatBtn.addEventListener(

  "click",

  () => {

    if (
      isSending
    ) {

      return;

    }


    const chat =
      getCurrentChat();


    if (!chat) {

      return;

    }


    if (
      !confirm(
        `Clear all messages and memory from "${chat.title}"?`
      )
    ) {

      return;

    }


    updateCurrentChat(

      stored => {

        stored.messages =
          [];

        stored.title =
          "New Chat";

        stored.memory =
          createEmptyMemory();

      }

    );


    closeChatMenu();


    closeMemoryViewer();


    renderMessages();

  }

);


// =========================
// DELETE CHAT
// =========================

deleteChatBtn.addEventListener(

  "click",

  () => {

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


    if (
      !confirm(
        `Delete "${current.title}" permanently?`
      )
    ) {

      return;

    }


    const character =
      currentCharacter;


    let chats =
      getCharacterChats(
        character.id
      )
        .filter(
          chat =>
            chat.id !==
            currentChatId
        );


    saveCharacterChats(
      character.id,
      chats
    );


    closeChatMenu();


    closeMemoryViewer();


    if (
      chats.length
    ) {

      chats =
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

  }

);


// =========================
// SAVE MESSAGE
// =========================

function saveMessageToChat(
  characterId,
  chatId,
  message
) {

  return mutateStoredChat(

    characterId,

    chatId,

    chat => {

      chat.messages.push(

        normalizeMessage(
          message
        )

      );

    }

  );

}


// =========================
// REQUEST CHARACTER
// =========================

async function requestCharacterReply(
  character,
  chatId
) {

  const chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (
    !chat ||
    !chat.messages.length
  ) {

    throw new Error(
      "Chat is empty."
    );

  }


  const requestMessages =
    chat.messages
      .slice(
        -CHAT_RECENT_LIMIT
      )
      .map(
        message => ({
          ...message
        })
      );


  const requestMemory =
    createMemoryPayload(
      chat.memory
    );


  const response =
    await fetch(

      "/api/chat",

      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            character,

            messages:
              requestMessages,

            memory:
              requestMemory

          })

      }

    );


  if (
    !response.ok
  ) {

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

      // ignore

    }


    throw new Error(
      errorMessage
    );

  }


  return readAIStream(
    response
  );

}


// =========================
// SENDING STATE
// =========================

function setSendingState(
  value
) {

  isSending =
    value;


  messageInput.disabled =
    value;


  sendBtn.disabled =
    value;


  document
    .querySelectorAll(
      ".message-regenerate"
    )
    .forEach(

      button => {

        button.disabled =
          value;

      }

    );

}


// =========================
// MULTILINE INPUT
// =========================

function autoGrowMessageInput() {

  messageInput
    .style
    .height =
    "auto";


  const nextHeight =
    Math.min(

      messageInput
        .scrollHeight,

      180

    );


  messageInput
    .style
    .height =
    `${nextHeight}px`;


  messageInput
    .style
    .overflowY =
    (
      messageInput
        .scrollHeight >
      180

        ? "auto"

        : "hidden"
    );

}


messageInput.addEventListener(

  "input",

  autoGrowMessageInput

);


messageInput.addEventListener(

  "keydown",

  event => {

    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();


      if (
        !isSending &&
        messageInput
          .value
          .trim()
      ) {

        chatForm.requestSubmit();

      }

    }

  }

);


// =========================
// SEND MESSAGE
// =========================

chatForm.addEventListener(

  "submit",

  async event => {

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


    const requestChatId =
      currentChatId;


    mutateStoredChat(

      requestCharacter.id,

      requestChatId,

      chat => {

        chat.messages.push(

          normalizeMessage({

            sender:
              "user",

            text,

            time:
              Date.now()

          })

        );


        if (
          chat.title ===
            "New Chat" &&
          chat.messages.length ===
            1
        ) {

          chat.title =
            makeChatTitle(
              text
            );

        }

      }

    );


    messageInput.value =
      "";


    autoGrowMessageInput();


    renderMessages();


    renderChatHistory();


    setSendingState(
      true
    );


    showTypingIndicator();


    try {

      const {
        text:
          finalReply,

        row:
          temporaryRow

      } =
        await requestCharacterReply(

          requestCharacter,

          requestChatId

        );


      removeTypingIndicator();


      if (
        !finalReply
      ) {

        throw new Error(
          "The character returned an empty response."
        );

      }


      temporaryRow
        ?.remove();


      const saved =
        normalizeMessage({

          sender:
            "character",

          text:
            finalReply,

          time:
            Date.now()

        });


      saveMessageToChat(

        requestCharacter.id,

        requestChatId,

        saved

      );


      renderMessages();


      renderChatHistory();


      updateMemoryForChat(

        requestCharacter,

        requestChatId

      );

    }

    catch (error) {

      removeTypingIndicator();


      document
        .querySelector(
          ".message.streaming"
        )
        ?.closest(
          ".message-row"
        )
        ?.remove();


      console.error(
        "Chat error:",
        error
      );


      const system =
        normalizeMessage({

          sender:
            "user",

          text:
            "Could not generate a response right now.",

          time:
            Date.now()

        });


      const row =
        createMessageRow(

          {
            ...system,

            sender:
              "system"
          },

          {
            hideRegenerate:
              true
          }

        ).row;


      messages.appendChild(
        row
      );


      scrollToBottom();

    }

    finally {

      setSendingState(
        false
      );


      if (
        !chatView
          .classList
          .contains(
            "hidden"
          )
      ) {

        messageInput.focus();

      }

    }

  }

);


// =========================
// REGENERATE
// =========================

async function regenerateMessage(
  messageId
) {

  if (
    isSending ||
    !currentCharacter ||
    !currentChatId
  ) {

    return;

  }


  const character = {
    ...currentCharacter
  };


  const chatId =
    currentChatId;


  const chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (!chat) {

    return;

  }


  const index =
    chat.messages
      .findIndex(
        message =>
          message.id ===
          messageId
      );


  if (
    index === -1 ||
    chat.messages[index]
      .sender !==
      "character"
  ) {

    return;

  }


  const laterCount =
    chat.messages.length -
    index -
    1;


  if (
    laterCount > 0
  ) {

    const confirmed =
      confirm(

        (
          "Regenerating this older reply will remove it and " +
          laterCount +
          " later message" +
          (
            laterCount === 1
              ? ""
              : "s"
          ) +
          ". Continue?"
        )

      );


    if (
      !confirmed
    ) {

      return;

    }

  }


  mutateStoredChat(

    character.id,

    chatId,

    stored => {

      stored.messages =
        stored.messages.slice(
          0,
          index
        );


      removePinsForMissingMessages(
        stored
      );


      const oldPins =
        normalizeMemory(
          stored.memory
        )
          .pinnedMemories;


      stored.memory = {

        ...createEmptyMemory(),

        pinnedMemories:
          oldPins,

        needsFullRebuild:
          true

      };

    }

  );


  renderMessages();


  renderChatHistory();


  setSendingState(
    true
  );


  showTypingIndicator();


  try {

    const remainingChat =
      getStoredChat(
        character.id,
        chatId
      );


    if (
      !remainingChat
        ?.messages
        .length
    ) {

      throw new Error(
        "Nothing remains before this response."
      );

    }


    const {
      text:
        finalReply,

      row:
        temporaryRow

    } =
      await requestCharacterReply(

        character,

        chatId

      );


    removeTypingIndicator();


    if (
      !finalReply
    ) {

      throw new Error(
        "The character returned an empty response."
      );

    }


    temporaryRow
      ?.remove();


    saveMessageToChat(

      character.id,

      chatId,

      {

        sender:
          "character",

        text:
          finalReply,

        time:
          Date.now()

      }

    );


    renderMessages();


    renderChatHistory();


    rebuildMemoryAfterHistoryChange(

      character,

      chatId

    );

  }

  catch (error) {

    removeTypingIndicator();


    document
      .querySelector(
        ".message.streaming"
      )
      ?.closest(
        ".message-row"
      )
      ?.remove();


    console.error(
      "Regenerate error:",
      error
    );


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "message-row system";


    const bubble =
      document.createElement(
        "div"
      );


    bubble.className =
      "message system";


    bubble.textContent =
      "Could not regenerate the response right now.";


    row.appendChild(
      bubble
    );


    messages.appendChild(
      row
    );

  }

  finally {

    setSendingState(
      false
    );


    messageInput.focus();

  }

}


// =========================
// GLOBAL EVENTS
// =========================

document.addEventListener(

  "click",

  event => {

    if (
      !event.target.closest(
        ".chat-menu-wrapper"
      )
    ) {

      closeChatMenu();

    }


    if (
      !event.target.closest(
        "#messageContextMenu"
      )
    ) {

      closeMessageContextMenu();

    }

  }

);


document.addEventListener(

  "scroll",

  closeMessageContextMenu,

  true

);


window.addEventListener(

  "resize",

  closeMessageContextMenu

);


document.addEventListener(

  "keydown",

  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeMemoryViewer();

      closeChatMenu();

      closeMessageContextMenu();

    }

  }

);


// =========================
// START
// =========================

autoGrowMessageInput();

saveCharacters();

renderCharacters();

renderChatHistory();