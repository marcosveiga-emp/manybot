import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const db: SupabaseClient = createClient(
  process.env.SUPABASE_URL || "http://localhost",
  process.env.SUPABASE_SERVICE_KEY || "dummy-build-key",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
