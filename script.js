const CHAT_RECENT_LIMIT = 50;
const MEMORY_BATCH_THRESHOLD = 10;
const MEMORY_MAX_BATCH_MESSAGES = 80;
const MAX_ATTACHMENT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_AUDIO_FILE_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENT_DIMENSION = 1280;
const MAX_AUDIO_DURATION = 60;
const MAX_VIDEO_DURATION = 30;
const VIDEO_FRAME_COUNT = 6;
const MEDIA_DB_NAME = "chatiMediaDB";
const MEDIA_DB_STORE = "media";

const $ = (id) => document.getElementById(id);

const homeView = $("homeView");
const createView = $("createView");
const chatView = $("chatView");
const chatBackground = $("chatBackground");

const createBtn = $("createBtn");
const mainCreateBtn = $("mainCreateBtn");
const chatsBtn = $("chatsBtn");
const backBtn = $("backBtn");
const settingsBtn = $("settingsBtn");

const characterForm = $("characterForm");
const characterFormTitle = $("characterFormTitle");
const characterFormSubtitle = $("characterFormSubtitle");
const saveCharacterBtn = $("saveCharacterBtn");
const cancelCharacterBtn = $("cancelCharacterBtn");

const characterName = $("characterName");
const characterImage = $("characterImage");
const characterPronouns = $("characterPronouns");
const characterBio = $("characterBio");
const characterPersonality = $("characterPersonality");
const characterScenario = $("characterScenario");
const characterInstructions = $("characterInstructions");
const characterBackground = $("characterBackground");

const characterAvatarPreview = $("characterAvatarPreview");
const characterAvatarPlaceholder = $("characterAvatarPlaceholder");
const backgroundPreview = $("backgroundPreview");
const pronounPicker = $("pronounPicker");

const exampleMessagesList = $("exampleMessagesList");
const addExampleBtn = $("addExampleBtn");

const characterHasPowers = $("characterHasPowers");
const powersFields = $("powersFields");
const characterPowerSystem = $("characterPowerSystem");
const characterCombatStyle = $("characterCombatStyle");
const characterAbilities = $("characterAbilities");
const characterPowerLimits = $("characterPowerLimits");

const charactersGrid = $("charactersGrid");
const emptyState = $("emptyState");
const chatHistoryList = $("chatHistoryList");

const chatBackBtn = $("chatBackBtn");
const chatCharacterImage = $("chatCharacterImage");
const chatCharacterName = $("chatCharacterName");
const chatCharacterDescription = $("chatCharacterDescription");

const currentChatTitle = $("currentChatTitle");
const messages = $("messages");

const chatForm = $("chatForm");
const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const newChatBtn = $("newChatBtn");
const newChatMenuWrapper = $("newChatMenuWrapper");
const newChatMenu = $("newChatMenu");
const newNormalChatBtn = $("newNormalChatBtn");
const newPrivateChatBtn = $("newPrivateChatBtn");
const privateChatBadge = $("privateChatBadge");

const mediaMenuWrapper = $("mediaMenuWrapper");
const mediaMenuBtn = $("mediaMenuBtn");
const mediaAttachMenu = $("mediaAttachMenu");
const attachPhotoOption = $("attachPhotoOption");
const attachAudioOption = $("attachAudioOption");
const attachVideoOption = $("attachVideoOption");

const imageInput = $("imageInput");
const audioInput = $("audioInput");
const videoInput = $("videoInput");

const attachmentPreview = $("attachmentPreview");
const attachmentPreviewImage = $("attachmentPreviewImage");
const attachmentPreviewAudio = $("attachmentPreviewAudio");
const attachmentPreviewVideo = $("attachmentPreviewVideo");
const attachmentPreviewIcon = $("attachmentPreviewIcon");
const attachmentPreviewTitle = $("attachmentPreviewTitle");
const attachmentPreviewSubtitle = $("attachmentPreviewSubtitle");
const attachmentNote = $("attachmentNote");
const removeAttachmentBtn = $("removeAttachmentBtn");

const chatMenuBtn = $("chatMenuBtn");
const chatMenu = $("chatMenu");

const renameChatBtn = $("renameChatBtn");
const editCharacterMenuBtn = $("editCharacterMenuBtn");
const clearChatBtn = $("clearChatBtn");
const deleteChatBtn = $("deleteChatBtn");

const memoryBtn = $("memoryBtn");
const memoryModal = $("memoryModal");
const memoryOverlay = $("memoryOverlay");
const closeMemoryBtn = $("closeMemoryBtn");

const memoryCharacterLabel = $("memoryCharacterLabel");
const memoryStatusText = $("memoryStatusText");
const memoryMessageCount = $("memoryMessageCount");
const memoryPinned = $("memoryPinned");
const memorySummary = $("memorySummary");
const memoryFacts = $("memoryFacts");
const memoryScene = $("memoryScene");
const memoryRelationship = $("memoryRelationship");
const memoryThreads = $("memoryThreads");
const memoryUpdatedAt = $("memoryUpdatedAt");

const messageContextMenu = $("messageContextMenu");
const ctxCopy = $("ctxCopy");
const ctxEdit = $("ctxEdit");
const ctxRewind = $("ctxRewind");
const ctxPin = $("ctxPin");
const ctxPinLabel = $("ctxPinLabel");
const ctxDelete = $("ctxDelete");


let characters =
  JSON.parse(
    localStorage.getItem(
      "chatiCharacters"
    )
  ) || [];


let currentCharacter = null;

let currentChatId = null;

let isSending = false;

let contextMessageId = null;

let editingCharacterId = null;

let pendingAttachment = null;
let pendingPreviewObjectUrl = null;

/* Used only to animate the AI message that has just finished generating. */
let recentlyCompletedMessageId = null;

/* Private Chat lives only in this page's JavaScript memory. */
let temporaryPrivateChat = null;

/* Audio/video for Private Chat never enters IndexedDB. */
const privateMediaStore = new Map();


const memoryUpdateLocks =
  new Set();


