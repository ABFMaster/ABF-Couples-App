import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // During build/SSR, return a mock client
    return null;
  }
  return createClientComponentClient();
}

export const supabase = typeof window !== 'undefined' ? createClientComponentClient() : null;
