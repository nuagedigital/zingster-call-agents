// src/hooks/useSpeechRecognition.js
import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechRecognition({ lang = 'en-US', onFinalResult } = {}) {
  const recognitionRef = useRef(null);
  const activeRef      = useRef(false);
  const startingRef    = useRef(false);

  const [supported, setSupported]   = useState(true);
  const [listening, setListening]   = useState(false);
  const [interim, setInterim]       = useState('');
  const [error, setError]           = useState(null);
  const [permission, setPermission] = useState('prompt');

  const onFinalRef = useRef(onFinalResult);
  useEffect(() => { onFinalRef.current = onFinalResult; }, [onFinalResult]);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions.query({ name: 'microphone' })
      .then((s) => {
        if (cancelled) return;
        setPermission(s.state);
        s.onchange = () => setPermission(s.state);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;          // one utterance per session
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      activeRef.current = true;
      startingRef.current = false;
      setListening(true);
      setError(null);
    };

    rec.onresult = (event) => {
      let interimText = '';
      let finalText   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim('');
        onFinalRef.current?.(finalText.trim());
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setPermission('denied');
        setError('not-allowed');
      } else if (e.error === 'permission-dismissed') {
        setError('permission-dismissed');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(e.error);
      }
      activeRef.current = false;
      startingRef.current = false;
    };

    rec.onend = () => {
      activeRef.current = false;
      startingRef.current = false;
      setListening(false);
      setInterim('');
      // ❌ no auto restart — App controls it
    };

    recognitionRef.current = rec;
    return () => {
      activeRef.current = false;
      try { rec.abort(); } catch {}
    };
  }, [lang]);

  const ensureMicAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setPermission('granted');
      setError(null);
      return true;
    } catch {
      setPermission('denied');
      setError('not-allowed');
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (activeRef.current || startingRef.current) return;

    startingRef.current = true;
    const ok = await ensureMicAccess();
    if (!ok) { startingRef.current = false; return; }

    try { rec.start(); }
    catch (err) {
      startingRef.current = false;
      if (err?.name === 'InvalidStateError') {
        setTimeout(() => { try { rec.start(); } catch {} }, 200);
      }
    }
  }, [ensureMicAccess]);

  const stop = useCallback(() => {
    activeRef.current = false;
    startingRef.current = false;
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    setListening(false);
    setInterim('');
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  return {
    supported, listening, interim, error,
    permission, start, stop, toggle,
  };
}