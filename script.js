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
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;
const MEDIA_DB_NAME = "chatiMediaDB";
const MEDIA_DB_STORE = "media";

const $ = (id) => document.getElementById(id);

const homeView = $("homeView");
const createView = $("createView");
const groupCreateView = $("groupCreateView");
const chatView = $("chatView");
const chatBackground = $("chatBackground");

const createBtn = $("createBtn");
const mainCreateBtn = $("mainCreateBtn");
const homeCreateGroupBtn = $("homeCreateGroupBtn");

const createChoiceModal = $("createChoiceModal");
const createChoiceOverlay = $("createChoiceOverlay");
const closeCreateChoiceBtn = $("closeCreateChoiceBtn");
const chooseCharacterBtn = $("chooseCharacterBtn");
const chooseGroupBtn = $("chooseGroupBtn");
const chooseGroupHint = $("chooseGroupHint");
const chatsBtn = $("chatsBtn");
const backBtn = $("backBtn");
const settingsBtn = $("settingsBtn");

const settingsModal = $("settingsModal");
const settingsOverlay = $("settingsOverlay");
const closeSettingsBtn = $("closeSettingsBtn");
const settingsDoneBtn = $("settingsDoneBtn");
const settingsEditCurrentBtn = $("settingsEditCurrentBtn");
const settingsEditCurrentLabel = $("settingsEditCurrentLabel");
const roleplayLevelStatus = $("roleplayLevelStatus");
const roleplayLevelButtons =
  [
    ...document.querySelectorAll(
      "[data-roleplay-level]"
    )
  ];

const sidebar = $("sidebar");
const sidebarBrandBtn = $("sidebarBrandBtn");
const sidebarCollapseBtn = $("sidebarCollapseBtn");
const sidebarSearch = $("sidebarSearch");
const sidebarSearchInput = $("sidebarSearchInput");
const sidebarSearchClear = $("sidebarSearchClear");
const sidebarPrivateIndicator = $("sidebarPrivateIndicator");
const sidebarPrivateTitle = $("sidebarPrivateTitle");
const sidebarPrivateSubtitle = $("sidebarPrivateSubtitle");
const chatHistoryCount = $("chatHistoryCount");

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
const characterPhysicalAppearance = $("characterPhysicalAppearance");
const characterDefaultOutfit = $("characterDefaultOutfit");
const characterStartingOutfit = $("characterStartingOutfit");
const characterAccessories = $("characterAccessories");
const characterMaintainVisualContinuity = $("characterMaintainVisualContinuity");

const characterAvatarPreview = $("characterAvatarPreview");
const characterAvatarPlaceholder = $("characterAvatarPlaceholder");
const backgroundPreview = $("backgroundPreview");
const pronounPicker = $("pronounPicker");

const exampleMessagesList = $("exampleMessagesList");
const addExampleBtn = $("addExampleBtn");

const characterHasPowers = $("characterHasPowers");
const powersFields = $("powersFields");

const groupForm = $("groupForm");
const groupFormTitle = $("groupFormTitle");
const groupFormSubtitle = $("groupFormSubtitle");
const groupBackBtn = $("groupBackBtn");
const cancelGroupBtn = $("cancelGroupBtn");
const saveGroupBtn = $("saveGroupBtn");
const groupName = $("groupName");
const groupBackground = $("groupBackground");
const groupBackgroundPreview = $("groupBackgroundPreview");
const groupMembersGrid = $("groupMembersGrid");
const groupMemberCount = $("groupMemberCount");
const characterPowerSystem = $("characterPowerSystem");
const characterCombatStyle = $("characterCombatStyle");
const characterAbilities = $("characterAbilities");
const characterPowerLimits = $("characterPowerLimits");

const charactersGrid = $("charactersGrid");
const groupsSection = $("groupsSection");
const groupsGrid = $("groupsGrid");
const emptyState = $("emptyState");
const emptyStateTitle = $("emptyStateTitle");
const emptyStateText = $("emptyStateText");
const chatHistoryList = $("chatHistoryList");

const chatBackBtn = $("chatBackBtn");
const chatCharacterImage = $("chatCharacterImage");
const chatGroupAvatar = $("chatGroupAvatar");
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
const privateChatOptionTitle = $("privateChatOptionTitle");
const privateChatOptionSubtitle = $("privateChatOptionSubtitle");
const privateChatBadge = $("privateChatBadge");
const privateChatBadgeLabel = $("privateChatBadgeLabel");
const privateChatBadgeSubtitle = $("privateChatBadgeSubtitle");
const groupResponderBar = $("groupResponderBar");
const groupResponderOptions = $("groupResponderOptions");

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
const deleteEntityBtn = $("deleteEntityBtn");
const deleteEntityLabel = $("deleteEntityLabel");

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
const memoryAppearance = $("memoryAppearance");
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


const SIDEBAR_COLLAPSED_KEY =
  "chatiSidebarCollapsed";

const ROLEPLAY_LEVEL_KEY =
  "chatiRoleplayLevel";

const ROLEPLAY_LEVEL_LABELS = {
  regular:
    "Regular",
  advanced:
    "Advanced",
  superAdvanced:
    "Super Advanced"
};

let roleplayLevel =
  loadRoleplayLevel();

let sidebarSearchQuery = "";


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
let editingGroupId = null;
let selectedGroupMemberIds = new Set();
let currentGroupResponderId = null;

let pendingAttachment = null;
let pendingPreviewObjectUrl = null;

/* Used only to animate the AI message that has just finished generating. */
let recentlyCompletedMessageId = null;

/* Used only to animate the newest user message without replaying old messages. */
let recentlyAddedMessageId = null;

/* Private Chat and Private Group Chat live only in this page's JavaScript memory. */
let temporaryPrivateChat = null;

/* Audio/video for private sessions never enters IndexedDB. */
const privateMediaStore = new Map();


const memoryUpdateLocks =
  new Set();


function normalizeRoleplayLevel(
  value
) {

  return [
    "regular",
    "advanced",
    "superAdvanced"
  ].includes(
    value
  )
    ? value
    : "advanced";

}


function loadRoleplayLevel() {

  try {

    return normalizeRoleplayLevel(
      localStorage.getItem(
        ROLEPLAY_LEVEL_KEY
      )
    );

  }

  catch {

    return "advanced";

  }

}


function saveRoleplayLevel(
  value
) {

  roleplayLevel =
    normalizeRoleplayLevel(
      value
    );


  try {

    localStorage.setItem(
      ROLEPLAY_LEVEL_KEY,
      roleplayLevel
    );

  }

  catch (
    error
  ) {

    console.warn(
      "Could not save roleplay level:",
      error
    );

  }


  renderRoleplayLevelSettings();

}


function renderRoleplayLevelSettings() {

  const normalized =
    normalizeRoleplayLevel(
      roleplayLevel
    );


  if (
    roleplayLevelStatus
  ) {

    roleplayLevelStatus.textContent =
      ROLEPLAY_LEVEL_LABELS[
        normalized
      ];

  }


  roleplayLevelButtons
    .forEach(
      button => {

        const selected =
          button.dataset
            .roleplayLevel ===
          normalized;


        button
          .classList
          .toggle(
            "is-selected",
            selected
          );


        button
          .setAttribute(
            "aria-checked",
            selected
              ? "true"
              : "false"
          );

      }
    );

}


function getSidebarCollapsedPreference() {

  const saved =
    localStorage.getItem(
      SIDEBAR_COLLAPSED_KEY
    );


  if (saved === "true") {

    return true;

  }


  if (saved === "false") {

    return false;

  }


  return window.matchMedia(
    "(max-width: 700px)"
  ).matches;

}


