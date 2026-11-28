import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

/**
 * Supabase Auth in the browser. The session lives in localStorage; invite links land here with
 * their tokens in the URL, which `detectSessionInUrl` turns into a session.
 */
export const supabase: SupabaseClient | null =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
