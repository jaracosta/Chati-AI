// ============================================================
// CHATI-AI V4.0.6.1 — CLOUD MEDIA
// Private Supabase Storage client
// Bucket: character-media
// ============================================================

(() => {
  "use strict";

  const BUCKET = "character-media";
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ]);

  const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };


  function getClient() {
    if (
      !window.ChatiAuth ||
      typeof window.ChatiAuth.getClient !== "function"
    ) {
      throw new Error(
        "ChatiAuth.getClient() is unavailable."
      );
    }

    return window.ChatiAuth.getClient();
  }


  async function getUser() {
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
    } = await window.ChatiAuth.getSession();

    if (error) {
      throw error;
    }

    const user =
      data?.session?.user || null;

    if (!user) {
      throw new Error(
        "You must be signed in to use Cloud Media."
      );
    }

    return user;
  }


  function sanitizeSegment(value) {
    const clean =
      String(value ?? "")
        .trim()
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )
        .slice(
          0,
          120
        );

    if (!clean) {
      throw new Error(
        "Invalid Cloud Media path segment."
      );
    }

    return clean;
  }


  function normalizeKind(kind) {
    const value =
      String(kind ?? "")
        .trim()
        .toLowerCase();

    if (value === "image") {
      return "avatar";
    }

    if (
      value !== "avatar" &&
      value !== "background"
    ) {
      throw new Error(
        'Media kind must be "avatar" or "background".'
      );
    }

    return value;
  }


  function randomToken() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto
        .randomUUID()
        .replace(
          /-/g,
          ""
        )
        .slice(
          0,
          12
        );
    }

    return Math.random()
      .toString(36)
      .slice(
        2,
        14
      );
  }


  async function getMediaPath(
    characterId,
    kind,
    mimeType
  ) {
    const user =
      await getUser();

    const extension =
      EXTENSIONS[mimeType];

    if (!extension) {
      throw new Error(
        `Unsupported image type: ${
          mimeType || "unknown"
        }`
      );
    }

    return [
      sanitizeSegment(
        user.id
      ),
      "characters",
      sanitizeSegment(
        characterId
      ),
      `${normalizeKind(kind)}-${Date.now()}-${randomToken()}.${extension}`
    ].join("/");
  }


  async function assertOwnedPath(path) {
    const user =
      await getUser();

    const value =
      String(
        path ?? ""
      );

    if (
      !value.startsWith(
        `${user.id}/`
      )
    ) {
      throw new Error(
        "Cloud Media blocked a path belonging to another user."
      );
    }

    return value;
  }


  async function sourceToBlob(source) {
    let blob;

    if (
      source instanceof Blob
    ) {
      blob = source;
    }

    else if (
      typeof source === "string" &&
      (
        source.startsWith("data:") ||
        source.startsWith("blob:")
      )
    ) {
      const response =
        await fetch(source);

      if (!response.ok) {
        throw new Error(
          "Could not read local image data."
        );
      }

      blob =
        await response.blob();
    }

    else {
      throw new Error(
        "Expected a File, Blob, data URL, or blob URL."
      );
    }

    const mimeType =
      String(
        blob.type || ""
      ).toLowerCase();

    if (
      !ALLOWED_TYPES.has(
        mimeType
      )
    ) {
      throw new Error(
        `Unsupported image type: ${
          mimeType || "unknown"
        }`
      );
    }

    if (
      blob.size >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        "Image exceeds the 20 MB limit."
      );
    }

    return blob;
  }


  // ------------------------------------------------------------
  // MEDIA CONTENT FINGERPRINT
  // ------------------------------------------------------------

  function fallbackByteHash(
    bytes
  ) {

    let hash =
      0x811c9dc5;


    for (
      let index = 0;
      index < bytes.length;
      index += 1
    ) {

      hash ^=
        bytes[index];


      hash =
        Math.imul(
          hash,
          0x01000193
        ) >>>
        0;

    }


    return hash
      .toString(
        16
      )
      .padStart(
        8,
        "0"
      );

  }


  async function fingerprintSource(
    source
  ) {

    const blob =
      await sourceToBlob(
        source
      );


    const buffer =
      await blob.arrayBuffer();


    const bytes =
      new Uint8Array(
        buffer
      );


    let hash;


    if (
      window.crypto
        ?.subtle
    ) {

      const digest =
        await window.crypto
          .subtle
          .digest(
            "SHA-256",
            buffer
          );


      hash =
        Array.from(
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

    else {

      hash =
        fallbackByteHash(
          bytes
        );

    }


    return {
      hash,

      mimeType:
        blob.type,

      size:
        blob.size
    };

  }


  async function uploadCharacterMedia(
    characterId,
    kind,
    source
  ) {

    const blob =
      await sourceToBlob(
        source
      );


    const path =
      await getMediaPath(
        characterId,
        kind,
        blob.type
      );


    const client =
      getClient();


    // ========================================================
    // V4.0.6.1 — RAW BINARY STORAGE FIX
    //
    // Keep Blob for MIME/size validation,
    // but send ArrayBuffer bytes to Supabase Storage.
    // This avoids multipart/form-data Blob uploads.
    // ========================================================

    const bytes =
      await blob.arrayBuffer();


    const {
      data,
      error
    } =
      await client
        .storage
        .from(
          BUCKET
        )
        .upload(
          path,
          bytes,
          {
            cacheControl:
              "3600",

            contentType:
              blob.type,

            upsert:
              false
          }
        );


    if (error) {

      console.error(
        "[Chati-AI Media] Upload failed:",
        error
      );


      throw error;

    }


    const savedPath =
      data?.path ||
      path;


    console.log(
      "[Chati-AI Media] Uploaded:",
      savedPath
    );


    return {
      bucket:
        BUCKET,

      path:
        savedPath,

      kind:
        normalizeKind(
          kind
        ),

      mimeType:
        blob.type,

      size:
        blob.size
    };

  }


  // ------------------------------------------------------------
  // STABLE CHARACTER MEDIA UPLOAD
  //
  // Uses the content hash in the object path.
  // Uploading the same image again therefore reuses the same
  // Storage object instead of creating unlimited duplicates.
  // ------------------------------------------------------------

  async function uploadCharacterMediaStable(
    characterId,
    kind,
    source,
    knownFingerprint = null
  ) {

    const blob =
      await sourceToBlob(
        source
      );


    const mediaKind =
      normalizeKind(
        kind
      );


    const fingerprint =
      (
        knownFingerprint &&
        knownFingerprint.hash
      )
        ? {
            hash:
              String(
                knownFingerprint.hash
              ),

            mimeType:
              knownFingerprint.mimeType ||
              blob.type,

            size:
              Number(
                knownFingerprint.size
              ) ||
              blob.size
          }

        : await fingerprintSource(
            blob
          );


    const extension =
      EXTENSIONS[
        blob.type
      ];


    if (!extension) {

      throw new Error(
        `Unsupported image type: ${blob.type || "unknown"}`
      );

    }


    const user =
      await getUser();


    const path =
      [
        sanitizeSegment(
          user.id
        ),

        "characters",

        sanitizeSegment(
          characterId
        ),

        `${mediaKind}-${fingerprint.hash}.${extension}`
      ]
        .join(
          "/"
        );


    const bytes =
      await blob.arrayBuffer();


    const client =
      getClient();


    const {
      data,
      error
    } =
      await client
        .storage
        .from(
          BUCKET
        )
        .upload(
          path,
          bytes,
          {
            cacheControl:
              "3600",

            contentType:
              blob.type,

            // Deterministic object path.
            // Re-uploading identical content is safe.
            upsert:
              true
          }
        );


    if (error) {

      console.error(
        "[Chati-AI Media] Stable upload failed:",
        error
      );


      throw error;

    }


    const savedPath =
      data?.path ||
      path;


    console.log(
      "[Chati-AI Media] Stable media ready:",
      savedPath
    );


    return {
      bucket:
        BUCKET,

      path:
        savedPath,

      kind:
        mediaKind,

      hash:
        fingerprint.hash,

      mimeType:
        blob.type,

      size:
        blob.size
    };

  }


  async function downloadMedia(path) {
    const safePath =
      await assertOwnedPath(
        path
      );

    const client =
      getClient();

    const {
      data,
      error
    } =
      await client.storage
        .from(
          BUCKET
        )
        .download(
          safePath
        );

    if (error) {
      console.error(
        "[Chati-AI Media] Download failed:",
        error
      );

      throw error;
    }

    return data;
  }


  function blobToDataUrl(blob) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onload =
          () => {
            resolve(
              String(
                reader.result || ""
              )
            );
          };

        reader.onerror =
          () => {
            reject(
              reader.error ||
              new Error(
                "Could not convert image to data URL."
              )
            );
          };

        reader.readAsDataURL(
          blob
        );
      }
    );
  }


  async function downloadToDataUrl(path) {
    const blob =
      await downloadMedia(
        path
      );

    return blobToDataUrl(
      blob
    );
  }


  async function getSignedUrl(
    path,
    expiresIn = 3600
  ) {
    const safePath =
      await assertOwnedPath(
        path
      );

    const seconds =
      Math.max(
        60,
        Math.min(
          Number(
            expiresIn
          ) || 3600,
          86400
        )
      );

    const client =
      getClient();

    const {
      data,
      error
    } =
      await client.storage
        .from(
          BUCKET
        )
        .createSignedUrl(
          safePath,
          seconds
        );

    if (error) {
      throw error;
    }

    return (
      data?.signedUrl ||
      null
    );
  }


  async function deleteMedia(path) {
    if (!path) {
      return {
        deleted:
          false,

        reason:
          "no-path"
      };
    }

    const safePath =
      await assertOwnedPath(
        path
      );

    const client =
      getClient();

    const {
      data,
      error
    } =
      await client.storage
        .from(
          BUCKET
        )
        .remove([
          safePath
        ]);

    if (error) {
      console.error(
        "[Chati-AI Media] Delete failed:",
        error
      );

      throw error;
    }

    console.log(
      "[Chati-AI Media] Deleted:",
      safePath
    );

    return {
      deleted:
        true,

      path:
        safePath,

      data
    };
  }


  async function replaceCharacterMedia(
    characterId,
    kind,
    source,
    oldPath = null
  ) {
    const uploaded =
      await uploadCharacterMedia(
        characterId,
        kind,
        source
      );

    let oldMediaDeleted =
      false;

    if (
      oldPath &&
      oldPath !==
        uploaded.path
    ) {
      try {
        const result =
          await deleteMedia(
            oldPath
          );

        oldMediaDeleted =
          Boolean(
            result?.deleted
          );
      }

      catch (error) {
        console.warn(
          "[Chati-AI Media] New media uploaded, but old media cleanup failed:",
          error
        );
      }
    }

    return {
      ...uploaded,
      oldMediaDeleted
    };
  }


  async function status() {
    try {
      const user =
        await getUser();

      return {
        ready:
          true,

        signedIn:
          true,

        bucket:
          BUCKET,

        userId:
          user.id,

        maxFileSize:
          MAX_FILE_SIZE,

        allowedTypes:
          [
            ...ALLOWED_TYPES
          ]
      };
    }

    catch (error) {
      return {
        ready:
          false,

        signedIn:
          false,

        bucket:
          BUCKET,

        error:
          error?.message ||
          String(error)
      };
    }
  }


  async function testRoundTrip() {
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    let uploaded =
      null;

    try {
      uploaded =
        await uploadCharacterMedia(
          "__v406_test__",
          "avatar",
          tinyPng
        );

      const downloaded =
        await downloadMedia(
          uploaded.path
        );

      const downloadedSize =
        downloaded.size;

      await deleteMedia(
        uploaded.path
      );

      return {
        ok:
          true,

        uploaded:
          true,

        downloaded:
          true,

        deleted:
          true,

        path:
          uploaded.path,

        downloadedSize
      };
    }

    catch (error) {
      if (
        uploaded?.path
      ) {
        try {
          await deleteMedia(
            uploaded.path
          );
        }

        catch {
          // Best-effort cleanup.
        }
      }

      return {
        ok:
          false,

        error:
          error?.message ||
          String(error)
      };
    }
  }


  window.ChatiMedia =
    Object.freeze({
      status,
      getMediaPath,
      fingerprintSource,
      uploadCharacterMedia,
      uploadCharacterMediaStable,
      downloadMedia,
      downloadToDataUrl,
      getSignedUrl,
      deleteMedia,
      replaceCharacterMedia,
      testRoundTrip
    });


  console.log(
    "[Chati-AI Media] V4.0.6.1 private Storage client ready."
  );

})();