function setSidebarCollapsed(
  collapsed,
  { persist = true } = {}
) {

  if (!sidebar) {

    return;

  }


  sidebar
    .classList
    .toggle(
      "is-collapsed",
      collapsed
    );


  sidebarCollapseBtn
    ?.setAttribute(
      "aria-expanded",
      collapsed
        ? "false"
        : "true"
    );


  sidebarCollapseBtn
    ?.setAttribute(
      "aria-label",
      collapsed
        ? "Expand sidebar"
        : "Collapse sidebar"
    );


  sidebarCollapseBtn
    ?.setAttribute(
      "data-tooltip",
      collapsed
        ? "Expand sidebar"
        : "Collapse sidebar"
    );


  if (persist) {

    localStorage.setItem(
      SIDEBAR_COLLAPSED_KEY,
      collapsed
        ? "true"
        : "false"
    );

  }

}


function setSidebarViewState(
  view
) {

  chatsBtn
    ?.classList
    .toggle(
      "active",
      view === "chats"
    );


  createBtn
    ?.classList
    .toggle(
      "active",
      view === "create"
    );

}


function updateSidebarSearchClear() {

  sidebarSearchClear
    ?.classList
    .toggle(
      "hidden",
      !sidebarSearchQuery
    );


  sidebarSearch
    ?.classList
    .toggle(
      "has-query",
      Boolean(
        sidebarSearchQuery
      )
    );

}


function clearSidebarSearch() {

  sidebarSearchQuery = "";


  if (sidebarSearchInput) {

    sidebarSearchInput.value = "";

  }


  updateSidebarSearchClear();
  renderCharacters();
  renderChatHistory();

}


function updateSidebarPrivateStatus(
  active,
  isGroup = false
) {

  sidebarPrivateIndicator
    ?.classList
    .toggle(
      "hidden",
      !active
    );


  if (sidebarPrivateTitle) {

    sidebarPrivateTitle.textContent =
      isGroup
        ? "Private group session"
        : "Private session";

  }


  if (sidebarPrivateSubtitle) {

    sidebarPrivateSubtitle.textContent =
      "Not saved";

  }


  if (sidebarPrivateIndicator) {

    sidebarPrivateIndicator.dataset.tooltip =
      isGroup
        ? "Private group session"
        : "Private session";

  }


  sidebar
    ?.classList
    .toggle(
      "has-private-session",
      Boolean(active)
    );

}



function isGroupCharacter(
  value
) {

  return Boolean(
    value?.isGroup
  );

}


function getStandaloneCharacters() {

  return characters.filter(
    item =>
      !isGroupCharacter(item)
  );

}


function getGroups() {

  return characters.filter(
    isGroupCharacter
  );

}


function getCharacterById(
  characterId
) {

  return characters.find(
    item =>
      !isGroupCharacter(item) &&
      String(item.id) ===
        String(characterId)
  ) || null;

}


function getGroupMembers(
  group
) {

  if (
    !isGroupCharacter(group) ||
    !Array.isArray(group.memberIds)
  ) {

    return [];

  }


  return group.memberIds
    .map(
      getCharacterById
    )
    .filter(Boolean);

}


function getGroupResponderKey(
  groupId
) {

  return `chatiGroupResponder_${groupId}`;

}


function getInitials(
  name,
  fallback = "C"
) {

  const clean =
    String(name || "")
      .trim();


  if (!clean) {

    return fallback;

  }


  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();

}


function createAvatarChip(
  character,
  extraClass = ""
) {

  const chip =
    document.createElement(
      "span"
    );


  chip.className =
    `group-avatar-chip ${extraClass}`
      .trim();


  if (character?.image) {

    const image =
      document.createElement(
        "img"
      );


    image.src =
      character.image;


    image.alt = "";


    chip.appendChild(
      image
    );

  }

  else {

    chip.textContent =
      getInitials(
        character?.name
      );

  }


  return chip;

}


function fillAvatarStack(
  container,
  members,
  limit = 3
) {

  if (!container) {

    return;

  }


  container.innerHTML = "";


  members
    .slice(0, limit)
    .forEach(
      member =>
        container.appendChild(
          createAvatarChip(
            member
          )
        )
    );


  if (
    members.length > limit
  ) {

    const more =
      document.createElement(
        "span"
      );


    more.className =
      "group-avatar-chip group-avatar-more";


    more.textContent =
      `+${members.length - limit}`;


    container.appendChild(
      more
    );

  }

}


function getSelectedGroupResponder() {

  if (
    !isGroupCharacter(
      currentCharacter
    )
  ) {

    return null;

  }


  const members =
    getGroupMembers(
      currentCharacter
    );


  let selected =
    members.find(
      member =>
        String(member.id) ===
          String(currentGroupResponderId)
    );


  if (!selected) {

    selected =
      members[0] ||
      null;


    currentGroupResponderId =
      selected?.id ||
      null;

  }


  return selected;

}


function getMessageSpeaker(
  message
) {

  if (
    message?.sender !== "character"
  ) {

    return null;

  }


  if (
    isGroupCharacter(
      currentCharacter
    )
  ) {

    return (
      getCharacterById(
        message.characterId
      ) ||
      {
        id:
          message.characterId ||
          "unknown",
        name:
          message.characterName ||
          "Character",
        image: ""
      }
    );

  }


  return currentCharacter;

}


function buildGroupContextInstructions(
  responder,
  group
) {

  const members =
    getGroupMembers(
      group
    );


  const roster =
    members
      .map(

        member => {

          const appearance =
            normalizeAppearanceProfile(
              member.appearance
            );

          const visual = [
            appearance.physical
              ? `appearance: ${appearance.physical}`
              : "",
            (
              appearance.startingOutfit ||
              appearance.defaultOutfit
            )
              ? `base outfit: ${appearance.startingOutfit || appearance.defaultOutfit}`
              : "",
            appearance.accessories
              ? `accessories/equipment: ${appearance.accessories}`
              : ""
          ]
            .filter(Boolean)
            .join("; ");


          return (
            `- ${member.name}` +
            (visual
              ? ` — ${visual}`
              : "")
          );

        }

      )
      .join("\n");


  return `
GROUP CHAT CONTEXT

You are currently inside the shared group conversation "${group.name}".

Participants:
${roster || "No participants listed."}

You are responding ONLY as ${responder.name}.
Do not write dialogue, actions, thoughts, or decisions for the other group characters unless the user's latest message explicitly asks for a brief description of something they can directly observe.
Treat prior assistant messages prefixed with another participant's name as things that participant already said or did in the shared scene.
Maintain the same shared timeline, location, relationships, injuries, objects, and events across all participants.
`.trim();

}


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


function normalizeAppearanceProfile(
  value
) {

  const appearance =
    value &&
    typeof value ===
      "object"
      ? value
      : {};


  return {

    physical:
      typeof appearance.physical ===
      "string"
        ? appearance.physical
        : "",

    defaultOutfit:
      typeof appearance.defaultOutfit ===
      "string"
        ? appearance.defaultOutfit
        : "",

    startingOutfit:
      typeof appearance.startingOutfit ===
      "string"
        ? appearance.startingOutfit
        : "",

    accessories:
      typeof appearance.accessories ===
      "string"
        ? appearance.accessories
        : "",

    maintainContinuity:
      appearance.maintainContinuity !==
        false

  };

}


