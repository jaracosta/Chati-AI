// ============================================================
// CHATI-AI V5.0.1B — CONVERSATION CLOUD CLIENT
//
// Cloud database client for:
// - Normal conversations
// - Normal group conversations
// - Individual messages
//
// IMPORTANT:
// Private Chat / Private Group Chat / temporary conversations
// are NEVER accepted by this client.
//
// This file DOES NOT sync local chats yet.
// V5.0.2 will connect it to script.js.
// ============================================================

(() => {
  "use strict";


  const CONVERSATIONS_TABLE =
    "cloud_conversations";

  const MESSAGES_TABLE =
    "cloud_messages";


  // ============================================================
  // BASIC HELPERS
  // ============================================================

  function getClient() {

    if (
      !window.ChatiAuth ||
      typeof window.ChatiAuth.getClient !== "function"
    ) {

      throw new Error(
        "ChatiAuth is unavailable."
      );

    }


    return window.ChatiAuth
      .getClient();

  }


  async function getSession() {

    if (
      !window.ChatiAuth ||
      typeof window.ChatiAuth.getSession !== "function"
    ) {

      throw new Error(
        "ChatiAuth is unavailable."
      );

    }


    const {
      data,
      error
    } =
      await window.ChatiAuth
        .getSession();


    if (error) {
      throw error;
    }


    if (
      !data?.session?.user
    ) {

      throw new Error(
        "You must sign in before using cloud conversations."
      );

    }


    return data.session;

  }


  function assertId(
    value,
    label = "ID"
  ) {

    const id =
      String(
        value ?? ""
      )
        .trim();


    if (!id) {

      throw new Error(
        `${label} is required.`
      );

    }


    return id;

  }


  function assertOwnerType(
    value
  ) {

    const type =
      String(
        value ?? ""
      )
        .trim()
        .toLowerCase();


    if (
      type !== "character" &&
      type !== "group"
    ) {

      throw new Error(
        "Conversation owner type must be character or group."
      );

    }


    return type;

  }


  function assertSender(
    value
  ) {

    const sender =
      String(
        value ?? ""
      )
        .trim()
        .toLowerCase();


    if (
      ![
        "user",
        "character",
        "system"
      ].includes(
        sender
      )
    ) {

      throw new Error(
        "Message sender must be user, character, or system."
      );

    }


    return sender;

  }


  function assertVersion(
    value
  ) {

    const version =
      Number(
        value
      );


    if (
      !Number.isInteger(
        version
      ) ||
      version < 1
    ) {

      throw new Error(
        "A valid expected cloud version is required."
      );

    }


    return version;

  }


  function assertSortIndex(
    value
  ) {

    const index =
      Number(
        value
      );


    if (
      !Number.isInteger(
        index
      ) ||
      index < 0
    ) {

      throw new Error(
        "Message sort index must be zero or greater."
      );

    }


    return index;

  }


  function asPlainObject(
    value,
    label = "Payload"
  ) {

    if (
      value == null
    ) {

      return {};

    }


    if (
      typeof value !== "object" ||
      Array.isArray(
        value
      )
    ) {

      throw new Error(
        `${label} must be an object.`
      );

    }


    return value;

  }


  function toIsoTimestamp(
    value
  ) {

    if (
      value == null ||
      value === ""
    ) {

      return null;

    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      throw new Error(
        "Invalid timestamp."
      );

    }


    return date
      .toISOString();

  }


  function normalizeMessageTime(
    value
  ) {

    if (
      value == null ||
      value === ""
    ) {

      return null;

    }


    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      throw new Error(
        "Invalid message timestamp."
      );

    }


    return Math.trunc(
      number
    );

  }


  // ============================================================
  // PRIVATE / TEMPORARY DEFENSE
  // ============================================================

  const BLOCKED_MARKERS =
    new Set([
      "private",
      "private_chat",
      "private_group",
      "private_group_chat",
      "temporary",
      "temporary_chat",
      "temporary_group"
    ]);


  function assertNormalScope({
    isPrivate = false,
    sourceScope = "normal"
  } = {}) {

    if (
      isPrivate === true
    ) {

      throw new Error(
        "Private conversations are never allowed in cloud storage."
      );

    }


    const scope =
      String(
        sourceScope ?? "normal"
      )
        .trim()
        .toLowerCase();


    if (
      scope !== "normal"
    ) {

      throw new Error(
        `Cloud conversation scope blocked: ${scope}`
      );

    }


    return "normal";

  }


  function containsPrivateMarker(
    value,
    depth = 0
  ) {

    if (
      depth > 5 ||
      value == null
    ) {

      return false;

    }


    if (
      Array.isArray(
        value
      )
    ) {

      return value.some(
        item =>
          containsPrivateMarker(
            item,
            depth + 1
          )
      );

    }


    if (
      typeof value !== "object"
    ) {

      return false;

    }


    for (
      const [
        key,
        item
      ] of Object.entries(
        value
      )
    ) {

      const normalizedKey =
        String(
          key
        )
          .trim()
          .toLowerCase();


      if (
        (
          normalizedKey === "isprivate" ||
          normalizedKey === "private"
        ) &&
        item === true
      ) {

        return true;

      }


      if (
        normalizedKey === "sourcescope" ||
        normalizedKey === "source_scope"
      ) {

        const scope =
          String(
            item ?? ""
          )
            .trim()
            .toLowerCase();


        if (
          scope &&
          scope !== "normal"
        ) {

          return true;

        }

      }


      if (
        normalizedKey === "type" ||
        normalizedKey === "mode"
      ) {

        const marker =
          String(
            item ?? ""
          )
            .trim()
            .toLowerCase();


        if (
          BLOCKED_MARKERS.has(
            marker
          ) ||
          marker.startsWith(
            "private_"
          ) ||
          marker.startsWith(
            "temporary_"
          )
        ) {

          return true;

        }

      }


      if (
        containsPrivateMarker(
          item,
          depth + 1
        )
      ) {

        return true;

      }

    }


    return false;

  }


  function assertCloudSafeObject(
    value,
    label
  ) {

    const object =
      asPlainObject(
        value,
        label
      );


    if (
      containsPrivateMarker(
        object
      )
    ) {

      throw new Error(
        `${label} contains private or temporary data and cannot be uploaded.`
      );

    }


    return object;

  }


  // ============================================================
  // ERROR HELPER
  // ============================================================

  function throwIfError(
    error
  ) {

    if (error) {
      throw error;
    }

  }


  // ============================================================
  // CONVERSATIONS — CREATE
  // ============================================================

  async function createConversation({
    localId,
    ownerType,
    ownerLocalId,
    title = "New Chat",
    memory = {},
    sourceScope = "normal",
    isPrivate = false,
    createdAt = null
  } = {}) {

    assertNormalScope({
      isPrivate,
      sourceScope
    });


    const id =
      assertId(
        localId,
        "Conversation local ID"
      );


    const type =
      assertOwnerType(
        ownerType
      );


    const ownerId =
      assertId(
        ownerLocalId,
        "Conversation owner local ID"
      );


    const safeMemory =
      assertCloudSafeObject(
        memory,
        "Conversation memory"
      );


    const session =
      await getSession();


    const row = {
      user_id:
        session.user.id,

      local_id:
        id,

      owner_type:
        type,

      owner_local_id:
        ownerId,

      title:
        String(
          title ?? "New Chat"
        ),

      memory:
        safeMemory,

      source_scope:
        "normal",

      is_private:
        false
    };


    const created =
      toIsoTimestamp(
        createdAt
      );


    if (created) {

      row.created_at =
        created;

    }


    const {
      data,
      error
    } =
      await getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .insert(
          row
        )
        .select()
        .single();


    throwIfError(
      error
    );


    return data;

  }


  // ============================================================
  // CONVERSATIONS — GET ONE
  // ============================================================

  async function getConversation(
    localId,
    {
      ownerType,
      ownerLocalId,
      includeDeleted = false
    } = {}
  ) {

    const id =
      assertId(
        localId,
        "Conversation local ID"
      );


    const type =
      assertOwnerType(
        ownerType
      );


    const ownerId =
      assertId(
        ownerLocalId,
        "Conversation owner local ID"
      );


    const session =
      await getSession();


    let query =
      getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .select("*")
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "local_id",
          id
        )
        .eq(
          "owner_type",
          type
        )
        .eq(
          "owner_local_id",
          ownerId
        );


    if (
      !includeDeleted
    ) {

      query =
        query.is(
          "deleted_at",
          null
        );

    }


    const {
      data,
      error
    } =
      await query
        .maybeSingle();


    throwIfError(
      error
    );


    return data ?? null;

  }


  // ============================================================
  // CONVERSATIONS — GET MANY
  // ============================================================

  async function getConversations({
    ownerType = null,
    ownerLocalId = null,
    includeDeleted = false,
    since = null
  } = {}) {

    const session =
      await getSession();


    let query =
      getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .select("*")
        .eq(
          "user_id",
          session.user.id
        );


    if (
      ownerType != null
    ) {

      query =
        query.eq(
          "owner_type",
          assertOwnerType(
            ownerType
          )
        );

    }


    if (
      ownerLocalId != null
    ) {

      query =
        query.eq(
          "owner_local_id",
          assertId(
            ownerLocalId,
            "Conversation owner local ID"
          )
        );

    }


    if (
      !includeDeleted
    ) {

      query =
        query.is(
          "deleted_at",
          null
        );

    }


    if (
      since != null
    ) {

      const timestamp =
        toIsoTimestamp(
          since
        );


      query =
        query.gt(
          "updated_at",
          timestamp
        );

    }


    const {
      data,
      error
    } =
      await query
        .order(
          "updated_at",
          {
            ascending:
              true
          }
        );


    throwIfError(
      error
    );


    return Array.isArray(
      data
    )
      ? data
      : [];

  }


  // ============================================================
  // CONVERSATIONS — CONDITIONAL PATCH
  // ============================================================

  async function patchConversationIfVersion(
    localId,
    ownerType,
    ownerLocalId,
    expectedVersion,
    changes = {}
  ) {

    const id =
      assertId(
        localId,
        "Conversation local ID"
      );


    const type =
      assertOwnerType(
        ownerType
      );


    const ownerId =
      assertId(
        ownerLocalId,
        "Conversation owner local ID"
      );


    const version =
      assertVersion(
        expectedVersion
      );


    const safeChanges =
      {};


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "title"
      )
    ) {

      safeChanges.title =
        String(
          changes.title ?? ""
        );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "memory"
      )
    ) {

      safeChanges.memory =
        assertCloudSafeObject(
          changes.memory,
          "Conversation memory"
        );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "deleted_at"
      )
    ) {

      safeChanges.deleted_at =
        changes.deleted_at;

    }


    if (
      !Object.keys(
        safeChanges
      ).length
    ) {

      throw new Error(
        "No valid conversation changes were provided."
      );

    }


    const session =
      await getSession();


    const {
      data,
      error
    } =
      await getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .update(
          safeChanges
        )
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "local_id",
          id
        )
        .eq(
          "owner_type",
          type
        )
        .eq(
          "owner_local_id",
          ownerId
        )
        .eq(
          "version",
          version
        )
        .select();


    throwIfError(
      error
    );


    return (
      Array.isArray(
        data
      ) &&
      data.length
    )
      ? data[0]
      : null;

  }


  async function updateConversationIfVersion(
    localId,
    ownerType,
    ownerLocalId,
    expectedVersion,
    {
      title,
      memory
    } = {}
  ) {

    const changes =
      {};


    if (
      title !== undefined
    ) {

      changes.title =
        title;

    }


    if (
      memory !== undefined
    ) {

      changes.memory =
        memory;

    }


    return patchConversationIfVersion(
      localId,
      ownerType,
      ownerLocalId,
      expectedVersion,
      changes
    );

  }


  async function removeConversationIfVersion(
    localId,
    ownerType,
    ownerLocalId,
    expectedVersion
  ) {

    return patchConversationIfVersion(
      localId,
      ownerType,
      ownerLocalId,
      expectedVersion,
      {
        deleted_at:
          new Date()
            .toISOString()
      }
    );

  }


  async function restoreConversationIfVersion(
    localId,
    ownerType,
    ownerLocalId,
    expectedVersion
  ) {

    return patchConversationIfVersion(
      localId,
      ownerType,
      ownerLocalId,
      expectedVersion,
      {
        deleted_at:
          null
      }
    );

  }


  async function purgeConversation(
    localId,
    ownerType,
    ownerLocalId
  ) {

    const id =
      assertId(
        localId,
        "Conversation local ID"
      );


    const type =
      assertOwnerType(
        ownerType
      );


    const ownerId =
      assertId(
        ownerLocalId,
        "Conversation owner local ID"
      );


    const session =
      await getSession();


    const {
      data,
      error
    } =
      await getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .delete()
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "local_id",
          id
        )
        .eq(
          "owner_type",
          type
        )
        .eq(
          "owner_local_id",
          ownerId
        )
        .select();


    throwIfError(
      error
    );


    return (
      Array.isArray(
        data
      ) &&
      data.length
    )
      ? data[0]
      : null;

  }


  // ============================================================
  // MESSAGES — CREATE
  // ============================================================

  async function createMessage({
    conversationId,
    localId,
    sender,
    sortIndex,
    messageTime = null,
    payload = {},
    sourceScope = "normal",
    isPrivate = false,
    createdAt = null
  } = {}) {

    assertNormalScope({
      isPrivate,
      sourceScope
    });


    const cloudConversationId =
      assertId(
        conversationId,
        "Cloud conversation ID"
      );


    const localMessageId =
      assertId(
        localId,
        "Message local ID"
      );


    const safeSender =
      assertSender(
        sender
      );


    const safeIndex =
      assertSortIndex(
        sortIndex
      );


    const safePayload =
      assertCloudSafeObject(
        payload,
        "Message payload"
      );


    const session =
      await getSession();


    // Defense in depth:
    // only allow messages to an ACTIVE conversation
    // belonging to the signed-in user.

    const {
      data:
        conversation,
      error:
        conversationError
    } =
      await getClient()
        .from(
          CONVERSATIONS_TABLE
        )
        .select(
          "id,user_id,deleted_at"
        )
        .eq(
          "id",
          cloudConversationId
        )
        .eq(
          "user_id",
          session.user.id
        )
        .is(
          "deleted_at",
          null
        )
        .maybeSingle();


    throwIfError(
      conversationError
    );


    if (
      !conversation
    ) {

      throw new Error(
        "The target cloud conversation does not exist or is deleted."
      );

    }


    const row = {
      user_id:
        session.user.id,

      conversation_id:
        cloudConversationId,

      local_id:
        localMessageId,

      sender:
        safeSender,

      sort_index:
        safeIndex,

      message_time:
        normalizeMessageTime(
          messageTime
        ),

      payload:
        safePayload,

      source_scope:
        "normal",

      is_private:
        false
    };


    const created =
      toIsoTimestamp(
        createdAt
      );


    if (created) {

      row.created_at =
        created;

    }


    const {
      data,
      error
    } =
      await getClient()
        .from(
          MESSAGES_TABLE
        )
        .insert(
          row
        )
        .select()
        .single();


    throwIfError(
      error
    );


    return data;

  }


  // ============================================================
  // MESSAGES — GET ONE
  // ============================================================

  async function getMessage(
    conversationId,
    localId,
    {
      includeDeleted = false
    } = {}
  ) {

    const cloudConversationId =
      assertId(
        conversationId,
        "Cloud conversation ID"
      );


    const localMessageId =
      assertId(
        localId,
        "Message local ID"
      );


    const session =
      await getSession();


    let query =
      getClient()
        .from(
          MESSAGES_TABLE
        )
        .select("*")
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "conversation_id",
          cloudConversationId
        )
        .eq(
          "local_id",
          localMessageId
        );


    if (
      !includeDeleted
    ) {

      query =
        query.is(
          "deleted_at",
          null
        );

    }


    const {
      data,
      error
    } =
      await query
        .maybeSingle();


    throwIfError(
      error
    );


    return data ?? null;

  }


  // ============================================================
  // MESSAGES — GET MANY
  // ============================================================

  async function getMessages(
    conversationId,
    {
      includeDeleted = false,
      since = null
    } = {}
  ) {

    const cloudConversationId =
      assertId(
        conversationId,
        "Cloud conversation ID"
      );


    const session =
      await getSession();


    let query =
      getClient()
        .from(
          MESSAGES_TABLE
        )
        .select("*")
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "conversation_id",
          cloudConversationId
        );


    if (
      !includeDeleted
    ) {

      query =
        query.is(
          "deleted_at",
          null
        );

    }


    if (
      since != null
    ) {

      query =
        query.gt(
          "updated_at",
          toIsoTimestamp(
            since
          )
        );

    }


    const {
      data,
      error
    } =
      await query
        .order(
          "sort_index",
          {
            ascending:
              true
          }
        )
        .order(
          "created_at",
          {
            ascending:
              true
          }
        );


    throwIfError(
      error
    );


    return Array.isArray(
      data
    )
      ? data
      : [];

  }


  // ============================================================
  // MESSAGES — CONDITIONAL PATCH
  // ============================================================

  async function patchMessageIfVersion(
    conversationId,
    localId,
    expectedVersion,
    changes = {}
  ) {

    const cloudConversationId =
      assertId(
        conversationId,
        "Cloud conversation ID"
      );


    const localMessageId =
      assertId(
        localId,
        "Message local ID"
      );


    const version =
      assertVersion(
        expectedVersion
      );


    const safeChanges =
      {};


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "payload"
      )
    ) {

      safeChanges.payload =
        assertCloudSafeObject(
          changes.payload,
          "Message payload"
        );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "sort_index"
      )
    ) {

      safeChanges.sort_index =
        assertSortIndex(
          changes.sort_index
        );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "message_time"
      )
    ) {

      safeChanges.message_time =
        normalizeMessageTime(
          changes.message_time
        );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "deleted_at"
      )
    ) {

      safeChanges.deleted_at =
        changes.deleted_at;

    }


    if (
      !Object.keys(
        safeChanges
      ).length
    ) {

      throw new Error(
        "No valid message changes were provided."
      );

    }


    const session =
      await getSession();


    const {
      data,
      error
    } =
      await getClient()
        .from(
          MESSAGES_TABLE
        )
        .update(
          safeChanges
        )
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "conversation_id",
          cloudConversationId
        )
        .eq(
          "local_id",
          localMessageId
        )
        .eq(
          "version",
          version
        )
        .select();


    throwIfError(
      error
    );


    return (
      Array.isArray(
        data
      ) &&
      data.length
    )
      ? data[0]
      : null;

  }


  async function updateMessageIfVersion(
    conversationId,
    localId,
    expectedVersion,
    {
      payload,
      sortIndex,
      messageTime
    } = {}
  ) {

    const changes =
      {};


    if (
      payload !== undefined
    ) {

      changes.payload =
        payload;

    }


    if (
      sortIndex !== undefined
    ) {

      changes.sort_index =
        sortIndex;

    }


    if (
      messageTime !== undefined
    ) {

      changes.message_time =
        messageTime;

    }


    return patchMessageIfVersion(
      conversationId,
      localId,
      expectedVersion,
      changes
    );

  }


  async function removeMessageIfVersion(
    conversationId,
    localId,
    expectedVersion
  ) {

    return patchMessageIfVersion(
      conversationId,
      localId,
      expectedVersion,
      {
        deleted_at:
          new Date()
            .toISOString()
      }
    );

  }


  async function restoreMessageIfVersion(
    conversationId,
    localId,
    expectedVersion
  ) {

    return patchMessageIfVersion(
      conversationId,
      localId,
      expectedVersion,
      {
        deleted_at:
          null
      }
    );

  }


  async function purgeMessage(
    conversationId,
    localId
  ) {

    const cloudConversationId =
      assertId(
        conversationId,
        "Cloud conversation ID"
      );


    const localMessageId =
      assertId(
        localId,
        "Message local ID"
      );


    const session =
      await getSession();


    const {
      data,
      error
    } =
      await getClient()
        .from(
          MESSAGES_TABLE
        )
        .delete()
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "conversation_id",
          cloudConversationId
        )
        .eq(
          "local_id",
          localMessageId
        )
        .select();


    throwIfError(
      error
    );


    return (
      Array.isArray(
        data
      ) &&
      data.length
    )
      ? data[0]
      : null;

  }


  // ============================================================
  // DIAGNOSTICS
  // ============================================================

  async function status() {

    const session =
      await getSession();


    const [
      conversationResult,
      messageResult
    ] =
      await Promise.all([
        getClient()
          .from(
            CONVERSATIONS_TABLE
          )
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true
            }
          )
          .eq(
            "user_id",
            session.user.id
          ),

        getClient()
          .from(
            MESSAGES_TABLE
          )
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true
            }
          )
          .eq(
            "user_id",
            session.user.id
          )
      ]);


    throwIfError(
      conversationResult.error
    );

    throwIfError(
      messageResult.error
    );


    return {
      signedIn:
        true,

      userId:
        session.user.id,

      conversations:
        conversationResult.count ?? 0,

      messages:
        messageResult.count ?? 0
    };

  }


  // ============================================================
  // PUBLIC APIs
  // ============================================================

  window.ChatiConversations =
    Object.freeze({
      create:
        createConversation,

      get:
        getConversation,

      getAll:
        getConversations,

      updateIfVersion:
        updateConversationIfVersion,

      removeIfVersion:
        removeConversationIfVersion,

      restoreIfVersion:
        restoreConversationIfVersion,

      purge:
        purgeConversation,

      status
    });


  window.ChatiMessages =
    Object.freeze({
      create:
        createMessage,

      get:
        getMessage,

      getAll:
        getMessages,

      updateIfVersion:
        updateMessageIfVersion,

      removeIfVersion:
        removeMessageIfVersion,

      restoreIfVersion:
        restoreMessageIfVersion,

      purge:
        purgeMessage
    });


  console.log(
    "[Chati-AI Conversations] V5.0.1B cloud client ready."
  );

})();
