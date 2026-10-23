// Supabase client — env-gated. When the two NEXT_PUBLIC_ vars are unset
// (local dev without keys, CI, the guard suite) this exports null and the
// builder silently stays on its localStorage stand-in. Setting the vars (in
// Vercel, or .env.local) turns the cloud store on with zero code changes.
// The anon key is PUBLIC by design (it ships in the browser bundle); what it
// may do is decided by the database's Row Level Security policies.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
