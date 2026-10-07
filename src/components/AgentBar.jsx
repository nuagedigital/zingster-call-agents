// src/components/AgentBar.jsx
export default function AgentBar({ onVoice, onCall, onChat, hidden }) {
  if (hidden) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999]
                    bg-white rounded-full px-3 py-3
                    shadow-[0_8px_30px_rgba(0,0,0,0.25)]
                    flex items-center gap-3 animate-fadeIn">

      {/* 1️⃣ Gradient orb — voice */}
      <button
        type="button"
        onClick={onVoice}
        aria-label="Voice assistant"
        title="Talk to agent"
        className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0
                   hover:scale-105 active:scale-95 transition-transform
                   ring-1 ring-black/5 cursor-pointer
                   shadow-[0_2px_10px_rgba(59,130,246,0.35)]"
      >
        <span className="absolute inset-[-50%] animate-spin-slow
                         bg-[conic-gradient(from_0deg,#3b82f6,#22d3ee,#a78bfa,#ec4899,#3b82f6)]" />
        <span className="absolute inset-0 rounded-full
                         shadow-[inset_0_2px_8px_rgba(255,255,255,0.55)]" />
      </button>

      {/* 2️⃣ Black phone — callback */}
      <button
        type="button"
        onClick={onCall}
        aria-label="Request a callback"
        title="Request a callback"
        className="w-14 h-14 rounded-full flex-shrink-0
                   bg-black text-white
                   flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-all
                   cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
        </svg>
      </button>

      {/* 3️⃣ Chat bubble — chat */}
      <button
        type="button"
        onClick={onChat}
        aria-label="Open chat"
        title="Open chat"
        className="w-14 h-14 rounded-full flex-shrink-0
                   bg-white border border-gray-300 text-black
                   flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-all
                   cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 3C6.5 3 2 6.58 2 11c0 2.2 1.05 4.2 2.75 5.66-.15 1.24-.65 2.5-1.6 3.44-.2.2-.07.55.22.55 2.02 0 3.72-.9 4.85-1.8 1.16.4 2.44.65 3.78.65 5.5 0 10-3.58 10-8S17.5 3 12 3z"/>
        </svg>
      </button>
    </div>
  );
}