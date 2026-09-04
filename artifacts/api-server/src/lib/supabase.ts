import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ddysnnfnzlhiidxkuvmh.supabase.co"
).trim();

// Use SERVICE_ROLE_KEY if available on server, otherwise fallback to publishable key
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_QNh-ADAVGbrMa_tzarWnCw_pk0v8xLC"
).trim();

export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default supabaseServer;
