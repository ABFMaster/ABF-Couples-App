'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { searchGifs, GIPHY_CATEGORIES, isGiphyConfigured } from '@/lib/giphy';

// Smart suggestions based on partner's love language (Q8 answer)
const SUGGESTION_MAP = {
  // A) Verbal affirmations
  a: [
    "You make everything better",
    "I'm so lucky to have you",
    "You're the best part of my day",
    "Just thinking about how amazing you are",
    "You mean the world to me",
  ],
  // B) Quality time
  b: [
    "Can't wait for our time together tonight",
    "15-min coffee break with you?",
    "Let's do nothing together later",
    "Missing our quality time",
    "Save some time for us today?",
  ],
  // C) Acts of service
  c: [
    "Making your favorite dinner tonight",
    "Picked something up for you",
    "Handling that thing you mentioned",
    "Got you covered today",
    "Already took care of it for you",
  ],
  // D) Physical affection
  d: [
    "Can't wait to hug you",
    "Missing your warmth",
    "You give the best cuddles",
    "Counting down to hold you",
    "Need one of your hugs right now",
  ],
};

// Default suggestions if no onboarding data
const DEFAULT_SUGGESTIONS = [
  "Thinking of you",
  "You make me smile",
  "Can't wait to see you",
  "You're amazing",
  "Missing you right now",
];

