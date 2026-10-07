// src/hooks/useSpeechSynthesis.js
import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechSynthesis({ lang = 'en-US', rate = 1.02, pitch = 1 } = {}) {
  const [enabled, setEnabled]   = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find(v => /Google US English|Samantha|Microsoft Aria/i.test(v.name)) ||
        voices.find(v => v.lang === lang) ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, [lang]);

  const speak = useCallback((text) => {
    if (!enabled || !text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate; u.pitch = pitch; u.volume = 1;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [enabled, lang, rate, pitch]);

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      if (prev) cancel();
      return !prev;
    });
  }, [cancel]);

  return { enabled, speaking, speak, cancel, toggleEnabled };
}