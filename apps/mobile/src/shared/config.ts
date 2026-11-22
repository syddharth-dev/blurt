/**
 * Build-time settings from .env.local (EXPO_PUBLIC_* only; these are bundled into the app,
 * so never secrets). See apps/mobile/.env.example.
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

/** Online features need all three; without them the app plays offline with local content. */
export const isOnlineConfigured = () =>
  !!(config.apiUrl && config.supabaseUrl && config.supabaseAnonKey);
