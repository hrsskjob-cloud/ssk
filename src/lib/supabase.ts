import { createClient } from '@supabase/supabase-js';

// Supabase URL & Public Anon Key injected from environment variables
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://eujuizkbznzbnpmkbdbg.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anVpemtiem56Ym5wbWtiZGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzA0MDMsImV4cCI6MjEwNTIwNjQwM30.hZgRPR6xhYVK-PO3Mkwh2_81-qn6mrVODdk9F-eB834';

/**
 * Standard Supabase client instance for client-side queries, auth, or realtime subscriptions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseHealthInfo {
  connected: boolean;
  projectUrl: string;
  host?: string;
  tables?: string[];
  recordsCount?: {
    employers: number;
    candidates: number;
  };
  latencyMs?: number;
  message?: string;
}

/**
 * Fetch real-time Supabase cloud database health from the application server
 */
export async function fetchSupabaseHealth(): Promise<SupabaseHealthInfo> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err: any) {
    return {
      connected: false,
      projectUrl: supabaseUrl,
      message: err.message || 'Unable to reach database health check endpoint',
    };
  }
}
