'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const EXCLUDED_PATHS = [
  '/login',
  '/signup',
  '/onboarding',
  '/connect',
  '/assessment',
  '/api',
  '/_next',
];

/**
 * OnboardingGuard
 *
 * Wraps the entire app. On every route change, checks whether the current user
 * has completed onboarding. A user is considered "through" onboarding if they
 * have either:
 *   (a) a completed relationship_assessment (completed_at NOT NULL), OR
 *   (b) a display_name set in user_profiles (Step 1 saved successfully)
 *
 * The display_name fallback prevents the guard from looping users back to
 * /onboarding if the assessment save failed but the user did finish Step 1.
 *
 * Excluded paths are bypassed entirely so users can always access auth, connect,
 * assessment, and onboarding pages without being caught in a redirect loop.
 */
export default function OnboardingGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    // Skip excluded paths
    const isExcluded = EXCLUDED_PATHS.some(p => pathname.startsWith(p));
    if (isExcluded) {
      checkedRef.current = false; // reset so we re-check on next non-excluded path
      return;
    }

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Let individual pages handle auth redirects

        // Primary check: completed assessment
        const { data: assessment } = await supabase
          .from('relationship_assessments')
          .select('id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .limit(1)
          .maybeSingle();

        if (assessment) return; // All good

        // Fallback: display_name set means Step 1 completed — allow through
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.display_name) return; // Step 1 done, assessment pending

        router.push('/onboarding');
      } catch {
        // Fail open — don't block the user if the check errors
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return children;
}
