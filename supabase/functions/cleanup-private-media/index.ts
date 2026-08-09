import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const bucket = "le-grimoire-private";

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase service environment.", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("private_media")
    .select("id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", new Date().toISOString())
    .limit(100);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const expired = data ?? [];
  if (expired.length === 0) {
    return Response.json({ ok: true, deleted: 0 });
  }

  const paths = expired.map((item) => item.storage_path);
  const { error: removeError } = await supabase.storage.from(bucket).remove(paths);

  if (removeError) {
    return Response.json({ ok: false, error: removeError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("private_media")
    .update({ deleted_at: new Date().toISOString() })
    .in(
      "id",
      expired.map((item) => item.id),
    );

  if (updateError) {
    return Response.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, deleted: expired.length });
});