function uid(prefix) {

  return (
    `${prefix}_${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );

}


function createChatId() {

  return uid(
    "chat"
  );

}


function createMessageId() {

  return uid(
    "msg"
  );

}


function createPinId() {

  return uid(
    "pin"
  );

}


function clamp(
  number,
  minimum,
  maximum
) {

  return Math.max(

    minimum,

    Math.min(
      maximum,
      number
    )

  );

}


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

  if (
    !memory ||
    typeof memory !==
      "object"
  ) {

    return createEmptyMemory();

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


function normalizeAttachment(
  attachment
) {

  if (
    !attachment ||
    typeof attachment !==
      "object"
  ) {

    return null;

  }


  let type =
    typeof attachment.type ===
    "string"
      ? attachment.type
      : "";


  if (
    !type &&
    typeof attachment.dataUrl ===
      "string" &&
    attachment.dataUrl.startsWith(
      "data:image/"
    )
  ) {

    type =
      "image";

  }


  if (
    ![
      "image",
      "audio",
      "video"
    ].includes(type)
  ) {

    return null;

  }


  const normalized = {

    type,

    note:
      typeof attachment.note ===
      "string"
        ? attachment.note
        : "",

    mimeType:
      typeof attachment.mimeType ===
      "string"
        ? attachment.mimeType
        : "",

    name:
      typeof attachment.name ===
      "string"
        ? attachment.name
        : `${type}-reference`,

    duration:
      Number.isFinite(
        attachment.duration
      )
        ? attachment.duration
        : null,

    mediaId:
      typeof attachment.mediaId ===
      "string"
        ? attachment.mediaId
        : null,

    thumbnailDataUrl:
      typeof attachment.thumbnailDataUrl ===
        "string" &&
      attachment.thumbnailDataUrl.startsWith(
        "data:image/"
      )
        ? attachment.thumbnailDataUrl
        : ""

  };


  if (
    type ===
    "image"
  ) {

    normalized.dataUrl =
      typeof attachment.dataUrl ===
        "string" &&
      attachment.dataUrl.startsWith(
        "data:image/"
      )
        ? attachment.dataUrl
        : "";


    if (
      !normalized.dataUrl
    ) {

      return null;

    }

  }


  if (
    (
      type ===
        "audio" ||
      type ===
        "video"
    ) &&
    !normalized.mediaId
  ) {

    return null;

  }


  return normalized;

}


function normalizeMessage(
  message
) {

  const sender =
    message?.sender ===
    "character"

      ? "character"

      : (
          message?.sender ===
          "system"

            ? "system"

            : "user"
        );


  let variants = [];

  let activeVariant = 0;


  if (
    sender ===
    "character"
  ) {

    if (
      Array.isArray(
        message?.variants
      ) &&
      message.variants.length
    ) {

      variants =
        message
          .variants
          .filter(

            item =>
              typeof item ===
              "string"

          );

    }


    if (
      !variants.length
    ) {

      variants = [

        typeof message?.text ===
        "string"

          ? message.text

          : ""

      ];

    }


    activeVariant =
      clamp(

        Number.isFinite(
          message?.activeVariant
        )
          ? message.activeVariant
          : 0,

        0,

        variants.length - 1

      );

  }


  const text =
    sender ===
    "character"

      ? variants[
          activeVariant
        ]

      : (
          typeof message?.text ===
          "string"

            ? message.text

            : ""
        );


  return {

    ...message,

    id:
      message?.id ||
      createMessageId(),

    sender,

    text,

    variants,

    activeVariant,

    attachment:
      normalizeAttachment(
        message?.attachment
      ),

    time:
      message?.time ||
      Date.now()

  };

}


function getMessageText(
  message
) {

  if (!message) {

    return "";

  }


  if (
    message.sender !==
    "character"
  ) {

    return (
      message.text ||
      ""
    );

  }


  const normalized =
    normalizeMessage(
      message
    );


  return (

    normalized
      .variants[
        normalized.activeVariant
      ] ||

    ""

  );

}


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


function normalizeExamples(
  value
) {

  if (
    !Array.isArray(value)
  ) {

    return [];

  }


  return value
    .map(

      example => ({

        user:
          typeof example?.user ===
          "string"
            ? example.user
            : "",

        character:
          typeof example?.character ===
          "string"
            ? example.character
            : ""

      })

    )
    .filter(

      example =>
        example.user ||
        example.character

    );

}


function normalizeCharacter(
  character
) {

  return {

    ...character,

    id:
      character?.id ||
      Date.now(),

    name:
      typeof character?.name ===
      "string"
        ? character.name
        : "Unnamed Character",

    image:
      typeof character?.image ===
      "string"
        ? character.image
        : "",

    pronouns:
      [
        "N/A",
        "HE",
        "SHE",
        "THEY"
      ].includes(
        character?.pronouns
      )
        ? character.pronouns
        : "N/A",

    bio:
      typeof character?.bio ===
      "string"
        ? character.bio
        : (
            typeof character?.description ===
            "string"
              ? character.description
              : ""
          ),

    description:
      typeof character?.bio ===
      "string"
        ? character.bio
        : (
            typeof character?.description ===
            "string"
              ? character.description
              : ""
          ),

    personality:
      typeof character?.personality ===
      "string"
        ? character.personality
        : "",

    scenario:
      typeof character?.scenario ===
      "string"
        ? character.scenario
        : "",

    instructions:
      typeof character?.instructions ===
      "string"
        ? character.instructions
        : "",

    exampleMessages:
      normalizeExamples(
        character?.exampleMessages
      ),

    hasPowers:
      Boolean(
        character?.hasPowers
      ),

    powerSystem:
      typeof character?.powerSystem ===
      "string"
        ? character.powerSystem
        : "",

    combatStyle:
      typeof character?.combatStyle ===
      "string"
        ? character.combatStyle
        : "",

    abilities:
      typeof character?.abilities ===
      "string"
        ? character.abilities
        : "",

    powerLimits:
      typeof character?.powerLimits ===
      "string"
        ? character.powerLimits
        : "",

    background:
      typeof character?.background ===
      "string"
        ? character.background
        : "",

    createdAt:
      character?.createdAt ||
      Date.now()

  };

}


characters =
  characters.map(
    normalizeCharacter
  );


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
    `chatiChats_${characterId}`
  );

}


function getActiveChatKey(
  characterId
) {

  return (
    `chatiActiveChat_${characterId}`
  );

}


function getOldChatKey(
  characterId
) {

  return (
    `chatiChat_${characterId}`
  );

}


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
      oldMessages.length
    ) {

      const migrated =
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
          migrated
        ])

      );


      localStorage.setItem(

        getActiveChatKey(
          characterId
        ),

        migrated.id

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
      raw
        .filter(

          chat =>
            !chat?.isPrivate

        )
        .map(
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


function saveCharacterChats(
  characterId,
  chats
) {

  localStorage.setItem(

    getChatsKey(
      characterId
    ),

    JSON.stringify(

      chats
        .filter(

          chat =>
            !chat?.isPrivate

        )
        .map(
          normalizeChat
        )

    )

  );

}


function getTemporaryPrivateChat(
  characterId,
  chatId = null
) {

  if (
    !temporaryPrivateChat ||
    temporaryPrivateChat.characterId !==
      characterId
  ) {

    return null;

  }


  if (
    chatId &&
    temporaryPrivateChat.id !==
      chatId
  ) {

    return null;

  }


  return temporaryPrivateChat;

}


function isPrivateChat(
  characterId,
  chatId
) {

  return Boolean(
    getTemporaryPrivateChat(
      characterId,
      chatId
    )
  );

}


function isCurrentChatPrivate() {

  return Boolean(
    currentCharacter &&
    currentChatId &&
    isPrivateChat(
      currentCharacter.id,
      currentChatId
    )
  );

}


function privateChatHasUnsavedContent() {

  const chat =
    currentCharacter &&
    currentChatId

      ? getTemporaryPrivateChat(
          currentCharacter.id,
          currentChatId
        )

      : null;


  if (!chat) {

    return false;

  }


  return Boolean(
    chat.messages.length ||
    messageInput?.value?.trim() ||
    pendingAttachment
  );

}


function discardPrivateChat() {

  if (!temporaryPrivateChat) {

    return;

  }


  temporaryPrivateChat.messages
    .forEach(

      message =>
        deleteMediaForAttachment(
          message.attachment
        )

    );


  const discardedId =
    temporaryPrivateChat.id;


  temporaryPrivateChat =
    null;


  if (
    currentChatId ===
    discardedId
  ) {

    currentChatId =
      null;

  }


  clearPendingAttachment();


  if (messageInput) {

    messageInput.value =
      "";

    autoGrowMessageInput();

  }


  closeMemoryViewer();

  updatePrivateChatUi(
    null
  );

}


function confirmAndDiscardPrivateChat() {

  if (!isCurrentChatPrivate()) {

    return true;

  }


  if (
    privateChatHasUnsavedContent() &&
    !confirm(
      "This Private Chat is not saved. Leaving it will permanently discard this conversation. Continue?"
    )
  ) {

    return false;

  }


  discardPrivateChat();

  return true;

}


function getStoredChat(
  characterId,
  chatId
) {

  const privateChat =
    getTemporaryPrivateChat(
      characterId,
      chatId
    );


  if (privateChat) {

    return privateChat;

  }


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


function mutateStoredChat(
  characterId,
  chatId,
  callback
) {

  const privateChat =
    getTemporaryPrivateChat(
      characterId,
      chatId
    );


  if (privateChat) {

    callback(
      privateChat
    );


    privateChat.updatedAt =
      Date.now();


    temporaryPrivateChat = {
      ...normalizeChat(
        privateChat
      ),
      characterId,
      isPrivate:
        true
    };


    return temporaryPrivateChat;

  }


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


  const result =
    mutateStoredChat(

      currentCharacter.id,

      currentChatId,

      callback

    );


  renderChatHistory();


  return result;

}


function buildNewChat(
  {
    isPrivate = false,
    characterId = null
  } = {}
) {

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
      createEmptyMemory(),

    isPrivate:
      Boolean(
        isPrivate
      ),

    characterId:
      isPrivate
        ? characterId
        : null

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


  const chat =
    buildNewChat();


  chats.push(
    chat
  );


  saveCharacterChats(
    character.id,
    chats
  );


  localStorage.setItem(

    getActiveChatKey(
      character.id
    ),

    chat.id

  );


  if (
    openImmediately
  ) {

    openChat(
      character,
      chat.id
    );

  }


  renderChatHistory();


  return chat;

}


function createPrivateChat(
  character
) {

  if (!character) {

    return null;

  }


  temporaryPrivateChat =
    buildNewChat({
      isPrivate:
        true,
      characterId:
        character.id
    });


  openChat(
    character,
    temporaryPrivateChat.id
  );


  renderChatHistory();


  return temporaryPrivateChat;

}


function setPronouns(
  value
) {

  const selected =
    [
      "N/A",
      "HE",
      "SHE",
      "THEY"
    ].includes(value)

      ? value

      : "N/A";


  characterPronouns.value =
    selected;


  pronounPicker
    .querySelectorAll(
      ".pronoun-option"
    )
    .forEach(

      button => {

        button.classList.toggle(

          "active",

          button.dataset.pronouns ===
          selected

        );

      }

    );

}


function updateAvatarPreview() {

  const url =
    characterImage
      .value
      .trim();


  if (url) {

    characterAvatarPreview.src =
      url;


    characterAvatarPreview
      .classList
      .remove(
        "hidden"
      );


    characterAvatarPlaceholder
      .classList
      .add(
        "hidden"
      );

  }

  else {

    characterAvatarPreview
      .removeAttribute(
        "src"
      );


    characterAvatarPreview
      .classList
      .add(
        "hidden"
      );


    characterAvatarPlaceholder
      .classList
      .remove(
        "hidden"
      );

  }

}


function updateBackgroundPreview() {

  const url =
    characterBackground
      .value
      .trim();


  if (url) {

    backgroundPreview
      .style
      .backgroundImage =
      `url("${url.replace(
        /"/g,
        '\\"'
      )}")`;


    backgroundPreview
      .classList
      .add(
        "has-image"
      );

  }

  else {

    backgroundPreview
      .style
      .backgroundImage =
      "none";


    backgroundPreview
      .classList
      .remove(
        "has-image"
      );

  }

}


function togglePowersFields() {

  powersFields
    .classList
    .toggle(

      "hidden",

      !characterHasPowers.checked

    );

}


function createExampleEditor(
  example = {
    user: "",
    character: ""
  }
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "example-card";


  card.innerHTML = `
    <div class="example-card-head">
      <strong>Example</strong>

      <button
        type="button"
        class="remove-example-btn"
      >
        Remove
      </button>
    </div>

    <div class="example-grid">

      <label>
        User message

        <textarea
          class="example-user"
          placeholder="What the user might say..."
        ></textarea>
      </label>

      <label>
        Character reply

        <textarea
          class="example-character"
          placeholder="How the character should reply..."
        ></textarea>
      </label>

    </div>
  `;


  card
    .querySelector(
      ".example-user"
    )
    .value =
    example.user ||
    "";


  card
    .querySelector(
      ".example-character"
    )
    .value =
    example.character ||
    "";


  card
    .querySelector(
      ".remove-example-btn"
    )
    .addEventListener(

      "click",

      () =>
        card.remove()

    );


  exampleMessagesList
    .appendChild(
      card
    );

}


function collectExamples() {

  return [

    ...exampleMessagesList
      .querySelectorAll(
        ".example-card"
      )

  ]
    .map(

      card => ({

        user:
          card
            .querySelector(
              ".example-user"
            )
            .value
            .trim(),

        character:
          card
            .querySelector(
              ".example-character"
            )
            .value
            .trim()

      })

    )
    .filter(

      example =>
        example.user ||
        example.character

    );

}


function resetCharacterForm() {

  characterForm.reset();


  editingCharacterId =
    null;


  exampleMessagesList.innerHTML =
    "";


  setPronouns(
    "N/A"
  );


  characterHasPowers.checked =
    false;


  togglePowersFields();

  updateAvatarPreview();

  updateBackgroundPreview();


  characterFormTitle.textContent =
    "Create Character";


  characterFormSubtitle.textContent =
    "Build the personality, identity, and world of your AI.";


  saveCharacterBtn.textContent =
    "Create Character";

}


function fillCharacterForm(
  character
) {

  const normalized =
    normalizeCharacter(
      character
    );


  editingCharacterId =
    normalized.id;


  characterName.value =
    normalized.name;


  characterImage.value =
    normalized.image;


  setPronouns(
    normalized.pronouns
  );


  characterBio.value =
    normalized.bio;


  characterPersonality.value =
    normalized.personality;


  characterScenario.value =
    normalized.scenario;


  characterInstructions.value =
    normalized.instructions;


  characterBackground.value =
    normalized.background;


  characterHasPowers.checked =
    normalized.hasPowers;


  characterPowerSystem.value =
    normalized.powerSystem;


  characterCombatStyle.value =
    normalized.combatStyle;


  characterAbilities.value =
    normalized.abilities;


  characterPowerLimits.value =
    normalized.powerLimits;


  exampleMessagesList.innerHTML =
    "";


  normalized
    .exampleMessages
    .forEach(
      createExampleEditor
    );


  togglePowersFields();

  updateAvatarPreview();

  updateBackgroundPreview();


  characterFormTitle.textContent =
    `Edit ${normalized.name}`;


  characterFormSubtitle.textContent =
    "Change the character without deleting their chats or memory.";


  saveCharacterBtn.textContent =
    "Save Changes";

}


function closeNewChatMenu() {

  newChatMenu
    ?.classList
    .add(
      "hidden"
    );


  newChatBtn
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

}


