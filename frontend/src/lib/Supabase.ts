import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis dans .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Types utilisateur ──────────────────────────────────────────
export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
};