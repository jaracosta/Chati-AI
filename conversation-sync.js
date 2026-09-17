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
      findLocalChat,
      backupOne,
      status
    });


  console.log(
    "[Chati-AI Conversations] V5.0.2A manual real-chat backup ready."
  );

})();