function toggleNewChatMenu() {

  if (
    isSending ||
    !currentCharacter
  ) {

    return;

  }


  const willOpen =
    newChatMenu
      ?.classList
      .contains(
        "hidden"
      );


  if (willOpen) {

    closeChatMenu();

    closeMessageContextMenu();

    closeMediaAttachMenu();


    newChatMenu
      ?.classList
      .remove(
        "hidden"
      );

  }

  else {

    closeNewChatMenu();

  }


  newChatBtn
    ?.setAttribute(
      "aria-expanded",
      willOpen
        ? "true"
        : "false"
    );

}


function updatePrivateChatUi(
  chat = getCurrentChat()
) {

  const active =
    Boolean(
      chat?.isPrivate &&
      currentCharacter &&
      currentChatId ===
        chat.id
    );


  privateChatBadge
    ?.classList
    .toggle(
      "hidden",
      !active
    );


  chatView
    ?.classList
    .toggle(
      "private-chat-active",
      active
    );

}


function closeAllFloatingUi() {

  closeChatMenu();

  closeNewChatMenu();

  closeMessageContextMenu();

  closeMediaAttachMenu();

}


function showCreateView(
  characterToEdit = null
) {

  if (isSending) {

    return;

  }


  closeMemoryViewer();

  closeAllFloatingUi();


  if (
    characterToEdit
  ) {

    fillCharacterForm(
      characterToEdit
    );

  }

  else {

    resetCharacterForm();

  }


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


  document
    .querySelector(
      ".main-content"
    )
    .scrollTop =
    0;

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


function readFileAsDataUrl(
  file
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            String(
              reader.result
            )
          );


      reader.onerror =
        () =>
          reject(
            reader.error ||
            new Error(
              "Could not read media file."
            )
          );


      reader.readAsDataURL(
        file
      );

    }

  );

}


function loadImageFromDataUrl(
  dataUrl
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const image =
        new Image();


      image.onload =
        () =>
          resolve(
            image
          );


      image.onerror =
        () =>
          reject(
            new Error(
              "Could not decode image."
            )
          );


      image.src =
        dataUrl;

    }

  );

}


async function compressImageFile(
  file
) {

  const originalDataUrl =
    await readFileAsDataUrl(
      file
    );


  const image =
    await loadImageFromDataUrl(
      originalDataUrl
    );


  const ratio =
    Math.min(

      MAX_ATTACHMENT_DIMENSION /
        image.width,

      MAX_ATTACHMENT_DIMENSION /
        image.height,

      1

    );


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    Math.max(
      1,
      Math.round(
        image.width *
        ratio
      )
    );


  canvas.height =
    Math.max(
      1,
      Math.round(
        image.height *
        ratio
      )
    );


  const context =
    canvas.getContext(
      "2d"
    );


  if (!context) {

    throw new Error(
      "Canvas is not available."
    );

  }


  context.drawImage(

    image,

    0,
    0,

    canvas.width,
    canvas.height

  );


  return canvas.toDataURL(
    "image/jpeg",
    0.8
  );

}


function openMediaDatabase() {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const request =
        indexedDB.open(
          MEDIA_DB_NAME,
          1
        );


      request.onupgradeneeded =
        () => {

          const database =
            request.result;


          if (
            !database
              .objectStoreNames
              .contains(
                MEDIA_DB_STORE
              )
          ) {

            database.createObjectStore(
              MEDIA_DB_STORE
            );

          }

        };


      request.onsuccess =
        () =>
          resolve(
            request.result
          );


      request.onerror =
        () =>
          reject(
            request.error ||
            new Error(
              "Could not open media storage."
            )
          );

    }

  );

}


function isPrivateMediaId(
  mediaId
) {

  return (
    typeof mediaId ===
      "string" &&
    mediaId.startsWith(
      "private_media_"
    )
  );

}


async function putMediaBlob(
  mediaId,
  blob
) {

  if (
    isPrivateMediaId(
      mediaId
    )
  ) {

    privateMediaStore.set(
      mediaId,
      blob
    );

    return;

  }


  const database =
    await openMediaDatabase();


  return new Promise(

    (
      resolve,
      reject
    ) => {

      const transaction =
        database.transaction(
          MEDIA_DB_STORE,
          "readwrite"
        );


      transaction
        .objectStore(
          MEDIA_DB_STORE
        )
        .put(
          blob,
          mediaId
        );


      transaction.oncomplete =
        () => {

          database.close();

          resolve();

        };


      transaction.onerror =
        () => {

          database.close();

          reject(
            transaction.error ||
            new Error(
              "Could not save media."
            )
          );

        };

    }

  );

}


async function getMediaBlob(
  mediaId
) {

  if (!mediaId) {

    return null;

  }


  if (
    isPrivateMediaId(
      mediaId
    )
  ) {

    return (
      privateMediaStore.get(
        mediaId
      ) ||
      null
    );

  }


  const database =
    await openMediaDatabase();


  return new Promise(

    (
      resolve,
      reject
    ) => {

      const transaction =
        database.transaction(
          MEDIA_DB_STORE,
          "readonly"
        );


      const request =
        transaction
          .objectStore(
            MEDIA_DB_STORE
          )
          .get(
            mediaId
          );


      request.onsuccess =
        () => {

          database.close();

          resolve(
            request.result ||
            null
          );

        };


      request.onerror =
        () => {

          database.close();

          reject(
            request.error ||
            new Error(
              "Could not load media."
            )
          );

        };

    }

  );

}


async function deleteMediaBlob(
  mediaId
) {

  if (!mediaId) {

    return;

  }


  if (
    isPrivateMediaId(
      mediaId
    )
  ) {

    privateMediaStore.delete(
      mediaId
    );

    return;

  }


  try {

    const database =
      await openMediaDatabase();


    await new Promise(

      (
        resolve,
        reject
      ) => {

        const transaction =
          database.transaction(
            MEDIA_DB_STORE,
            "readwrite"
          );


        transaction
          .objectStore(
            MEDIA_DB_STORE
          )
          .delete(
            mediaId
          );


        transaction.oncomplete =
          resolve;


        transaction.onerror =
          () =>
            reject(
              transaction.error ||
              new Error(
                "Could not delete media."
              )
            );

      }

    );


    database.close();

  }

  catch (error) {

    console.warn(
      "Could not remove stored media:",
      error
    );

  }

}


function deleteMediaForAttachment(
  attachment
) {

  const normalized =
    normalizeAttachment(
      attachment
    );


  if (
    normalized?.mediaId
  ) {

    deleteMediaBlob(
      normalized.mediaId
    );

  }

}


function getMediaDuration(
  file,
  kind
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const element =
        document.createElement(
          kind ===
          "video"

            ? "video"

            : "audio"
        );


      const url =
        URL.createObjectURL(
          file
        );


      let finished =
        false;


      const cleanup =
        () => {

          if (finished) {

            return;

          }


          finished =
            true;


          clearTimeout(
            timeoutId
          );


          element.onloadedmetadata =
            null;

          element.onerror =
            null;


          try {

            element.pause();

          }

          catch {
            // ignore
          }


          element.removeAttribute(
            "src"
          );


          URL.revokeObjectURL(
            url
          );

        };


      const fail =
        message => {

          if (finished) {

            return;

          }


          cleanup();


          reject(
            new Error(
              message
            )
          );

        };


      const timeoutId =
        setTimeout(

          () =>
            fail(
              `Could not read ${kind} metadata.`
            ),

          12000

        );


      element.preload =
        "metadata";


      if (
        kind ===
        "video"
      ) {

        element.muted =
          true;

        element.playsInline =
          true;

      }


      element.onloadedmetadata =
        () => {

          if (finished) {

            return;

          }


          const duration =
            Number(
              element.duration
            );


          if (
            Number.isFinite(
              duration
            ) &&
            duration >= 0
          ) {

            cleanup();

            resolve(
              duration
            );

            return;

          }


          fail(
            `Could not read ${kind} duration.`
          );

        };


      element.onerror =
        () =>
          fail(
            `This ${kind} format could not be decoded by the browser.`
          );


      element.src =
        url;


      try {

        element.load();

      }

      catch {
        // assigning src is enough in browsers where load() is restricted
      }

    }

  );

}


function seekVideo(
  video,
  time
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const targetTime =
        Math.max(
          0,
          Number(
            time
          ) || 0
        );


      if (
        Math.abs(
          video.currentTime -
          targetTime
        ) < 0.02 &&
        video.readyState >= 2
      ) {

        resolve();

        return;

      }


      let settled =
        false;


      const cleanup =
        () => {

          video.removeEventListener(
            "seeked",
            onSeeked
          );


          clearTimeout(
            timeoutId
          );

        };


      const finish =
        () => {

          if (settled) {

            return;

          }


          settled =
            true;

          cleanup();

          resolve();

        };


      const fail =
        () => {

          if (settled) {

            return;

          }


          settled =
            true;

          cleanup();

          reject(
            new Error(
              "Video seek timed out."
            )
          );

        };


      const onSeeked =
        () =>
          finish();


      video.addEventListener(
        "seeked",
        onSeeked,
        {
          once:
            true
        }
      );


      const timeoutId =
        setTimeout(
          fail,
          5000
        );


      try {

        video.currentTime =
          targetTime;

      }

      catch {

        fail();

      }

    }

  );

}


async function makeVideoThumbnail(
  file
) {

  try {

    const frames =
      await extractVideoFrames(
        file,
        null,
        1
      );


    return (
      frames[0] ||
      ""
    );

  }

  catch (error) {

    console.warn(
      "Video thumbnail skipped:",
      error
    );


    return "";

  }

}