function createInitialCurrentAppearance(
  ownerCharacter = null
) {

  if (!ownerCharacter) {

    return {
      characters: []
    };

  }


  const participants =
    isGroupCharacter(
      ownerCharacter
    )
      ? getGroupMembers(
          ownerCharacter
        )
      : [ownerCharacter];


  return {

    characters:
      participants
        .filter(Boolean)
        .map(

          participant => {

            const appearance =
              normalizeAppearanceProfile(
                participant.appearance
              );


            return {

              characterId:
                String(
                  participant.id ??
                  ""
                ),

              characterName:
                participant.name ||
                "Character",

              outfit:
                appearance.startingOutfit ||
                appearance.defaultOutfit ||
                "",

              condition:
                "",

              accessories:
                appearance.accessories ||
                "",

              temporaryChanges:
                []

            };

          }

        )

  };

}


function normalizeCurrentAppearance(
  value
) {

  const entries =
    Array.isArray(
      value?.characters
    )
      ? value.characters
      : [];


  return {

    characters:
      entries
        .map(

          item => {

            if (
              !item ||
              typeof item !==
                "object"
            ) {

              return null;

            }


            return {

              characterId:
                String(
                  item.characterId ??
                  ""
                ),

              characterName:
                typeof item.characterName ===
                "string"
                  ? item.characterName
                  : "Character",

              outfit:
                typeof item.outfit ===
                "string"
                  ? item.outfit
                  : "",

              condition:
                typeof item.condition ===
                "string"
                  ? item.condition
                  : "",

              accessories:
                typeof item.accessories ===
                "string"
                  ? item.accessories
                  : "",

              temporaryChanges:
                Array.isArray(
                  item.temporaryChanges
                )
                  ? item
                      .temporaryChanges
                      .filter(
                        change =>
                          typeof change ===
                          "string"
                      )
                  : []

            };

          }

        )
        .filter(Boolean)

  };

}


function createEmptyMemory(
  ownerCharacter = null
) {

  return {

    summary: "",

    importantFacts: [],

    currentScene: "",

    currentAppearance:
      createInitialCurrentAppearance(
        ownerCharacter
      ),

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


    currentAppearance:
      normalizeCurrentAppearance(
        memory.currentAppearance
      ),


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

    appearance:
      normalizeAppearanceProfile(
        character?.appearance
      ),

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

    isGroup:
      Boolean(
        character?.isGroup
      ),

    memberIds:
      Array.isArray(
        character?.memberIds
      )
        ? character.memberIds
            .map(String)
        : [],

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


  const discardedOwnerId =
    temporaryPrivateChat.characterId;


  const discardedOwner =
    characters.find(
      item =>
        String(item.id) ===
          String(discardedOwnerId)
    );


  temporaryPrivateChat =
    null;


  if (
    isGroupCharacter(
      discardedOwner
    )
  ) {

    const savedResponderId =
      localStorage.getItem(
        getGroupResponderKey(
          discardedOwner.id
        )
      );


    currentGroupResponderId =
      savedResponderId ||
      null;

  }


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


  const privateLabel =
    isGroupCharacter(
      currentCharacter
    )
      ? "Private Group Chat"
      : "Private Chat";


  if (
    privateChatHasUnsavedContent() &&
    !confirm(
      `This ${privateLabel} is not saved. Leaving it will permanently discard this conversation. Continue?`
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
    characterId = null,
    ownerCharacter = null
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
      createEmptyMemory(
        ownerCharacter
      ),

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
    buildNewChat({
      ownerCharacter:
        character
    });


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
        character.id,
      ownerCharacter:
        character
    });


  if (
    isGroupCharacter(
      character
    )
  ) {

    const members =
      getGroupMembers(
        character
      );


    const savedResponderId =
      localStorage.getItem(
        getGroupResponderKey(
          character.id
        )
      );


    const savedResponder =
      members.find(
        member =>
          String(member.id) ===
            String(savedResponderId)
      );


    currentGroupResponderId =
      savedResponder?.id ||
      members[0]?.id ||
      null;

  }


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


  if (
    characterMaintainVisualContinuity
  ) {

    characterMaintainVisualContinuity.checked =
      true;

  }


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


  characterPhysicalAppearance.value =
    normalized.appearance.physical;


  characterDefaultOutfit.value =
    normalized.appearance.defaultOutfit;


  characterStartingOutfit.value =
    normalized.appearance.startingOutfit;


  characterAccessories.value =
    normalized.appearance.accessories;


  characterMaintainVisualContinuity.checked =
    normalized.appearance.maintainContinuity;


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


  const groupPrivate =
    Boolean(
      active &&
      isGroupCharacter(
        currentCharacter
      )
    );


  privateChatBadge
    ?.classList
    .toggle(
      "hidden",
      !active
    );


  if (privateChatBadgeLabel) {

    privateChatBadgeLabel.textContent =
      groupPrivate
        ? "Private Group"
        : "Private";

  }


  if (privateChatBadgeSubtitle) {

    privateChatBadgeSubtitle.textContent =
      "Not saved";

  }


  if (privateChatBadge) {

    privateChatBadge.title =
      groupPrivate
        ? "This group chat is temporary and is not saved in browser storage."
        : "This chat is temporary and is not saved in browser storage.";

  }


  chatView
    ?.classList
    .toggle(
      "private-chat-active",
      active
    );


  chatView
    ?.classList
    .toggle(
      "private-group-chat-active",
      groupPrivate
    );


  updateSidebarPrivateStatus(
    active,
    groupPrivate
  );

}


function closeSettings() {

  settingsModal
    ?.classList
    .add(
      "hidden"
    );


  settingsModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

}


function updateSettingsCurrentEditor() {

  if (
    !settingsEditCurrentBtn ||
    !settingsEditCurrentLabel
  ) {

    return;

  }


  if (
    !currentCharacter
  ) {

    settingsEditCurrentBtn
      .classList
      .add(
        "hidden"
      );


    return;

  }


  settingsEditCurrentBtn
    .classList
    .remove(
      "hidden"
    );


  settingsEditCurrentLabel.textContent =
    isGroupCharacter(
      currentCharacter
    )
      ? "Edit current group"
      : "Edit current character";

}


function openSettings() {

  if (
    isSending
  ) {

    return;

  }


  closeCreateChoice();
  closeMemoryViewer();
  closeAllFloatingUi();


  renderRoleplayLevelSettings();
  updateSettingsCurrentEditor();


  settingsModal
    ?.classList
    .remove(
      "hidden"
    );


  settingsModal
    ?.setAttribute(
      "aria-hidden",
      "false"
    );

}


function closeAllFloatingUi() {

  closeChatMenu();

  closeNewChatMenu();

  closeMessageContextMenu();

  closeMediaAttachMenu();

}



function closeCreateChoice() {

  createChoiceModal
    ?.classList
    .add(
      "hidden"
    );


  createChoiceModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

}


function openCreateChoice() {

  if (isSending) {

    return;

  }


  const available =
    getStandaloneCharacters();


  const canCreateGroup =
    available.length >= 2;


  if (chooseGroupBtn) {

    chooseGroupBtn.disabled =
      !canCreateGroup;

  }


  if (chooseGroupHint) {

    chooseGroupHint.textContent =
      canCreateGroup
        ? "Chat with multiple existing characters."
        : "Create at least two characters first.";

  }


  createChoiceModal
    ?.classList
    .remove(
      "hidden"
    );


  createChoiceModal
    ?.setAttribute(
      "aria-hidden",
      "false"
    );

}


function updateGroupBackgroundPreview() {

  const url =
    groupBackground
      ?.value
      ?.trim() ||
    "";


  if (!groupBackgroundPreview) {

    return;

  }


  if (url) {

    groupBackgroundPreview.style.backgroundImage =
      `url("${url.replace(/"/g, '\\"')}")`;


    groupBackgroundPreview
      .classList
      .add(
        "has-image"
      );

  }

  else {

    groupBackgroundPreview.style.backgroundImage =
      "none";


    groupBackgroundPreview
      .classList
      .remove(
        "has-image"
      );

  }

}


function updateGroupMemberCount() {

  if (!groupMemberCount) {

    return;

  }


  const count =
    selectedGroupMemberIds.size;


  groupMemberCount.textContent =
    `${count} selected`;

}


function renderGroupMemberChoices() {

  if (!groupMembersGrid) {

    return;

  }


  groupMembersGrid.innerHTML =
    "";


  const available =
    getStandaloneCharacters();


  available.forEach(

    character => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "group-member-option";


      const selected =
        selectedGroupMemberIds.has(
          String(character.id)
        );


      button.classList.toggle(
        "selected",
        selected
      );


      button.setAttribute(
        "aria-pressed",
        selected
          ? "true"
          : "false"
      );


      const avatar =
        document.createElement(
          "span"
        );


      avatar.className =
        "group-member-avatar";


      if (character.image) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          character.image;


        image.alt =
          "";


        avatar.appendChild(
          image
        );

      }

      else {

        avatar.textContent =
          getInitials(
            character.name
          );

      }


      const copy =
        document.createElement(
          "span"
        );


      copy.className =
        "group-member-copy";


      const name =
        document.createElement(
          "strong"
        );


      name.textContent =
        character.name;


      const bio =
        document.createElement(
          "small"
        );


      bio.textContent =
        character.bio ||
        "AI Character";


      copy.append(
        name,
        bio
      );


      const check =
        document.createElement(
          "span"
        );


      check.className =
        "group-member-check";


      check.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-9"></path></svg>';


      button.append(
        avatar,
        copy,
        check
      );


      button.addEventListener(

        "click",

        () => {

          const key =
            String(
              character.id
            );


          if (
            selectedGroupMemberIds.has(
              key
            )
          ) {

            selectedGroupMemberIds.delete(
              key
            );

          }

          else {

            selectedGroupMemberIds.add(
              key
            );

          }


          renderGroupMemberChoices();
          updateGroupMemberCount();

        }

      );


      groupMembersGrid.appendChild(
        button
      );

    }

  );


  updateGroupMemberCount();

}


