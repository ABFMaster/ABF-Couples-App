'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import AiChatMessage from '@/components/AiChatMessage';
import { analyzeUserPatterns } from '@/lib/checkin-patterns';

function AiCoachContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messagesRemaining, setMessagesRemaining] = useState(20);
  const [isPremium, setIsPremium] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [userName, setUserName] = useState(null);
  const [checkinContext, setCheckinContext] = useState(null);
  const [proactivePrompt, setProactivePrompt] = useState(null);
  const [dismissedProactivePrompt, setDismissedProactivePrompt] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Check for pre-filled prompt from URL
  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (promptParam && !loading) {
      setInputMessage(decodeURIComponent(promptParam));
      // Clear the URL parameter without navigation
      window.history.replaceState({}, '', '/ai-coach');
    }
  }, [searchParams, loading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      router.push('/login');
      return;
    }

    setUser(user);

    // Get couple data
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();

    if (coupleError || !couple) {
      router.push('/connect');
      return;
    }

    setCoupleId(couple.id);

    // Fetch check-in patterns for context
    try {
      const patterns = await analyzeUserPatterns(user.id, 7);
      setCheckinContext(patterns);

      // Check for high-severity concerns to show proactive prompt
      if (patterns?.concernFlags?.length > 0) {
        const highConcern = patterns.concernFlags.find(c => c.severity === 'high');
        if (highConcern) {
          // Generate contextual prompt based on concern type
          const promptMap = {
            consecutive_stress: "I've been feeling stressed lately. Can you help me work through this?",
            low_connection: "I want to feel more connected with my partner. Any suggestions?",
            connection_drop: "My connection with my partner has dropped recently. What can I do?",
            low_engagement: "I haven't been checking in regularly. Can you help me stay consistent?"
          };
          setProactivePrompt({
            type: highConcern.type,
            message: promptMap[highConcern.type] || "I'd like to talk about how things are going.",
            description: highConcern.description
          });
        }
      }
    } catch (err) {
      console.error('Error fetching check-in patterns:', err);
    }

    // Fetch the most recent conversation (include updated_at for stale check)
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('id, updated_at')
      .eq('user_id', user.id)
      .eq('type', 'solo')
      .order('updated_at', { ascending: false })
      .limit(1);

    const { data: { session } } = await supabase.auth.getSession();
    const recentConv = conversations?.[0];
    const isStale = recentConv
      ? Date.now() - new Date(recentConv.updated_at).getTime() > 24 * 60 * 60 * 1000
      : true;

    if (recentConv && !isStale) {
      // Resume recent conversation
      await loadConversation(recentConv.id, session);
    } else {
      // Start fresh — fetch a warm opener from the server
      await loadOpener(couple.id, session);
    }

    setLoading(false);
  };

  const loadConversation = async (convId, existingSession = null) => {
    setConversationId(convId);

    const session = existingSession ?? (await supabase.auth.getSession()).data.session;

    const response = await fetch(`/api/ai-coach?conversationId=${convId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    const data = await response.json();

    if (data.messages) {
      setMessages(data.messages);
    }
    if (data.isPremium) {
      setIsPremium(true);
    }
    if (data.messagesRemaining !== undefined && data.messagesRemaining !== null) {
      setMessagesRemaining(data.messagesRemaining);
      setLimitReached(data.messagesRemaining <= 0);
    }
  };

  // Fetch a warm opener for a fresh conversation start
  const loadOpener = async (coupleIdParam, existingSession = null) => {
    try {
      const session = existingSession ?? (await supabase.auth.getSession()).data.session;

      const response = await fetch(`/api/ai-coach?getOpener=true&coupleId=${coupleIdParam}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      const data = await response.json();

      if (data.userName) setUserName(data.userName);
      if (data.isPremium) setIsPremium(true);
      if (data.messagesRemaining !== undefined && data.messagesRemaining !== null) {
        setMessagesRemaining(data.messagesRemaining);
        setLimitReached(data.messagesRemaining <= 0);
      }

      // Build a warm opener message from recent activity
      if (data.recentActivity) {
        const { type, description, suggestion } = data.recentActivity;
        const nameGreeting = data.userName ? `Hey ${data.userName}! ` : 'Hey! ';

        const openerMap = {
          completed_date: `${nameGreeting}Great to see you. By the way, I noticed ${description}. ${suggestion} Of course, we can talk about anything on your mind — I'm here.`,
          flirt_sent: `${nameGreeting}I noticed ${description} — love to see those little sparks. ${suggestion} What's on your mind today?`,
          low_health: `${nameGreeting}I'm glad you're here. ${description}. ${suggestion} What would you like to talk about?`,
          missed_checkins: `${nameGreeting}${description}. ${suggestion} No pressure — I'm just here whenever you need me.`,
        };

        const openerText = openerMap[type] || `${nameGreeting}Good to see you. What's on your mind today?`;

        setMessages([{
          id: 'opener-' + Date.now(),
          role: 'assistant',
          content: openerText,
          created_at: new Date().toISOString(),
          isOpener: true,
        }]);
      }
    } catch (e) {
      console.error('Error loading opener:', e);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || sending || (!isPremium && limitReached)) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          coupleId,
        }),
      });

      const data = await response.json();

      if (data.limitReached) {
        setLimitReached(true);
        setMessagesRemaining(0);
        // Remove optimistic message and show limit message
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        return;
      }

      if (data.success) {
        // Update conversation ID if new
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Replace temp message with real one and add AI response
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, { ...tempUserMsg, id: 'user-' + Date.now() }, data.message];
        });

        if (data.isPremium) {
          setIsPremium(true);
        }
        if (data.messagesRemaining !== undefined && data.messagesRemaining !== null) {
          setMessagesRemaining(data.messagesRemaining);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewConversation = async () => {
    setConversationId(null);
    setMessages([]);
    if (coupleId) {
      await loadOpener(coupleId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-500 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-cream-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm z-10 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-coral-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-coral-500 flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">AI Coach</h1>
              {isPremium ? (
                <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                  ✨ Premium — unlimited messages
                </p>
              ) : messagesRemaining <= 5 ? (
                <p className="text-xs text-amber-600 font-medium">
                  {messagesRemaining} {messagesRemaining === 1 ? 'message' : 'messages'} left this week
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  {messagesRemaining} messages left this week
                </p>
              )}
            </div>
          </div>

          <button
            onClick={startNewConversation}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-coral-600 transition-colors"
            title="New conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Empty state / Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-coral-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-4xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Hi! I'm your AI Coach</h2>
              <p className="text-gray-600 max-w-sm mx-auto mb-6">
                I'm here to help you strengthen your relationship. Whether you want to discuss communication, plan a special date, or work through a challenge, I'm here to listen and guide you.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {[
                  'How can I show appreciation?',
                  'We had a disagreement...',
                  'Date night ideas',
                  'Communication tips',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputMessage(suggestion)}
                    className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 hover:bg-cream-50 hover:text-coral-600 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Proactive Prompt Suggestion */}
          {proactivePrompt && !dismissedProactivePrompt && messages.length === 0 && (
            <div className="mb-6 bg-gradient-to-r from-cream-50 to-purple-50 rounded-2xl p-4 border border-coral-100 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💡</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 mb-1">Based on your recent check-ins...</p>
                  <p className="text-sm text-gray-600 mb-3">{proactivePrompt.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setInputMessage(proactivePrompt.message);
                        setDismissedProactivePrompt(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-coral-400 to-indigo-400 text-white text-sm font-medium rounded-full hover:from-coral-500 hover:to-indigo-600 transition-all shadow-sm"
                    >
                      Let's talk about this
                    </button>
                    <button
                      onClick={() => setDismissedProactivePrompt(true)}
                      className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <AiChatMessage key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {sending && <AiChatMessage message={{}} isTyping />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Limit Banner */}
      {!isPremium && messagesRemaining <= 5 && messagesRemaining > 0 && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex-shrink-0">
          <p className="text-center text-amber-700 text-sm">
            <span className="font-medium">{messagesRemaining}</span> free {messagesRemaining === 1 ? 'message' : 'messages'} remaining this week
          </p>
        </div>
      )}

      {/* Limit Reached Banner */}
      {!isPremium && limitReached && (
        <div className="bg-cream-50 border-t border-coral-100 px-4 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-coral-700 text-sm mb-2">
              You've used your 20 free messages this week. Upgrade for unlimited coaching.
            </p>
            <button className="text-coral-600 text-sm font-medium hover:text-coral-700">
              Upgrade for unlimited access
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={!isPremium && limitReached ? 'Weekly limit reached...' : 'Type your message...'}
                disabled={sending || (!isPremium && limitReached)}
                rows={1}
                className="w-full px-4 py-3 pr-12 border-2 border-coral-100 rounded-2xl focus:border-coral-400 focus:outline-none resize-none disabled:bg-gray-50 disabled:text-gray-400"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || sending || (!isPremium && limitReached)}
              className="w-12 h-12 bg-gradient-to-r from-coral-400 to-indigo-400 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-coral-500 hover:to-indigo-600 transition-all shadow-md"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          {!limitReached && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiCoach() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-500 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AiCoachContent />
    </Suspense>
  );
}