async function extractVideoFrames(
  blob,
  knownDuration = null,
  count = VIDEO_FRAME_COUNT
) {

  const url =
    URL.createObjectURL(
      blob
    );


  const video =
    document.createElement(
      "video"
    );


  video.preload =
    "auto";

  video.muted =
    true;

  video.playsInline =
    true;

  video.src =
    url;


  try {

    await new Promise(

      (
        resolve,
        reject
      ) => {

        let settled =
          false;


        const cleanup =
          () => {

            clearTimeout(
              timeoutId
            );


            video.removeEventListener(
              "loadeddata",
              onReady
            );


            video.removeEventListener(
              "canplay",
              onReady
            );


            video.removeEventListener(
              "error",
              onError
            );

          };


        const finish =
          () => {

            if (settled) {

              return;

            }


            settled =
              true;

            cleanup();

            resolve();

          };


        const fail =
          () => {

            if (settled) {

              return;

            }


            settled =
              true;

            cleanup();

            reject(
              new Error(
                "Could not decode enough video data to read frames."
              )
            );

          };


        const onReady =
          () => {

            if (
              video.videoWidth > 0 &&
              video.videoHeight > 0 &&
              video.readyState >= 2
            ) {

              finish();

            }

          };


        const onError =
          () =>
            fail();


        const timeoutId =
          setTimeout(
            fail,
            12000
          );


        video.addEventListener(
          "loadeddata",
          onReady
        );


        video.addEventListener(
          "canplay",
          onReady
        );


        video.addEventListener(
          "error",
          onError
        );


        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {

          finish();

          return;

        }


        try {

          video.load();

        }

        catch {
          // assigning src is enough in browsers where load() is restricted
        }

      }

    );


    const duration =
      Number.isFinite(
        knownDuration
      )
        ? knownDuration
        : video.duration;


    if (
      !Number.isFinite(
        duration
      ) ||
      duration < 0
    ) {

      throw new Error(
        "Video duration is unavailable."
      );

    }


    const safeCount =
      Math.max(
        1,
        Math.min(
          count,
          8
        )
      );


    const frames =
      [];


    for (
      let index = 0;
      index < safeCount;
      index += 1
    ) {

      const fraction =
        safeCount === 1
          ? 0.18
          : 0.06 +
            0.88 *
            index /
            (
              safeCount -
              1
            );


      const time =
        Math.min(
          Math.max(
            duration *
            fraction,
            0
          ),
          Math.max(
            duration -
            0.05,
            0
          )
        );


      try {

        await seekVideo(
          video,
          time
        );

      }

      catch (error) {

        console.warn(
          `Skipping video frame ${index + 1}:`,
          error
        );


        continue;

      }


      if (
        video.videoWidth <= 0 ||
        video.videoHeight <= 0 ||
        video.readyState < 2
      ) {

        continue;

      }


      const scale =
        Math.min(
          768 /
          video.videoWidth,
          768 /
          video.videoHeight,
          1
        );


      const canvas =
        document.createElement(
          "canvas"
        );


      canvas.width =
        Math.max(
          1,
          Math.round(
            video.videoWidth *
            scale
          )
        );


      canvas.height =
        Math.max(
          1,
          Math.round(
            video.videoHeight *
            scale
          )
        );


      const context =
        canvas.getContext(
          "2d"
        );


      if (!context) {

        continue;

      }


      try {

        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );


        frames.push(
          canvas.toDataURL(
            "image/jpeg",
            0.7
          )
        );

      }

      catch (error) {

        console.warn(
          `Could not capture video frame ${index + 1}:`,
          error
        );

      }

    }


    return frames;

  }

  finally {

    try {

      video.pause();

    }

    catch {
      // ignore
    }


    video.removeAttribute(
      "src"
    );


    URL.revokeObjectURL(
      url
    );

  }

}


function blobToDataUrl(
  blob
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            String(
              reader.result
            )
          );


      reader.onerror =
        () =>
          reject(
            reader.error ||
            new Error(
              "Could not read stored media."
            )
          );


      reader.readAsDataURL(
        blob
      );

    }

  );

}


function formatDuration(
  seconds
) {

  if (
    !Number.isFinite(
      seconds
    )
  ) {

    return "";

  }


  const rounded =
    Math.max(
      0,
      Math.round(
        seconds
      )
    );


  return (
    `${Math.floor(
      rounded /
      60
    )}:${String(
      rounded %
      60
    ).padStart(
      2,
      "0"
    )}`
  );

}


function closeMediaAttachMenu() {

  mediaAttachMenu
    ?.classList
    .add(
      "hidden"
    );


  mediaMenuBtn
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

}


function toggleMediaAttachMenu() {

  if (isSending) {

    return;

  }


  const willOpen =
    mediaAttachMenu
      ?.classList
      .contains(
        "hidden"
      );


  if (willOpen) {

    mediaAttachMenu
      ?.classList
      .remove(
        "hidden"
      );

  }

  else {

    closeMediaAttachMenu();

  }


  mediaMenuBtn
    ?.setAttribute(
      "aria-expanded",
      willOpen
        ? "true"
        : "false"
    );

}


function revokePendingPreviewUrl() {

  if (
    pendingPreviewObjectUrl
  ) {

    URL.revokeObjectURL(
      pendingPreviewObjectUrl
    );

    pendingPreviewObjectUrl =
      null;

  }

}


function clearPendingAttachment(
  {
    deleteStored = true
  } = {}
) {

  const old =
    pendingAttachment;


  pendingAttachment =
    null;


  closeMediaAttachMenu();

  revokePendingPreviewUrl();


  if (
    deleteStored &&
    old?.mediaId
  ) {

    deleteMediaBlob(
      old.mediaId
    );

  }


  for (
    const input of [
      imageInput,
      audioInput,
      videoInput
    ]
  ) {

    if (input) {

      input.value =
        "";

    }

  }


  if (attachmentNote) {

    attachmentNote.value =
      "";

  }


  attachmentPreviewImage
    ?.removeAttribute(
      "src"
    );


  if (
    attachmentPreviewAudio
  ) {

    attachmentPreviewAudio.pause();

    attachmentPreviewAudio
      .removeAttribute(
        "src"
      );

  }


  if (
    attachmentPreviewVideo
  ) {

    attachmentPreviewVideo.pause();

    attachmentPreviewVideo
      .removeAttribute(
        "src"
      );

    attachmentPreviewVideo
      .removeAttribute(
        "poster"
      );

  }


  attachmentPreviewImage
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewAudio
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewVideo
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewIcon
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreview
    ?.classList
    .add(
      "hidden"
    );

}


function showPendingAttachment(
  attachment,
  blob = null
) {

  pendingAttachment =
    attachment;


  attachmentNote.value =
    attachment.note ||
    "";


  attachmentPreviewImage
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewAudio
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewVideo
    ?.classList
    .add(
      "hidden"
    );

  attachmentPreviewIcon
    ?.classList
    .add(
      "hidden"
    );


  revokePendingPreviewUrl();


  if (
    attachment.type ===
    "image"
  ) {

    attachmentPreviewImage.src =
      attachment.dataUrl;

    attachmentPreviewImage
      .classList
      .remove(
        "hidden"
      );

  }

  else if (
    attachment.type ===
    "audio"
  ) {

    if (
      blob &&
      attachmentPreviewAudio
    ) {

      pendingPreviewObjectUrl =
        URL.createObjectURL(
          blob
        );

      attachmentPreviewAudio.src =
        pendingPreviewObjectUrl;

      attachmentPreviewAudio
        .classList
        .remove(
          "hidden"
        );

    }

    else {

      attachmentPreviewIcon
        ?.classList
        .remove(
          "hidden"
        );

    }

  }

  else if (
    attachment.type ===
    "video"
  ) {

    if (
      blob &&
      attachmentPreviewVideo
    ) {

      pendingPreviewObjectUrl =
        URL.createObjectURL(
          blob
        );

      attachmentPreviewVideo.src =
        pendingPreviewObjectUrl;


      if (
        attachment.thumbnailDataUrl
      ) {

        attachmentPreviewVideo.poster =
          attachment.thumbnailDataUrl;

      }


      attachmentPreviewVideo
        .classList
        .remove(
          "hidden"
        );

    }

  }


  attachmentPreviewTitle.textContent =
    attachment.type ===
    "image"

      ? "Photo reference"

      : attachment.type ===
        "audio"

        ? "Audio reference"

        : "Video reference";


  attachmentPreviewSubtitle.textContent =
    [
      attachment.name,
      formatDuration(
        attachment.duration
      )
    ]
      .filter(Boolean)
      .join(
        " • "
      );


  attachmentPreview
    .classList
    .remove(
      "hidden"
    );

}


function fileLooksLikeType(
  file,
  kind
) {

  const mime =
    String(
      file?.type ||
      ""
    )
      .toLowerCase();


  if (
    mime.startsWith(
      `${kind}/`
    )
  ) {

    return true;

  }


  const name =
    String(
      file?.name ||
      ""
    )
      .toLowerCase();


  const extensions =
    kind ===
    "video"

      ? [
          ".mp4",
          ".mov",
          ".m4v",
          ".webm",
          ".mpeg",
          ".mpg"
        ]

      : kind ===
        "audio"

        ? [
            ".mp3",
            ".m4a",
            ".wav",
            ".aac",
            ".ogg",
            ".webm",
            ".flac",
            ".mp4"
          ]

        : [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".heic",
            ".heif"
          ];


  return extensions.some(
    extension =>
      name.endsWith(
        extension
      )
  );

}


async function selectImageFile(
  file
) {

  if (
    !fileLooksLikeType(
      file,
      "image"
    )
  ) {

    throw new Error(
      "Please choose an image file."
    );

  }


  if (
    file.size >
    MAX_ATTACHMENT_FILE_SIZE
  ) {

    throw new Error(
      "Please keep the original image under 5MB."
    );

  }


  const dataUrl =
    await compressImageFile(
      file
    );


  clearPendingAttachment();


  showPendingAttachment({

    type:
      "image",

    dataUrl,

    note:
      "",

    mimeType:
      "image/jpeg",

    name:
      file.name ||
      "battle-reference.jpg",

    duration:
      null

  });

}


async function selectAudioFile(
  file
) {

  if (
    !fileLooksLikeType(
      file,
      "audio"
    )
  ) {

    throw new Error(
      "Please choose an audio file."
    );

  }


  if (
    file.size >
    MAX_AUDIO_FILE_SIZE
  ) {

    throw new Error(
      "Please keep audio files under 15MB."
    );

  }


  const duration =
    await getMediaDuration(
      file,
      "audio"
    );


  if (
    duration >
    MAX_AUDIO_DURATION +
    0.25
  ) {

    throw new Error(
      "Audio can be up to 60 seconds long."
    );

  }


  clearPendingAttachment();


  const mediaId =
    uid(
      isCurrentChatPrivate()
        ? "private_media_audio"
        : "media_audio"
    );


  await putMediaBlob(
    mediaId,
    file
  );


  showPendingAttachment(

    {
      type:
        "audio",

      mediaId,

      note:
        "",

      mimeType:
        file.type ||
        "audio/mpeg",

      name:
        file.name ||
        "scene-audio",

      duration
    },

    file

  );

}


async function selectVideoFile(
  file
) {

  if (
    !fileLooksLikeType(
      file,
      "video"
    )
  ) {

    throw new Error(
      "Please choose a video file."
    );

  }


  if (
    file.size >
    MAX_VIDEO_FILE_SIZE
  ) {

    throw new Error(
      "Please keep video files under 25MB."
    );

  }


  const duration =
    await getMediaDuration(
      file,
      "video"
    );


  if (
    duration >
    MAX_VIDEO_DURATION +
    0.25
  ) {

    throw new Error(
      "Videos can be up to 30 seconds long in Battle Media V1."
    );

  }


  clearPendingAttachment();


  const mediaId =
    uid(
      isCurrentChatPrivate()
        ? "private_media_video"
        : "media_video"
    );


  await putMediaBlob(
    mediaId,
    file
  );


  const attachment = {

    type:
      "video",

    mediaId,

    note:
      "",

    mimeType:
      file.type ||
      "video/mp4",

    name:
      file.name ||
      "scene-video",

    duration,

    thumbnailDataUrl:
      ""

  };


  showPendingAttachment(
    attachment,
    file
  );


  makeVideoThumbnail(
    file
  )
    .then(
      thumbnailDataUrl => {

        if (
          !thumbnailDataUrl ||
          pendingAttachment?.mediaId !==
          mediaId
        ) {

          return;

        }


        pendingAttachment.thumbnailDataUrl =
          thumbnailDataUrl;


        if (
          attachmentPreviewVideo
        ) {

          attachmentPreviewVideo.poster =
            thumbnailDataUrl;

        }

      }
    )
    .catch(
      error => {

        console.warn(
          "Video thumbnail generation failed:",
          error
        );

      }
    );

}