function showGroupCreateView(
  groupToEdit = null
) {

  if (isSending) {

    return;

  }


  const available =
    getStandaloneCharacters();


  if (
    available.length < 2 &&
    !groupToEdit
  ) {

    alert(
      "Create at least two characters before making a group."
    );


    return;

  }


  closeCreateChoice();
  closeMemoryViewer();
  closeAllFloatingUi();
  setSidebarViewState(
    "create"
  );


  editingGroupId =
    groupToEdit?.id ||
    null;


  editingCharacterId =
    null;


  selectedGroupMemberIds =
    new Set(
      Array.isArray(
        groupToEdit?.memberIds
      )
        ? groupToEdit.memberIds
            .map(String)
        : []
    );


  groupName.value =
    groupToEdit?.name ||
    "";


  groupBackground.value =
    groupToEdit?.background ||
    "";


  groupFormTitle.textContent =
    groupToEdit
      ? `Edit ${groupToEdit.name}`
      : "Create Group";


  groupFormSubtitle.textContent =
    groupToEdit
      ? "Change this group without deleting its chats or shared memory."
      : "Bring your existing characters into one shared conversation.";


  saveGroupBtn.textContent =
    groupToEdit
      ? "Save Changes"
      : "Create Group";


  updateGroupBackgroundPreview();
  renderGroupMemberChoices();


  homeView.classList.add(
    "hidden"
  );


  createView.classList.add(
    "hidden"
  );


  chatView.classList.add(
    "hidden"
  );


  groupCreateView.classList.remove(
    "hidden"
  );


  document
    .querySelector(
      ".main-content"
    )
    .scrollTop = 0;

}


function renderGroupResponderBar() {

  if (
    !groupResponderBar ||
    !groupResponderOptions
  ) {

    return;

  }


  const isGroup =
    isGroupCharacter(
      currentCharacter
    );


  groupResponderBar
    .classList
    .toggle(
      "hidden",
      !isGroup
    );


  groupResponderOptions.innerHTML =
    "";


  if (!isGroup) {

    currentGroupResponderId =
      null;


    return;

  }


  const members =
    getGroupMembers(
      currentCharacter
    );


  const saved =
    localStorage.getItem(
      getGroupResponderKey(
        currentCharacter.id
      )
    );


  const currentResponderIsValid =
    members.some(
      member =>
        String(member.id) ===
          String(currentGroupResponderId)
    );


  const savedResponderIsValid =
    members.some(
      member =>
        String(member.id) ===
          String(saved)
    );


  if (
    !isCurrentChatPrivate() &&
    savedResponderIsValid
  ) {

    currentGroupResponderId =
      saved;

  }

  else if (
    isCurrentChatPrivate() &&
    !currentResponderIsValid &&
    savedResponderIsValid
  ) {

    currentGroupResponderId =
      saved;

  }


  const selected =
    getSelectedGroupResponder();


  if (selected) {

    currentGroupResponderId =
      selected.id;

  }


  members.forEach(

    member => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "group-responder-option";


      button.classList.toggle(
        "active",
        String(member.id) ===
          String(currentGroupResponderId)
      );


      button.disabled =
        isSending;


      button.title =
        `Have ${member.name} respond`;


      const avatar =
        document.createElement(
          "span"
        );


      avatar.className =
        "group-responder-avatar";


      if (member.image) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          member.image;


        image.alt =
          "";


        avatar.appendChild(
          image
        );

      }

      else {

        avatar.textContent =
          getInitials(
            member.name
          );

      }


      const name =
        document.createElement(
          "span"
        );


      name.className =
        "group-responder-name";


      name.textContent =
        member.name;


      button.append(
        avatar,
        name
      );


      button.addEventListener(

        "click",

        () => {

          currentGroupResponderId =
            member.id;


          if (
            !isCurrentChatPrivate()
          ) {

            localStorage.setItem(
              getGroupResponderKey(
                currentCharacter.id
              ),
              String(member.id)
            );

          }


          renderGroupResponderBar();

        }

      );


      groupResponderOptions.appendChild(
        button
      );

    }

  );

}


function updateGroupChatUi() {

  const active =
    isGroupCharacter(
      currentCharacter
    );


  if (newPrivateChatBtn) {

    newPrivateChatBtn
      .classList
      .remove(
        "hidden"
      );

  }


  if (privateChatOptionTitle) {

    privateChatOptionTitle.textContent =
      active
        ? "Private Group Chat"
        : "Private Chat";

  }


  if (privateChatOptionSubtitle) {

    privateChatOptionSubtitle.textContent =
      active
        ? "Shared session · not saved"
        : "Not saved on this device";

  }


  if (editCharacterMenuBtn) {

    editCharacterMenuBtn.textContent =
      active
        ? "Edit Group"
        : "Edit Character";

  }


  if (deleteEntityLabel) {

    deleteEntityLabel.textContent =
      active
        ? "Delete Group"
        : "Delete Character";

  }


  if (deleteEntityBtn) {

    deleteEntityBtn.setAttribute(
      "aria-label",
      active
        ? "Delete group"
        : "Delete character"
    );

  }


  renderGroupResponderBar();

}