export default function FlirtComposer({ isOpen, onClose, coupleId, partnerId, partnerName, onSent, spotifyConnected, onSendSong }) {
  const [activeTab, setActiveTab] = useState('text');
  const [message, setMessage] = useState('');
  const [selectedGif, setSelectedGif] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [gifs, setGifs] = useState([]);
  const [gifSearch, setGifSearch] = useState('');
  const [gifLoading, setGifLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch partner's onboarding for smart suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!partnerId) return;

    try {
      const { data } = await supabase
        .from('onboarding_responses')
        .select('answers')
        .eq('user_id', partnerId)
        .single();

      if (data?.answers) {
        // Q8 is about love languages - index 7 (0-based)
        const loveLanguageAnswer = data.answers['q8']?.toLowerCase();
        if (loveLanguageAnswer && SUGGESTION_MAP[loveLanguageAnswer]) {
          // Shuffle and pick 3-5 suggestions
          const all = [...SUGGESTION_MAP[loveLanguageAnswer]];
          const shuffled = all.sort(() => Math.random() - 0.5);
          setSuggestions(shuffled.slice(0, 4));
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [partnerId]);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      // Load default GIFs
      loadGifs('love');
    }
  }, [isOpen, fetchSuggestions]);

  const loadGifs = async (query) => {
    setGifLoading(true);
    const results = await searchGifs(query);
    setGifs(results);
    setGifLoading(false);
  };

  const handleGifSearch = async (e) => {
    e.preventDefault();
    if (gifSearch.trim()) {
      await loadGifs(gifSearch);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
        setSelectedPhoto(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (sending) return;

    // Determine flirt type
    let flirtType = 'text';
    if (selectedGif && message) flirtType = 'combo';
    else if (selectedGif) flirtType = 'gif';
    else if (selectedPhoto) flirtType = 'photo';
    else if (!message.trim()) return;

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Handle photo upload if needed
      let photoUrl = null;
      if (selectedPhoto) {
        const fileName = `${coupleId}/${Date.now()}_${selectedPhoto.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('flirt-photos')
          .upload(fileName, selectedPhoto);

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          // Continue without photo
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('flirt-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      }

      // Create flirt record
      const flirtData = {
        couple_id: coupleId,
        sender_id: user.id,
        receiver_id: partnerId,
        type: photoUrl ? (message ? 'combo' : 'photo') : flirtType,
        message: message.trim() || null,
        gif_url: selectedGif?.url || null,
        gif_id: selectedGif?.id || null,
        photo_url: photoUrl,
      };

      const { error: insertError } = await supabase
        .from('flirts')
        .insert(flirtData);

      if (insertError) throw insertError;

      // Award points to sender
      await supabase.from('relationship_points').insert({
        couple_id: coupleId,
        user_id: user.id,
        points: 5,
        action: 'affection_shown',
      });

      // Check for mutual flirts bonus
      const { data: mutualFlirts } = await supabase
        .rpc('check_mutual_flirts_today', { p_couple_id: coupleId });

      if (mutualFlirts) {
        // Award bonus to both
        await supabase.from('relationship_points').insert([
          { couple_id: coupleId, user_id: user.id, points: 10, action: 'mutual_flirts_bonus' },
          { couple_id: coupleId, user_id: partnerId, points: 10, action: 'mutual_flirts_bonus' },
        ]);
      }

      // Recalculate health
      await supabase.rpc('calculate_relationship_health', { p_couple_id: coupleId });

      // Show success
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onSent?.();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error sending flirt:', error);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setSelectedGif(null);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setActiveTab('text');
    setGifSearch('');
  };

  const hasContent = message.trim() || selectedGif || selectedPhoto;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-500 z-10 flex items-center justify-center animate-fadeIn">
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-bounce">💕</div>
              <p className="text-2xl font-bold">Sent to {partnerName}!</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <h2 className="font-bold text-lg text-gray-800">Send a Flirt</h2>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'text', label: '💬 Text', icon: '💬' },
            { id: 'gif', label: '🎉 GIF', icon: '🎉' },
            { id: 'photo', label: '📸 Photo', icon: '📸' },
            { id: 'song', label: '🎵 Song', icon: '🎵' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-pink-600 border-b-2 border-pink-500 bg-pink-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* TEXT TAB */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* Smart suggestions */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Quick suggestions for {partnerName}:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(suggestion)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        message === suggestion
                          ? 'bg-pink-500 text-white'
                          : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Or write your own:</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                  placeholder="What's on your mind?"
                  className="w-full p-4 border-2 border-pink-200 rounded-xl focus:border-pink-400 focus:outline-none resize-none h-24 transition-colors"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{message.length}/300</p>
              </div>
            </div>
          )}

          {/* GIF TAB */}
          {activeTab === 'gif' && (
            <div className="space-y-4">
              {!isGiphyConfigured() ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-gray-500">GIF search unavailable</p>
                  <p className="text-sm text-gray-400">Configure Giphy API key to enable</p>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <form onSubmit={handleGifSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      placeholder="Search Giphy..."
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:border-pink-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                    >
                      Search
                    </button>
                  </form>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-2">
                    {GIPHY_CATEGORIES.slice(0, 4).map(cat => (
                      <button
                        key={cat.query}
                        onClick={() => {
                          setGifSearch(cat.label);
                          loadGifs(cat.query);
                        }}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* GIF Grid */}
                  {gifLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {gifs.map(gif => (
                        <button
                          key={gif.id}
                          onClick={() => setSelectedGif(selectedGif?.id === gif.id ? null : gif)}
                          className={`relative rounded-lg overflow-hidden aspect-square ${
                            selectedGif?.id === gif.id
                              ? 'ring-4 ring-pink-500 ring-offset-2'
                              : 'hover:ring-2 hover:ring-pink-300'
                          }`}
                        >
                          <img
                            src={gif.preview || gif.url}
                            alt={gif.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {selectedGif?.id === gif.id && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <span className="text-2xl">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Optional message with GIF */}
                  {selectedGif && (
                    <div className="pt-3 border-t border-gray-100">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                        placeholder="Add a message (optional)..."
                        className="w-full px-4 py-2 border-2 border-pink-200 rounded-full focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PHOTO TAB */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              {photoPreview ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full" />
                    <button
                      onClick={() => {
                        setSelectedPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                    placeholder="Add a caption (optional)..."
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-full focus:border-pink-400 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-gray-600 mb-6">Share a photo with {partnerName}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl font-medium hover:from-pink-500 hover:to-pink-600 transition-all"
                    >
                      Choose from Library
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SONG TAB */}
          {activeTab === 'song' && (
            <div className="text-center py-8">
              {spotifyConnected ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                  <p className="text-gray-800 font-medium mb-2">Share a song with {partnerName}</p>
                  <p className="text-gray-500 text-sm mb-6">Search Spotify for the perfect song</p>
                  <button
                    onClick={() => {
                      onClose();
                      onSendSong?.();
                    }}
                    className="px-8 py-3 bg-[#1DB954] text-white rounded-full font-medium hover:bg-[#1ed760] transition-colors"
                  >
                    Search Songs
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                  <p className="text-gray-800 font-medium mb-2">Connect Spotify to share songs</p>
                  <p className="text-gray-500 text-sm mb-6">Send songs from Spotify to {partnerName}</p>
                  <p className="text-gray-400 text-sm">Go to the Flirts page and tap &quot;Connect Spotify&quot;</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Preview Section */}
        {hasContent && (
          <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Preview:</p>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              {selectedGif && (
                <img src={selectedGif.url} alt="Selected GIF" className="rounded-lg mb-2 max-h-32 object-contain" />
              )}
              {photoPreview && (
                <img src={photoPreview} alt="Photo" className="rounded-lg mb-2 max-h-32 object-contain" />
              )}
              {message && (
                <p className="text-gray-800">{message}</p>
              )}
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100">
          <button
            onClick={handleSend}
            disabled={!hasContent || sending}
            className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              `Send to ${partnerName} 💕`
            )}
          </button>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
