import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import AgentBar from './components/AgentBar.jsx';
import AgentPanel from './components/AgentPanel.jsx';

import { useSpeechRecognition } from './hooks/useSpeechRecognition.js';

import {
  useSpeechSynthesis,
} from './hooks/useSpeechSynthesis.js';

import { askAgent } from './lib/api.js';

import { ToastCart } from './lib/toast.js';

const GREETING =
  'Hi there! Thanks for calling Zingster. I can help you place a pickup order today. What can I get started for you?';

export default function App() {
  const [open, setOpen] = useState(false);

  const [mode, setMode] =
    useState('chat');

  const [inputText, setInputText] =
    useState('');

  const [processing, setProcessing] =
    useState(false);

  const [connecting, setConnecting] =
    useState(false);

  const [toastMenu, setToastMenu] =
    useState(null);

  const [callActive, setCallActive] =
    useState(false);

  const [aiSpeaking, setAiSpeaking] =
    useState(false);

  /*
   * Determines whether we WANT
   * recognition to be active.
   */
  const [micActive, setMicActive] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: 'agent',
        text: GREETING,
      },
    ]);

  const abortRef = useRef(null);

  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const {
    cancel: cancelSpeech,
  } = useSpeechSynthesis();

  // ==========================================================
  // SPEAK AGENT RESPONSE
  // ==========================================================

  const speakAndWait =
    useCallback((text) => {
      return new Promise((resolve) => {
        if (!text) {
          resolve();
          return;
        }

        /*
         * Turn microphone OFF before
         * the AI starts speaking.
         */
        setMicActive(false);

        setAiSpeaking(true);

        if (
          !('speechSynthesis' in window)
        ) {
          setAiSpeaking(false);

          setMicActive(true);

          resolve();

          return;
        }

        const synth =
          window.speechSynthesis;

        /*
         * Stop previous voice.
         */
        synth.cancel();

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        utterance.lang = 'en-US';

        utterance.rate = 1;

        utterance.pitch = 1;

        utterance.volume = 1;

        /*
         * Try to use a natural
         * English voice.
         */
        const voices =
          synth.getVoices();

        const selectedVoice =
          voices.find((voice) =>
            /Google US English|Samantha|Aria/i.test(
              voice.name
            )
          ) ||
          voices.find(
            (voice) =>
              voice.lang === 'en-US'
          );

        if (selectedVoice) {
          utterance.voice =
            selectedVoice;
        }

        utterance.onend = () => {
          console.log(
            'AI FINISHED SPEAKING'
          );

          setAiSpeaking(false);

          /*
           * Wait briefly before microphone
           * starts so it doesn't hear the
           * end of the AI voice.
           */
          setTimeout(() => {
            setMicActive(true);

            resolve();
          }, 400);
        };

        utterance.onerror = (event) => {
          console.log(
            'Speech synthesis error:',
            event
          );

          setAiSpeaking(false);

          setTimeout(() => {
            setMicActive(true);

            resolve();
          }, 400);
        };

        console.log(
          'AI SPEAKING:',
          text
        );

        synth.speak(utterance);
      });
    }, []);

  // ==========================================================
  // USER ANSWER
  // ==========================================================

  const handleFinalResult =
    useCallback(
      async (rawText) => {
        if (!rawText) {
          return;
        }

        const text =
          String(rawText).trim();

        if (!text) {
          return;
        }

        /*
         * Don't accept microphone audio
         * while AI is speaking.
         */
        if (aiSpeaking) {
          return;
        }

        console.log(
          'USER SAID:',
          text
        );

        /*
         * IMPORTANT:
         *
         * DO NOT convert:
         *
         * five -> 5
         * two  -> 2
         * three -> 3
         *
         * Send exactly what recognition
         * heard.
         */

        setMicActive(false);

        try {
          cancelSpeech();
        } catch {
          // Ignore
        }

        /*
         * Add user message.
         */
        setMessages((previous) => [
          ...previous,
          {
            role: 'user',
            text,
          },
        ]);

        setProcessing(true);

        /*
         * Cancel previous API request.
         */
        if (abortRef.current) {
          abortRef.current.abort();
        }

        const controller =
          new AbortController();

        abortRef.current =
          controller;

        const timer =
          setTimeout(() => {
            controller.abort();
          }, 30000);

        /*
         * Create menu context.
         */
        const menuContext =
          toastMenu
            ? (
                toastMenu.menuGroups ||
                []
              )
                .flatMap((group) =>
                  (
                    group.menuItems ||
                    []
                  ).map((item) => {
                    if (
                      item.price != null
                    ) {
                      return `${item.name} — $${item.price}`;
                    }

                    return item.name;
                  })
                )
                .slice(0, 40)
                .join('\n')
            : '';

        try {
          /*
           * SEND EXACT SPEECH TO API
           *
           * Example:
           *
           * "five"
           *
           * gets sent as:
           *
           * "five"
           */

          const reply =
            await askAgent(
              text,
              modeRef.current,
              controller.signal,
              {
                menuContext,

                cart:
                  ToastCart.get(),
              }
            );

          clearTimeout(timer);

          if (!reply) {
            const message =
              'I did not receive a response. Please try again.';

            setMessages(
              (previous) => [
                ...previous,
                {
                  role: 'agent',
                  text: message,
                },
              ]
            );

            await speakAndWait(
              message
            );

            return;
          }

          console.log(
            'AGENT RESPONSE:',
            reply
          );

          /*
           * Show response.
           */
          setMessages(
            (previous) => [
              ...previous,
              {
                role: 'agent',
                text: reply,
              },
            ]
          );

          /*
           * Speak response.
           */
          await speakAndWait(
            reply
          );
        } catch (error) {
          clearTimeout(timer);

          console.error(
            'Agent API error:',
            error
          );

          const message =
            error?.name ===
            'AbortError'
              ? 'The request timed out. Please try again.'
              : 'Something went wrong. Please try again.';

          setMessages(
            (previous) => [
              ...previous,
              {
                role: 'agent',
                text: message,
              },
            ]
          );

          await speakAndWait(
            message
          );
        } finally {
          setProcessing(false);
        }
      },
      [
        aiSpeaking,
        cancelSpeech,
        toastMenu,
        speakAndWait,
      ]
    );

  // ==========================================================
  // SPEECH RECOGNITION
  // ==========================================================

  const {
    supported,
    listening,
    interim,
    error: recognitionError,
    permission,
    start: startMic,
    stop: stopMic,
  } = useSpeechRecognition({
    onFinalResult:
      handleFinalResult,
  });

  // ==========================================================
  // AUTOMATIC MIC START
  // ==========================================================

  useEffect(() => {
    /*
     * Do nothing if browser doesn't
     * support speech recognition.
     */
    if (!supported) {
      return;
    }

    /*
     * Start listening when:
     *
     * call is active
     * AI isn't speaking
     * API isn't processing
     * micActive = true
     */
    if (
      callActive &&
      micActive &&
      !aiSpeaking &&
      !processing &&
      !listening
    ) {
      /*
       * Small delay improves Chrome
       * reliability between recognition
       * sessions.
       */
      const timer =
        setTimeout(() => {
          startMic();
        }, 250);

      return () =>
        clearTimeout(timer);
    }

    /*
     * Stop microphone if it
     * shouldn't currently listen.
     */
    if (
      !callActive ||
      !micActive ||
      aiSpeaking ||
      processing
    ) {
      stopMic();
    }
  }, [
    callActive,
    micActive,
    aiSpeaking,
    processing,
    listening,
    supported,
    startMic,
    stopMic,
  ]);

  // ==========================================================
  // RECOGNITION ERRORS
  // ==========================================================

  useEffect(() => {
    if (!recognitionError) {
      return;
    }

    console.log(
      'Recognition error:',
      recognitionError
    );

    if (
      recognitionError ===
        'not-allowed' ||
      recognitionError ===
        'service-not-allowed'
    ) {
      setMessages(
        (previous) => [
          ...previous,
          {
            role: 'sys',
            text:
              'Microphone access is blocked. Please allow microphone access and reload the page.',
          },
        ]
      );
    }
  }, [recognitionError]);

  // ==========================================================
  // OPEN PANEL
  // ==========================================================

  const handleOpen =
    useCallback(
      (selectedMode) => {
        setMode(selectedMode);

        setOpen(true);

        setCallActive(false);

        setMicActive(false);

        setConnecting(true);

        setTimeout(() => {
          setConnecting(false);
        }, 900);
      },
      []
    );

  // ==========================================================
  // START / END CALL
  // ==========================================================

  const handleCallRequest =
    useCallback(() => {
      if (!callActive) {
        /*
         * START CALL
         */

        console.log(
          'STARTING VOICE CALL'
        );

        setCallActive(true);

        setMode('voice');

        /*
         * Keep microphone OFF while
         * greeting is speaking.
         */
        setMicActive(false);

        setTimeout(() => {
          speakAndWait(
            GREETING
          );
        }, 200);
      } else {
        /*
         * END CALL
         */

        console.log(
          'ENDING VOICE CALL'
        );

        setCallActive(false);

        setMicActive(false);

        stopMic();

        try {
          cancelSpeech();
        } catch {
          // Ignore
        }

        if (
          'speechSynthesis' in
          window
        ) {
          window.speechSynthesis.cancel();
        }

        setAiSpeaking(false);

        setMode('chat');
      }
    }, [
      callActive,
      stopMic,
      cancelSpeech,
      speakAndWait,
    ]);

  // ==========================================================
  // MANUAL MIC BUTTON
  // ==========================================================

  const handleMicClick =
    useCallback(() => {
      if (!callActive) {
        return;
      }

      if (aiSpeaking) {
        return;
      }

      setMicActive(
        (previous) => !previous
      );
    }, [
      callActive,
      aiSpeaking,
    ]);

  // ==========================================================
  // CLOSE PANEL
  // ==========================================================

  const handleClose =
    useCallback(() => {
      setOpen(false);

      setCallActive(false);

      setMicActive(false);

      stopMic();

      try {
        cancelSpeech();
      } catch {
        // Ignore
      }

      if (
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }

      setAiSpeaking(false);
    }, [
      stopMic,
      cancelSpeech,
    ]);

  // ==========================================================
  // SEND TEXT MESSAGE
  // ==========================================================

  const handleSendText =
    useCallback(() => {
      const text =
        inputText.trim();

      if (!text) {
        return;
      }

      setInputText('');

      handleFinalResult(text);
    }, [
      inputText,
      handleFinalResult,
    ]);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <AgentBar
        hidden={open}
        onVoice={() =>
          handleOpen('voice')
        }
        onCall={() =>
          handleOpen('call')
        }
        onChat={() =>
          handleOpen('chat')
        }
      />

      <AgentPanel
        open={open}
        onClose={handleClose}

        messages={messages}

        processing={
          processing ||
          connecting
        }

        interim={interim}

        inputText={inputText}

        setInputText={
          setInputText
        }

        onSend={
          handleSendText
        }

        onCall={
          handleCallRequest
        }

        onMicClick={
          handleMicClick
        }

        listening={listening}

        supported={supported}

        micBlocked={
          permission ===
          'denied'
        }

        callActive={
          callActive
        }

        aiSpeaking={
          aiSpeaking
        }

        onToastMenuReady={
          setToastMenu
        }
      />
    </div>
  );
}