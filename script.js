// =========================
// CONFIG
// =========================

const CHAT_RECENT_LIMIT = 50;

const MEMORY_BATCH_THRESHOLD = 10;

const MEMORY_MAX_BATCH_MESSAGES = 80;


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
// MEMORY VIEWER ELEMENTS
// =========================

const memoryBtn =
  document.getElementById("memoryBtn");

const memoryModal =
  document.getElementById("memoryModal");

const memoryOverlay =
  document.getElementById("memoryOverlay");

const closeMemoryBtn =
  document.getElementById("closeMemoryBtn");

const memoryCharacterLabel =
  document.getElementById(
    "memoryCharacterLabel"
  );

const memoryStatusText =
  document.getElementById(
    "memoryStatusText"
  );

const memoryMessageCount =
  document.getElementById(
    "memoryMessageCount"
  );

const memorySummary =
  document.getElementById(
    "memorySummary"
  );

const memoryFacts =
  document.getElementById(
    "memoryFacts"
  );

const memoryScene =
  document.getElementById(
    "memoryScene"
  );

const memoryRelationship =
  document.getElementById(
    "memoryRelationship"
  );

const memoryThreads =
  document.getElementById(
    "memoryThreads"
  );

const memoryUpdatedAt =
  document.getElementById(
    "memoryUpdatedAt"
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


const memoryUpdateLocks =
  new Set();


// =========================
// EMPTY MEMORY
// =========================

function createEmptyMemory() {

  return {

    summary: "",

    importantFacts: [],

    currentScene: "",

    relationshipState: "",

    unresolvedThreads: [],

    lastProcessedMessageCount: 0,

    updatedAt: null

  };

}


// =========================
// NORMALIZE MEMORY
// =========================

function normalizeMemory(
  memory
) {

  const empty =
    createEmptyMemory();


  if (
    !memory ||
    typeof memory !== "object"
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
        ? memory.importantFacts.filter(
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
        ? memory.unresolvedThreads.filter(
            item =>
              typeof item ===
              "string"
          )
        : [],


    lastProcessedMessageCount:
      Number.isFinite(
        memory.lastProcessedMessageCount
      )
        ? memory.lastProcessedMessageCount
        : 0,


    updatedAt:
      memory.updatedAt ||
      null

  };

}


// =========================
// NORMALIZE CHAT
// =========================

function normalizeChat(
  chat
) {

  return {

    ...chat,

    id:
      chat.id ||
      createChatId(),

    title:
      chat.title ||
      "New Chat",

    createdAt:
      chat.createdAt ||
      Date.now(),

    updatedAt:
      chat.updatedAt ||
      Date.now(),

    messages:
      Array.isArray(
        chat.messages
      )
        ? chat.messages
        : [],

    memory:
      normalizeMemory(
        chat.memory
      )

  };

}


// =========================
// CHARACTER STORAGE
// =========================

function saveCharacters() {

  localStorage.setItem(

    "chatiCharacters",

    JSON.stringify(
      characters
    )

  );

}


// =========================
// STORAGE KEYS
// =========================

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


  const oldKey =
    getOldChatKey(
      characterId
    );


  const oldRaw =
    localStorage.getItem(
      oldKey
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

      const migratedChat = {

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
// GET CHARACTER CHATS
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
// SAVE CHARACTER CHATS
// =========================

function saveCharacterChats(
  characterId,
  chats
) {

  const cleanChats =
    chats.map(
      normalizeChat
    );


  localStorage.setItem(

    getChatsKey(
      characterId
    ),

    JSON.stringify(
      cleanChats
    )

  );

}


// =========================
// NEW CHAT OBJECT
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
// SPECIFIC CHAT
// =========================

function getStoredChat(
  characterId,
  chatId
) {

  const chats =
    getCharacterChats(
      characterId
    );


  return (

    chats.find(
      chat =>
        chat.id ===
        chatId
    ) || null

  );

}


// =========================
// UPDATE CURRENT CHAT
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

  if (isSending) {

    return;

  }


  closeMemoryViewer();


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

  if (isSending) {

    return;

  }


  closeMemoryViewer();


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

  if (isSending) {

    return;

  }


  closeMemoryViewer();


  currentCharacter =
    character;


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
    null;


  if (
    requestedChatId
  ) {

    selectedChat =
      chats.find(
        chat =>
          chat.id ===
          requestedChatId
      );

  }


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


  if (
    character.image
  ) {

    chatCharacterImage.src =
      character.image;


    chatCharacterImage.style.display =
      "block";

  }

  else {

    chatCharacterImage
      .removeAttribute(
        "src"
      );

  }


  closeChatMenu();

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


      if (
        character.image
      ) {

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
// AUTO CHAT TITLE
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


  if (
    cleaned.length <= 28
  ) {

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


  const allChats =
    [];


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

  messages.innerHTML =
    "";


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


    if (
      currentCharacter.image
    ) {

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
// TYPING INDICATOR
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


  if (empty) {

    item.classList.add(
      "memory-empty-item"
    );

  }


  return item;

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


  memoryCharacterLabel.textContent =
    `${currentCharacter.name} • ${chat.title}`;


  const totalMessages =
    chat.messages.length;


  const processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      totalMessages

    );


  memoryMessageCount.textContent =
    `${processed} / ${totalMessages} processed`;


  const hasMemory =

    Boolean(
      memory.summary.trim()
    ) ||

    memory
      .importantFacts
      .length > 0 ||

    Boolean(
      memory.currentScene.trim()
    ) ||

    Boolean(
      memory
        .relationshipState
        .trim()
    ) ||

    memory
      .unresolvedThreads
      .length > 0;


  if (hasMemory) {

    memoryStatusText.textContent =
      "Memory active";

  }

  else if (
    totalMessages >=
    MEMORY_BATCH_THRESHOLD
  ) {

    memoryStatusText.textContent =
      "Waiting for memory update";

  }

  else {

    memoryStatusText.textContent =
      "Not enough messages yet";

  }


  memorySummary.textContent =
    memory.summary.trim() ||
    "No summary yet.";


  memoryScene.textContent =
    memory.currentScene.trim() ||
    "No current scene stored.";


  memoryRelationship.textContent =
    memory
      .relationshipState
      .trim() ||
    "No relationship development stored.";


  // IMPORTANT FACTS

  memoryFacts.innerHTML =
    "";


  if (
    memory
      .importantFacts
      .length === 0
  ) {

    memoryFacts.appendChild(

      createMemoryListItem(
        "No important memories stored yet.",
        true
      )

    );

  }

  else {

    memory
      .importantFacts
      .forEach(

        fact => {

          memoryFacts.appendChild(

            createMemoryListItem(
              fact
            )

          );

        }

      );

  }


  // UNRESOLVED THREADS

  memoryThreads.innerHTML =
    "";


  if (
    memory
      .unresolvedThreads
      .length === 0
  ) {

    memoryThreads.appendChild(

      createMemoryListItem(
        "No unresolved threads.",
        true
      )

    );

  }

  else {

    memory
      .unresolvedThreads
      .forEach(

        thread => {

          memoryThreads.appendChild(

            createMemoryListItem(
              thread
            )

          );

        }

      );

  }


  // UPDATED DATE

  if (
    memory.updatedAt
  ) {

    const date =
      new Date(
        memory.updatedAt
      );


    memoryUpdatedAt.textContent =
      `Last updated: ${date.toLocaleString()}`;

  }

  else {

    memoryUpdatedAt.textContent =
      "Memory has not been updated yet.";

  }

}


function openMemoryViewer() {

  if (
    !currentCharacter ||
    !currentChatId
  ) {

    return;

  }


  closeChatMenu();


  renderMemoryViewer();


  memoryModal.classList.remove(
    "hidden"
  );


  document.body.style.overflow =
    "hidden";

}


function closeMemoryViewer() {

  if (!memoryModal) {

    return;

  }


  memoryModal.classList.add(
    "hidden"
  );


  document.body.style.overflow =
    "";

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


document.addEventListener(

  "keydown",

  function(event) {

    if (
      event.key ===
      "Escape"
    ) {

      closeMemoryViewer();

      closeChatMenu();

    }

  }

);


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


    closeMemoryViewer();


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


    if (
      newName === null
    ) {

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

        `Clear all messages and memory from "${chat.title}"?`

      );


    if (!confirmed) {

      return;

    }


    updateCurrentChat(

      function(chat) {

        chat.messages =
          [];

        chat.title =
          "New Chat";

        chat.memory =
          createEmptyMemory();

      }

    );


    closeChatMenu();

    closeMemoryViewer();

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


    closeMemoryViewer();


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


    if (
      chats.length > 0
    ) {

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
// SAVE MESSAGE
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


  if (
    index === -1
  ) {

    return null;

  }


  chats[index]
    .messages
    .push(
      message
    );


  chats[index].updatedAt =
    Date.now();


  saveCharacterChats(
    characterId,
    chats
  );


  return chats[index];

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
      clean.unresolvedThreads

  };

}


// =========================
// MEMORY UPDATE
// =========================

async function updateMemoryForChat(
  character,
  chatId
) {

  if (
    !character ||
    !chatId
  ) {

    return;

  }


  const lockKey =
    `${character.id}_${chatId}`;


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


  const memory =
    normalizeMemory(
      chat.memory
    );


  const totalMessages =
    chat.messages.length;


  let processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      totalMessages

    );


  const unprocessedCount =
    totalMessages -
    processed;


  if (
    unprocessedCount <
    MEMORY_BATCH_THRESHOLD
  ) {

    return;

  }


  memoryUpdateLocks.add(
    lockKey
  );


  try {

    let start =
      processed;


    if (
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

              character:
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


    const latestChats =
      getCharacterChats(
        character.id
      );


    const index =
      latestChats.findIndex(
        item =>
          item.id ===
          chatId
      );


    if (
      index === -1
    ) {

      return;

    }


    const latestMemory =
      normalizeMemory(
        latestChats[index]
          .memory
      );


    latestChats[index].memory = {

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

      lastProcessedMessageCount:
        Math.max(
          latestMemory
            .lastProcessedMessageCount,
          end
        ),

      updatedAt:
        Date.now()

    };


    saveCharacterChats(
      character.id,
      latestChats
    );


    console.log(
      `✅ Memory saved for ${character.name}`
    );


    // If viewer happens to be open,
    // refresh it automatically.

    if (
      !memoryModal
        .classList
        .contains(
          "hidden"
        ) &&
      currentCharacter &&
      currentCharacter.id ===
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


  const newestChat =
    getStoredChat(
      character.id,
      chatId
    );


  if (
    newestChat
  ) {

    const newestMemory =
      normalizeMemory(
        newestChat.memory
      );


    const stillWaiting =

      newestChat
        .messages
        .length -

      newestMemory
        .lastProcessedMessageCount;


    if (
      stillWaiting >=
      MEMORY_BATCH_THRESHOLD
    ) {

      setTimeout(

        () => {

          updateMemoryForChat(
            character,
            chatId
          );

        },

        500

      );

    }

  }

}


// =========================
// READ STREAM
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


          streamingBubble =
            addMessageBubble(
              "character",
              ""
            );


          streamingBubble
            .classList
            .add(
              "streaming"
            );

        }


        finalText +=
          packet.delta;


        streamingBubble
          .textContent =
          finalText;


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


          streamingBubble =
            addMessageBubble(
              "character",
              ""
            );

        }


        finalText +=
          packet.delta;


        streamingBubble
          .textContent =
          finalText;

      }

    }

    catch {

      // Ignore incomplete
      // leftover packet.

    }

  }


  if (
    streamingBubble
  ) {

    streamingBubble
      .classList
      .remove(
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


    if (
      chatIndex === -1
    ) {

      return;

    }


    const chat =
      chats[chatIndex];


    chat.messages.push({

      sender:
        "user",

      text:
        text,

      time:
        Date.now()

    });


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


    chat.updatedAt =
      Date.now();


    chats[chatIndex] =
      chat;


    saveCharacterChats(
      requestCharacterId,
      chats
    );


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


    messageInput.value =
      "";


    renderMessages();

    renderChatHistory();


    isSending =
      true;


    messageInput.disabled =
      true;


    showTypingIndicator();


    try {

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

                character:
                  requestCharacter,

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

          // Ignore JSON issue.

        }


        throw new Error(
          errorMessage
        );

      }


      const finalReply =
        await readAIStream(
          response
        );


      removeTypingIndicator();


      if (
        !finalReply
      ) {

        throw new Error(
          "The character returned an empty response."
        );

      }


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


      updateMemoryForChat(

        requestCharacter,

        requestChatId

      );

    }

    catch (error) {

      removeTypingIndicator();


      console.error(
        "Chat error:",
        error
      );


      const unfinished =
        messages.querySelector(
          ".message.streaming"
        );


      if (
        unfinished
      ) {

        unfinished.remove();

      }


      addMessageBubble(

        "system",

        "Could not generate a response right now."

      );


      scrollToBottom();

    }

    finally {

      isSending =
        false;


      messageInput.disabled =
        false;


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
// START APP
// =========================

renderCharacters();

renderChatHistory();