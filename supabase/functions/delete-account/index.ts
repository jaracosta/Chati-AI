import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

async function collectStoragePaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) throw error;

    const rows = data || [];

    for (const item of rows) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id) {
        paths.push(full);
      } else {
        paths.push(...await collectStoragePaths(admin, bucket, full));
      }
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return paths;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return json({ ok: false, error: "Missing authentication." }, 401);
  }

  let body: { confirm?: string } = {};

  try {
    body = await req.json();
  } catch {}

  if (body.confirm !== "DELETE") {
    return json({ ok: false, error: "Deletion confirmation is required." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return json({ ok: false, error: "Server configuration is incomplete." }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return json({ ok: false, error: "Invalid or expired session." }, 401);
  }

  const userId = user.id;
  const bucket = "character-media";

  try {
    const storagePaths = await collectStoragePaths(admin, bucket, userId);

    for (let i = 0; i < storagePaths.length; i += 100) {
      const batch = storagePaths.slice(i, i + 100);
      if (!batch.length) continue;

      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) throw error;
    }

    const deletions = [
      admin.from("cloud_messages").delete().eq("user_id", userId),
      admin.from("cloud_conversations").delete().eq("user_id", userId),
      admin.from("cloud_items").delete().eq("user_id", userId),
      admin.from("user_profiles").delete().eq("user_id", userId)
    ];

    const results = await Promise.all(deletions);

    for (const result of results) {
      if (result.error) throw result.error;
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return json({
      ok: true,
      deletedUserId: userId,
      deletedStorageObjects: storagePaths.length
    });
  } catch (error) {
    console.error("delete-account failed", error);

    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Account deletion failed."
    }, 500);
  }
});
