import { supabase } from "@/lib/supabase/client";

/**
 * fetch() wrapper for same-origin /api/* calls that attaches the current
 * Supabase session's access token as a Bearer header. Several API routes
 * (dashboard, drivers, customers, enquiries, audit-logs, settings, and most
 * POST/PATCH/DELETE mutations) are gated by requireAuth/requireOwner on the
 * server and 401 without this.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}

export default apiFetch;