mediaMenuBtn?.addEventListener(

  "click",

  event => {

    event.stopPropagation();

    toggleMediaAttachMenu();

  }

);


attachPhotoOption?.addEventListener(

  "click",

  () => {

    closeMediaAttachMenu();

    imageInput?.click();

  }

);


attachAudioOption?.addEventListener(

  "click",

  () => {

    closeMediaAttachMenu();

    audioInput?.click();

  }

);


attachVideoOption?.addEventListener(

  "click",

  () => {

    closeMediaAttachMenu();

    videoInput?.click();

  }

);


removeAttachmentBtn?.addEventListener(

  "click",

  () =>
    clearPendingAttachment()

);


imageInput?.addEventListener(

  "change",

  async event => {

    const file =
      event.target.files?.[0];


    if (!file) {

      return;

    }


    try {

      await selectImageFile(
        file
      );

    }

    catch (error) {

      console.error(
        "Image attachment error:",
        error
      );


      alert(
        error.message ||
        "Could not process that image."
      );


      clearPendingAttachment();

    }

  }

);


audioInput?.addEventListener(

  "change",

  async event => {

    const file =
      event.target.files?.[0];


    if (!file) {

      return;

    }


    try {

      await selectAudioFile(
        file
      );

    }

    catch (error) {

      console.error(
        "Audio attachment error:",
        error
      );


      alert(
        error.message ||
        "Could not process that audio file."
      );


      clearPendingAttachment();

    }

  }

);


videoInput?.addEventListener(

  "change",

  async event => {

    const file =
      event.target.files?.[0];


    if (!file) {

      return;

    }


    try {

      await selectVideoFile(
        file
      );

    }

    catch (error) {

      console.error(
        "Video attachment error:",
        error
      );


      alert(
        error.message ||
        "Could not process that video file."
      );


      clearPendingAttachment();

    }

  }

);


async function hydrateAttachmentForApi(
  attachment
) {

  const normalized =
    normalizeAttachment(
      attachment
    );


  if (!normalized) {

    return null;

  }


  if (
    normalized.type ===
    "image"
  ) {

    return normalized;

  }


  const blob =
    await getMediaBlob(
      normalized.mediaId
    );


  if (!blob) {

    return {
      ...normalized,
      mediaUnavailable:
        true
    };

  }


  const mediaDataUrl =
    await blobToDataUrl(
      blob
    );


  if (
    normalized.type ===
    "audio"
  ) {

    return {
      ...normalized,
      mediaDataUrl
    };

  }


  let frames =
    [];


  try {

    frames =
      await extractVideoFrames(
        blob,
        normalized.duration,
        VIDEO_FRAME_COUNT
      );

  }

  catch (error) {

    console.warn(
      "Video frame extraction failed; sending audio/context only:",
      error
    );

  }


  return {
    ...normalized,
    mediaDataUrl,
    frames
  };

}


pronounPicker.addEventListener(

  "click",

  event => {

    const button =
      event.target.closest(
        ".pronoun-option"
      );


    if (button) {

      setPronouns(
        button.dataset.pronouns
      );

    }

  }

);


characterImage.addEventListener(
  "input",
  updateAvatarPreview
);


characterBackground.addEventListener(
  "input",
  updateBackgroundPreview
);


characterHasPowers.addEventListener(
  "change",
  togglePowersFields
);


addExampleBtn.addEventListener(

  "click",

  () =>
    createExampleEditor()

);


createBtn.addEventListener(

  "click",

  () => {

    if (
      !confirmAndDiscardPrivateChat()
    ) {

      return;

    }


    showCreateView();

  }

);


mainCreateBtn.addEventListener(

  "click",

  () =>
    showCreateView()

);


chatsBtn.addEventListener(

  "click",

  () => {

    if (
      !confirmAndDiscardPrivateChat()
    ) {

      return;

    }


    showHomeView();

  }

);


chatBackBtn.addEventListener(

  "click",

  () => {

    if (
      !confirmAndDiscardPrivateChat()
    ) {

      return;

    }


    showHomeView();

  }

);


backBtn.addEventListener(

  "click",

  () => {

    if (
      editingCharacterId &&
      currentCharacter
    ) {

      openChat(
        currentCharacter,
        currentChatId
      );

    }

    else {

      showHomeView();

    }

  }

);


cancelCharacterBtn.addEventListener(

  "click",

  () => {

    if (
      editingCharacterId &&
      currentCharacter
    ) {

      openChat(
        currentCharacter,
        currentChatId
      );

    }

    else {

      showHomeView();

    }

  }

);


settingsBtn.addEventListener(

  "click",

  () => {

    if (
      !currentCharacter
    ) {

      alert(
        "Open a character first, then use Settings to edit it."
      );


      return;

    }


    showCreateView(
      currentCharacter
    );

  }

);


editCharacterMenuBtn.addEventListener(

  "click",

  () => {

    closeChatMenu();


    if (
      currentCharacter
    ) {

      showCreateView(
        currentCharacter
      );

    }

  }

);


characterForm.addEventListener(

  "submit",

  event => {

    event.preventDefault();


    const existing =
      editingCharacterId

        ? characters.find(

            character =>
              character.id ===
              editingCharacterId

          )

        : null;


    const character =
      normalizeCharacter({

        ...(existing || {}),

        id:
          existing?.id ||
          Date.now(),

        createdAt:
          existing?.createdAt ||
          Date.now(),

        name:
          characterName
            .value
            .trim(),

        image:
          characterImage
            .value
            .trim(),

        pronouns:
          characterPronouns.value,

        bio:
          characterBio
            .value
            .trim(),

        description:
          characterBio
            .value
            .trim(),

        personality:
          characterPersonality
            .value
            .trim(),

        scenario:
          characterScenario
            .value
            .trim(),

        instructions:
          characterInstructions
            .value
            .trim(),

        exampleMessages:
          collectExamples(),

        hasPowers:
          characterHasPowers.checked,

        powerSystem:
          characterPowerSystem
            .value
            .trim(),

        combatStyle:
          characterCombatStyle
            .value
            .trim(),

        abilities:
          characterAbilities
            .value
            .trim(),

        powerLimits:
          characterPowerLimits
            .value
            .trim(),

        background:
          characterBackground
            .value
            .trim()

      });


    if (
      !character.name ||
      !character.personality
    ) {

      return;

    }


    if (
      existing
    ) {

      const index =
        characters.findIndex(

          item =>
            item.id ===
            existing.id

        );


      characters[index] =
        character;


      if (
        currentCharacter?.id ===
        character.id
      ) {

        currentCharacter =
          character;

      }

    }

    else {

      characters.push(
        character
      );

    }


    saveCharacters();

    resetCharacterForm();


    if (
      existing
    ) {

      openChat(
        character,
        currentChatId
      );

    }

    else {

      showHomeView();

    }

  }

);


function renderCharacters() {

  charactersGrid.innerHTML =
    "";


  emptyState.style.display =
    characters.length

      ? "none"

      : "flex";


  characters.forEach(

    character => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "character-card";


      if (
        character.image
      ) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          character.image;


        image.alt =
          character.name;


        image.className =
          "character-image";


        card.appendChild(
          image
        );

      }

      else {

        const placeholder =
          document.createElement(
            "div"
          );


        placeholder.className =
          "character-placeholder";


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


      info.className =
        "character-info";


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        character.name;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        character.bio ||
        "AI Character";


      info.append(
        title,
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


      charactersGrid.appendChild(
        card
      );

    }

  );

}


function makeChatTitle(
  text
) {

  const clean =
    text
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return (
    clean.length <= 28

      ? clean

      : `${clean.slice(
          0,
          28
        )}...`
  );

}


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

          chat => {

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
    !allChats.length
  ) {

    const empty =
      document.createElement(
        "p"
      );


    empty.className =
      "history-empty";


    empty.textContent =
      "No chats yet";


    chatHistoryList.appendChild(
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


      button.className =
        "history-item";


      if (
        currentCharacter?.id ===
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


      const name =
        document.createElement(
          "span"
        );


      name.className =
        "history-character";


      name.textContent =
        character.name;


      const title =
        document.createElement(
          "span"
        );


      title.className =
        "history-title";


      title.textContent =
        chat.title;


      button.append(
        name,
        title
      );


      button.addEventListener(

        "click",

        () => {

          if (
            !isSending
          ) {

            if (
              !confirmAndDiscardPrivateChat()
            ) {

              return;

            }


            openChat(
              character,
              chat.id
            );

          }

        }

      );


      chatHistoryList.appendChild(
        button
      );

    }

  );

}


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


  chatBackground
    .style
    .backgroundImage =
    `url("${url.replace(
      /"/g,
      '\\"'
    )}")`;


  chatBackground
    .classList
    .add(
      "active"
    );

}


