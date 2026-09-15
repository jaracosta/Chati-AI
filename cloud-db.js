// ============================================================
// CHATI-AI V4.0.2 — CLOUD DATABASE
//
// Generic cloud database layer for Chati-AI.
// Does NOT automatically sync local data.
//
// Private Chat / Private Group are blocked here
// AND protected by the PostgreSQL constraint.
// ============================================================

(() => {
  "use strict";


  // =========================
  // SUPABASE CONFIG
  // =========================

  const SUPABASE_URL =
    "https://pqnebvtbxwpizhzvrisu.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Ywt13f_gR40wYhFANM76-A_RFc4BkHS";

  const CLOUD_ITEMS_URL =
    `${SUPABASE_URL}/rest/v1/cloud_items`;


  // =========================
  // PRIVATE / TEMPORARY TYPES
  // =========================

  const BLOCKED_ENTITY_TYPES =
    new Set([
      "private_chat",
      "private_group",
      "private_group_chat",
      "temporary_chat",
      "temporary_group"
    ]);


  function normalizeEntityType(
    entityType
  ) {
    return String(
      entityType || ""
    )
      .trim()
      .toLowerCase();
  }


  function assertAllowedEntityType(
    entityType
  ) {
    const normalized =
      normalizeEntityType(
        entityType
      );

    if (!normalized) {
      throw new Error(
        "Cloud entity type is required."
      );
    }

    if (
      BLOCKED_ENTITY_TYPES.has(
        normalized
      ) ||
      normalized.startsWith(
        "private_"
      ) ||
      normalized.startsWith(
        "temporary_"
      )
    ) {
      throw new Error(
        `Cloud sync blocked for private or temporary entity type: ${normalized}`
      );
    }

    return normalized;
  }


  function assertLocalId(
    localId
  ) {
    const normalized =
      String(
        localId || ""
      ).trim();

    if (!normalized) {
      throw new Error(
        "Cloud local_id is required."
      );
    }

    return normalized;
  }


  // =========================
  // AUTH
  // =========================

  async function getActiveSession() {
    if (!window.ChatiAuth) {
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

    if (!data?.session) {
      throw new Error(
        "You must sign in before using cloud data."
      );
    }

    return data.session;
  }


  // =========================
  // HTTP HELPERS
  // =========================

  async function parseResponse(
    response
  ) {
    const text =
      await response.text();

    let data =
      null;

    if (text) {
      try {
        data =
          JSON.parse(text);
      }

      catch {
        data =
          text;
      }
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        (
          typeof data === "string"
            ? data
            : `Cloud request failed with status ${response.status}.`
        );

      const error =
        new Error(message);

      error.status =
        response.status;

      error.data =
        data;

      throw error;
    }

    return data;
  }


  async function cloudRequest(
    url,
    options = {}
  ) {
    const session =
      await getActiveSession();

    const headers = {
      apikey:
        SUPABASE_PUBLISHABLE_KEY,

      Authorization:
        `Bearer ${session.access_token}`,

      ...options.headers
    };

    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );

    const data =
      await parseResponse(
        response
      );

    return {
      data,
      user:
        session.user
    };
  }


  // =========================
  // PUT / UPSERT
  // =========================

  async function put(
    entityType,
    localId,
    payload = {}
  ) {
    const type =
      assertAllowedEntityType(
        entityType
      );

    const id =
      assertLocalId(
        localId
      );

    const session =
      await getActiveSession();

    const url =
      `${CLOUD_ITEMS_URL}` +
      `?on_conflict=user_id,entity_type,local_id`;

    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",

            Prefer:
              "resolution=merge-duplicates,return=representation"
          },

          body:
            JSON.stringify({
              user_id:
                session.user.id,

              entity_type:
                type,

              local_id:
                id,

              payload:
                payload ?? {},

              deleted_at:
                null
            })
        }
      );

    const data =
      await parseResponse(
        response
      );

    return data?.[0] ?? null;
  }


  // =========================
  // GET ONE
  // =========================

  async function get(
    entityType,
    localId,
    {
      includeDeleted = false
    } = {}
  ) {
    const type =
      assertAllowedEntityType(
        entityType
      );

    const id =
      assertLocalId(
        localId
      );

    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    params.set(
      "entity_type",
      `eq.${type}`
    );

    params.set(
      "local_id",
      `eq.${id}`
    );

    if (!includeDeleted) {
      params.set(
        "deleted_at",
        "is.null"
      );
    }

    params.set(
      "limit",
      "1"
    );

    const {
      data
    } =
      await cloudRequest(
        `${CLOUD_ITEMS_URL}?${params.toString()}`
      );

    return data?.[0] ?? null;
  }


  // =========================
  // GET MANY
  // =========================

  async function getAll(
    entityType = null,
    {
      includeDeleted = false,
      since = null
    } = {}
  ) {
    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    if (entityType) {
      const type =
        assertAllowedEntityType(
          entityType
        );

      params.set(
        "entity_type",
        `eq.${type}`
      );
    }

    if (!includeDeleted) {
      params.set(
        "deleted_at",
        "is.null"
      );
    }

    if (since) {
      const date =
        new Date(since);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        throw new Error(
          "Invalid sync timestamp."
        );
      }

      params.set(
        "updated_at",
        `gt.${date.toISOString()}`
      );
    }

    params.set(
      "order",
      "updated_at.asc"
    );

    const {
      data
    } =
      await cloudRequest(
        `${CLOUD_ITEMS_URL}?${params.toString()}`
      );

    return Array.isArray(data)
      ? data
      : [];
  }


  // =========================
  // SOFT DELETE
  //
  // We keep a tombstone so another
  // device can learn that the item
  // was deleted.
  // =========================

  async function remove(
    entityType,
    localId
  ) {
    const type =
      assertAllowedEntityType(
        entityType
      );

    const id =
      assertLocalId(
        localId
      );

    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    params.set(
      "entity_type",
      `eq.${type}`
    );

    params.set(
      "local_id",
      `eq.${id}`
    );

    const response =
      await fetch(
        `${CLOUD_ITEMS_URL}?${params.toString()}`,
        {
          method:
            "PATCH",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify({
              deleted_at:
                new Date()
                  .toISOString()
            })
        }
      );

    const data =
      await parseResponse(
        response
      );

    return data?.[0] ?? null;
  }


  // =========================
  // RESTORE SOFT-DELETED ITEM
  // =========================

  async function restore(
    entityType,
    localId
  ) {
    const type =
      assertAllowedEntityType(
        entityType
      );

    const id =
      assertLocalId(
        localId
      );

    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    params.set(
      "entity_type",
      `eq.${type}`
    );

    params.set(
      "local_id",
      `eq.${id}`
    );

    const response =
      await fetch(
        `${CLOUD_ITEMS_URL}?${params.toString()}`,
        {
          method:
            "PATCH",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify({
              deleted_at:
                null
            })
        }
      );

    const data =
      await parseResponse(
        response
      );

    return data?.[0] ?? null;
  }


  // =========================
  // PERMANENT DELETE
  //
  // Mainly for tests / maintenance.
  // Normal sync should use remove().
  // =========================

  async function purge(
    entityType,
    localId
  ) {
    const type =
      assertAllowedEntityType(
        entityType
      );

    const id =
      assertLocalId(
        localId
      );

    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    params.set(
      "entity_type",
      `eq.${type}`
    );

    params.set(
      "local_id",
      `eq.${id}`
    );

    const response =
      await fetch(
        `${CLOUD_ITEMS_URL}?${params.toString()}`,
        {
          method:
            "DELETE",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.access_token}`,

            Prefer:
              "return=representation"
          }
        }
      );

    const data =
      await parseResponse(
        response
      );

    return data?.[0] ?? null;
  }


  // =========================
  // CONNECTION TEST
  // =========================

  async function testConnection() {
    const session =
      await getActiveSession();

    const params =
      new URLSearchParams();

    params.set(
      "user_id",
      `eq.${session.user.id}`
    );

    params.set(
      "select",
      "id"
    );

    params.set(
      "limit",
      "1"
    );

    await cloudRequest(
      `${CLOUD_ITEMS_URL}?${params.toString()}`
    );

    return {
      ok: true,
      userId:
        session.user.id
    };
  }


  // =========================
  // PUBLIC CLOUD API
  // =========================

  window.ChatiCloud =
    Object.freeze({
      put,
      get,
      getAll,
      remove,
      restore,
      purge,
      testConnection
    });


  console.log(
    "[Chati-AI Cloud] V4.0.2 ready."
  );

})();