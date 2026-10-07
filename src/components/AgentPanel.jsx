// src/components/AgentPanel.jsx
import { useEffect, useRef } from 'react';
import { useToastMenu } from '../hooks/useToastMenu.js';

export default function AgentPanel({
  open, onClose, messages, processing, interim,
  inputText, setInputText, onSend, onCall, onMicClick,
  listening, supported, micBlocked, callActive, aiSpeaking,
  onToastMenuReady,
}) {
  const scrollRef = useRef(null);
  const { menu, loading: menuLoading } = useToastMenu();

  useEffect(() => {
    if (menu && onToastMenuReady) onToastMenuReady(menu);
  }, [menu, onToastMenuReady]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, processing, interim]);

  if (!open) return null;

  const canSend = inputText.trim().length > 0;

  // Status pill — reflects real state
  let statusText = 'Ready';
  if (aiSpeaking && callActive)        statusText = 'AI speaking';
  else if (listening && callActive)    statusText = 'Listening to you';
  else if (processing && callActive)   statusText = 'Thinking';
  else if (processing)                 statusText = 'Connecting';
  else if (callActive)                 statusText = 'On call';
  else if (!supported)                 statusText = 'Chat only';
  else if (menuLoading)                statusText = 'Menu loading';

  return (
    <>
      <div className="fixed z-[1000] bg-white text-black
                      rounded-[28px] overflow-hidden
                      shadow-[0_30px_80px_rgba(0,0,0,0.35)]
                      flex flex-col
                      w-[480px] h-[640px]
                      max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)]
                      bottom-6 right-6 animate-fadeIn">

        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
              <span className="absolute inset-[-50%] animate-spin-slow
                               bg-[conic-gradient(from_0deg,#3b82f6,#22d3ee,#a78bfa,#ec4899,#3b82f6)]" />
              <span className="absolute inset-0 rounded-full
                               shadow-[inset_0_2px_8px_rgba(255,255,255,0.55)]" />
            </div>

            {callActive && (
              <div className="bg-gray-100 rounded-full px-4 py-2">
                <span className="text-[15px] font-medium text-gray-700">
                  {statusText}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Expand"
            title="Expand"
            className="w-9 h-9 rounded-full hover:bg-black/5
                       flex items-center justify-center text-black/70
                       transition cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
        </div>

        {/* ============ MESSAGES ============ */}
        <div ref={scrollRef}
             className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-4 chat-scroll">
          {messages.map((m, i) => (
            <div key={i}
                 className={`max-w-[88%] text-[16px] leading-relaxed break-words whitespace-pre-wrap
                   ${m.role === 'user'
                     ? 'self-end bg-black text-white px-5 py-3 rounded-3xl rounded-br-md'
                     : m.role === 'sys'
                       ? 'self-center bg-gray-100 text-gray-600 text-[12px] text-center px-3 py-2 rounded-xl max-w-[90%]'
                       : 'self-start text-black'}`}>
              {m.text}
            </div>
          ))}

          {processing && (
            <div className="self-start flex gap-1 py-2">
              <span className="w-2 h-2 bg-black/40 rounded-full animate-bounceDot" />
              <span className="w-2 h-2 bg-black/40 rounded-full animate-bounceDot"
                    style={{ animationDelay: '0.15s' }} />
              <span className="w-2 h-2 bg-black/40 rounded-full animate-bounceDot"
                    style={{ animationDelay: '0.3s' }} />
            </div>
          )}

          {interim && (
            <div className="self-start text-[13px] italic text-black/40">{interim}</div>
          )}
        </div>

        {/* ============ INPUT BAR ============ */}
        <div className="p-4">
          {micBlocked && (
            <div className="mb-2 text-[12px] text-amber-600 text-center">
              🎤 Mic blocked — click the 🔒 padlock → allow Microphone → reload.
            </div>
          )}

          <div className="relative bg-white border border-gray-200 rounded-[22px]
                          px-5 pt-5 pb-20 shadow-sm">

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) onSend();
                }
              }}
              placeholder="Send a message..."
              rows={2}
              className="w-full bg-transparent outline-none resize-none
                         text-[16px] text-gray-700 placeholder-gray-400"
            />

            <div className="absolute bottom-3 right-3 flex items-center gap-2">

              {/* 🎤 MIC — visible only during call; shows listening vs idle */}
              {callActive && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onMicClick(); }}
                  disabled={!supported}
                  aria-label={listening ? 'Stop speaking' : 'Start speaking'}
                  title={listening ? 'Stop speaking' : 'Start speaking'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center
                              transition-all active:scale-95
                    ${listening
                      ? 'bg-red-500 text-white border border-red-500 animate-micPulse cursor-pointer'
                      : 'bg-white border border-gray-300 text-black hover:bg-gray-50 cursor-pointer'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z"/>
                  </svg>
                </button>
              )}

              {/* 📞 PHONE — always visible; crossed when call active */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCall(); }}
                aria-label={callActive ? 'End call' : 'Start call'}
                title={callActive ? 'End call' : 'Start call'}
                className={`w-12 h-12 rounded-full flex items-center justify-center
                            transition-all active:scale-95 cursor-pointer
                  ${callActive
                    ? 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-50'
                    : 'bg-white border border-gray-300 text-black hover:bg-gray-50'}`}
              >
                {callActive ? (
                  /* crossed phone */
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
                    <path d="M3 3 L21 21" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" fill="none"/>
                  </svg>
                ) : (
                  /* normal phone */
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
                  </svg>
                )}
              </button>

              {/* ➤ SEND */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); if (canSend) onSend(); }}
                disabled={!canSend}
                aria-label="Send"
                title="Send"
                className={`w-12 h-12 rounded-full flex items-center justify-center
                            transition-all active:scale-95
                  ${canSend
                    ? 'bg-black text-white hover:bg-black/80 cursor-pointer'
                    : 'bg-gray-400 text-white cursor-not-allowed'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FLOATING BLACK CIRCLE ============ */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        title="Close"
        className="fixed z-[1001] bottom-6 right-6
                   w-14 h-14 rounded-full bg-black text-white
                   flex items-center justify-center
                   shadow-[0_8px_24px_rgba(0,0,0,0.4)]
                   hover:scale-105 active:scale-95 transition-transform
                   cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
    </>
  );
}