function openChat(
  character,
  requestedChatId = null
) {

  if (isSending) {

    return;

  }


  closeMemoryViewer();

  closeAllFloatingUi();

  clearPendingAttachment();


  currentCharacter =
    normalizeCharacter(
      character
    );


  const characterIndex =
    characters.findIndex(

      item =>
        item.id ===
        currentCharacter.id

    );


  if (
    characterIndex >= 0
  ) {

    characters[
      characterIndex
    ] =
      currentCharacter;


    saveCharacters();

  }


  const requestedPrivateChat =
    requestedChatId

      ? getTemporaryPrivateChat(
          currentCharacter.id,
          requestedChatId
        )

      : null;


  let chats =
    getCharacterChats(
      currentCharacter.id
    );


  if (
    !requestedPrivateChat &&
    !chats.length
  ) {

    const firstChat =
      buildNewChat();


    chats.push(
      firstChat
    );


    saveCharacterChats(
      currentCharacter.id,
      chats
    );

  }


  let selected =
    requestedPrivateChat;


  if (
    !selected &&
    requestedChatId
  ) {

    selected =
      chats.find(

        chat =>
          chat.id ===
          requestedChatId

      );

  }


  if (!selected) {

    const active =
      localStorage.getItem(

        getActiveChatKey(
          currentCharacter.id
        )

      );


    selected =
      chats.find(

        chat =>
          chat.id ===
          active

      );

  }


  if (
    !selected &&
    chats.length
  ) {

    selected =
      [...chats]
        .sort(

          (a, b) =>
            b.updatedAt -
            a.updatedAt

        )[0];

  }


  if (!selected) {

    return;

  }


  currentChatId =
    selected.id;


  if (
    !selected.isPrivate
  ) {

    localStorage.setItem(

      getActiveChatKey(
        currentCharacter.id
      ),

      currentChatId

    );

  }


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


  chatCharacterName.textContent =
    currentCharacter.name;


  chatCharacterDescription.textContent =
    currentCharacter.bio ||
    "AI Character";


  if (
    currentCharacter.image
  ) {

    chatCharacterImage.src =
      currentCharacter.image;


    chatCharacterImage.style.display =
      "block";

  }

  else {

    chatCharacterImage
      .removeAttribute(
        "src"
      );


    chatCharacterImage.style.display =
      "none";

  }


  applyCharacterBackground(
    currentCharacter
  );


  updatePrivateChatUi(
    selected
  );


  renderMessages();

  renderChatHistory();


  setTimeout(

    () =>
      messageInput.focus(),

    80

  );

}


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
    )
  ) {

    if (
      match.index >
      lastIndex
    ) {

      element.appendChild(

        document.createTextNode(

          text.slice(
            lastIndex,
            match.index
          )

        )

      );

    }


    const token =
      match[0];


    const strip =
      token.startsWith(
        "**"
      )
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

        token.length -
        strip

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

      document.createTextNode(

        text.slice(
          lastIndex
        )

      )

    );

  }

}


function renderMessageContent(
  bubble,
  message
) {

  bubble.replaceChildren();


  const attachmentData =
    normalizeAttachment(
      message.attachment
    );


  if (
    attachmentData
  ) {

    const attachment =
      document.createElement(
        "div"
      );


    attachment.className =
      `message-attachment ${attachmentData.type}`;


    if (
      attachmentData.type ===
      "image"
    ) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        attachmentData.dataUrl;

      image.alt =
        "Scene reference";


      attachment.appendChild(
        image
      );

    }


    if (
      attachmentData.type ===
      "audio"
    ) {

      const shell =
        document.createElement(
          "div"
        );


      shell.className =
        "message-media-shell audio";


      const label =
        document.createElement(
          "div"
        );


      label.className =
        "message-media-label";


      label.textContent =
        [
          attachmentData.name ||
          "Audio reference",
          formatDuration(
            attachmentData.duration
          )
        ]
          .filter(Boolean)
          .join(
            " • "
          );


      const audio =
        document.createElement(
          "audio"
        );


      audio.controls =
        true;

      audio.preload =
        "metadata";


      shell.append(
        label,
        audio
      );


      attachment.appendChild(
        shell
      );


      getMediaBlob(
        attachmentData.mediaId
      )
        .then(

          blob => {

            if (blob) {

              audio.src =
                URL.createObjectURL(
                  blob
                );

            }

            else {

              label.textContent +=
                " • unavailable on this device";

            }

          }

        )
        .catch(

          () => {

            label.textContent +=
              " • unavailable";

          }

        );

    }


    if (
      attachmentData.type ===
      "video"
    ) {

      const video =
        document.createElement(
          "video"
        );


      video.controls =
        true;

      video.preload =
        "metadata";

      video.playsInline =
        true;


      if (
        attachmentData.thumbnailDataUrl
      ) {

        video.poster =
          attachmentData.thumbnailDataUrl;

      }


      attachment.appendChild(
        video
      );


      getMediaBlob(
        attachmentData.mediaId
      )
        .then(

          blob => {

            if (blob) {

              video.src =
                URL.createObjectURL(
                  blob
                );

            }

          }

        )
        .catch(
          () => {}
        );

    }


    if (
      attachmentData.note
        ?.trim()
    ) {

      const note =
        document.createElement(
          "div"
        );


      note.className =
        "message-attachment-note";


      note.textContent =
        attachmentData.note
          .trim();


      attachment.appendChild(
        note
      );

    }


    bubble.appendChild(
      attachment
    );

  }


  const text =
    message.sender ===
    "character"

      ? getMessageText(
          message
        )

      : (
          message.text ||
          ""
        );


  if (!text) {

    return;

  }


  const textBlock =
    document.createElement(
      "div"
    );


  textBlock.className =
    "message-text";


  if (
    message.sender ===
      "character" ||
    message.sender ===
      "user"
  ) {

    renderRichText(
      textBlock,
      text
    );

  }

  else {

    textBlock.textContent =
      text;

  }


  bubble.appendChild(
    textBlock
  );

}


function createMessageRow(
  message,
  options = {}
) {

  const normalized =
    normalizeMessage(
      message
    );


  const row =
    document.createElement(
      "div"
    );


  row.className =
    `message-row ${normalized.sender}`;


  row.dataset.messageId =
    normalized.id;


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    `message ${normalized.sender}`;


  bubble.dataset.messageId =
    normalized.id;


  renderMessageContent(
    bubble,
    normalized
  );


  if (
    normalized.sender ===
      "character" &&
    normalized.id ===
      recentlyCompletedMessageId
  ) {

    row.classList.add(
      "response-finished-row"
    );


    bubble.classList.add(
      "response-finished"
    );

  }


  row.appendChild(
    bubble
  );


  if (
    normalized.sender ===
      "character" ||
    normalized.sender ===
      "user"
  ) {

    bubble.addEventListener(

      "contextmenu",

      event => {

        openMessageContextMenu(

          event,

          normalized.id

        );

      }

    );

  }


  if (
    normalized.sender ===
      "character" &&
    !options.hideTools
  ) {

    const tools =
      document.createElement(
        "div"
      );


    tools.className =
      "message-tools";


    const left =
      document.createElement(
        "button"
      );


    left.type =
      "button";


    left.className =
      "message-tool-btn";


    left.textContent =
      "←";


    left.title =
      "Previous version";


    const count =
      document.createElement(
        "span"
      );


    count.className =
      "variant-count";


    count.textContent =
      `${normalized.activeVariant + 1}/${normalized.variants.length}`;


    const right =
      document.createElement(
        "button"
      );


    right.type =
      "button";


    right.className =
      "message-tool-btn";


    right.textContent =
      "→";


    right.title =
      "Next version";


    const regenerate =
      document.createElement(
        "button"
      );


    regenerate.type =
      "button";


    regenerate.className =
      "message-tool-btn message-regenerate";


    regenerate.textContent =
      "↻";


    regenerate.title =
      "Generate another version";


    left.disabled =
      isSending ||
      normalized.activeVariant <=
      0;


    right.disabled =
      isSending ||
      normalized.activeVariant >=
      normalized.variants.length -
      1;


    regenerate.disabled =
      isSending;


    left.addEventListener(

      "click",

      () => {

        selectVariant(

          normalized.id,

          normalized.activeVariant -
          1

        );

      }

    );


    right.addEventListener(

      "click",

      () => {

        selectVariant(

          normalized.id,

          normalized.activeVariant +
          1

        );

      }

    );


    regenerate.addEventListener(

      "click",

      () =>
        regenerateMessage(
          normalized.id
        )

    );


    tools.append(

      left,

      count,

      right,

      regenerate

    );


    row.appendChild(
      tools
    );

  }


  return {

    row,

    bubble

  };

}


