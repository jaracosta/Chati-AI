// ============================================================
// CHATI-AI V5.0.2A — FIRST REAL CHAT BACKUP
//
// SAFE / MANUAL MODE:
//
// - Reads persistent normal chats from IndexedDB.
// - Private Chat / Private Group Chat are NEVER read or uploaded.
// - Can preview all local conversations.
// - Can manually back up ONE selected conversation.
// - No automatic sync yet.
// - No cloud -> local restore yet.
// - Chat attachments are deferred until a later V5 media step.
// ============================================================

(() => {
  "use strict";


  const DB_NAME =
    "chatiMediaDB";

  const APP_STORE =
    "appData";

  const CHARACTERS_KEY =
    "chatiCharacters";

  const CHATS_PREFIX =
    "chatiChats_";


  // ============================================================
  // LOCAL DATABASE
  // ============================================================

  function openDb() {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const request =
          indexedDB.open(
            DB_NAME
          );


        request.onsuccess =
          () => {
            resolve(
              request.result
            );
          };


        request.onerror =
          () => {
            reject(
              request.error ||
              new Error(
                "Could not open Chati-AI local database."
              )
            );
          };

      }
    );

  }


  async function readAppData(
    key
  ) {

    try {

      const db =
        await openDb();


      if (
        !db.objectStoreNames
          .contains(
            APP_STORE
          )
      ) {

        db.close();

        return localStorage
          .getItem(
            key
          );

      }


      const value =
        await new Promise(
          (
            resolve,
            reject
          ) => {

            const tx =
              db.transaction(
                APP_STORE,
                "readonly"
              );


            const request =
              tx
                .objectStore(
                  APP_STORE
                )
                .get(
                  key
                );


            request.onsuccess =
              () => {
                resolve(
                  request.result ??
                  null
                );
              };


            request.onerror =
              () => {
                reject(
                  request.error ||
                  new Error(
                    "Could not read local Chati-AI data."
                  )
                );
              };

          }
        );


      db.close();

      return value;

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] IndexedDB read failed; using localStorage.",
        error
      );


      return localStorage
        .getItem(
          key
        );

    }

  }


  function parseArray(
    raw
  ) {

    if (!raw) {
      return [];
    }


    try {

      const parsed =
        typeof raw ===
        "string"

          ? JSON.parse(
              raw
            )

          : raw;


      return Array.isArray(
        parsed
      )
        ? parsed
        : [];

    }

    catch (
      error
    ) {

      console.error(
        "[Chati-AI Conversations] Could not parse local data.",
        error
      );


      return [];

    }

  }


  function clone(
    value
  ) {

    if (
      value === undefined
    ) {
      return undefined;
    }


    return (
      typeof structuredClone ===
      "function"

        ? structuredClone(
            value
          )

        : JSON.parse(
            JSON.stringify(
              value
            )
          )
    );

  }


  // ============================================================
  // V5.0.3 — LOCAL CHAT WRITE
  // ============================================================

  async function writeAppData(
    key,
    value
  ) {

    const stringValue =
      typeof value === "string"
        ? value
        : JSON.stringify(
            value
          );


    try {

      const db =
        await openDb();


      if (
        !db.objectStoreNames
          .contains(
            APP_STORE
          )
      ) {

        db.close();

        localStorage.setItem(
          key,
          stringValue
        );

        return;

      }


      await new Promise(
        (
          resolve,
          reject
        ) => {

          const tx =
            db.transaction(
              APP_STORE,
              "readwrite"
            );


          const store =
            tx.objectStore(
              APP_STORE
            );


          store.put(
            stringValue,
            key
          );


          tx.oncomplete =
            () => {
              resolve();
            };


          tx.onerror =
            () => {
              reject(
                tx.error ||
                new Error(
                  "Could not write Chati-AI local data."
                )
              );
            };


          tx.onabort =
            () => {
              reject(
                tx.error ||
                new Error(
                  "Chati-AI local write was aborted."
                )
              );
            };

        }
      );


      db.close();

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] IndexedDB write failed; using localStorage.",
        error
      );


      localStorage.setItem(
        key,
        stringValue
      );

    }

  }


  // ============================================================
  // LOCAL OWNERS
  // ============================================================

  async function getLocalOwners() {

    const raw =
      await readAppData(
        CHARACTERS_KEY
      );


    return parseArray(
      raw
    )
      .filter(
        item =>
          item &&
          item.id !== null &&
          item.id !== undefined
      );

  }


  function getOwnerType(
    owner
  ) {

    return owner?.isGroup
      ? "group"
      : "character";

  }


  function getOwnerName(
    owner
  ) {

    return (
      String(
        owner?.name ??
        "Unnamed"
      )
    );

  }


  async function getOwnerChats(
    ownerLocalId
  ) {

    const id =
      String(
        ownerLocalId
      );


    const raw =
      await readAppData(
        `${CHATS_PREFIX}${id}`
      );


    return parseArray(
      raw
    )
      .filter(
        chat =>
          chat &&
          !chat.isPrivate
      );

  }


  // ============================================================
  // PREVIEW
  // ============================================================

  async function previewLocalChats() {

    const owners =
      await getLocalOwners();


    const rows =
      [];


    for (
      const owner
      of owners
    ) {

      const chats =
        await getOwnerChats(
          owner.id
        );


      for (
        const chat
        of chats
      ) {

        if (
          !chat?.id
        ) {
          continue;
        }


        const messages =
          Array.isArray(
            chat.messages
          )
            ? chat.messages
            : [];


        rows.push({
          ownerType:
            getOwnerType(
              owner
            ),

          ownerLocalId:
            String(
              owner.id
            ),

          ownerName:
            getOwnerName(
              owner
            ),

          chatId:
            String(
              chat.id
            ),

          title:
            String(
              chat.title ||
              "New Chat"
            ),

          messageCount:
            messages.length,

          attachmentCount:
            messages.filter(
              message =>
                Boolean(
                  message?.attachment
                )
            ).length,

          createdAt:
            chat.createdAt ??
            null,

          updatedAt:
            chat.updatedAt ??
            null
        });

      }

    }


    rows.sort(
      (
        a,
        b
      ) =>
        Number(
          b.updatedAt || 0
        ) -
        Number(
          a.updatedAt || 0
        )
    );


    console.table(
      rows
    );


    console.log(
      `[Chati-AI Conversations] ${rows.length} persistent normal chat(s) found.`
    );


    return rows;

  }


  async function findLocalChat(
    ownerLocalId,
    chatId
  ) {

    const ownerId =
      String(
        ownerLocalId
      );

    const targetChatId =
      String(
        chatId
      );


    const owners =
      await getLocalOwners();


    const owner =
      owners.find(
        item =>
          String(
            item.id
          ) ===
          ownerId
      );


    if (!owner) {

      throw new Error(
        `Local owner not found: ${ownerId}`
      );

    }


    const chats =
      await getOwnerChats(
        ownerId
      );


    const chat =
      chats.find(
        item =>
          String(
            item?.id
          ) ===
          targetChatId
      );


    if (!chat) {

      throw new Error(
        `Local normal chat not found: ${targetChatId}`
      );

    }


    if (
      chat.isPrivate
    ) {

      throw new Error(
        "Private conversations are never allowed in cloud backup."
      );

    }


    return {
      owner,
      chat
    };

  }


  // ============================================================
  // MESSAGE PREPARATION
  // ============================================================

  function normalizeSender(
    value
  ) {

    if (
      value === "character"
    ) {
      return "character";
    }


    if (
      value === "system"
    ) {
      return "system";
    }


    return "user";

  }


  function getMessageLocalId(
    message,
    chatId,
    index
  ) {

    const existing =
      String(
        message?.id ??
        ""
      )
        .trim();


    if (existing) {
      return existing;
    }


    return (
      `legacy_${String(chatId)}_${index}`
    );

  }


  function prepareAttachmentMetadata(
    attachment
  ) {

    if (
      !attachment ||
      typeof attachment !==
      "object"
    ) {

      return null;

    }


    return {
      deferred:
        true,

      type:
        attachment.type ||
        null,

      name:
        attachment.name ||
        null,

      mimeType:
        attachment.mimeType ||
        null,

      note:
        attachment.note ||
        "",

      duration:
        Number.isFinite(
          attachment.duration
        )
          ? attachment.duration
          : null
    };

  }


  function prepareMessagePayload(
    message
  ) {

    const payload =
      clone(
        message &&
        typeof message ===
          "object"

          ? message

          : {}
      );


    delete payload.id;
    delete payload.sender;
    delete payload.time;


    if (
      payload.attachment
    ) {

      const metadata =
        prepareAttachmentMetadata(
          payload.attachment
        );


      payload.attachment =
        null;

      payload.attachmentDeferred =
        metadata;

    }


    return payload;

  }


  function prepareMemory(
    memory
  ) {

    if (
      !memory ||
      typeof memory !==
        "object" ||
      Array.isArray(
        memory
      )
    ) {

      return {};

    }


    return clone(
      memory
    );

  }


  // ============================================================
  // BACKUP ONE REAL CHAT
  // ============================================================

  async function backupOne(
    ownerLocalId,
    chatId
  ) {

    if (
      !window.ChatiConversations ||
      !window.ChatiMessages
    ) {

      throw new Error(
        "Conversation cloud client is unavailable."
      );

    }


    const {
      owner,
      chat
    } =
      await findLocalChat(
        ownerLocalId,
        chatId
      );


    const ownerType =
      getOwnerType(
        owner
      );


    const ownerId =
      String(
        owner.id
      );


    const localChatId =
      String(
        chat.id
      );


    const existing =
      await window
        .ChatiConversations
        .get(
          localChatId,
          {
            ownerType,
            ownerLocalId:
              ownerId,
            includeDeleted:
              true
          }
        );


    if (
      existing
    ) {

      console.warn(
        "[Chati-AI Conversations] Chat already exists in cloud. Nothing uploaded.",
        existing
      );


      return {
        ok:
          false,

        reason:
          "already-exists",

        conversation:
          existing,

        uploadedMessages:
          0,

        deferredAttachments:
          0
      };

    }


    const messages =
      Array.isArray(
        chat.messages
      )
        ? chat.messages
        : [];


    console.log(
      "[Chati-AI Conversations] Starting manual backup:",
      {
        owner:
          getOwnerName(
            owner
          ),

        ownerType,

        chatId:
          localChatId,

        title:
          chat.title ||
          "New Chat",

        messages:
          messages.length
      }
    );


    const cloudConversation =
      await window
        .ChatiConversations
        .create({
          localId:
            localChatId,

          ownerType,

          ownerLocalId:
            ownerId,

          title:
            String(
              chat.title ||
              "New Chat"
            ),

          memory:
            prepareMemory(
              chat.memory
            ),

          createdAt:
            chat.createdAt ??
            null
        });


    let uploadedMessages =
      0;

    let deferredAttachments =
      0;


    try {

      for (
        let index = 0;
        index < messages.length;
        index += 1
      ) {

        const message =
          messages[
            index
          ];


        if (
          message?.attachment
        ) {

          deferredAttachments +=
            1;

        }


        await window
          .ChatiMessages
          .create({
            conversationId:
              cloudConversation.id,

            localId:
              getMessageLocalId(
                message,
                localChatId,
                index
              ),

            sender:
              normalizeSender(
                message?.sender
              ),

            sortIndex:
              index,

            messageTime:
              Number.isFinite(
                Number(
                  message?.time
                )
              )
                ? Number(
                    message.time
                  )
                : null,

            payload:
              prepareMessagePayload(
                message
              ),

            createdAt:
              Number.isFinite(
                Number(
                  message?.time
                )
              )
                ? Number(
                    message.time
                  )
                : null
          });


        uploadedMessages +=
          1;

      }

    }

    catch (
      error
    ) {

      console.error(
        "[Chati-AI Conversations] Backup failed. Rolling back cloud conversation.",
        error
      );


      try {

        await window
          .ChatiConversations
          .purge(
            localChatId,
            ownerType,
            ownerId
          );

      }

      catch (
        cleanupError
      ) {

        console.error(
          "[Chati-AI Conversations] Rollback also failed:",
          cleanupError
        );

      }


      throw error;

    }


    const result = {
      ok:
        true,

      ownerType,

      ownerLocalId:
        ownerId,

      ownerName:
        getOwnerName(
          owner
        ),

      chatId:
        localChatId,

      cloudConversationId:
        cloudConversation.id,

      title:
        cloudConversation.title,

      version:
        cloudConversation.version,

      uploadedMessages,

      deferredAttachments
    };


    console.log(
      "🔥 V5 FIRST REAL CHAT BACKUP COMPLETE",
      result
    );


    if (
      deferredAttachments > 0
    ) {

      console.warn(
        `[Chati-AI Conversations] ${deferredAttachments} attachment(s) were intentionally deferred. Chat attachment cloud storage comes later in V5.`
      );

    }


    return result;

  }


  // ============================================================
  // V5.0.3 — CLOUD -> LOCAL RESTORE
  // ============================================================

  function timestampFromCloud(
    value,
    fallback = null
  ) {

    if (
      value == null ||
      value === ""
    ) {

      return fallback;

    }


    const numeric =
      Number(
        value
      );


    if (
      Number.isFinite(
        numeric
      ) &&
      numeric > 0
    ) {

      return numeric;

    }


    const parsed =
      Date.parse(
        value
      );


    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;

  }


  function cloudMessageToLocal(
    cloudMessage
  ) {

    const payload =
      clone(
        cloudMessage?.payload &&
        typeof cloudMessage.payload ===
          "object"

          ? cloudMessage.payload

          : {}
      );


    const time =
      timestampFromCloud(
        cloudMessage?.message_time,
        timestampFromCloud(
          cloudMessage?.created_at,
          Date.now()
        )
      );


    return {
      ...payload,

      id:
        String(
          cloudMessage?.local_id ??
          crypto.randomUUID()
        ),

      sender:
        normalizeSender(
          cloudMessage?.sender
        ),

      time
    };

  }


  async function previewCloudChats() {

    if (
      !window.ChatiConversations ||
      !window.ChatiMessages
    ) {

      throw new Error(
        "Conversation cloud client is unavailable."
      );

    }


    const cloudConversations =
      await window
        .ChatiConversations
        .getAll({
          includeDeleted:
            false
        });


    const owners =
      await getLocalOwners();


    const rows =
      [];


    for (
      const conversation
      of cloudConversations
    ) {

      if (
        conversation?.is_private ===
          true ||
        conversation?.source_scope !==
          "normal"
      ) {

        continue;

      }


      const ownerId =
        String(
          conversation.owner_local_id
        );


      const owner =
        owners.find(
          item =>
            String(
              item?.id
            ) ===
            ownerId
        );


      let ownerMatchesType =
        false;


      if (owner) {

        ownerMatchesType =
          conversation.owner_type ===
          (
            owner.isGroup
              ? "group"
              : "character"
          );

      }


      let localExists =
        false;


      if (
        owner &&
        ownerMatchesType
      ) {

        const localChats =
          await getOwnerChats(
            ownerId
          );


        localExists =
          localChats.some(
            chat =>
              String(
                chat?.id
              ) ===
              String(
                conversation.local_id
              )
          );

      }


      const cloudMessages =
        await window
          .ChatiMessages
          .getAll(
            conversation.id
          );


      rows.push({
        cloudConversationId:
          conversation.id,

        ownerType:
          conversation.owner_type,

        ownerLocalId:
          ownerId,

        ownerName:
          owner
            ? getOwnerName(
                owner
              )
            : "(owner missing locally)",

        chatId:
          String(
            conversation.local_id
          ),

        title:
          String(
            conversation.title ||
            "New Chat"
          ),

        messageCount:
          cloudMessages.length,

        ownerExists:
          Boolean(
            owner
          ),

        ownerMatchesType,

        localExists,

        version:
          conversation.version
      });

    }


    console.table(
      rows
    );


    console.log(
      `[Chati-AI Conversations] ${rows.length} active cloud conversation(s) found.`
    );


    return rows;

  }


  async function restoreOne(
    cloudConversationId
  ) {

    if (
      !window.ChatiConversations ||
      !window.ChatiMessages
    ) {

      throw new Error(
        "Conversation cloud client is unavailable."
      );

    }


    const targetId =
      String(
        cloudConversationId ??
        ""
      )
        .trim();


    if (!targetId) {

      throw new Error(
        "Cloud conversation ID is required."
      );

    }


    const cloudConversations =
      await window
        .ChatiConversations
        .getAll({
          includeDeleted:
            true
        });


    const cloudConversation =
      cloudConversations.find(
        item =>
          String(
            item?.id
          ) ===
          targetId
      );


    if (
      !cloudConversation
    ) {

      throw new Error(
        `Cloud conversation not found: ${targetId}`
      );

    }


    if (
      cloudConversation.deleted_at
    ) {

      throw new Error(
        "Deleted cloud conversations cannot be restored."
      );

    }


    if (
      cloudConversation.is_private ===
        true ||
      cloudConversation.source_scope !==
        "normal"
    ) {

      throw new Error(
        "Private or temporary cloud conversations are blocked."
      );

    }


    const ownerId =
      String(
        cloudConversation.owner_local_id
      );


    const owners =
      await getLocalOwners();


    const owner =
      owners.find(
        item =>
          String(
            item?.id
          ) ===
          ownerId
      );


    if (!owner) {

      throw new Error(
        `The conversation owner does not exist locally yet: ${ownerId}`
      );

    }


    const expectedOwnerType =
      owner.isGroup
        ? "group"
        : "character";


    if (
      cloudConversation.owner_type !==
      expectedOwnerType
    ) {

      throw new Error(
        "Cloud conversation owner type does not match the local owner."
      );

    }


    const storageKey =
      `${CHATS_PREFIX}${ownerId}`;


    const rawChats =
      await readAppData(
        storageKey
      );


    const storedChats =
      parseArray(
        rawChats
      );


    const existing =
      storedChats.find(
        chat =>
          String(
            chat?.id
          ) ===
          String(
            cloudConversation.local_id
          )
      );


    if (existing) {

      console.warn(
        "[Chati-AI Conversations] Restore protected: chat already exists locally. Nothing overwritten.",
        existing
      );


      return {
        ok:
          false,

        reason:
          "already-local",

        chatId:
          String(
            cloudConversation.local_id
          ),

        ownerLocalId:
          ownerId,

        restoredMessages:
          0,

        requiresReload:
          false
      };

    }


    const cloudMessages =
      await window
        .ChatiMessages
        .getAll(
          cloudConversation.id,
          {
            includeDeleted:
              false
          }
        );


    cloudMessages.sort(
      (
        a,
        b
      ) => {

        const indexDifference =
          Number(
            a.sort_index
          ) -
          Number(
            b.sort_index
          );


        if (
          indexDifference !== 0
        ) {

          return indexDifference;

        }


        return (
          timestampFromCloud(
            a.message_time,
            0
          ) -
          timestampFromCloud(
            b.message_time,
            0
          )
        );

      }
    );


    for (
      const message
      of cloudMessages
    ) {

      if (
        message?.is_private ===
          true ||
        message?.source_scope !==
          "normal"
      ) {

        throw new Error(
          "Private or temporary cloud message detected. Restore cancelled."
        );

      }

    }


    const localMessages =
      cloudMessages.map(
        cloudMessageToLocal
      );


    const createdAt =
      timestampFromCloud(
        cloudConversation.created_at,
        localMessages[0]?.time ||
        Date.now()
      );


    const newestMessageTime =
      localMessages.reduce(
        (
          newest,
          message
        ) =>
          Math.max(
            newest,
            Number(
              message?.time ||
              0
            )
          ),
        0
      );


    const updatedAt =
      newestMessageTime ||
      createdAt;


    const restoredChat = {
      id:
        String(
          cloudConversation.local_id
        ),

      title:
        String(
          cloudConversation.title ||
          "New Chat"
        ),

      createdAt,

      updatedAt,

      messages:
        localMessages,

      memory:
        prepareMemory(
          cloudConversation.memory
        )
    };


    const nextChats = [
      ...storedChats,
      restoredChat
    ];


    await writeAppData(
      storageKey,
      JSON.stringify(
        nextChats
      )
    );


    const result = {
      ok:
        true,

      ownerType:
        cloudConversation.owner_type,

      ownerLocalId:
        ownerId,

      ownerName:
        getOwnerName(
          owner
        ),

      chatId:
        restoredChat.id,

      title:
        restoredChat.title,

      restoredMessages:
        restoredChat.messages.length,

      createdAt:
        restoredChat.createdAt,

      updatedAt:
        restoredChat.updatedAt,

      requiresReload:
        true
    };


    console.log(
      "🔥 V5 CROSS-DEVICE CHAT RESTORE COMPLETE",
      result
    );


    console.log(
      "[Chati-AI Conversations] Reload the page to load the restored chat into the active app state."
    );


    return result;

  }


  // ============================================================
  // V5.0.4A2 — AUTOMATIC NEW CHAT SYNC
  //
  // SAFE BASELINE MODE
  //
  // - Existing local/cloud chats are baselined first.
  // - Existing historical chats are NOT mass-uploaded.
  // - Only NEW normal chats created after the baseline
  //   are automatically backed up.
  // - Only NEW cloud chats appearing after the baseline
  //   are automatically restored.
  // - Private Chat / Private Group remain excluded.
  // - Existing conversation edits/messages are handled
  //   in the next V5.0.4 phase.
  // ============================================================


  const AUTO_CONVERSATION_SYNC_INTERVAL_MS =
    10000;


  let autoConversationEnabled =
    false;

  let autoConversationBusy =
    false;

  let autoConversationInterval =
    null;

  let autoConversationDelay =
    null;

  let autoConversationReloadPending =
    false;

  let lastAutoConversationResult =
    null;


  function makeConversationSyncKey(
    ownerType,
    ownerLocalId,
    chatId
  ) {

    return [
      String(
        ownerType ?? ""
      ),

      String(
        ownerLocalId ?? ""
      ),

      String(
        chatId ?? ""
      )
    ].join(
      "::"
    );

  }


  async function getConversationSyncSession() {

    if (
      !window.ChatiAuth ||
      typeof window.ChatiAuth.getSession !==
        "function"
    ) {

      return null;

    }


    try {

      const result =
        await window.ChatiAuth
          .getSession();


      return (
        result?.data?.session ||
        null
      );

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] Could not read auth session.",
        error
      );


      return null;

    }

  }


  function getConversationBaselineKey(
    userId
  ) {

    return (
      `chatiConversationAutoBaselineV504A2_${String(userId)}`
    );

  }


  function readConversationBaseline(
    userId
  ) {

    const key =
      getConversationBaselineKey(
        userId
      );


    try {

      const raw =
        localStorage.getItem(
          key
        );


      if (!raw) {
        return null;
      }


      const parsed =
        JSON.parse(
          raw
        );


      if (
        !parsed ||
        typeof parsed !==
          "object"
      ) {

        return null;

      }


      return {
        initializedAt:
          Number(
            parsed.initializedAt ||
            0
          ),

        knownLocal:
          (
            parsed.knownLocal &&
            typeof parsed.knownLocal ===
              "object"
          )
            ? parsed.knownLocal
            : {},

        knownCloud:
          (
            parsed.knownCloud &&
            typeof parsed.knownCloud ===
              "object"
          )
            ? parsed.knownCloud
            : {}
      };

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] Could not read automatic sync baseline.",
        error
      );


      return null;

    }

  }


  function saveConversationBaseline(
    userId,
    state
  ) {

    localStorage.setItem(
      getConversationBaselineKey(
        userId
      ),
      JSON.stringify(
        state
      )
    );

  }


  async function collectLocalConversationSnapshot() {

    const owners =
      await getLocalOwners();


    const rows =
      [];


    for (
      const owner
      of owners
    ) {

      const ownerType =
        getOwnerType(
          owner
        );

      const ownerLocalId =
        String(
          owner.id
        );


      const chats =
        await getOwnerChats(
          ownerLocalId
        );


      for (
        const chat
        of chats
      ) {

        if (
          !chat ||
          chat.isPrivate ||
          !chat.id
        ) {

          continue;

        }


        const messages =
          Array.isArray(
            chat.messages
          )
            ? chat.messages
            : [];


        rows.push({
          ownerType,

          ownerLocalId,

          ownerName:
            getOwnerName(
              owner
            ),

          chatId:
            String(
              chat.id
            ),

          title:
            String(
              chat.title ||
              "New Chat"
            ),

          messageCount:
            messages.length,

          attachmentCount:
            messages.filter(
              message =>
                Boolean(
                  message?.attachment
                )
            ).length,

          createdAt:
            chat.createdAt ??
            null,

          updatedAt:
            chat.updatedAt ??
            null
        });

      }

    }


    return {
      owners,
      rows
    };

  }


  function isNormalCloudConversation(
    conversation
  ) {

    return Boolean(
      conversation &&
      conversation.is_private !==
        true &&
      conversation.source_scope ===
        "normal" &&
      (
        conversation.owner_type ===
          "character" ||
        conversation.owner_type ===
          "group"
      )
    );

  }


  function userIsTypingConversation() {

    const active =
      document.activeElement;


    if (!active) {
      return false;
    }


    if (
      active.tagName ===
        "TEXTAREA" ||
      active.tagName ===
        "INPUT" ||
      active.isContentEditable
    ) {

      return true;

    }


    return false;

  }


  function maybeReloadAfterConversationRestore() {

    if (
      !autoConversationReloadPending
    ) {

      return false;

    }


    if (
      document.visibilityState !==
        "visible"
    ) {

      return false;

    }


    if (
      userIsTypingConversation()
    ) {

      console.log(
        "[Chati-AI Conversations] Restore completed. Reload deferred while the user is typing."
      );

      return false;

    }


    autoConversationReloadPending =
      false;


    console.log(
      "🔥 [Chati-AI Conversations] New cloud chat restored. Reloading UI..."
    );


    setTimeout(
      () => {
        location.reload();
      },
      700
    );


    return true;

  }


  async function initializeAutoConversationBaseline() {

    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        ok:
          false,

        reason:
          "signed-out"
      };

    }


    const existing =
      readConversationBaseline(
        session.user.id
      );


    if (existing) {

      return {
        ok:
          true,

        created:
          false,

        initializedAt:
          existing.initializedAt,

        localKnown:
          Object.keys(
            existing.knownLocal
          ).length,

        cloudKnown:
          Object.keys(
            existing.knownCloud
          ).length
      };

    }


    const {
      rows: localRows
    } =
      await collectLocalConversationSnapshot();


    const cloudRows =
      await window
        .ChatiConversations
        .getAll({
          includeDeleted:
            false
        });


    const state = {
      initializedAt:
        Date.now(),

      knownLocal:
        {},

      knownCloud:
        {}
    };


    for (
      const row
      of localRows
    ) {

      const key =
        makeConversationSyncKey(
          row.ownerType,
          row.ownerLocalId,
          row.chatId
        );


      state.knownLocal[
        key
      ] = true;

    }


    for (
      const row
      of cloudRows
    ) {

      if (
        !isNormalCloudConversation(
          row
        )
      ) {

        continue;

      }


      const key =
        makeConversationSyncKey(
          row.owner_type,
          row.owner_local_id,
          row.local_id
        );


      state.knownCloud[
        key
      ] = true;

    }


    saveConversationBaseline(
      session.user.id,
      state
    );


    const result = {
      ok:
        true,

      created:
        true,

      initializedAt:
        state.initializedAt,

      localKnown:
        Object.keys(
          state.knownLocal
        ).length,

      cloudKnown:
        Object.keys(
          state.knownCloud
        ).length
    };


    console.log(
      "🔥 V5.0.4A2 AUTOMATIC CHAT BASELINE CREATED",
      result
    );


    return result;

  }


  async function syncAutomaticNewChats(
    reason = "manual"
  ) {

    if (
      autoConversationBusy
    ) {

      return {
        ok:
          false,

        reason:
          "busy"
      };

    }


    autoConversationBusy =
      true;


    const result = {
      ok:
        true,

      reason,

      uploadedChats:
        0,

      restoredChats:
        0,

      skippedEmpty:
        0,

      errors:
        [],

      requiresReload:
        false
    };


    try {

      if (
        !window.ChatiConversations ||
        !window.ChatiMessages
      ) {

        return {
          ...result,

          ok:
            false,

          reason:
            "cloud-client-unavailable"
        };

      }


      const session =
        await getConversationSyncSession();


      if (
        !session?.user?.id
      ) {

        return {
          ...result,

          ok:
            false,

          reason:
            "signed-out"
        };

      }


      let state =
        readConversationBaseline(
          session.user.id
        );


      if (!state) {

        await initializeAutoConversationBaseline();


        state =
          readConversationBaseline(
            session.user.id
          );


        lastAutoConversationResult = {
          ...result,

          reason:
            "baseline-created"
        };


        return lastAutoConversationResult;

      }


      const {
        owners,
        rows: localRows
      } =
        await collectLocalConversationSnapshot();


      const cloudRows =
        (
          await window
            .ChatiConversations
            .getAll({
              includeDeleted:
                false
            })
        )
          .filter(
            isNormalCloudConversation
          );


      const localMap =
        new Map();


      for (
        const row
        of localRows
      ) {

        const key =
          makeConversationSyncKey(
            row.ownerType,
            row.ownerLocalId,
            row.chatId
          );


        localMap.set(
          key,
          row
        );

      }


      const cloudMap =
        new Map();


      for (
        const row
        of cloudRows
      ) {

        const key =
          makeConversationSyncKey(
            row.owner_type,
            row.owner_local_id,
            row.local_id
          );


        cloudMap.set(
          key,
          row
        );

      }


      // --------------------------------------------------------
      // NEW LOCAL -> CLOUD
      // --------------------------------------------------------

      for (
        const row
        of localRows
      ) {

        const key =
          makeConversationSyncKey(
            row.ownerType,
            row.ownerLocalId,
            row.chatId
          );


        if (
          cloudMap.has(
            key
          )
        ) {

          state.knownLocal[
            key
          ] = true;

          state.knownCloud[
            key
          ] = true;

          continue;

        }


        if (
          state.knownLocal[
            key
          ]
        ) {

          continue;

        }


        if (
          row.messageCount < 1
        ) {

          result.skippedEmpty +=
            1;

          continue;

        }


        try {

          const backup =
            await backupOne(
              row.ownerLocalId,
              row.chatId
            );


          if (
            backup?.ok
          ) {

            result.uploadedChats +=
              1;


            state.knownLocal[
              key
            ] = true;

            state.knownCloud[
              key
            ] = true;


            console.log(
              "🔥 V5.0.4A2 NEW LOCAL CHAT AUTO-UPLOADED",
              {
                owner:
                  row.ownerName,

                title:
                  row.title,

                messages:
                  row.messageCount
              }
            );

          }

        }

        catch (
          error
        ) {

          console.error(
            "[Chati-AI Conversations] Automatic new-chat upload failed:",
            row,
            error
          );


          result.errors.push({
            direction:
              "upload",

            chatId:
              row.chatId,

            message:
              String(
                error?.message ||
                error
              )
          });

        }

      }


      // --------------------------------------------------------
      // NEW CLOUD -> LOCAL
      // --------------------------------------------------------

      for (
        const row
        of cloudRows
      ) {

        const key =
          makeConversationSyncKey(
            row.owner_type,
            row.owner_local_id,
            row.local_id
          );


        if (
          localMap.has(
            key
          )
        ) {

          state.knownLocal[
            key
          ] = true;

          state.knownCloud[
            key
          ] = true;

          continue;

        }


        if (
          state.knownCloud[
            key
          ]
        ) {

          continue;

        }


        const owner =
          owners.find(
            item =>
              String(
                item?.id
              ) ===
              String(
                row.owner_local_id
              )
          );


        if (!owner) {

          continue;

        }


        const expectedOwnerType =
          owner.isGroup
            ? "group"
            : "character";


        if (
          expectedOwnerType !==
          row.owner_type
        ) {

          continue;

        }


        try {

          const restored =
            await restoreOne(
              row.id
            );


          if (
            restored?.ok
          ) {

            result.restoredChats +=
              1;

            result.requiresReload =
              true;


            state.knownLocal[
              key
            ] = true;

            state.knownCloud[
              key
            ] = true;


            localMap.set(
              key,
              true
            );


            console.log(
              "🔥 V5.0.4A2 NEW CLOUD CHAT AUTO-RESTORED",
              {
                owner:
                  restored.ownerName,

                title:
                  restored.title,

                messages:
                  restored.restoredMessages
              }
            );

          }

        }

        catch (
          error
        ) {

          console.error(
            "[Chati-AI Conversations] Automatic cloud restore failed:",
            row,
            error
          );


          result.errors.push({
            direction:
              "restore",

            cloudConversationId:
              row.id,

            message:
              String(
                error?.message ||
                error
              )
          });

        }

      }


      // ========================================================
      // V5.0.4A2 — IMPORTANT BASELINE FIX
      //
      // DO NOT blanket-mark every currently visible local/cloud
      // conversation as known here.
      //
      // A newly-created empty local chat may be skipped above.
      // If we marked it known anyway, it would never upload after
      // the first real message is added.
      //
      // Likewise, a cloud chat that could not yet be restored
      // must remain unknown so another sync cycle can retry it.
      //
      // knownLocal / knownCloud are now updated ONLY when:
      // - the row already exists on both sides,
      // - upload succeeds,
      // - restore succeeds,
      // - or it existed in the initial baseline.
      // ========================================================


      saveConversationBaseline(
        session.user.id,
        state
      );


      if (
        result.requiresReload
      ) {

        autoConversationReloadPending =
          true;

        maybeReloadAfterConversationRestore();

      }


      const messageSyncResult =
        await syncAutomaticMessages(
          reason
        );

      result.uploadedMessages =
        messageSyncResult.uploadedMessages;

      result.downloadedMessages =
        messageSyncResult.downloadedMessages;

      result.messageSyncErrors =
        messageSyncResult.errors;


      const updateSyncResult =
        await syncAutomaticUpdates(
          reason
        );


      result.uploadedConversationUpdates =
        updateSyncResult.uploadedConversationUpdates ||
        0;

      result.downloadedConversationUpdates =
        updateSyncResult.downloadedConversationUpdates ||
        0;

      result.uploadedMessageUpdates =
        updateSyncResult.uploadedMessageUpdates ||
        0;

      result.downloadedMessageUpdates =
        updateSyncResult.downloadedMessageUpdates ||
        0;

      result.updateConflicts =
        Array.isArray(
          updateSyncResult.conflicts
        )
          ? updateSyncResult.conflicts.length
          : 0;

      result.updateSyncErrors =
        updateSyncResult.errors ||
        [];


      lastAutoConversationResult =
        result;


      if (
        result.uploadedChats ||
        result.restoredChats ||
        result.errors.length ||
        reason === "manual"
      ) {

        console.log(
          "[Chati-AI Conversations] V5.0.4A2 automatic sync complete:",
          result
        );

      }


      return result;

    }

    finally {

      autoConversationBusy =
        false;

    }

  }


  function scheduleAutoConversationSync(
    reason = "scheduled",
    delay = 500
  ) {

    if (
      !autoConversationEnabled
    ) {

      return;

    }


    if (
      autoConversationDelay
    ) {

      clearTimeout(
        autoConversationDelay
      );

    }


    autoConversationDelay =
      setTimeout(
        () => {

          autoConversationDelay =
            null;


          syncAutomaticNewChats(
            reason
          )
            .catch(
              error => {

                console.error(
                  "[Chati-AI Conversations] Automatic conversation sync failed:",
                  error
                );

              }
            );

        },
        delay
      );

  }


  function startAutoConversationSync() {

    if (
      autoConversationEnabled
    ) {

      return {
        ok:
          true,

        alreadyRunning:
          true
      };

    }


    autoConversationEnabled =
      true;


    scheduleAutoConversationSync(
      "start",
      900
    );


    autoConversationInterval =
      setInterval(
        () => {

          scheduleAutoConversationSync(
            "interval",
            0
          );

        },
        AUTO_CONVERSATION_SYNC_INTERVAL_MS
      );


    return {
      ok:
        true,

      intervalMs:
        AUTO_CONVERSATION_SYNC_INTERVAL_MS
    };

  }


  function stopAutoConversationSync() {

    autoConversationEnabled =
      false;


    if (
      autoConversationDelay
    ) {

      clearTimeout(
        autoConversationDelay
      );

      autoConversationDelay =
        null;

    }


    if (
      autoConversationInterval
    ) {

      clearInterval(
        autoConversationInterval
      );

      autoConversationInterval =
        null;

    }


    return {
      ok:
        true
    };

  }


  async function resetAutoConversationBaseline() {

    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        ok:
          false,

        reason:
          "signed-out"
      };

    }


    localStorage.removeItem(
      getConversationBaselineKey(
        session.user.id
      )
    );


    return initializeAutoConversationBaseline();

  }


  async function autoConversationStatus() {

    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        signedIn:
          false,

        enabled:
          autoConversationEnabled,

        busy:
          autoConversationBusy,

        baseline:
          null,

        lastResult:
          lastAutoConversationResult
      };

    }


    const state =
      readConversationBaseline(
        session.user.id
      );


    return {
      signedIn:
        true,

      userId:
        session.user.id,

      enabled:
        autoConversationEnabled,

      busy:
        autoConversationBusy,

      intervalMs:
        AUTO_CONVERSATION_SYNC_INTERVAL_MS,

      baseline:
        state
          ? {
              initializedAt:
                state.initializedAt,

              localKnown:
                Object.keys(
                  state.knownLocal
                ).length,

              cloudKnown:
                Object.keys(
                  state.knownCloud
                ).length
            }
          : null,

      reloadPending:
        autoConversationReloadPending,

      lastResult:
        lastAutoConversationResult
    };

  }


  window.addEventListener(
    "online",
    () => {

      scheduleAutoConversationSync(
        "online",
        300
      );

    }
  );


  window.addEventListener(
    "chati:authchange",
    () => {

      scheduleAutoConversationSync(
        "auth-change",
        500
      );

    }
  );


  window.addEventListener(
    "chati:characterschange",
    () => {

      scheduleAutoConversationSync(
        "characters-change",
        700
      );

    }
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState ===
          "visible"
      ) {

        if (
          maybeReloadAfterConversationRestore()
        ) {

          return;

        }


        scheduleAutoConversationSync(
          "visible",
          250
        );

      }

    }
  );


  startAutoConversationSync();



  // ============================================================
  // V5.0.4B — AUTOMATIC NEW MESSAGE SYNC
  //
  // APPEND-ONLY SAFE MODE
  //
  // - Existing normal cloud conversations only.
  // - Uploads messages missing from cloud.
  // - Downloads messages missing locally.
  // - Does not edit/delete existing messages yet.
  // - Private chats remain excluded.
  // ============================================================

  function getLocalMessageSyncId(
    message,
    chatId,
    index
  ) {

    return getMessageLocalId(
      message,
      chatId,
      index
    );

  }


  async function syncMessagesForConversation(
    localRow,
    cloudConversation
  ) {

    const result = {
      uploadedMessages: 0,
      downloadedMessages: 0,
      changedLocal: false
    };


    if (
      !localRow ||
      !cloudConversation
    ) {
      return result;
    }


    const found =
      await findLocalChat(
        localRow.ownerLocalId,
        localRow.chatId
      );


    const chat =
      found.chat;


    if (
      !chat ||
      chat.isPrivate
    ) {
      return result;
    }


    const localMessages =
      Array.isArray(
        chat.messages
      )
        ? chat.messages
        : [];


    const cloudMessages =
      await window
        .ChatiMessages
        .getAll(
          cloudConversation.id,
          {
            includeDeleted:
              false
          }
        );


    const localMap =
      new Map();


    for (
      let index = 0;
      index < localMessages.length;
      index += 1
    ) {

      const message =
        localMessages[index];

      const localId =
        getLocalMessageSyncId(
          message,
          localRow.chatId,
          index
        );


      localMap.set(
        localId,
        {
          message,
          index
        }
      );

    }


    const cloudMap =
      new Map();


    for (
      const message
      of cloudMessages
    ) {

      cloudMap.set(
        String(
          message.local_id
        ),
        message
      );

    }


    // --------------------------------------------------------
    // LOCAL -> CLOUD
    // --------------------------------------------------------

    for (
      let index = 0;
      index < localMessages.length;
      index += 1
    ) {

      const message =
        localMessages[index];

      const localId =
        getLocalMessageSyncId(
          message,
          localRow.chatId,
          index
        );


      if (
        cloudMap.has(
          localId
        )
      ) {
        continue;
      }


      await window
        .ChatiMessages
        .create({
          conversationId:
            cloudConversation.id,

          localId,

          sender:
            normalizeSender(
              message?.sender
            ),

          sortIndex:
            index,

          messageTime:
            message?.time ??
            Date.now(),

          payload:
            prepareMessagePayload(
              message
            )
        });


      result.uploadedMessages +=
        1;

    }


    // --------------------------------------------------------
    // CLOUD -> LOCAL
    // --------------------------------------------------------

    const missingCloudMessages =
      cloudMessages
        .filter(
          message =>
            !localMap.has(
              String(
                message.local_id
              )
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              a.sort_index ?? 0
            ) -
            Number(
              b.sort_index ?? 0
            )
        );


    if (
      missingCloudMessages.length
    ) {

      for (
        const cloudMessage
        of missingCloudMessages
      ) {

        const payload =
          clone(
            cloudMessage.payload ||
            {}
          );


        const restoredMessage = {
          ...payload,

          id:
            String(
              cloudMessage.local_id
            ),

          sender:
            normalizeSender(
              cloudMessage.sender
            ),

          time:
            timestampFromCloud(
              cloudMessage.message_time,
              Date.now()
            )
        };


        if (
          restoredMessage
            .attachmentDeferred &&
          !restoredMessage
            .attachment
        ) {

          restoredMessage.attachment =
            null;

        }


        localMessages.push(
          restoredMessage
        );


        result.downloadedMessages +=
          1;

      }


      localMessages.sort(
        (
          a,
          b
        ) =>
          Number(
            a?.time || 0
          ) -
          Number(
            b?.time || 0
          )
      );


      chat.messages =
        localMessages;


      chat.updatedAt =
        Date.now();


      const chats =
        await getOwnerChats(
          localRow.ownerLocalId
        );


      const chatIndex =
        chats.findIndex(
          item =>
            String(
              item?.id
            ) ===
            String(
              localRow.chatId
            )
        );


      if (
        chatIndex >= 0
      ) {

        chats[
          chatIndex
        ] =
          chat;


        await writeAppData(
          `${CHATS_PREFIX}${String(
            localRow.ownerLocalId
          )}`,
          chats
        );


        result.changedLocal =
          true;

      }

    }


    return result;

  }


  async function syncAutomaticMessages(
    reason = "manual"
  ) {

    const result = {
      ok: true,
      reason,
      uploadedMessages: 0,
      downloadedMessages: 0,
      changedLocalChats: 0,
      errors: []
    };


    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        ...result,
        ok: false,
        reason: "signed-out"
      };

    }


    const {
      rows: localRows
    } =
      await collectLocalConversationSnapshot();


    const cloudRows =
      (
        await window
          .ChatiConversations
          .getAll({
            includeDeleted:
              false
          })
      )
        .filter(
          isNormalCloudConversation
        );


    const cloudMap =
      new Map();


    for (
      const row
      of cloudRows
    ) {

      cloudMap.set(
        makeConversationSyncKey(
          row.owner_type,
          row.owner_local_id,
          row.local_id
        ),
        row
      );

    }


    for (
      const localRow
      of localRows
    ) {

      const key =
        makeConversationSyncKey(
          localRow.ownerType,
          localRow.ownerLocalId,
          localRow.chatId
        );


      const cloudConversation =
        cloudMap.get(
          key
        );


      if (
        !cloudConversation
      ) {
        continue;
      }


      try {

        const synced =
          await syncMessagesForConversation(
            localRow,
            cloudConversation
          );


        result.uploadedMessages +=
          synced.uploadedMessages;

        result.downloadedMessages +=
          synced.downloadedMessages;


        if (
          synced.changedLocal
        ) {

          result.changedLocalChats +=
            1;

        }

      }

      catch (
        error
      ) {

        console.error(
          "[Chati-AI Conversations] Message sync failed:",
          localRow,
          error
        );


        result.errors.push({
          chatId:
            localRow.chatId,

          message:
            String(
              error?.message ||
              error
            )
        });

      }

    }


    if (
      result.changedLocalChats
    ) {

      autoConversationReloadPending =
        true;

      maybeReloadAfterConversationRestore();

    }


    if (
      result.uploadedMessages ||
      result.downloadedMessages ||
      result.errors.length ||
      reason === "manual"
    ) {

      console.log(
        "🔥 V5.0.4B AUTOMATIC MESSAGE SYNC",
        result
      );

    }


    return result;

  }


  // ============================================================
  // V5.0.4C — CONFLICT-PROTECTED UPDATES
  //
  // SAFE UPDATE MODE
  //
  // - Detects edits to existing normal conversations.
  // - Detects edits to existing normal messages.
  // - Uses cloud row versions for optimistic concurrency.
  // - Local-only change -> upload.
  // - Cloud-only change -> download.
  // - Both changed -> conflict; NOTHING is overwritten.
  // - Private Chat / Private Group remain excluded.
  // - Deletes are intentionally deferred to V5.0.4D.
  // ============================================================


  let autoUpdateBusy =
    false;

  let lastUpdateConflicts =
    [];

  let lastUpdateResult =
    null;


  function getUpdateBaselineKey(
    userId
  ) {

    return (
      `chatiConversationUpdateBaselineV504C_${String(
        userId
      )}`
    );

  }


  function createEmptyUpdateBaseline() {

    return {
      initializedAt:
        Date.now(),

      conversations:
        {},

      messages:
        {}
    };

  }


  function readUpdateBaseline(
    userId
  ) {

    try {

      const raw =
        localStorage.getItem(
          getUpdateBaselineKey(
            userId
          )
        );


      if (!raw) {
        return createEmptyUpdateBaseline();
      }


      const parsed =
        JSON.parse(
          raw
        );


      if (
        !parsed ||
        typeof parsed !==
          "object"
      ) {

        return createEmptyUpdateBaseline();

      }


      return {
        initializedAt:
          Number(
            parsed.initializedAt ||
            Date.now()
          ),

        conversations:
          (
            parsed.conversations &&
            typeof parsed.conversations ===
              "object"
          )
            ? parsed.conversations
            : {},

        messages:
          (
            parsed.messages &&
            typeof parsed.messages ===
              "object"
          )
            ? parsed.messages
            : {}
      };

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] Could not read V5.0.4C update baseline.",
        error
      );


      return createEmptyUpdateBaseline();

    }

  }


  function saveUpdateBaseline(
    userId,
    state
  ) {

    localStorage.setItem(
      getUpdateBaselineKey(
        userId
      ),
      JSON.stringify(
        state
      )
    );

  }


  function stableNormalize(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return value === undefined
        ? null
        : value;

    }


    if (
      typeof value !==
        "object"
    ) {

      return value;

    }


    if (
      Array.isArray(
        value
      )
    ) {

      return value.map(
        stableNormalize
      );

    }


    const output =
      {};


    for (
      const key
      of Object.keys(
        value
      ).sort()
    ) {

      if (
        value[
          key
        ] === undefined
      ) {
        continue;
      }


      output[
        key
      ] =
        stableNormalize(
          value[
            key
          ]
        );

    }


    return output;

  }


  async function fingerprintUpdateValue(
    value
  ) {

    const source =
      JSON.stringify(
        stableNormalize(
          value
        )
      );


    try {

      if (
        window.crypto?.subtle &&
        typeof TextEncoder ===
          "function"
      ) {

        const bytes =
          new TextEncoder()
            .encode(
              source
            );


        const digest =
          await window.crypto
            .subtle
            .digest(
              "SHA-256",
              bytes
            );


        return Array
          .from(
            new Uint8Array(
              digest
            )
          )
          .map(
            byte =>
              byte
                .toString(
                  16
                )
                .padStart(
                  2,
                  "0"
                )
          )
          .join(
            ""
          );

      }

    }

    catch (
      error
    ) {

      console.warn(
        "[Chati-AI Conversations] SHA-256 fingerprint unavailable; using fallback.",
        error
      );

    }


    let hash =
      2166136261;


    for (
      let index = 0;
      index < source.length;
      index += 1
    ) {

      hash ^=
        source.charCodeAt(
          index
        );

      hash =
        Math.imul(
          hash,
          16777619
        );

    }


    return (
      `fnv1a_${(
        hash >>> 0
      ).toString(
        16
      )}`
    );

  }


  function getConversationUpdateStateFromLocal(
    chat
  ) {

    return {
      title:
        String(
          chat?.title ||
          "New Chat"
        ),

      memory:
        prepareMemory(
          chat?.memory
        )
    };

  }


  function getConversationUpdateStateFromCloud(
    conversation
  ) {

    return {
      title:
        String(
          conversation?.title ||
          "New Chat"
        ),

      memory:
        prepareMemory(
          conversation?.memory
        )
    };

  }


  function getMessageUpdateStateFromLocal(
    message
  ) {

    return {
      payload:
        prepareMessagePayload(
          message
        )
    };

  }


  function getMessageUpdateStateFromCloud(
    message
  ) {

    return {
      payload:
        clone(
          (
            message?.payload &&
            typeof message.payload ===
              "object"
          )
            ? message.payload
            : {}
        )
    };

  }


  function makeMessageUpdateKey(
    conversationKey,
    localMessageId
  ) {

    return (
      `${conversationKey}::message::${String(
        localMessageId
      )}`
    );

  }


  function setUpdateBaselineEntry(
    container,
    key,
    version,
    fingerprint
  ) {

    container[
      key
    ] = {
      version:
        Number(
          version
        ) ||
        1,

      fingerprint:
        String(
          fingerprint
        )
    };

  }


  function addUpdateConflict(
    result,
    conflict
  ) {

    result.conflicts.push(
      conflict
    );

  }


  async function writeNormalChatPreservingStorage(
    ownerLocalId,
    updatedChat
  ) {

    const ownerId =
      String(
        ownerLocalId
      );


    const raw =
      await readAppData(
        `${CHATS_PREFIX}${ownerId}`
      );


    const allChats =
      parseArray(
        raw
      );


    const index =
      allChats.findIndex(
        item =>
          String(
            item?.id
          ) ===
          String(
            updatedChat?.id
          )
      );


    if (
      index < 0
    ) {

      throw new Error(
        `Could not locate local chat for update: ${String(
          updatedChat?.id
        )}`
      );

    }


    allChats[
      index
    ] =
      updatedChat;


    await writeAppData(
      `${CHATS_PREFIX}${ownerId}`,
      allChats
    );

  }


  function mergeCloudMessageUpdateIntoLocal(
    localMessage,
    cloudMessage
  ) {

    const payload =
      clone(
        (
          cloudMessage?.payload &&
          typeof cloudMessage.payload ===
            "object"
        )
          ? cloudMessage.payload
          : {}
      );


    const restored = {
      ...payload,

      id:
        String(
          cloudMessage?.local_id ??
          localMessage?.id ??
          crypto.randomUUID()
        ),

      sender:
        normalizeSender(
          cloudMessage?.sender
        ),

      time:
        timestampFromCloud(
          cloudMessage?.message_time,
          localMessage?.time ??
          Date.now()
        )
    };


    // Chat attachments are still deferred in V5.
    // Never destroy a valid local attachment merely because
    // the cloud payload currently contains deferred metadata.

    if (
      payload?.attachmentDeferred &&
      !payload?.attachment &&
      localMessage?.attachment
    ) {

      restored.attachment =
        clone(
          localMessage.attachment
        );

    }


    return restored;

  }


  async function syncUpdatesForConversation(
    localRow,
    cloudConversation,
    state,
    result
  ) {

    const {
      chat
    } =
      await findLocalChat(
        localRow.ownerLocalId,
        localRow.chatId
      );


    if (
      !chat ||
      chat.isPrivate
    ) {

      return;

    }


    const conversationKey =
      makeConversationSyncKey(
        localRow.ownerType,
        localRow.ownerLocalId,
        localRow.chatId
      );


    let chatDirty =
      false;


    const pendingRemoteBaselines =
      [];


    // ========================================================
    // CONVERSATION METADATA
    // ========================================================

    const localConversationFingerprint =
      await fingerprintUpdateValue(
        getConversationUpdateStateFromLocal(
          chat
        )
      );


    const cloudConversationFingerprint =
      await fingerprintUpdateValue(
        getConversationUpdateStateFromCloud(
          cloudConversation
        )
      );


    const conversationBaseline =
      state.conversations[
        conversationKey
      ];


    if (
      !conversationBaseline
    ) {

      if (
        localConversationFingerprint ===
        cloudConversationFingerprint
      ) {

        setUpdateBaselineEntry(
          state.conversations,
          conversationKey,
          cloudConversation.version,
          cloudConversationFingerprint
        );


        result.createdConversationBaselines +=
          1;

      }

      else {

        addUpdateConflict(
          result,
          {
            type:
              "untracked-conversation-divergence",

            ownerType:
              localRow.ownerType,

            ownerLocalId:
              localRow.ownerLocalId,

            ownerName:
              localRow.ownerName,

            chatId:
              localRow.chatId,

            baselineVersion:
              null,

            cloudVersion:
              Number(
                cloudConversation.version
              ) ||
              1
          }
        );

      }

    }

    else {

      const localChanged =
        localConversationFingerprint !==
        conversationBaseline.fingerprint;

      const cloudChanged =
        cloudConversationFingerprint !==
        conversationBaseline.fingerprint;


      // Same semantic state, but cloud row version advanced.
      if (
        !cloudChanged &&
        Number(
          conversationBaseline.version
        ) !==
        Number(
          cloudConversation.version
        )
      ) {

        conversationBaseline.version =
          Number(
            cloudConversation.version
          ) ||
          conversationBaseline.version;

      }


      if (
        !localChanged &&
        !cloudChanged
      ) {

        // Nothing to do.

      }

      else if (
        localChanged &&
        !cloudChanged
      ) {

        const saved =
          await window
            .ChatiConversations
            .updateIfVersion(
              localRow.chatId,
              localRow.ownerType,
              localRow.ownerLocalId,
              conversationBaseline.version,
              {
                title:
                  String(
                    chat.title ||
                    "New Chat"
                  ),

                memory:
                  prepareMemory(
                    chat.memory
                  )
              }
            );


        if (
          !saved
        ) {

          addUpdateConflict(
            result,
            {
              type:
                "stale-conversation-update-blocked",

              ownerType:
                localRow.ownerType,

              ownerLocalId:
                localRow.ownerLocalId,

              ownerName:
                localRow.ownerName,

              chatId:
                localRow.chatId,

              baselineVersion:
                conversationBaseline.version,

              cloudVersion:
                Number(
                  cloudConversation.version
                ) ||
                null
            }
          );

        }

        else {

          setUpdateBaselineEntry(
            state.conversations,
            conversationKey,
            saved.version,
            localConversationFingerprint
          );


          result.uploadedConversationUpdates +=
            1;

        }

      }

      else if (
        !localChanged &&
        cloudChanged
      ) {

        chat.title =
          String(
            cloudConversation.title ||
            "New Chat"
          );


        chat.memory =
          prepareMemory(
            cloudConversation.memory
          );


        chat.updatedAt =
          timestampFromCloud(
            cloudConversation.updated_at,
            Date.now()
          );


        chatDirty =
          true;


        pendingRemoteBaselines.push({
          type:
            "conversation",

          key:
            conversationKey,

          version:
            cloudConversation.version,

          fingerprint:
            cloudConversationFingerprint
        });


        result.downloadedConversationUpdates +=
          1;

      }

      else {

        addUpdateConflict(
          result,
          {
            type:
              "conversation-both-edited",

            ownerType:
              localRow.ownerType,

            ownerLocalId:
              localRow.ownerLocalId,

            ownerName:
              localRow.ownerName,

            chatId:
              localRow.chatId,

            baselineVersion:
              conversationBaseline.version,

            cloudVersion:
              Number(
                cloudConversation.version
              ) ||
              null
          }
        );

      }

    }


    // ========================================================
    // MESSAGE UPDATES
    // ========================================================

    const localMessages =
      Array.isArray(
        chat.messages
      )
        ? chat.messages
        : [];


    const cloudMessages =
      await window
        .ChatiMessages
        .getAll(
          cloudConversation.id,
          {
            includeDeleted:
              false
          }
        );


    const cloudMessageMap =
      new Map();


    for (
      const cloudMessage
      of cloudMessages
    ) {

      cloudMessageMap.set(
        String(
          cloudMessage.local_id
        ),
        cloudMessage
      );

    }


    for (
      let index = 0;
      index < localMessages.length;
      index += 1
    ) {

      const localMessage =
        localMessages[
          index
        ];


      const localMessageId =
        getLocalMessageSyncId(
          localMessage,
          localRow.chatId,
          index
        );


      const cloudMessage =
        cloudMessageMap.get(
          String(
            localMessageId
          )
        );


      // New/missing messages are handled by V5.0.4B.
      if (
        !cloudMessage
      ) {
        continue;
      }


      const messageKey =
        makeMessageUpdateKey(
          conversationKey,
          localMessageId
        );


      const localFingerprint =
        await fingerprintUpdateValue(
          getMessageUpdateStateFromLocal(
            localMessage
          )
        );


      const cloudFingerprint =
        await fingerprintUpdateValue(
          getMessageUpdateStateFromCloud(
            cloudMessage
          )
        );


      const baseline =
        state.messages[
          messageKey
        ];


      if (!baseline) {

        if (
          localFingerprint ===
          cloudFingerprint
        ) {

          setUpdateBaselineEntry(
            state.messages,
            messageKey,
            cloudMessage.version,
            cloudFingerprint
          );


          result.createdMessageBaselines +=
            1;

        }

        else {

          addUpdateConflict(
            result,
            {
              type:
                "untracked-message-divergence",

              ownerType:
                localRow.ownerType,

              ownerLocalId:
                localRow.ownerLocalId,

              ownerName:
                localRow.ownerName,

              chatId:
                localRow.chatId,

              messageId:
                String(
                  localMessageId
                ),

              baselineVersion:
                null,

              cloudVersion:
                Number(
                  cloudMessage.version
                ) ||
                1
            }
          );

        }


        continue;

      }


      const localChanged =
        localFingerprint !==
        baseline.fingerprint;

      const cloudChanged =
        cloudFingerprint !==
        baseline.fingerprint;


      // Refresh version if the semantic state is identical.
      if (
        !cloudChanged &&
        Number(
          baseline.version
        ) !==
        Number(
          cloudMessage.version
        )
      ) {

        baseline.version =
          Number(
            cloudMessage.version
          ) ||
          baseline.version;

      }


      if (
        !localChanged &&
        !cloudChanged
      ) {

        continue;

      }


      if (
        localChanged &&
        !cloudChanged
      ) {

        const saved =
          await window
            .ChatiMessages
            .updateIfVersion(
              cloudConversation.id,
              String(
                localMessageId
              ),
              baseline.version,
              {
                payload:
                  prepareMessagePayload(
                    localMessage
                  ),

                sortIndex:
                  index
              }
            );


        if (
          !saved
        ) {

          addUpdateConflict(
            result,
            {
              type:
                "stale-message-update-blocked",

              ownerType:
                localRow.ownerType,

              ownerLocalId:
                localRow.ownerLocalId,

              ownerName:
                localRow.ownerName,

              chatId:
                localRow.chatId,

              messageId:
                String(
                  localMessageId
                ),

              baselineVersion:
                baseline.version,

              cloudVersion:
                Number(
                  cloudMessage.version
                ) ||
                null
            }
          );

        }

        else {

          setUpdateBaselineEntry(
            state.messages,
            messageKey,
            saved.version,
            localFingerprint
          );


          result.uploadedMessageUpdates +=
            1;

        }


        continue;

      }


      if (
        !localChanged &&
        cloudChanged
      ) {

        localMessages[
          index
        ] =
          mergeCloudMessageUpdateIntoLocal(
            localMessage,
            cloudMessage
          );


        chat.messages =
          localMessages;


        chat.updatedAt =
          Date.now();


        chatDirty =
          true;


        pendingRemoteBaselines.push({
          type:
            "message",

          key:
            messageKey,

          version:
            cloudMessage.version,

          fingerprint:
            cloudFingerprint
        });


        result.downloadedMessageUpdates +=
          1;


        continue;

      }


      addUpdateConflict(
        result,
        {
          type:
            "message-both-edited",

          ownerType:
            localRow.ownerType,

          ownerLocalId:
            localRow.ownerLocalId,

          ownerName:
            localRow.ownerName,

          chatId:
            localRow.chatId,

          messageId:
            String(
              localMessageId
            ),

          baselineVersion:
            baseline.version,

          cloudVersion:
            Number(
              cloudMessage.version
            ) ||
            null
        }
      );

    }


    // ========================================================
    // SAVE REMOTE CHANGES LOCALLY
    // ========================================================

    if (
      chatDirty
    ) {

      await writeNormalChatPreservingStorage(
        localRow.ownerLocalId,
        chat
      );


      result.changedLocalChats +=
        1;


      // Only advance cloud->local baselines AFTER the local
      // IndexedDB write succeeds.

      for (
        const pending
        of pendingRemoteBaselines
      ) {

        if (
          pending.type ===
            "conversation"
        ) {

          setUpdateBaselineEntry(
            state.conversations,
            pending.key,
            pending.version,
            pending.fingerprint
          );

        }

        else {

          setUpdateBaselineEntry(
            state.messages,
            pending.key,
            pending.version,
            pending.fingerprint
          );

        }

      }

    }

  }


  async function syncAutomaticUpdates(
    reason = "manual"
  ) {

    if (
      autoUpdateBusy
    ) {

      return {
        ok:
          false,

        reason:
          "busy",

        conflicts:
          clone(
            lastUpdateConflicts
          )
      };

    }


    autoUpdateBusy =
      true;


    const result = {
      ok:
        true,

      reason,

      createdConversationBaselines:
        0,

      createdMessageBaselines:
        0,

      uploadedConversationUpdates:
        0,

      downloadedConversationUpdates:
        0,

      uploadedMessageUpdates:
        0,

      downloadedMessageUpdates:
        0,

      changedLocalChats:
        0,

      conflicts:
        [],

      errors:
        []
    };


    try {

      const session =
        await getConversationSyncSession();


      if (
        !session?.user?.id
      ) {

        return {
          ...result,
          ok:
            false,
          reason:
            "signed-out"
        };

      }


      const state =
        readUpdateBaseline(
          session.user.id
        );


      const {
        rows:
          localRows
      } =
        await collectLocalConversationSnapshot();


      const cloudRows =
        (
          await window
            .ChatiConversations
            .getAll({
              includeDeleted:
                false
            })
        )
          .filter(
            isNormalCloudConversation
          );


      const cloudMap =
        new Map();


      for (
        const cloudConversation
        of cloudRows
      ) {

        cloudMap.set(
          makeConversationSyncKey(
            cloudConversation.owner_type,
            cloudConversation.owner_local_id,
            cloudConversation.local_id
          ),
          cloudConversation
        );

      }


      for (
        const localRow
        of localRows
      ) {

        const key =
          makeConversationSyncKey(
            localRow.ownerType,
            localRow.ownerLocalId,
            localRow.chatId
          );


        const cloudConversation =
          cloudMap.get(
            key
          );


        // New chats are still handled by V5.0.4A/B.
        if (
          !cloudConversation
        ) {
          continue;
        }


        try {

          await syncUpdatesForConversation(
            localRow,
            cloudConversation,
            state,
            result
          );

        }

        catch (
          error
        ) {

          console.error(
            "[Chati-AI Conversations] V5.0.4C update sync failed:",
            localRow,
            error
          );


          result.errors.push({
            ownerType:
              localRow.ownerType,

            ownerLocalId:
              localRow.ownerLocalId,

            chatId:
              localRow.chatId,

            message:
              String(
                error?.message ||
                error
              )
          });

        }

      }


      saveUpdateBaseline(
        session.user.id,
        state
      );


      lastUpdateConflicts =
        clone(
          result.conflicts
        );


      lastUpdateResult =
        clone(
          result
        );


      if (
        result.changedLocalChats
      ) {

        autoConversationReloadPending =
          true;


        maybeReloadAfterConversationRestore();

      }


      if (
        result.uploadedConversationUpdates ||
        result.downloadedConversationUpdates ||
        result.uploadedMessageUpdates ||
        result.downloadedMessageUpdates ||
        result.conflicts.length ||
        result.errors.length ||
        reason ===
          "manual"
      ) {

        console.log(
          "🔥 V5.0.4C CONFLICT-PROTECTED UPDATE SYNC",
          result
        );

      }


      if (
        result.conflicts.length
      ) {

        console.warn(
          `[Chati-AI Conversations] ${result.conflicts.length} update conflict(s) protected. Nothing conflicting was overwritten.`,
          result.conflicts
        );


        window.dispatchEvent(
          new CustomEvent(
            "chati:conversationupdateconflict",
            {
              detail:
                clone(
                  result.conflicts
                )
            }
          )
        );

      }


      return result;

    }

    finally {

      autoUpdateBusy =
        false;

    }

  }


  function getUpdateConflicts() {

    return clone(
      lastUpdateConflicts
    );

  }


  async function updateSyncStatus() {

    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        signedIn:
          false,

        busy:
          autoUpdateBusy,

        baseline:
          null,

        conflicts:
          clone(
            lastUpdateConflicts
          ),

        lastResult:
          clone(
            lastUpdateResult
          )
      };

    }


    const state =
      readUpdateBaseline(
        session.user.id
      );


    return {
      signedIn:
        true,

      userId:
        session.user.id,

      busy:
        autoUpdateBusy,

      baseline: {
        initializedAt:
          state.initializedAt,

        conversations:
          Object.keys(
            state.conversations
          ).length,

        messages:
          Object.keys(
            state.messages
          ).length
      },

      conflicts:
        clone(
          lastUpdateConflicts
        ),

      lastResult:
        clone(
          lastUpdateResult
        )
    };

  }


  async function resetUpdateBaseline() {

    const session =
      await getConversationSyncSession();


    if (
      !session?.user?.id
    ) {

      return {
        ok:
          false,

        reason:
          "signed-out"
      };

    }


    localStorage.removeItem(
      getUpdateBaselineKey(
        session.user.id
      )
    );


    lastUpdateConflicts =
      [];

    lastUpdateResult =
      null;


    return syncAutomaticUpdates(
      "baseline-reset"
    );

  }


  // ============================================================
  // STATUS
  // ============================================================

  async function status() {

    const localChats =
      await previewLocalChats();


    const cloud =
      await window
        .ChatiConversations
        .status();


    return {
      localChats:
        localChats.length,

      cloudConversations:
        cloud.conversations,

      cloudMessages:
        cloud.messages,

      signedIn:
        cloud.signedIn
    };

  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  window.ChatiConversationSync =
    Object.freeze({
      previewLocalChats,
      previewCloudChats,
      findLocalChat,
      backupOne,
      restoreOne,
      initializeAutoConversationBaseline,
      syncAutomaticNewChats,
      startAutoConversationSync,
      stopAutoConversationSync,
      resetAutoConversationBaseline,
      autoConversationStatus,
      syncAutomaticMessages,
      syncMessagesForConversation,
      syncAutomaticUpdates,
      getUpdateConflicts,
      updateSyncStatus,
      resetUpdateBaseline,
      status
    });


  console.log(
    "[Chati-AI Conversations] V5.0.4C conflict-protected chat update sync ready."
  );

})();
