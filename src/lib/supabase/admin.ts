import { createClient } from "@supabase/supabase-js";

let _admin: ReturnType<typeof createClient> | null = null;

/**
 * Возвращает admin client или null, если нет SUPABASE_SERVICE_ROLE_KEY.
 * Без краша.
 */
export function getSupabaseAdminClientOrNull() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) return null;

  _admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _admin;
}

/**
 * Старый экспорт (чтобы не ломать импорты).
 * Если ключа нет — бросает ошибку.
 */
export function getSupabaseAdminClient() {
  const c = getSupabaseAdminClientOrNull();
  if (!c) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  return c;
}