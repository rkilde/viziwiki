// auth.ts — email+password accounts via Supabase Auth, plus the profile
// (role/class) the roles migration maintains. Null-safe: without env keys
// every call is a no-op and the builder behaves as a signed-out viewer.
import { supabase } from './supabase';

export type Role = 'viewer' | 'contributor' | 'admin';
export type ContributorClass = 'writer' | 'editor' | 'designer' | 'wiki_master';
export type Profile = { id: string; email: string; role: Role; class: ContributorClass | null; wiki_id: string | null };

export const authAvailable = !!supabase;

export async function signUp(email: string, password: string): Promise<{ error?: string; needsConfirm?: boolean }> {
  if (!supabase) return { error: 'Cloud not configured' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  // confirmation-required projects return a user but no session
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud not configured' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

/** Subscribe to auth state; fires immediately with the current session. */
export function onAuth(cb: (email: string | null) => void): () => void {
  if (!supabase) { cb(null); return () => {}; }
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user?.email ?? null));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user?.email ?? null));
  return () => sub.subscription.unsubscribe();
}

export async function fetchProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('id, email, role, class, wiki_id').eq('id', uid).single();
  if (error || !data) return null;
  return data as Profile;
}
