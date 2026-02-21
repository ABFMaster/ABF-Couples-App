'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function HealthMeter({ coupleId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Status messages based on score ranges
  const getStatusMessage = (score) => {
    if (score >= 81) return { text: "Thriving together!", emoji: "✨" };
    if (score >= 61) return { text: "Growing stronger", emoji: "🌸" };
    if (score >= 41) return { text: "Building momentum", emoji: "🌱" };
    if (score >= 21) return { text: "Getting started", emoji: "💕" };
    return { text: "Let's build connection", emoji: "🤍" };
  };

  // Category labels and icons
  const categories = [
    { key: 'communication_score', label: 'Communication', icon: '💬' },
    { key: 'conflict_score', label: 'Conflict Resolution', icon: '🤝' },
    { key: 'intimacy_score', label: 'Emotional Intimacy', icon: '💗' },
    { key: 'values_score', label: 'Values & Goals', icon: '🎯' },
    { key: 'affection_score', label: 'Affection', icon: '💝' },
    { key: 'support_score', label: 'Support', icon: '🌟' },
  ];

  const fetchHealth = useCallback(async (forceRecalculate = false) => {
    if (!coupleId) return;

    try {
      // Always recalculate on first load or when forced
      if (forceRecalculate || loading) {
        console.log('[HealthMeter] Calculating relationship health...');

        // Call the stored procedure to calculate/update health
        const { data: calculated, error: calcError } = await supabase
          .rpc('calculate_relationship_health', { p_couple_id: coupleId });

        if (calcError) {
          console.error('[HealthMeter] Error calculating health:', calcError);
          // Fall through to fetch existing data
        } else {
          console.log('[HealthMeter] Calculation result:', calculated);
        }
      }

      // Now fetch the updated health data from the table
      const { data: healthData, error: fetchError } = await supabase
        .from('relationship_health')
        .select('*')
        .eq('couple_id', coupleId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[HealthMeter] Error fetching health:', fetchError);
      }

      if (healthData) {
        setHealth(healthData);
        setLastUpdated(healthData.updated_at ? new Date(healthData.updated_at) : new Date());
        // Animate the score counting up
        animateScore(healthData.overall_score || 0);
      } else {
        // No data exists - set defaults
        setHealth({
          overall_score: 0,
          communication_score: 0,
          conflict_score: 0,
          intimacy_score: 0,
          values_score: 0,
          affection_score: 0,
          support_score: 0
        });
        setDisplayScore(0);
      }
    } catch (error) {
      console.error('[HealthMeter] Error in fetchHealth:', error);
      // Set defaults on error
      setHealth({
        overall_score: 0,
        communication_score: 0,
        conflict_score: 0,
        intimacy_score: 0,
        values_score: 0,
        affection_score: 0,
        support_score: 0
      });
      setDisplayScore(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coupleId, loading]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth(true);
  };

  // Animate score counting up
  const animateScore = (targetScore) => {
    setAnimating(true);
    let current = 0;
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = targetScore / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setDisplayScore(targetScore);
        setAnimating(false);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepDuration);
  };

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Expose refresh method
  useEffect(() => {
    if (onRefresh) {
      onRefresh.current = fetchHealth;
    }
  }, [onRefresh, fetchHealth]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-coral-50 p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-20 h-20 bg-cream-100 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 w-32 bg-cream-100 rounded"></div>
              <div className="h-4 w-24 bg-cream-50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const score = health?.overall_score || 0;
  const status = getStatusMessage(score);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-coral-50 overflow-hidden mb-6">
      {/* Collapsed State - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-cream-50/30 transition-colors"
      >
        <div className="flex items-center gap-5">
          {/* Filling Heart */}
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Heart outline */}
              <defs>
                <clipPath id="heartClip">
                  <path d="M50 88.5C50 88.5 10 60 10 35C10 20 22 10 35 10C42 10 48 14 50 18C52 14 58 10 65 10C78 10 90 20 90 35C90 60 50 88.5 50 88.5Z" />
                </clipPath>
                <linearGradient id="heartGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#E8614D" />
                  <stop offset="100%" stopColor="#F08070" />
                </linearGradient>
              </defs>

              {/* Background heart (empty) */}
              <path
                d="M50 88.5C50 88.5 10 60 10 35C10 20 22 10 35 10C42 10 48 14 50 18C52 14 58 10 65 10C78 10 90 20 90 35C90 60 50 88.5 50 88.5Z"
                fill="#fce7f3"
                stroke="#f9a8d4"
                strokeWidth="2"
              />

              {/* Filling rectangle (clipped to heart) */}
              <g clipPath="url(#heartClip)">
                <rect
                  x="0"
                  y={100 - score}
                  width="100"
                  height={score}
                  fill="url(#heartGradient)"
                  className="transition-all duration-1000 ease-out"
                />
              </g>

              {/* Heart outline on top */}
              <path
                d="M50 88.5C50 88.5 10 60 10 35C10 20 22 10 35 10C42 10 48 14 50 18C52 14 58 10 65 10C78 10 90 20 90 35C90 60 50 88.5 50 88.5Z"
                fill="none"
                stroke="#E8614D"
                strokeWidth="2"
              />
            </svg>

            {/* Score number overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${score >= 50 ? 'text-white' : 'text-coral-600'} drop-shadow-sm`}>
                {displayScore}%
              </span>
            </div>

            {/* Celebration sparkles for high scores */}
            {score >= 80 && (
              <div className="absolute -top-1 -right-1 animate-pulse">
                <span className="text-lg">✨</span>
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="text-left">
            <h3 className="text-xl font-semibold text-gray-800">
              Relationship Health
            </h3>
            <p className="text-coral-600 font-medium flex items-center gap-2">
              <span>{status.emoji}</span>
              <span>{status.text}</span>
            </p>
          </div>
        </div>

        {/* Expand/Collapse indicator */}
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-sm">{expanded ? 'Hide details' : 'View details'}</span>
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded State - Category Breakdown */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 border-t border-coral-50">
          <div className="flex items-center justify-between mt-4 mb-4">
            <p className="text-sm text-gray-500">
              Your connection across different areas
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-coral-600 bg-cream-50 hover:bg-cream-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((category) => {
              const categoryScore = health?.[category.key] || 0;
              return (
                <div key={category.key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span>{category.icon}</span>
                      {category.label}
                    </span>
                    <span className="text-sm font-semibold text-coral-600">
                      {categoryScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-coral-400 to-coral-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: expanded ? `${categoryScore}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Encouragement message */}
          <div className="mt-5 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {score < 30 && "Start with daily check-ins to grow your connection together."}
              {score >= 30 && score < 60 && "You're building great habits! Keep checking in with each other."}
              {score >= 60 && score < 80 && "Your connection is growing stronger. Keep nurturing it!"}
              {score >= 80 && "Amazing! You're truly investing in your relationship. Keep it up!"}
            </p>
          </div>

          {/* Score breakdown info */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>Score based on check-ins, assessments, and relationship activities</p>
            {lastUpdated && (
              <p className="mt-1">
                Last calculated: {lastUpdated.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