function showCreateView(
  characterToEdit = null
) {

  if (isSending) {

    return;

  }


  closeCreateChoice();
  closeMemoryViewer();

  closeAllFloatingUi();

  setSidebarViewState(
    "create"
  );


  editingGroupId =
    null;


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


  groupCreateView
    ?.classList
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

  setSidebarViewState(
    "chats"
  );


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


  groupCreateView
    ?.classList
    .add(
      "hidden"
    );


  chatView
    .classList
    .add(
      "hidden"
    );


  renderCharacters();
  renderGroups();

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


sidebarCollapseBtn?.addEventListener(

  "click",

  () => {

    const collapsed =
      sidebar
        ?.classList
        .contains(
          "is-collapsed"
        );


    setSidebarCollapsed(
      !collapsed
    );

  }

);


sidebarBrandBtn?.addEventListener(

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


sidebarSearch?.addEventListener(

  "click",

  event => {

    if (
      sidebar
        ?.classList
        .contains(
          "is-collapsed"
        ) &&
      event.target !==
        sidebarSearchClear
    ) {

      setSidebarCollapsed(
        false
      );


      setTimeout(
        () =>
          sidebarSearchInput
            ?.focus(),
        180
      );

    }

  }

);


sidebarSearchInput?.addEventListener(

  "input",

  () => {

    sidebarSearchQuery =
      sidebarSearchInput.value
        .trim();


    updateSidebarSearchClear();
    renderCharacters();
    renderGroups();
    renderChatHistory();

  }

);


sidebarSearchClear?.addEventListener(

  "click",

  event => {

    event.preventDefault();
    event.stopPropagation();

    clearSidebarSearch();

    sidebarSearchInput
      ?.focus();

  }

);


createBtn.addEventListener(

  "click",

  () => {

    if (
      !confirmAndDiscardPrivateChat()
    ) {

      return;

    }


    openCreateChoice();

  }

);


mainCreateBtn.addEventListener(

  "click",

  () =>
    openCreateChoice()

);


homeCreateGroupBtn?.addEventListener(

  "click",

  () =>
    showGroupCreateView()

);


createChoiceOverlay?.addEventListener(
  "click",
  closeCreateChoice
);


closeCreateChoiceBtn?.addEventListener(
  "click",
  closeCreateChoice
);


chooseCharacterBtn?.addEventListener(

  "click",

  () => {
    closeCreateChoice();
    showCreateView();
  }

);


chooseGroupBtn?.addEventListener(

  "click",

  () => {
    closeCreateChoice();
    showGroupCreateView();
  }

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



groupBackBtn?.addEventListener(

  "click",

  () => {

    if (
      editingGroupId &&
      currentCharacter?.isGroup
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


cancelGroupBtn?.addEventListener(
  "click",
  () => groupBackBtn?.click()
);


groupBackground?.addEventListener(
  "input",
  updateGroupBackgroundPreview
);


groupForm?.addEventListener(

  "submit",

  event => {

    event.preventDefault();


    const name =
      groupName.value
        .trim();


    const memberIds =
      [...selectedGroupMemberIds];


    if (
      memberIds.length < 2
    ) {

      alert(
        "Choose at least two characters for the group."
      );


      return;

    }


    const existing =
      editingGroupId
        ? characters.find(
            item =>
              item.id ===
                editingGroupId &&
              isGroupCharacter(item)
          )
        : null;


    const members =
      memberIds
        .map(
          getCharacterById
        )
        .filter(Boolean);


    const group =
      normalizeCharacter({
        ...(existing || {}),
        id:
          existing?.id ||
          `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt:
          existing?.createdAt ||
          Date.now(),
        name,
        image: "",
        pronouns: "THEY",
        bio:
          `Group chat with ${members.map(member => member.name).join(", ")}`,
        description:
          `Group chat with ${members.map(member => member.name).join(", ")}`,
        personality: "",
        scenario: "",
        instructions: "",
        exampleMessages: [],
        hasPowers: false,
        powerSystem: "",
        combatStyle: "",
        abilities: "",
        powerLimits: "",
        background:
          groupBackground.value
            .trim(),
        isGroup: true,
        memberIds
      });


    const index =
      characters.findIndex(
        item =>
          item.id ===
            group.id
      );


    if (index >= 0) {

      characters[index] =
        group;

    }

    else {

      characters.push(
        group
      );

    }


    saveCharacters();


    editingGroupId =
      null;


    selectedGroupMemberIds =
      new Set();


    if (existing) {

      openChat(
        group,
        currentChatId
      );

    }

    else {

      const chat =
        createNewChat(
          group,
          false
        );


      openChat(
        group,
        chat?.id || null
      );

    }

  }

);


settingsBtn.addEventListener(

  "click",

  openSettings

);


settingsOverlay?.addEventListener(

  "click",

  closeSettings

);


closeSettingsBtn?.addEventListener(

  "click",

  closeSettings

);


settingsDoneBtn?.addEventListener(

  "click",

  closeSettings

);


roleplayLevelButtons
  .forEach(
    button => {

      button.addEventListener(

        "click",

        () => {

          saveRoleplayLevel(
            button.dataset
              .roleplayLevel
          );

        }

      );

    }
  );


settingsEditCurrentBtn?.addEventListener(

  "click",

  () => {

    if (
      !currentCharacter
    ) {

      return;

    }


    closeSettings();


    if (
      isGroupCharacter(
        currentCharacter
      )
    ) {

      showGroupCreateView(
        currentCharacter
      );

    }

    else {

      showCreateView(
        currentCharacter
      );

    }

  }

);


editCharacterMenuBtn.addEventListener(

  "click",

  () => {

    closeChatMenu();


    if (
      !currentCharacter
    ) {

      return;

    }


    if (
      isGroupCharacter(
        currentCharacter
      )
    ) {

      showGroupCreateView(
        currentCharacter
      );

    }

    else {

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

        appearance: {

          physical:
            characterPhysicalAppearance
              .value
              .trim(),

          defaultOutfit:
            characterDefaultOutfit
              .value
              .trim(),

          startingOutfit:
            characterStartingOutfit
              .value
              .trim(),

          accessories:
            characterAccessories
              .value
              .trim(),

          maintainContinuity:
            characterMaintainVisualContinuity
              .checked

        },

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


  const query =
    sidebarSearchQuery
      .trim()
      .toLowerCase();


  const standaloneCharacters =
    getStandaloneCharacters();


  const visibleCharacters =
    standaloneCharacters.filter(

      character => {

        if (!query) {

          return true;

        }


        return [
          character.name,
          character.bio,
          character.personality
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      }

    );


  const visibleGroupMatches =
    getGroups().filter(

      group => {

        if (!query) {

          return true;

        }


        return [
          group.name,
          ...getGroupMembers(
            group
          ).map(
            member =>
              member.name
          )
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      }

    );


  const shouldShowEmpty =
    !visibleCharacters.length &&
    !visibleGroupMatches.length;


  emptyState.style.display =
    shouldShowEmpty
      ? "flex"
      : "none";


  if (shouldShowEmpty) {

    const searching =
      Boolean(query) &&
      standaloneCharacters.length > 0;


    if (emptyStateTitle) {

      emptyStateTitle.textContent =
        searching
          ? "No matches"
          : "No characters yet";

    }


    if (emptyStateText) {

      emptyStateText.textContent =
        searching
          ? "Try a different character or chat name."
          : "Create your first AI character and start chatting.";

    }

  }


  visibleCharacters.forEach(

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
          (
            character.name ||
            "C"
          )
            .trim()
            .slice(0, 1)
            .toUpperCase();


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



function renderGroups() {

  if (
    !groupsGrid ||
    !groupsSection
  ) {

    return;

  }


  groupsGrid.innerHTML =
    "";


  const query =
    sidebarSearchQuery
      .trim()
      .toLowerCase();


  const groups =
    getGroups()
      .filter(

        group => {

          if (!query) {

            return true;

          }


          const members =
            getGroupMembers(
              group
            );


          return [
            group.name,
            ...members.map(
              member =>
                member.name
            )
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        }

      );


  groupsSection
    .classList
    .toggle(
      "hidden",
      groups.length === 0
    );


  groups.forEach(

    group => {

      const members =
        getGroupMembers(
          group
        );


      const card =
        document.createElement(
          "button"
        );


      card.type =
        "button";


      card.className =
        "group-card";


      const top =
        document.createElement(
          "div"
        );


      top.className =
        "group-card-top";


      const stack =
        document.createElement(
          "span"
        );


      stack.className =
        "group-avatar-stack";


      fillAvatarStack(
        stack,
        members,
        4
      );


      const count =
        document.createElement(
          "span"
        );


      count.className =
        "group-card-count";


      count.textContent =
        `${members.length} characters`;


      top.append(
        stack,
        count
      );


      const title =
        document.createElement(
          "h4"
        );


      title.textContent =
        group.name;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        members.length
          ? members
              .map(member => member.name)
              .join(" · ")
          : "No active characters";


      card.append(
        top,
        title,
        description
      );


      card.addEventListener(

        "click",

        () => {

          if (
            !confirmAndDiscardPrivateChat()
          ) {

            return;

          }


          openChat(
            group
          );

        }

      );


      groupsGrid.appendChild(
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


  const query =
    sidebarSearchQuery
      .trim()
      .toLowerCase();


  const visibleChats =
    query
      ? allChats.filter(

          ({
            character,
            chat
          }) =>
            `${character.name} ${chat.title}`
              .toLowerCase()
              .includes(query)

        )
      : allChats;


  if (chatHistoryCount) {

    chatHistoryCount.textContent =
      String(
        visibleChats.length
      );

  }


  if (
    !visibleChats.length
  ) {

    const empty =
      document.createElement(
        "p"
      );


    empty.className =
      "history-empty";


    empty.textContent =
      query
        ? "No matching chats"
        : "No chats yet";


    chatHistoryList.appendChild(
      empty
    );


    return;

  }


  visibleChats.forEach(

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


      button.title =
        `${character.name} — ${chat.title}`;


      const active =
        currentCharacter?.id ===
          character.id &&
        currentChatId ===
          chat.id;


      if (active) {

        button
          .classList
          .add(
            "active"
          );

      }


      const avatar =
        document.createElement(
          "span"
        );


      avatar.className =
        "history-avatar";


      if (
        isGroupCharacter(
          character
        )
      ) {

        avatar.classList.add(
          "history-group-stack"
        );


        fillAvatarStack(
          avatar,
          getGroupMembers(
            character
          ),
          2
        );

      }

      else if (character.image) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          character.image;


        image.alt =
          "";


        avatar.appendChild(
          image
        );

      }

      else {

        avatar.textContent =
          getInitials(
            character.name
          );

      }


      const copy =
        document.createElement(
          "span"
        );


      copy.className =
        "history-copy";


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


      copy.append(
        name,
        title
      );


      const activeDot =
        document.createElement(
          "span"
        );


      activeDot.className =
        "history-active-dot";


      activeDot.setAttribute(
        "aria-hidden",
        "true"
      );


      button.append(
        avatar,
        copy,
        activeDot
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

  setSidebarViewState(
    "chats"
  );

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
      buildNewChat({
        ownerCharacter:
          currentCharacter
      });


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


  groupCreateView
    ?.classList
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


  const activeGroupMembers =
    isGroupCharacter(
      currentCharacter
    )
      ? getGroupMembers(
          currentCharacter
        )
      : [];


  chatCharacterDescription.textContent =
    isGroupCharacter(
      currentCharacter
    )
      ? `${activeGroupMembers.length} characters · Shared conversation`
      : (
          currentCharacter.bio ||
          "AI Character"
        );


  if (
    isGroupCharacter(
      currentCharacter
    )
  ) {

    chatCharacterImage
      .removeAttribute(
        "src"
      );


    chatCharacterImage.style.display =
      "none";


    chatGroupAvatar
      ?.classList
      .remove(
        "hidden"
      );


    fillAvatarStack(
      chatGroupAvatar,
      activeGroupMembers,
      3
    );

  }

  else if (
    currentCharacter.image
  ) {

    chatGroupAvatar
      ?.classList
      .add(
        "hidden"
      );


    chatCharacterImage.src =
      currentCharacter.image;


    chatCharacterImage.style.display =
      "block";

  }

  else {

    chatGroupAvatar
      ?.classList
      .add(
        "hidden"
      );


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


  updateGroupChatUi();


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


function canGroupMessages(
  first,
  second
) {

  if (
    !first ||
    !second
  ) {

    return false;

  }


  const a =
    normalizeMessage(
      first
    );


  const b =
    normalizeMessage(
      second
    );


  if (
    a.sender !==
      b.sender ||
    ![
      "user",
      "character"
    ].includes(
      a.sender
    )
  ) {

    return false;

  }


  if (
    a.sender === "character" &&
    (a.characterId || b.characterId) &&
    String(a.characterId || "") !==
      String(b.characterId || "")
  ) {

    return false;

  }


  const firstTime =
    Number(
      a.time
    ) || 0;


  const secondTime =
    Number(
      b.time
    ) || 0;


  if (
    !firstTime ||
    !secondTime
  ) {

    return true;

  }


  return (
    Math.abs(
      secondTime -
      firstTime
    ) <=
    MESSAGE_GROUP_WINDOW_MS
  );

}


function getMessageGroupPosition(
  chatMessages,
  index
) {

  const message =
    chatMessages[index];


  if (
    !message ||
    ![
      "user",
      "character"
    ].includes(
      normalizeMessage(
        message
      ).sender
    )
  ) {

    return "solo";

  }


  const joinsPrevious =
    canGroupMessages(
      chatMessages[index - 1],
      message
    );


  const joinsNext =
    canGroupMessages(
      message,
      chatMessages[index + 1]
    );


  if (
    joinsPrevious &&
    joinsNext
  ) {

    return "middle";

  }


  if (joinsPrevious) {

    return "end";

  }


  if (joinsNext) {

    return "start";

  }


  return "solo";

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


  if (
    normalized.sender ===
      "user" ||
    normalized.sender ===
      "character"
  ) {

    row.classList.add(
      `group-${options.groupPosition || "solo"}`
    );

  }


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


  if (
    normalized.id ===
      recentlyAddedMessageId
  ) {

    row.classList.add(
      "message-enter-row"
    );


    bubble.classList.add(
      "message-enter"
    );

  }


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


  if (
    normalized.sender === "character" &&
    isGroupCharacter(
      currentCharacter
    )
  ) {

    const speaker =
      getMessageSpeaker(
        normalized
      );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "group-speaker-meta";


    const avatar =
      document.createElement(
        "span"
      );


    avatar.className =
      "group-speaker-avatar";


    if (speaker?.image) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        speaker.image;


      image.alt =
        "";


      avatar.appendChild(
        image
      );

    }

    else {

      avatar.textContent =
        getInitials(
          speaker?.name
        );

    }


    const name =
      document.createElement(
        "span"
      );


    name.textContent =
      speaker?.name ||
      normalized.characterName ||
      "Character";


    meta.append(
      avatar,
      name
    );


    row.appendChild(
      meta
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
      isGroupCharacter(
        currentCharacter
      )
    ) {

      const stack =
        document.createElement(
          "div"
        );


      stack.className =
        "group-avatar-stack chat-empty-group-stack";


      fillAvatarStack(
        stack,
        getGroupMembers(
          currentCharacter
        ),
        4
      );


      empty.appendChild(
        stack
      );

    }

    else if (
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
      isGroupCharacter(
        currentCharacter
      )
        ? "Choose who should respond, then start the shared conversation."
        : `Start a new conversation with ${currentCharacter.name}.`;


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

    (
      message,
      index
    ) => {

      messages.appendChild(

        createMessageRow(
          message,
          {
            groupPosition:
              getMessageGroupPosition(
                chat.messages,
                index
              )
          }
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
    "message-row character typing-row message-enter-row";


  const typingCharacter =
    isGroupCharacter(
      currentCharacter
    )
      ? getSelectedGroupResponder()
      : currentCharacter;


  row.setAttribute(
    "aria-label",
    `${typingCharacter?.name || "Character"} is typing`
  );


  if (
    isGroupCharacter(
      currentCharacter
    )
  ) {

    row.classList.add(
      "group-typing-row"
    );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "group-speaker-meta";


    const avatar =
      document.createElement(
        "span"
      );


    avatar.className =
      "group-speaker-avatar";


    if (typingCharacter?.image) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        typingCharacter.image;


      image.alt = "";


      avatar.appendChild(
        image
      );

    }

    else {

      avatar.textContent =
        getInitials(
          typingCharacter?.name
        );

    }


    const name =
      document.createElement(
        "span"
      );


    name.textContent =
      typingCharacter?.name ||
      "Character";


    meta.append(
      avatar,
      name
    );


    row.appendChild(
      meta
    );

  }


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
  response,
  streamCharacter = null
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
            "message-row character message-stream-enter-row";


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
            "message-row character message-stream-enter-row";


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

    currentAppearance:
      normalized.currentAppearance,

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


      const ownerCharacter =
        getCharacterById(
          characterId
        ) ||
        (
          String(
            currentCharacter?.id
          ) ===
          String(
            characterId
          )
            ? currentCharacter
            : null
        );


      chat.memory = {

        ...createEmptyMemory(
          ownerCharacter
        ),

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

          text:
            isGroupCharacter(
              character
            ) &&
            message.sender ===
              "character"
              ? `${message.characterName || getCharacterById(message.characterId)?.name || "Character"}: ${message.text || ""}`
              : message.text,

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


    const memoryCharacter =
      isGroupCharacter(
        character
      )
        ? {
            ...character,
            appearanceRoster:
              getGroupMembers(
                character
              ).map(
                member => ({
                  id:
                    String(
                      member.id
                    ),
                  name:
                    member.name,
                  appearance:
                    normalizeAppearanceProfile(
                      member.appearance
                    )
                })
              )
          }
        : character;


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
                memoryCharacter,

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

          currentAppearance:
            normalizeCurrentAppearance(
              data.memory
                .currentAppearance
            ),

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


function createAppearanceMemoryField(
  label,
  value,
  wide = false
) {

  const field =
    document.createElement(
      "div"
    );


  field.className =
    "memory-appearance-field" +
    (wide ? " wide" : "");


  const labelElement =
    document.createElement(
      "span"
    );

  labelElement.className =
    "memory-appearance-label";

  labelElement.textContent =
    label;


  const valueElement =
    document.createElement(
      "div"
    );

  valueElement.className =
    "memory-appearance-value";

  valueElement.textContent =
    value?.trim() ||
    "Not currently specified.";


  field.append(
    labelElement,
    valueElement
  );


  return field;

}


function renderMemoryAppearance(
  memory,
  ownerCharacter
) {

  if (!memoryAppearance) {

    return;

  }


  memoryAppearance.replaceChildren();


  const stored =
    normalizeCurrentAppearance(
      memory.currentAppearance
    );


  const fallback =
    createInitialCurrentAppearance(
      ownerCharacter
    );


  const entries =
    stored.characters.length
      ? stored.characters
      : fallback.characters;


  if (!entries.length) {

    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "memory-appearance-empty";

    empty.textContent =
      "No visual state is stored for this chat yet.";

    memoryAppearance.appendChild(
      empty
    );

    return;

  }


  entries.forEach(

    entry => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "memory-appearance-card";


      const name =
        document.createElement(
          "div"
        );

      name.className =
        "memory-appearance-name";


      const dot =
        document.createElement(
          "span"
        );

      dot.className =
        "memory-appearance-dot";


      const nameText =
        document.createElement(
          "span"
        );

      nameText.textContent =
        entry.characterName ||
        "Character";


      name.append(
        dot,
        nameText
      );


      const grid =
        document.createElement(
          "div"
        );

      grid.className =
        "memory-appearance-grid";


      grid.append(

        createAppearanceMemoryField(
          "Current outfit",
          entry.outfit
        ),

        createAppearanceMemoryField(
          "Visible condition",
          entry.condition
        ),

        createAppearanceMemoryField(
          "Accessories / equipment",
          entry.accessories,
          true
        ),

        createAppearanceMemoryField(
          "Temporary changes",
          entry.temporaryChanges
            .join(" • "),
          true
        )

      );


      card.append(
        name,
        grid
      );


      memoryAppearance.appendChild(
        card
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
        .currentAppearance
        .characters
        .length ||

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


  renderMemoryAppearance(
    memory,
    currentCharacter
  );


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

        `Clear all messages and memory from "${chat.title}"? ${isGroupCharacter(currentCharacter) ? "The group" : "The character"} will stay.`

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



function getEntitySavedChats(
  entityId
) {

  return getCharacterChats(
    entityId
  );

}


function removeEntityStorage(
  entityId
) {

  const chats =
    getEntitySavedChats(
      entityId
    );


  chats.forEach(

    chat => {

      chat.messages.forEach(

        message =>
          deleteMediaForAttachment(
            message.attachment
          )

      );

    }

  );


  localStorage.removeItem(
    getChatsKey(
      entityId
    )
  );


  localStorage.removeItem(
    getActiveChatKey(
      entityId
    )
  );


  localStorage.removeItem(
    getOldChatKey(
      entityId
    )
  );

}


function removeGroupResponderStorage(
  groupId
) {

  localStorage.removeItem(
    getGroupResponderKey(
      groupId
    )
  );

}


function buildGroupAfterMemberRemoval(
  group,
  removedCharacterId
) {

  const memberIds =
    (group.memberIds || [])
      .filter(

        memberId =>
          String(memberId) !==
          String(removedCharacterId)

      );


  if (
    memberIds.length < 2
  ) {

    return null;

  }


  const members =
    memberIds
      .map(
        getCharacterById
      )
      .filter(Boolean);


  return normalizeCharacter({

    ...group,

    memberIds,

    bio:
      `Group chat with ${members.map(member => member.name).join(", ")}`,

    description:
      `Group chat with ${members.map(member => member.name).join(", ")}`

  });

}


function deleteGroupPermanently(
  group
) {

  if (
    !group ||
    !isGroupCharacter(
      group
    )
  ) {

    return;

  }


  if (
    getTemporaryPrivateChat(
      group.id
    )
  ) {

    discardPrivateChat();

  }


  removeEntityStorage(
    group.id
  );


  removeGroupResponderStorage(
    group.id
  );


  characters =
    characters.filter(

      item =>
        String(item.id) !==
        String(group.id)

    );


  saveCharacters();

}


function deleteStandaloneCharacterPermanently(
  character
) {

  if (
    !character ||
    isGroupCharacter(
      character
    )
  ) {

    return;

  }


  if (
    getTemporaryPrivateChat(
      character.id
    )
  ) {

    discardPrivateChat();

  }


  removeEntityStorage(
    character.id
  );


  const groups =
    getGroups();


  const groupsToDelete =
    [];


  const groupsToUpdate =
    [];


  groups.forEach(

    group => {

      if (
        !(group.memberIds || [])
          .some(
            memberId =>
              String(memberId) ===
              String(character.id)
          )
      ) {

        return;

      }


      const updatedGroup =
        buildGroupAfterMemberRemoval(
          group,
          character.id
        );


      if (!updatedGroup) {

        groupsToDelete.push(
          group
        );

      }

      else {

        groupsToUpdate.push(
          updatedGroup
        );

      }

    }

  );


  groupsToDelete.forEach(

    group => {

      removeEntityStorage(
        group.id
      );


      removeGroupResponderStorage(
        group.id
      );

    }

  );


  groupsToUpdate.forEach(

    group => {

      const responderKey =
        getGroupResponderKey(
          group.id
        );


      const savedResponderId =
        localStorage.getItem(
          responderKey
        );


      if (
        savedResponderId &&
        !group.memberIds
          .some(
            memberId =>
              String(memberId) ===
              String(savedResponderId)
          )
      ) {

        localStorage.setItem(
          responderKey,
          String(
            group.memberIds[0]
          )
        );

      }

    }

  );


  const groupsToDeleteIds =
    new Set(
      groupsToDelete.map(
        group =>
          String(group.id)
      )
    );


  const updatedGroupsById =
    new Map(
      groupsToUpdate.map(
        group => [
          String(group.id),
          group
        ]
      )
    );


  characters =
    characters
      .filter(

        item =>
          String(item.id) !==
            String(character.id) &&
          !groupsToDeleteIds.has(
            String(item.id)
          )

      )
      .map(

        item =>
          updatedGroupsById.get(
            String(item.id)
          ) ||
          item

      );


  saveCharacters();

}


function describeCharacterGroupImpact(
  character
) {

  const affectedGroups =
    getGroups()
      .filter(

        group =>
          (group.memberIds || [])
            .some(
              memberId =>
                String(memberId) ===
                String(character.id)
            )

      );


  if (!affectedGroups.length) {

    return "";

  }


  const deletedGroups =
    affectedGroups
      .filter(

        group =>
          (group.memberIds || [])
            .filter(
              memberId =>
                String(memberId) !==
                String(character.id)
            )
            .length < 2

      );


  const updatedGroups =
    affectedGroups.length -
    deletedGroups.length;


  const parts =
    [];


  if (updatedGroups) {

    parts.push(
      `${updatedGroups} group${updatedGroups === 1 ? "" : "s"} will stay, but this character will be removed from ${updatedGroups === 1 ? "it" : "them"}.`
    );

  }


  if (deletedGroups.length) {

    parts.push(
      `${deletedGroups.length} group${deletedGroups.length === 1 ? "" : "s"} will also be deleted because fewer than two members would remain.`
    );

  }


  return `\n\n${parts.join("\n")}`;

}


deleteEntityBtn?.addEventListener(

  "click",

  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      isSending ||
      !currentCharacter
    ) {

      return;

    }


    const entity =
      currentCharacter;


    const groupMode =
      isGroupCharacter(
        entity
      );


    const impactText =
      groupMode
        ? ""
        : describeCharacterGroupImpact(
            entity
          );


    const confirmed =
      confirm(

        groupMode

          ? (
              `Delete group "${entity.name}" permanently?\n\n` +
              "This will delete the group and all of its saved conversations. " +
              "The individual characters inside the group will not be deleted."
            )

          : (
              `Delete character "${entity.name}" permanently?\n\n` +
              "This will delete the character and all of its saved conversations." +
              impactText
            )

      );


    if (!confirmed) {

      closeChatMenu();

      return;

    }


    closeChatMenu();

    closeMemoryViewer();

    clearPendingAttachment();


    if (groupMode) {

      deleteGroupPermanently(
        entity
      );

    }

    else {

      deleteStandaloneCharacterPermanently(
        entity
      );

    }


    currentChatId =
      null;


    currentCharacter =
      null;


    currentGroupResponderId =
      null;


    editingCharacterId =
      null;


    editingGroupId =
      null;


    showHomeView();

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

          ? (
              isGroupCharacter(
                character
              )
                ? "Close this Private Group Chat? It is not saved, and this shared conversation will be permanently discarded."
                : "Close this Private Chat? It is not saved, and this conversation will be permanently discarded."
            )

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
  messagesOverride = null,
  storageCharacterId = null
) {

  const ownerId =
    storageCharacterId ||
    character.id;


  const conversationOwner =
    characters.find(
      item =>
        String(item.id) ===
          String(ownerId)
    ) ||
    currentCharacter;


  const groupMode =
    isGroupCharacter(
      conversationOwner
    );


  const chat =
    getStoredChat(
      ownerId,
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
        groupMode &&
        normalized.sender ===
          "character"
          ? `${normalized.characterName || getCharacterById(normalized.characterId)?.name || "Character"}: ${getMessageText(normalized)}`
          : getMessageText(
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


  const requestCharacter =
    groupMode
      ? {
          ...character,
          instructions:
            [
              character.instructions || "",
              buildGroupContextInstructions(
                character,
                conversationOwner
              )
            ]
              .filter(Boolean)
              .join("\n\n")
        }
      : character;


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
              activeMessages,

            memory:
              createMemoryPayload(
                chat.memory
              ),

            roleplayLevel:
              normalizeRoleplayLevel(
                roleplayLevel
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
    response,
    character
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


  if (
    isGroupCharacter(
      currentCharacter
    )
  ) {

    renderGroupResponderBar();

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


    const responseCharacter =
      isGroupCharacter(
        character
      )
        ? getSelectedGroupResponder()
        : character;


    if (
      isGroupCharacter(
        character
      ) &&
      !responseCharacter
    ) {

      alert(
        "This group has no available character to respond."
      );


      return;

    }


    const chatId =
      currentChatId;


    let sentUserMessageId =
      null;


    mutateStoredChat(

      character.id,

      chatId,

      chat => {

        const userMessage =
          normalizeMessage({

            sender:
              "user",

            text,

            attachment,

            time:
              Date.now()

          });


        sentUserMessageId =
          userMessage.id;


        chat.messages.push(
          userMessage
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


    recentlyAddedMessageId =
      sentUserMessageId;


    renderMessages();


    recentlyAddedMessageId =
      null;


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

          responseCharacter,

          chatId,

          null,

          character.id

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

            characterId:
              isGroupCharacter(
                character
              )
                ? responseCharacter.id
                : null,

            characterName:
              isGroupCharacter(
                character
              )
                ? responseCharacter.name
                : character.name,

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


      setTimeout(

        () => {

          if (!isSending) {

            renderMessages();

          }

        },

        620

      );


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


  const targetMessage =
    normalizeMessage(
      chat.messages[index]
    );


  const responseCharacter =
    isGroupCharacter(
      character
    )
      ? (
          getCharacterById(
            targetMessage.characterId
          ) ||
          getSelectedGroupResponder()
        )
      : character;


  if (!responseCharacter) {

    alert(
      "That group character is no longer available."
    );


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

        responseCharacter,

        chatId,

        requestHistory,

        character.id

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


    setTimeout(

      () => {

        if (!isSending) {

          renderMessages();

        }

      },

      620

    );


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

      closeCreateChoice();

      closeSettings();

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

setSidebarCollapsed(
  getSidebarCollapsedPreference(),
  {
    persist: false
  }
);

updateSidebarSearchClear();
renderRoleplayLevelSettings();
setSidebarViewState(
  "chats"
);
updateSidebarPrivateStatus(
  false
);

renderCharacters();
renderGroups();

renderChatHistory();