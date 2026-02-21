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
 * has a completed relationship_assessment. If not, redirects to /onboarding.
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

    // Only run one check per path visit
    const currentPath = pathname;

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Let individual pages handle auth redirects

        const { data: assessment } = await supabase
          .from('relationship_assessments')
          .select('id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .limit(1)
          .maybeSingle();

        if (!assessment) {
          router.push('/onboarding');
        }
      } catch {
        // Fail open — don't block the user if the check errors
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return children;
}