function renderMessages() {

  messages.innerHTML =
    "";


  const chat =
    getCurrentChat();


  updatePrivateChatUi(
    chat
  );


  if (!chat) {

    return;

  }


  currentChatTitle.textContent =
    chat.title ||
    "New Chat";


  if (
    !chat.messages.length
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "chat-empty";


    if (
      currentCharacter.image
    ) {

      const avatar =
        document.createElement(
          "img"
        );


      avatar.className =
        "chat-empty-avatar";


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


    empty.append(
      title,
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


function scrollToBottom() {

  messages.scrollTop =
    messages.scrollHeight;

}


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
    let index = 0;
    index < 3;
    index += 1
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

  $("typingIndicator")
    ?.remove();

}


async function readAIStream(
  response
) {

  if (
    !response.body
  ) {

    throw new Error(
      "Streaming not supported"
    );

  }


  const reader =
    response.body
      .getReader();


  const decoder =
    new TextDecoder();


  let buffer = "";

  let finalText = "";

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
          "Streaming failed"

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

      // incomplete packet

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


function syncPinsForMessage(
  chat,
  messageId
) {

  const target =
    chat.messages.find(

      message =>
        message.id ===
        messageId

    );


  if (!target) {

    return;

  }


  const memory =
    normalizeMemory(
      chat.memory
    );


  const text =
    getMessageText(
      target
    );


  memory.pinnedMemories =
    memory
      .pinnedMemories
      .map(

        pin =>
          pin.sourceMessageId ===
          messageId

            ? {
                ...pin,
                text
              }

            : pin

      );


  chat.memory =
    memory;

}


function selectVariant(
  messageId,
  newIndex
) {

  if (isSending) {

    return;

  }


  const chat =
    getCurrentChat();


  const message =
    chat
      ?.messages
      .find(

        item =>
          item.id ===
          messageId

      );


  if (
    !message ||
    message.sender !==
    "character"
  ) {

    return;

  }


  const normalized =
    normalizeMessage(
      message
    );


  if (
    newIndex < 0 ||
    newIndex >=
      normalized.variants.length ||
    newIndex ===
      normalized.activeVariant
  ) {

    return;

  }


  updateCurrentChat(

    stored => {

      const target =
        stored.messages.find(

          item =>
            item.id ===
            messageId

        );


      if (!target) {

        return;

      }


      target.activeVariant =
        newIndex;


      target.text =
        target.variants[
          newIndex
        ];


      syncPinsForMessage(
        stored,
        messageId
      );

    }

  );


  renderMessages();


  rebuildMemoryAfterHistoryChange(

    currentCharacter,

    currentChatId

  );

}


function createMemoryPayload(
  memory
) {

  const normalized =
    normalizeMemory(
      memory
    );


  return {

    summary:
      normalized.summary,

    importantFacts:
      normalized.importantFacts,

    currentScene:
      normalized.currentScene,

    relationshipState:
      normalized.relationshipState,

    unresolvedThreads:
      normalized.unresolvedThreads,

    pinnedMemories:
      normalized.pinnedMemories

  };

}


function getActiveMessages(
  chat
) {

  return chat.messages
    .filter(

      message =>
        message.sender !==
        "system"

    )
    .map(

      message => {

        const normalized =
          normalizeMessage(
            message
          );


        return {

          ...normalized,

          text:
            getMessageText(
              normalized
            )

        };

      }

    );

}


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


  let memory =
    normalizeMemory(
      chat.memory
    );


  let activeMessages =
    getActiveMessages(
      chat
    );


  const totalMessages =
    activeMessages.length;


  const processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      totalMessages

    );


  const unprocessed =
    totalMessages -
    processed;


  const fullRebuild =
    memory.needsFullRebuild;


  if (
    !force &&
    !fullRebuild &&
    unprocessed <
      MEMORY_BATCH_THRESHOLD
  ) {

    return;

  }


  if (
    unprocessed <= 0
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
      activeMessages.slice(
        start,
        end
      );


    const memoryBatch =
      batch.map(

        message => ({

          ...message,

          attachment:
            message.attachment

              ? {
                  type:
                    message.attachment.type ||
                    "image",

                  note:
                    message.attachment.note ||
                    "",

                  name:
                    message.attachment.name ||
                    "",

                  duration:
                    message.attachment.duration ||
                    null
                }

              : null

        })

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
                memoryBatch

            })
        }

      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Memory request failed"
      );

    }


    const data =
      await response.json();


    if (
      !data.memory
    ) {

      throw new Error(
        "Empty memory response"
      );

    }


    const latestChatBeforeSave =
      getStoredChat(
        character.id,
        chatId
      );


    if (
      !latestChatBeforeSave ||
      getActiveMessages(
        latestChatBeforeSave
      ).length <
        end
    ) {

      console.log(
        "🧠 Ignored stale memory result after chat history changed."
      );


      return;

    }


    mutateStoredChat(

      character.id,

      chatId,

      stored => {

        const latest =
          normalizeMemory(
            stored.memory
          );


        stored.memory = {

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
            latest
              .pinnedMemories,

          lastProcessedMessageCount:
            Math.max(

              latest
                .lastProcessedMessageCount,

              end

            ),

          updatedAt:
            Date.now(),

          needsFullRebuild:
            latest
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
      currentCharacter?.id ===
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


  activeMessages =
    getActiveMessages(
      chat
    );


  const waiting =
    activeMessages.length -
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


function rebuildMemoryAfterHistoryChange(
  character,
  chatId
) {

  if (
    !character ||
    !chatId
  ) {

    return;

  }


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
    getActiveMessages(

      chat || {
        messages: []
      }

    ).length
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

    item => {

      element.appendChild(

        createMemoryListItem(
          item
        )

      );

    }

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


  const total =
    getActiveMessages(
      chat
    ).length;


  const processed =
    Math.min(

      memory
        .lastProcessedMessageCount,

      total

    );


  memoryCharacterLabel.textContent =
    `${currentCharacter.name} • ${chat.title}`;


  memoryMessageCount.textContent =
    `${processed} / ${total} processed`;


  const hasMemory =
    Boolean(

      memory
        .summary
        .trim() ||

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
        .length ||

      memory
        .pinnedMemories
        .length

    );


  memoryStatusText.textContent =
    memory.needsFullRebuild

      ? "Rebuilding memory..."

      : (
          hasMemory

            ? "Memory active"

            : (
                total >=
                MEMORY_BATCH_THRESHOLD

                  ? "Waiting for memory update"

                  : "Not enough messages yet"
              )
        );


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


  memorySummary.textContent =
    memory
      .summary
      .trim() ||
    "No summary yet.";


  fillMemoryList(

    memoryFacts,

    memory
      .importantFacts,

    "No important memories stored yet."

  );


  memoryScene.textContent =
    memory
      .currentScene
      .trim() ||
    "No current scene stored.";


  memoryRelationship.textContent =
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


  memoryUpdatedAt.textContent =
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


function findCurrentMessage(
  id
) {

  return (

    getCurrentChat()
      ?.messages
      .find(

        message =>
          message.id ===
          id

      ) ||

    null

  );

}


function isMessagePinned(
  chat,
  id
) {

  return normalizeMemory(
    chat.memory
  )
    .pinnedMemories
    .some(

      pin =>
        pin.sourceMessageId ===
        id

    );

}


function setContextMenuForSender(
  sender
) {

  const isCharacter =
    sender ===
    "character";


  ctxRewind
    .classList
    .toggle(

      "hidden",

      !isCharacter

    );


  ctxPin
    .classList
    .toggle(

      "hidden",

      !isCharacter

    );

}


function openMessageContextMenu(
  event,
  id
) {

  event.preventDefault();


  if (isSending) {

    return;

  }


  const chat =
    getCurrentChat();


  const message =
    chat
      ?.messages
      .find(

        item =>
          item.id ===
          id

      );


  if (
    !chat ||
    !message
  ) {

    return;

  }


  contextMessageId =
    id;


  setContextMenuForSender(
    message.sender
  );


  if (
    message.sender ===
    "character"
  ) {

    ctxPinLabel.textContent =
      isMessagePinned(
        chat,
        id
      )

        ? "Unpin Memory"

        : "Pin Memory";

  }


  messageContextMenu
    .classList
    .remove(
      "hidden"
    );


  const rectangle =
    messageContextMenu
      .getBoundingClientRect();


  let x =
    event.clientX;


  let y =
    event.clientY;


  if (
    x +
      rectangle.width >
    window.innerWidth -
      8
  ) {

    x =
      window.innerWidth -
      rectangle.width -
      8;

  }


  if (
    y +
      rectangle.height >
    window.innerHeight -
      8
  ) {

    y =
      window.innerHeight -
      rectangle.height -
      8;

  }


  messageContextMenu
    .style
    .left =
    `${Math.max(
      8,
      x
    )}px`;


  messageContextMenu
    .style
    .top =
    `${Math.max(
      8,
      y
    )}px`;

}


function closeMessageContextMenu() {

  messageContextMenu
    .classList
    .add(
      "hidden"
    );


  contextMessageId =
    null;


  ctxRewind
    .classList
    .remove(
      "hidden"
    );


  ctxPin
    .classList
    .remove(
      "hidden"
    );

}


ctxCopy.addEventListener(

  "click",

  async () => {

    const message =
      findCurrentMessage(
        contextMessageId
      );


    if (!message) {

      closeMessageContextMenu();

      return;

    }


    const text =
      getMessageText(
        message
      );


    try {

      await navigator
        .clipboard
        .writeText(
          text
        );

    }

    catch {

      const area =
        document.createElement(
          "textarea"
        );


      area.value =
        text;


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

      closeMessageContextMenu();

      return;

    }


    const current =
      getMessageText(
        message
      );


    const edited =
      prompt(

        "Edit this message:",

        current

      );


    if (
      edited === null ||
      !edited.trim() ||
      edited.trim() ===
        current
    ) {

      closeMessageContextMenu();

      return;

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


        if (
          target.sender ===
          "character"
        ) {

          const normalized =
            normalizeMessage(
              target
            );


          target.variants[
            normalized.activeVariant
          ] =
            edited.trim();


          target.text =
            edited.trim();


          syncPinsForMessage(
            chat,
            id
          );

        }

        else {

          target.text =
            edited.trim();

        }

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


ctxRewind.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const chat =
      getCurrentChat();


    const message =
      findCurrentMessage(
        id
      );


    if (
      !chat ||
      !message ||
      message.sender !==
        "character"
    ) {

      closeMessageContextMenu();

      return;

    }


    const index =
      chat.messages
        .findIndex(

          item =>
            item.id ===
            id

        );


    if (
      index === -1
    ) {

      closeMessageContextMenu();

      return;

    }


    const count =
      chat.messages.length -
      index -
      1;


    if (
      count > 0 &&
      !confirm(

        `Rewind to this message? ${count} later message${count === 1 ? "" : "s"} will be removed.`

      )
    ) {

      closeMessageContextMenu();

      return;

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


ctxPin.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const message =
      findCurrentMessage(
        id
      );


    if (
      !message ||
      message.sender !==
        "character"
    ) {

      closeMessageContextMenu();

      return;

    }


    updateCurrentChat(

      chat => {

        const memory =
          normalizeMemory(
            chat.memory
          );


        const index =
          memory
            .pinnedMemories
            .findIndex(

              pin =>
                pin.sourceMessageId ===
                id

            );


        if (
          index >= 0
        ) {

          memory
            .pinnedMemories
            .splice(
              index,
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
                getMessageText(
                  message
                ),

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


ctxDelete.addEventListener(

  "click",

  () => {

    const id =
      contextMessageId;


    const chat =
      getCurrentChat();


    const message =
      findCurrentMessage(
        id
      );


    if (
      !chat ||
      !message
    ) {

      closeMessageContextMenu();

      return;

    }


    const label =
      message.sender ===
      "user"

        ? "your message"

        : "this character message";


    if (
      !confirm(
        `Delete ${label}?`
      )
    ) {

      closeMessageContextMenu();

      return;

    }


    deleteMediaForAttachment(
      message.attachment
    );


    updateCurrentChat(

      stored => {

        stored.messages =
          stored.messages.filter(

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

    renderChatHistory();


    rebuildMemoryAfterHistoryChange(

      currentCharacter,

      currentChatId

    );

  }

);


newChatBtn.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();

    toggleNewChatMenu();

  }

);


newNormalChatBtn?.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      !currentCharacter ||
      isSending
    ) {

      return;

    }


    if (
      !confirmAndDiscardPrivateChat()
    ) {

      closeNewChatMenu();

      return;

    }


    closeMemoryViewer();

    closeNewChatMenu();


    createNewChat(

      currentCharacter,

      true

    );

  }

);


newPrivateChatBtn?.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      !currentCharacter ||
      isSending
    ) {

      return;

    }


    if (
      !confirmAndDiscardPrivateChat()
    ) {

      closeNewChatMenu();

      return;

    }


    closeMemoryViewer();

    closeNewChatMenu();


    createPrivateChat(
      currentCharacter
    );

  }

);


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


renameChatBtn.addEventListener(

  "click",

  () => {

    const chat =
      getCurrentChat();


    if (!chat) {

      return;

    }


    const name =
      prompt(

        "Rename this chat:",

        chat.title

      );


    if (
      name?.trim()
    ) {

      updateCurrentChat(

        stored => {

          stored.title =
            name.trim();

        }

      );


      renderMessages();

    }


    closeChatMenu();

  }

);


clearChatBtn.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      isSending ||
      !currentCharacter ||
      !currentChatId
    ) {

      return;

    }


    const characterId =
      currentCharacter.id;


    const chatId =
      currentChatId;


    const chat =
      getStoredChat(
        characterId,
        chatId
      );


    if (!chat) {

      return;

    }


    const confirmed =
      confirm(

        `Clear all messages and memory from "${chat.title}"? The character will stay.`

      );


    if (
      !confirmed
    ) {

      closeChatMenu();

      return;

    }


    if (
      isPrivateChat(
        characterId,
        chatId
      )
    ) {

      chat.messages.forEach(

        message =>
          deleteMediaForAttachment(
            message.attachment
          )

      );


      mutateStoredChat(

        characterId,

        chatId,

        stored => {

          stored.title =
            "New Chat";

          stored.messages =
            [];

          stored.memory =
            createEmptyMemory();

        }

      );


      closeChatMenu();

      closeMemoryViewer();

      renderMessages();

      renderChatHistory();


      messageInput.value =
        "";


      clearPendingAttachment();

      autoGrowMessageInput();

      messageInput.focus();

      return;

    }


    const chats =
      getCharacterChats(
        characterId
      );


    const index =
      chats.findIndex(

        item =>
          item.id ===
          chatId

      );


    if (
      index === -1
    ) {

      return;

    }


    chats[index]
      .messages
      .forEach(

        message =>
          deleteMediaForAttachment(
            message.attachment
          )

      );


    chats[index] = {

      ...chats[index],

      title:
        "New Chat",

      messages:
        [],

      memory:
        createEmptyMemory(),

      updatedAt:
        Date.now()

    };


    saveCharacterChats(
      characterId,
      chats
    );


    localStorage.setItem(

      getActiveChatKey(
        characterId
      ),

      chatId

    );


    closeChatMenu();

    closeMemoryViewer();

    renderMessages();

    renderChatHistory();


    messageInput.value =
      "";


    clearPendingAttachment();


    autoGrowMessageInput();

    messageInput.focus();

  }

);


deleteChatBtn.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      isSending ||
      !currentCharacter ||
      !currentChatId
    ) {

      return;

    }


    const character =
      currentCharacter;


    const deletedChatId =
      currentChatId;


    const chat =
      getStoredChat(
        character.id,
        deletedChatId
      );


    if (!chat) {

      return;

    }


    const confirmed =
      confirm(

        isPrivateChat(
          character.id,
          deletedChatId
        )

          ? "Close this Private Chat? It is not saved, and this conversation will be permanently discarded."

          : `Delete "${chat.title}" permanently?`

      );


    if (
      !confirmed
    ) {

      closeChatMenu();

      return;

    }


    chat.messages.forEach(

      message =>
        deleteMediaForAttachment(
          message.attachment
        )

    );


    if (
      isPrivateChat(
        character.id,
        deletedChatId
      )
    ) {

      discardPrivateChat();

      closeChatMenu();

      closeMemoryViewer();

      clearPendingAttachment();


      const storedChats =
        getCharacterChats(
          character.id
        );


      if (
        storedChats.length
      ) {

        storedChats.sort(

          (a, b) =>
            b.updatedAt -
            a.updatedAt

        );


        openChat(
          character,
          storedChats[0].id
        );

      }

      else {

        currentChatId =
          null;

        currentCharacter =
          null;

        showHomeView();

      }


      renderChatHistory();

      return;

    }


    const remainingChats =
      getCharacterChats(
        character.id
      )
        .filter(

          item =>
            item.id !==
            deletedChatId

        );


    saveCharacterChats(

      character.id,

      remainingChats

    );


    closeChatMenu();

    closeMemoryViewer();

    clearPendingAttachment();


    if (
      remainingChats.length
    ) {

      remainingChats.sort(

        (a, b) =>
          b.updatedAt -
          a.updatedAt

      );


      const nextChat =
        remainingChats[0];


      localStorage.setItem(

        getActiveChatKey(
          character.id
        ),

        nextChat.id

      );


      currentChatId =
        nextChat.id;


      openChat(

        character,

        nextChat.id

      );

    }

    else {

      localStorage.removeItem(

        getActiveChatKey(
          character.id
        )

      );


      currentChatId =
        null;


      currentCharacter =
        null;


      showHomeView();

    }


    renderChatHistory();

  }

);


function saveMessageToChat(
  characterId,
  chatId,
  message
) {

  let savedMessage =
    null;


  mutateStoredChat(

    characterId,

    chatId,

    chat => {

      savedMessage =
        normalizeMessage(
          message
        );


      chat.messages.push(
        savedMessage
      );

    }

  );


  return savedMessage;

}


async function requestCharacterReply(
  character,
  chatId,
  messagesOverride = null
) {

  const chat =
    getStoredChat(
      character.id,
      chatId
    );


  if (!chat) {

    throw new Error(
      "Chat not found"
    );

  }


  const recentMessages =
    (
      messagesOverride ||
      getActiveMessages(
        chat
      )
    )
      .slice(
        -CHAT_RECENT_LIMIT
      );


  const activeMessages =
    [];


  for (
    let index = 0;
    index < recentMessages.length;
    index += 1
  ) {

    const normalized =
      normalizeMessage(
        recentMessages[index]
      );


    const isLatestMessage =
      index ===
      recentMessages.length - 1;


    activeMessages.push({

      ...normalized,

      text:
        getMessageText(
          normalized
        ),

      attachment:
        isLatestMessage
          ? await hydrateAttachmentForApi(
              normalized.attachment
            )
          : null

    });

  }


  if (
    !activeMessages.length
  ) {

    throw new Error(
      "Conversation is empty"
    );

  }


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
              activeMessages,

            memory:
              createMemoryPayload(
                chat.memory
              )

          })
      }

    );


  if (
    !response.ok
  ) {

    let error =
      "Something went wrong.";


    try {

      const data =
        await response.json();


      error =
        data.error ||
        error;

    }

    catch {

      // ignore bad error body

    }


    throw new Error(
      error
    );

  }


  return readAIStream(
    response
  );

}


