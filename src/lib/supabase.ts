import './polyfills';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig';

/** Client Supabase, oppure null se l'app non è ancora collegata. */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: AsyncStorage,
          storageKey: 'planapp.auth.v1',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const cloudConfigured = supabase != null;

export const TABLE = 'planapp_records';
export const BUCKET = 'planapp-photos';
