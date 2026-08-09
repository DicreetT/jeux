import { supabase } from "./supabase";

const TABLE_NAME = "le_grimoire_state";

type StateRow<T> = {
  key: string;
  value: T;
};

export async function loadSharedState<T>(key: string): Promise<T | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("key,value")
    .eq("key", key)
    .maybeSingle<StateRow<T>>();

  if (error) {
    console.warn(`[Le Grimoire] Supabase load skipped for ${key}:`, error.message);
    return undefined;
  }

  return data?.value;
}

export async function saveSharedState<T>(key: string, value: T) {
  if (!supabase) return;

  const { error } = await supabase.from(TABLE_NAME).upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn(`[Le Grimoire] Supabase save skipped for ${key}:`, error.message);
  }
}
