'use client';

import { useMemo } from 'react';

// Simple markdown parser for AI responses
function parseMarkdown(text) {
  if (!text) return '';

  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  // Bullet lists: lines starting with - or *
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-4 my-2">$1</ul>');

  // Numbered lists: lines starting with 1. 2. etc
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  return html;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AiChatMessage({ message, isTyping = false }) {
  const isUser = message.role === 'user';
  const parsedContent = useMemo(() => {
    if (isUser) return message.content;
    return parseMarkdown(message.content);
  }, [message.content, isUser]);

  // Typing indicator for AI
  if (isTyping) {
    return (
      <div className="flex items-start gap-3 mb-4">
        {/* AI Avatar */}
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(145deg, #1C1410, #2D3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
        </div>

        {/* Typing bubble */}
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-md max-w-[80%]">
          <div className="flex items-center gap-1">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4AA87', animation: 'bounce 1s infinite', animationDelay: '0ms' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4AA87', animation: 'bounce 1s infinite', animationDelay: '150ms' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4AA87', animation: 'bounce 1s infinite', animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(145deg, #1C1410, #2D3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
        </div>
      )}

      {/* Message bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          style={isUser ? {
            background: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 100%)',
            borderRadius: '18px',
            borderTopRightRadius: '4px',
            padding: '12px 16px',
            boxShadow: '0 1px 4px rgba(28,20,16,0.06)',
            maxWidth: '85%',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'white',
            lineHeight: 1.6,
          } : {
            background: 'white',
            border: '1px solid #EDE4D8',
            borderRadius: '18px',
            borderTopLeftRadius: '4px',
            padding: '12px 16px',
            boxShadow: '0 1px 4px rgba(28,20,16,0.06)',
            maxWidth: '85%',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: '#1C1410',
            lineHeight: 1.6,
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0"
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            />
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
