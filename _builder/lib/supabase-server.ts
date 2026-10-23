// Server-side Supabase client for the READER routes (no session persistence —
// readers are anonymous; RLS makes content world-readable). Null without env.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function serverSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;
}
