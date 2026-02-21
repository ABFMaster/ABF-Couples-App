'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FlirtView({ isOpen, onClose, flirt, senderName, coupleId, onUpdate }) {
  const [localFlirt, setLocalFlirt] = useState(flirt);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  useEffect(() => {
    setLocalFlirt(flirt);
  }, [flirt]);

  // Mark as read when opened
  useEffect(() => {
    if (isOpen && flirt && !flirt.is_read) {
      markAsRead();
    }
  }, [isOpen, flirt]);

  const markAsRead = async () => {
    if (!flirt) return;

    try {
      await supabase
        .from('flirts')
        .update({ is_read: true })
        .eq('id', flirt.id);

      // Award points for viewing
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('relationship_points').insert({
        couple_id: coupleId,
        user_id: user.id,
        points: 5,
        action: 'affection_received',
        reference_id: flirt.id,
      });

      // Use flirt prop (not localFlirt) to avoid stale closure
      setLocalFlirt({ ...flirt, is_read: true });
      onUpdate?.();
    } catch (error) {
      console.error('Error marking flirt as read:', error);
    }
  };

  const handleHeart = async () => {
    if (!localFlirt || localFlirt.hearted) return;

    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 600);

    try {
      await supabase
        .from('flirts')
        .update({ hearted: true })
        .eq('id', localFlirt.id);

      // Award points to sender
      await supabase.from('relationship_points').insert({
        couple_id: coupleId,
        user_id: flirt.sender_id,
        points: 10,
        action: 'positive_communication',
        reference_id: flirt.id,
      });

      // Recalculate health
      await supabase.rpc('calculate_relationship_health', { p_couple_id: coupleId });

      // Use functional update to avoid stale closure
      setLocalFlirt(prev => prev ? { ...prev, hearted: true } : prev);
      onUpdate?.();
    } catch (error) {
      console.error('Error hearting flirt:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || submitting) return;

    setSubmitting(true);

    try {
      await supabase
        .from('flirts')
        .update({
          reply: replyText.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq('id', localFlirt.id);

      // Award points to sender
      await supabase.from('relationship_points').insert({
        couple_id: coupleId,
        user_id: flirt.sender_id,
        points: 15,
        action: 'positive_communication',
        reference_id: flirt.id,
      });

      // Recalculate health
      await supabase.rpc('calculate_relationship_health', { p_couple_id: coupleId });

      // Use functional update to avoid stale closure
      const trimmedReply = replyText.trim();
      setLocalFlirt(prev => prev ? { ...prev, reply: trimmedReply } : prev);
      setReplyText('');
      setShowReplyInput(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error replying to flirt:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen || !localFlirt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Heart burst animation */}
      {showHeartBurst && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="text-8xl animate-heartBurst">💕</div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-white font-semibold">{senderName}</p>
          <p className="text-white/60 text-sm">{formatTime(localFlirt.created_at)}</p>
        </div>

        {/* Flirt content */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-4">
          {/* GIF */}
          {localFlirt.gif_url && (
            <div className="rounded-2xl overflow-hidden">
              <img
                src={localFlirt.gif_url}
                alt="GIF"
                className="w-full"
              />
            </div>
          )}

          {/* Photo */}
          {localFlirt.photo_url && (
            <div className="rounded-2xl overflow-hidden">
              <img
                src={localFlirt.photo_url}
                alt="Photo"
                className="w-full"
              />
            </div>
          )}

          {/* Message */}
          {localFlirt.message && (
            <p className="text-xl text-gray-800 text-center py-4 leading-relaxed">
              {localFlirt.message}
            </p>
          )}

          {/* Existing reply */}
          {localFlirt.reply && (
            <div className="bg-cream-50 rounded-xl p-3 mt-4">
              <p className="text-xs text-coral-500 mb-1">Your reply:</p>
              <p className="text-gray-700">{localFlirt.reply}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-6 mt-6">
          {/* Heart button */}
          <button
            onClick={handleHeart}
            disabled={localFlirt.hearted}
            className={`flex flex-col items-center gap-1 transition-all ${
              localFlirt.hearted ? 'opacity-100' : 'hover:scale-110'
            }`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              localFlirt.hearted
                ? 'bg-coral-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}>
              <span className="text-2xl">{localFlirt.hearted ? '❤️' : '🤍'}</span>
            </div>
            <span className="text-white/70 text-xs">
              {localFlirt.hearted ? 'Loved!' : 'Love'}
            </span>
          </button>

          {/* Reply button */}
          {!localFlirt.reply && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex flex-col items-center gap-1 hover:scale-110 transition-all"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                showReplyInput ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}>
                <span className="text-2xl">💬</span>
              </div>
              <span className="text-white/70 text-xs">Reply</span>
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && !localFlirt.reply && (
          <div className="mt-6 animate-fadeIn">
            <div className="bg-white rounded-2xl p-4 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-4 py-2 border-2 border-coral-100 rounded-full focus:border-coral-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || submitting}
                className="px-4 py-2 bg-coral-500 text-white rounded-full font-medium disabled:opacity-50 hover:bg-coral-600 transition-colors"
              >
                {submitting ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes heartBurst {
          0% {
            opacity: 1;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-heartBurst {
          animation: heartBurst 0.6s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
