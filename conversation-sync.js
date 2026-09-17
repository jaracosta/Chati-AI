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
      status
    });


  console.log(
    "[Chati-AI Conversations] V5.0.3A safe cross-device chat restore ready."
  );

})();
