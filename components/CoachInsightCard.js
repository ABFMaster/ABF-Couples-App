'use client';

import { useRouter } from 'next/navigation';

/**
 * CoachInsightCard
 *
 * Rule-based insight card for the dashboard.
 * Picks one insight based on priority and shows a gentle CTA to /ai-coach.
 *
 * Props:
 *   healthScore        {number|null}  0–100 relationship health score
 *   lastCheckinDate    {string|null}  ISO date string of last check-in
 *   upcomingDate       {{ title: string, date: string }|null}
 *   lastCompletedDate  {{ title: string, hasReview: boolean }|null}
 *   lastFlirtDate      {string|null}  ISO date string of last flirt sent
 */
export default function CoachInsightCard({
  healthScore = null,
  lastCheckinDate = null,
  upcomingDate = null,
  lastCompletedDate = null,
  lastFlirtDate = null,
}) {
  const router = useRouter();

  // ── RULE ENGINE (priority order) ──────────────────────────────────
  function getInsight() {
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    // 1. Low health score
    if (healthScore !== null && healthScore < 50) {
      return {
        text: 'Your relationship health score is lower than usual. A few minutes with your coach could help.',
        cta: 'Talk to Coach →',
      };
    }

    // 2. No check-in in last 3 days
    if (lastCheckinDate) {
      const daysSince = Math.floor((now - new Date(lastCheckinDate).getTime()) / dayMs);
      if (daysSince >= 3) {
        return {
          text: "You two haven't checked in recently. Consistency is one of the strongest predictors of relationship health.",
          cta: 'Talk to Coach →',
        };
      }
    } else {
      // No check-in data at all
      return {
        text: "You two haven't checked in recently. Consistency is one of the strongest predictors of relationship health.",
        cta: 'Talk to Coach →',
      };
    }

    // 3. Upcoming date in next 7 days
    if (upcomingDate?.date) {
      const daysUntil = Math.floor((new Date(upcomingDate.date).getTime() - now) / dayMs);
      if (daysUntil >= 0 && daysUntil <= 7) {
        return {
          text: 'You have a date coming up! Your coach has some ideas to make it extra special.',
          cta: 'Talk to Coach →',
        };
      }
    }

    // 4. Completed date with no review
    if (lastCompletedDate && !lastCompletedDate.hasReview) {
      return {
        text: `How did "${lastCompletedDate.title}" go? Your coach would love to hear about it.`,
        cta: 'Share with Coach →',
      };
    }

    // 5. No flirt sent in 7 days
    if (lastFlirtDate) {
      const daysSince = Math.floor((now - new Date(lastFlirtDate).getTime()) / dayMs);
      if (daysSince >= 7) {
        return {
          text: 'Small gestures matter. Your coach suggests sending your partner a flirt today.',
          cta: 'Talk to Coach →',
        };
      }
    } else {
      return {
        text: 'Small gestures matter. Your coach suggests sending your partner a flirt today.',
        cta: 'Talk to Coach →',
      };
    }

    // 6. Default — everything looks good
    return {
      text: 'Your relationship is looking healthy! Check in with your coach for personalized insights.',
      cta: 'Talk to Coach →',
    };
  }

  const insight = getInsight();

  return (
    <div
      className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, #FEF0EE 0%, #EDE0D0 100%)',
        borderLeft: '3px solid #E8614D',
      }}
    >
      <span className="text-xl flex-shrink-0">💡</span>
      <p className="flex-1 text-sm text-gray-700 leading-snug">{insight.text}</p>
      <button
        onClick={() => router.push('/ai-coach')}
        className="flex-shrink-0 text-sm font-semibold text-coral-600 hover:text-coral-700 transition-colors whitespace-nowrap"
      >
        {insight.cta}
      </button>
    </div>
  );
}
