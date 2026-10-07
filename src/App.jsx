// src/App.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import AgentBar   from './components/AgentBar.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import { useSpeechRecognition } from './hooks/useSpeechRecognition.js';
import { useSpeechSynthesis }   from './hooks/useSpeechSynthesis.js';
import { askAgent } from './lib/api.js';
import { ToastCart } from './lib/toast.js';

export default function App() {
  const [open, setOpen]             = useState(false);
  const [mode, setMode]             = useState('chat');
  const [inputText, setInputText]   = useState('');
  const [processing, setProcessing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [toastMenu, setToastMenu]   = useState(null);
  const [callActive, setCallActive] = useState(false);

  // 🔥 turn control
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [micActive, setMicActive]   = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'agent',
      text: "Hi there! Thanks for calling Zingster. I can help you place a pickup order today. What can I get started for you?",
    },
  ]);

  const abortRef = useRef(null);
  const modeRef  = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const {
    speak: rawSpeak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis();

  // ------- speak wrapper: sets aiSpeaking true, then false on end -------
  const speakAndWait = useCallback((text) => {
    return new Promise((resolve) => {
      if (!text) { resolve(); return; }
      setAiSpeaking(true);

      // stop mic while AI speaks
      setMicActive(false);

      const synth = window.speechSynthesis;
      if (!synth) { setAiSpeaking(false); resolve(); return; }

      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.02;
      u.pitch = 1;
      u.volume = 1;

      const voices = synth.getVoices();
      const v =
        voices.find(x => /Google US English|Samantha|Microsoft Aria/i.test(x.name)) ||
        voices.find(x => x.lang === 'en-US');
      if (v) u.voice = v;

      u.onend = () => {
        setAiSpeaking(false);
        // ✅ AI ne baat khatam ki → ab mic live
        setTimeout(() => {
          setMicActive(true);
          resolve();
        }, 150);
      };
      u.onerror = () => {
        setAiSpeaking(false);
        setMicActive(true);
        resolve();
      };

      synth.speak(u);
    });
  }, []);

  // ------- webhook -------
  const handleFinalResult = useCallback(async (text) => {
    if (!text) return;
    if (aiSpeaking) return;   // ignore while AI is speaking (prevent echo loop)

    // ✅ user bola → mic band, AI cut
    setMicActive(false);
    cancelSpeech();

    setMessages(prev => [...prev, { role: 'user', text }]);
    setProcessing(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort('timeout'), 30000);

    const menuContext = toastMenu
      ? (toastMenu.menuGroups || [])
          .flatMap(g => (g.menuItems || []).map(i =>
            `${i.name}${i.price != null ? ` — $${i.price}` : ''}`))
          .slice(0, 40).join('\n')
      : '';

    try {
      const reply = await askAgent(text, modeRef.current, controller.signal, {
        menuContext,
        cart: ToastCart.get(),
      });
      clearTimeout(timer);

      if (!reply) {
        setMessages(prev => [...prev, { role: 'agent', text: 'Empty response — try again?' }]);
        setMicActive(true);
        return;
      }

      setMessages(prev => [...prev, { role: 'agent', text: reply }]);
      // 🎙️ AI bole, phir mic live ho
      await speakAndWait(reply);
    } catch (err) {
      clearTimeout(timer);
      const msg = err.name === 'AbortError'
        ? '⏱️ Request timed out.'
        : '💥 ' + err.message;
      setMessages(prev => [...prev, { role: 'agent', text: msg }]);
      setMicActive(true);
      console.error('❌ Webhook error:', err);
    } finally {
      setProcessing(false);
    }
  }, [cancelSpeech, toastMenu, aiSpeaking, speakAndWait]);

  // ------- speech recognition -------
  const {
    supported, listening, interim, error: recError, permission,
    start: startMic, stop: stopMic, toggle: toggleMic,
  } = useSpeechRecognition({
    onFinalResult: handleFinalResult,
  });

  // 🔥 sync mic with micActive (turn control)
  useEffect(() => {
    if (!supported) return;
    if (micActive && callActive && !aiSpeaking && !processing) {
      startMic().catch(() => {});
    } else {
      stopMic();
    }
  }, [micActive, callActive, aiSpeaking, processing, supported, startMic, stopMic]);

  useEffect(() => {
    if (!recError) return;
    if (recError === 'not-allowed' || recError === 'permission-dismissed') {
      setMessages(prev => [...prev, {
        role: 'sys',
        text: "🎤 Microphone is blocked. Click the 🔒 padlock → allow Microphone → reload.",
      }]);
    }
  }, [recError]);

  const handleOpen = useCallback((selectedMode) => {
    setMode(selectedMode);
    setOpen(true);
    setCallActive(false);
    setMicActive(false);
    setConnecting(true);
    setTimeout(() => setConnecting(false), 900);
  }, []);

  // ------- 📞 PHONE toggle -------
  const handleCallRequest = useCallback(() => {
    setCallActive(prev => {
      const turningOn = !prev;

      if (turningOn) {
        setMode('voice');
        // start mic next turn (after AI greeting — optional)
        setTimeout(() => setMicActive(true), 300);
      } else {
        setMicActive(false);
        cancelSpeech();
        setMode('chat');
      }

      return turningOn;
    });
  }, [cancelSpeech]);

  const handleMicClick = useCallback(() => {
    // Manual override during call
    if (!callActive) return;
    setMicActive(prev => !prev);
  }, [callActive]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCallActive(false);
    setMicActive(false);
    stopMic();
    cancelSpeech();
  }, [stopMic, cancelSpeech]);

  const handleSendText = useCallback(() => {
    const t = inputText.trim();
    if (!t) return;
    setInputText('');
    // typed input → always allowed (bypass aiSpeaking gate)
    setAiSpeaking(false);
    cancelSpeech();
    handleFinalResult(t);
  }, [inputText, cancelSpeech, handleFinalResult]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">

      <AgentBar
        hidden={open}
        onVoice={() => handleOpen('voice')}
        onCall={()  => handleOpen('call')}
        onChat={()  => handleOpen('chat')}
      />

      <AgentPanel
        open={open}
        onClose={handleClose}
        messages={messages}
        processing={processing || connecting}
        interim={interim}
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSendText}
        onCall={handleCallRequest}
        onMicClick={handleMicClick}
        listening={listening}
        supported={supported}
        micBlocked={permission === 'denied'}
        callActive={callActive}
        aiSpeaking={aiSpeaking}
        onToastMenuReady={setToastMenu}
      />
    </div>
  );
}