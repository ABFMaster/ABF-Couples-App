'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

// Lightweight markdown parser — duplicated from components/AiChatMessage.js
// rather than imported, matching this codebase's established pattern of
// small self-contained per-surface duplication (see CLINICAL_KNOWLEDGE
// blocks repeated across ai-coach/nora-inline/couples-session API routes).
function parseMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Three-way message bubble — Nora, me, or partner. Solo AI Coach's
// AiChatMessage only needed a binary isUser split (there's only ever one
// person); a shared session needs a real third state since both partners'
// messages render differently (mine on the right, theirs on the left with
// a name label, matching NoraCouplesChat's proven inline pattern) — this
// is the same distinction sender_id was added to ai_messages to support.
function SessionMessage({ message, myUserId, partnerName, isTyping = false }) {
  const isNora = message.role === 'assistant';
  const isMe = !isNora && message.sender_id === myUserId;
  const senderLabel = isNora ? null : isMe ? 'You' : (message.sender_name || partnerName);
  const parsedContent = useMemo(() => (isNora ? parseMarkdown(message.content) : message.content), [message.content, isNora]);

  if (isTyping) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(145deg,#1C1410,#2D3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C' }} />
        </div>
        <div style={{ background: 'white', border: '1px solid #EDE4D8', borderRadius: '18px', borderTopLeftRadius: 4, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 150, 300].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4AA87', animation: 'noraBounce 1s infinite', animationDelay: `${d}ms` }} />)}
          </div>
        </div>
        <style>{`@keyframes noraBounce { 0%,60%,100%{opacity:.3;transform:scale(.8)} 30%{opacity:1;transform:scale(1.1)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, flexDirection: isMe ? 'row-reverse' : 'row' }}>
      {isNora && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(145deg,#1C1410,#2D3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C' }} />
        </div>
      )}
      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {senderLabel && (
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4AA87', fontFamily: 'DM Sans, sans-serif', marginBottom: 4, padding: isMe ? '0 2px 0 0' : '0 0 0 2px' }}>{senderLabel}</span>
        )}
        <div style={{
          background: isNora ? 'white' : isMe ? 'linear-gradient(135deg,#8B4A2A,#C4714A)' : '#F5EDE0',
          border: isNora ? '1px solid #EDE4D8' : 'none',
          borderRadius: 18,
          borderTopLeftRadius: isNora || !isMe ? 4 : 18,
          borderTopRightRadius: isMe ? 4 : 18,
          padding: '12px 16px',
          fontFamily: isNora ? 'Georgia, serif' : 'DM Sans, sans-serif',
          fontStyle: isNora ? 'italic' : 'normal',
          fontSize: 15,
          lineHeight: 1.6,
          color: isMe ? 'white' : '#1C1410',
        }}>
          {isNora ? <div dangerouslySetInnerHTML={{ __html: parsedContent }} /> : <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>}
        </div>
        <p style={{ fontSize: 11, color: '#B0A090', marginTop: 4 }}>{formatTime(message.created_at)}</p>
      </div>
    </div>
  );
}

function CouplesSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewSession = searchParams.get('new') === 'true';
  // Seed param — mirrors ai-coach/page.js's pendingSeed pattern. Lets a
  // caller (e.g. the Weekly Reflection Sunday hook) hand Couples Session a
  // grounded opening line instead of a cold start. Purely client-side/
  // visual: never written to ai_messages until the couple actually sends a
  // real message, which is when the session and its first real exchange
  // get persisted. Presence of a seed implies starting fresh, same as
  // ?new=true — a deliberate "let's talk about this" invite shouldn't
  // silently resume an unrelated older session.
  const seedParam = searchParams.get('seed');
  const startFresh = isNewSession || !!seedParam;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const hasCheckedAuth = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    checkAuth();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lightweight poll while a session is open — this is still the async
  // shared-thread model (no websockets, no presence/typing indicators;
  // matches the design decision behind NoraCouplesChat), but a session
  // that's explicitly meant for both partners to be in around the same
  // time benefits from not requiring a manual reload to see a message the
  // other partner just sent. Only polls while a conversation is active and
  // the tab is visible; stops entirely once the page unmounts.
  useEffect(() => {
    if (!conversationId) return;
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && !sending) refreshMessages(conversationId);
    }, 8000);
    return () => clearInterval(pollRef.current);
  }, [conversationId, sending]);

  const checkAuth = async () => {
    const startingFresh = startFresh;
    const capturedSeed = seedParam;
    if (isNewSession || seedParam) window.history.replaceState({}, '', '/couples-session');

    const { data: { user: authedUser }, error } = await supabase.auth.getUser();
    if (error || !authedUser) { router.push('/login'); return; }
    setUser(authedUser);

    const { data: couple } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${authedUser.id},user2_id.eq.${authedUser.id}`)
      .maybeSingle();

    if (!couple) { setLoading(false); return; }
    setCoupleId(couple.id);

    const partnerId = authedUser.id === couple.user1_id ? couple.user2_id : couple.user1_id;
    const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', authedUser.id).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
    ]);
    setUserName(myProfile?.display_name || 'You');
    setPartnerName(partnerProfile?.display_name || 'Partner');

    // Direct client-side convenience read for the most recent shared
    // session — relies on ai_conversations' existing SELECT RLS policy for
    // type='shared' (couple-membership scoped, already correct), same
    // pattern app/ai-coach/page.js uses for "resume most recent" on solo.
    if (!startingFresh) {
      const { data: recent } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('couple_id', couple.id)
        .eq('type', 'shared')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (recent?.[0]?.id) await loadConversation(recent[0].id, couple.id);
    } else if (capturedSeed) {
      setMessages([{
        id: 'opener-' + Date.now(),
        role: 'assistant',
        content: decodeURIComponent(capturedSeed),
        created_at: new Date().toISOString(),
        isOpener: true,
      }]);
    }

    setLoading(false);
  };

  const loadConversation = async (convId, coupleIdParam) => {
    setConversationId(convId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/couples-session?conversationId=${convId}&coupleId=${coupleIdParam || coupleId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  };

  const refreshMessages = async (convId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/couples-session?conversationId=${convId}&coupleId=${coupleId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.messages && data.messages.length !== messages.length) setMessages(data.messages);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/couples-session?coupleId=${coupleId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.conversations) setSessionHistory(data.conversations);
    } catch {}
  };

  const startNewSession = () => {
    setShowHistory(false);
    setConversationId(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || sending || !coupleId) return;
    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const tempMsg = { id: 'temp-' + Date.now(), role: 'user', content: text, sender_id: user.id, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/couples-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: text, conversationId, coupleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempMsg.id);
        return [...filtered, { ...tempMsg, id: 'user-' + Date.now() }, data.message];
      });
    } catch (err) {
      console.error('[couples-session] send failed:', err);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInputMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4714A', marginBottom: 20, animation: 'noraPulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#7A6A54', fontStyle: 'italic' }}>Nora is here.</p>
        <style>{`@keyframes noraPulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #FAF6F0, #F0EBF8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#FAF6F0', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8B7355', fontSize: 20 }}>‹</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4694F', border: '1px solid #FAF6F0' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', marginLeft: -3, border: '1px solid #FAF6F0' }} />
            </div>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 300, color: '#1C1410', letterSpacing: '-0.01em' }}>Together</span>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#C4AA87', letterSpacing: '0.06em' }}>{userName} &amp; {partnerName}</span>
        </div>
        <div style={{ width: 32 }} />
      </div>

      {/* History panel */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#FAF6F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #EDE4D8' }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, color: '#1C1410' }}>Past sessions</span>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#8B7355', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {sessionHistory.length === 0 ? (
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#C4AA87', fontStyle: 'italic', textAlign: 'center', padding: '40px 20px' }}>No sessions together yet.</p>
            ) : (
              sessionHistory.map(conv => (
                <button key={conv.id} onClick={() => { setShowHistory(false); loadConversation(conv.id, coupleId); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 20px', background: 'none', border: 'none', borderBottom: '1px solid #F0E8DC', cursor: 'pointer' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1C1410', marginBottom: 4 }}>{conv.title}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#C4AA87' }}>
                    {new Date(conv.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    {conv.message_count ? ` · ${conv.message_count} messages` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
          <div style={{ padding: '16px 20px 96px', borderTop: '1px solid #EDE4D8' }}>
            <button onClick={startNewSession} style={{ width: '100%', padding: 14, background: '#1C1208', color: '#FAF6F0', border: 'none', borderRadius: 14, fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
              Start a new session →
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 24px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C4694F', border: '2px solid #FAF6F0' }} />
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C9A84C', marginLeft: -8, border: '2px solid #FAF6F0' }} />
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 300, color: '#1C1410', marginBottom: 10 }}>Nora, together.</div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8B7355', maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Both of you are here. Talk through something big or small — Nora's listening for both of you, not just one.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 360, margin: '0 auto' }}>
                {['Something small from today', 'We disagreed about...', 'Just want to check in with each other'].map(s => (
                  <button key={s} onClick={() => setInputMessage(s)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #EDE4D8', borderRadius: 20, fontSize: 13, color: '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => <SessionMessage key={m.id} message={m} myUserId={user.id} partnerName={partnerName} />)}
          {sending && <SessionMessage isTyping message={{}} myUserId={user.id} partnerName={partnerName} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Session controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', background: '#FAF6F0', borderTop: '1px solid #F0E8DC' }}>
        <button onClick={() => { loadHistory(); setShowHistory(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#C4AA87', fontFamily: 'DM Sans, sans-serif', fontSize: 12, padding: '4px 0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          History
        </button>
        <button onClick={startNewSession} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#C4AA87', fontFamily: 'DM Sans, sans-serif', fontSize: 12, padding: '4px 0' }}>
          New
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {/* Input */}
      <div style={{ background: '#FAF6F0', borderTop: '1px solid #EDE4D8', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message together..."
            disabled={sending}
            rows={1}
            style={{ flex: 1, minHeight: 48, maxHeight: 120, padding: '12px 16px', borderRadius: 18, resize: 'none', background: 'white', border: '1px solid #EDE4D8', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#1C1410', outline: 'none' }}
          />
          <button onClick={handleSend} disabled={!inputMessage.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(145deg,#1C1410,#2D3561)', color: 'white', border: 'none', cursor: inputMessage.trim() && !sending ? 'pointer' : 'not-allowed', opacity: inputMessage.trim() && !sending ? 1 : 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {sending ? (
              <div style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'noraSpin 0.8s linear infinite' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            )}
          </button>
        </div>
        <style>{`@keyframes noraSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function CouplesSession() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4714A', marginBottom: 20 }} />
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#7A6A54', fontStyle: 'italic' }}>Nora is here.</p>
      </div>
    }>
      <CouplesSessionContent />
    </Suspense>
  );
}