function setSendingState(
  value
) {

  isSending =
    value;


  messageInput.disabled =
    value;


  sendBtn.disabled =
    value;


  if (newChatBtn) {

    newChatBtn.disabled =
      value;

  }


  if (newNormalChatBtn) {

    newNormalChatBtn.disabled =
      value;

  }


  if (newPrivateChatBtn) {

    newPrivateChatBtn.disabled =
      value;

  }


  if (value) {

    closeNewChatMenu();

  }


  if (mediaMenuBtn) {

    mediaMenuBtn.disabled =
      value;

  }


  for (
    const input of [
      imageInput,
      audioInput,
      videoInput
    ]
  ) {

    if (input) {

      input.disabled =
        value;

    }

  }


  if (attachmentNote) {

    attachmentNote.disabled =
      value;

  }


  if (removeAttachmentBtn) {

    removeAttachmentBtn.disabled =
      value;

  }


  if (value) {

    closeMediaAttachMenu();

  }


  document
    .querySelectorAll(
      ".message-tool-btn"
    )
    .forEach(

      button => {

        if (value) {

          button.disabled =
            true;

        }

      }

    );

}


function autoGrowMessageInput() {

  messageInput.style.height =
    "auto";


  const height =
    Math.min(

      messageInput.scrollHeight,

      180

    );


  messageInput.style.height =
    `${height}px`;


  messageInput.style.overflowY =
    messageInput.scrollHeight >
    180

      ? "auto"

      : "hidden";

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
      !event.shiftKey &&
      !event.isComposing
    ) {

      event.preventDefault();


      if (
        !isSending &&
        (
          messageInput
            .value
            .trim() ||
          pendingAttachment
        )
      ) {

        chatForm.requestSubmit();

      }

    }

  }

);


function addSystemMessage(
  text
) {

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
    text;


  row.appendChild(
    bubble
  );


  messages.appendChild(
    row
  );


  scrollToBottom();

}


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


    const note =
      attachmentNote
        ?.value
        ?.trim() ||
      "";


    if (
      !text &&
      !pendingAttachment
    ) {

      return;

    }


    const attachment =
      pendingAttachment

        ? {
            ...pendingAttachment,
            note
          }

        : null;


    const character = {
      ...currentCharacter
    };


    const chatId =
      currentChatId;


    mutateStoredChat(

      character.id,

      chatId,

      chat => {

        chat.messages.push(

          normalizeMessage({

            sender:
              "user",

            text,

            attachment,

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
              text ||
              note ||
              "Media reference"
            );

        }

      }

    );


    messageInput.value =
      "";


    clearPendingAttachment({
      deleteStored:
        false
    });


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
          reply,

        row:
          temporaryRow
      } =
        await requestCharacterReply(

          character,

          chatId

        );


      removeTypingIndicator();


      if (!reply) {

        throw new Error(
          "Empty response"
        );

      }


      temporaryRow
        ?.remove();


      const savedReply =
        saveMessageToChat(

          character.id,

          chatId,

          {
            sender:
              "character",

            text:
              reply,

            variants: [
              reply
            ],

            activeVariant:
              0,

            time:
              Date.now()
          }

        );


      recentlyCompletedMessageId =
        savedReply?.id ||
        null;


      renderMessages();


      recentlyCompletedMessageId =
        null;


      renderChatHistory();


      updateMemoryForChat(

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
        "Chat error:",
        error
      );


      addSystemMessage(
        "Could not generate a response right now."
      );

    }

    finally {

      setSendingState(
        false
      );


      renderMessages();

      messageInput.focus();

    }

  }

);


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
    laterCount > 0 &&
    !confirm(

      `Generate a new version here? ${laterCount} later message${laterCount === 1 ? "" : "s"} will be removed after the new version succeeds.`

    )
  ) {

    return;

  }


  const requestHistory =
    chat.messages
      .slice(
        0,
        index
      )
      .map(
        normalizeMessage
      );


  if (
    !requestHistory.length
  ) {

    alert(
      "There is no user message before this response."
    );


    return;

  }


  setSendingState(
    true
  );


  showTypingIndicator();


  try {

    const {
      text:
        reply,

      row:
        temporaryRow
    } =
      await requestCharacterReply(

        character,

        chatId,

        requestHistory

      );


    removeTypingIndicator();


    if (!reply) {

      throw new Error(
        "Empty response"
      );

    }


    temporaryRow
      ?.remove();


    mutateStoredChat(

      character.id,

      chatId,

      stored => {

        const target =
          stored.messages.find(

            message =>
              message.id ===
              messageId

          );


        if (!target) {

          return;

        }


        const normalized =
          normalizeMessage(
            target
          );


        target.variants = [

          ...normalized.variants,

          reply

        ];


        target.activeVariant =
          target.variants.length -
          1;


        target.text =
          reply;


        if (
          laterCount > 0
        ) {

          const targetIndex =
            stored.messages
              .findIndex(

                message =>
                  message.id ===
                  messageId

              );


          stored.messages =
            stored.messages.slice(

              0,

              targetIndex + 1

            );


          removePinsForMissingMessages(
            stored
          );

        }


        syncPinsForMessage(

          stored,

          messageId

        );

      }

    );


    recentlyCompletedMessageId =
      messageId;


    renderMessages();


    recentlyCompletedMessageId =
      null;


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


    addSystemMessage(
      "Could not regenerate the response right now."
    );

  }

  finally {

    setSendingState(
      false
    );


    renderMessages();

    messageInput.focus();

  }

}


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
        "#newChatMenuWrapper"
      )
    ) {

      closeNewChatMenu();

    }


    if (
      !event.target.closest(
        "#mediaMenuWrapper"
      )
    ) {

      closeMediaAttachMenu();

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

      closeNewChatMenu();

      closeMessageContextMenu();

      closeMediaAttachMenu();

    }

  }

);


autoGrowMessageInput();

saveCharacters();

renderCharacters();

renderChatHistory();