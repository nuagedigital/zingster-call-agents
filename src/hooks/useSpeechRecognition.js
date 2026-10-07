import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechRecognition({
  lang = 'en-US',
  onFinalResult,
} = {}) {
  const recognitionRef = useRef(null);
  const onFinalRef = useRef(onFinalResult);

  const activeRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  const transcriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const submittedRef = useRef(false);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt');

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  // ---------------------------------------------------------
  // Clear silence timer
  // ---------------------------------------------------------

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------
  // Submit speech
  // ---------------------------------------------------------

  const submitTranscript = useCallback(() => {
    clearSilenceTimer();

    const text = transcriptRef.current.trim();

    if (!text || submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    console.log('[VOICE] SUBMIT:', text);

    setInterim('');

    onFinalRef.current?.(text);

    /*
     * We have the answer.
     * Stop recognition while the AI processes/speaks.
     */
    activeRef.current = false;
    manuallyStoppedRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
  }, [clearSilenceTimer]);

  // ---------------------------------------------------------
  // Create recognition
  // ---------------------------------------------------------

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        'Browser SpeechRecognition is not supported.'
      );

      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();

    recognition.lang = lang;

    /*
     * IMPORTANT FOR CHROME:
     *
     * Keep recognition alive instead of ending immediately
     * after a very short word.
     */
    recognition.continuous = true;

    /*
     * Required so we can capture "five" even if Chrome
     * doesn't mark it final.
     */
    recognition.interimResults = true;

    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      console.log('[VOICE] recognition started');

      activeRef.current = true;

      setListening(true);
      setError(null);
    };

    recognition.onaudiostart = () => {
      console.log('[VOICE] audio started');
    };

    recognition.onsoundstart = () => {
      console.log('[VOICE] sound detected');
    };

    recognition.onspeechstart = () => {
      console.log('[VOICE] speech started');

      clearSilenceTimer();
    };

    // -------------------------------------------------------
    // RESULT
    // -------------------------------------------------------

    recognition.onresult = (event) => {
      let completeText = '';

      /*
       * Read everything Chrome/Edge currently has.
       *
       * IMPORTANT:
       * We DO NOT require result.isFinal.
       */
      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];

        if (!result?.[0]) continue;

        const text =
          result[0].transcript?.trim();

        if (!text) continue;

        completeText +=
          (completeText ? ' ' : '') +
          text;
      }

      completeText = completeText.trim();

      if (!completeText) {
        return;
      }

      transcriptRef.current =
        completeText;

      setInterim(completeText);

      console.log(
        '[VOICE] HEARD:',
        completeText
      );

      /*
       * Every time speech changes, restart the silence timer.
       *
       * This means:
       *
       * User: "five"
       *
       * HEARD: five
       *
       * 850 ms silence
       *
       * SUBMIT: five
       *
       * We don't wait for Chrome to mark it final.
       */

      clearSilenceTimer();

      silenceTimerRef.current =
        setTimeout(() => {
          submitTranscript();
        }, 850);
    };

    // -------------------------------------------------------
    // SPEECH ENDED
    // -------------------------------------------------------

    recognition.onspeechend = () => {
      console.log(
        '[VOICE] speech ended'
      );

      /*
       * Do NOT immediately stop recognition.
       *
       * Give Chrome time to provide its transcript.
       */

      clearSilenceTimer();

      silenceTimerRef.current =
        setTimeout(() => {
          submitTranscript();
        }, 650);
    };

    // -------------------------------------------------------
    // ERROR
    // -------------------------------------------------------

    recognition.onerror = (event) => {
      console.log(
        '[VOICE] recognition error:',
        event.error
      );

      if (
        event.error === 'not-allowed' ||
        event.error ===
          'service-not-allowed'
      ) {
        setPermission('denied');
        setError('not-allowed');

        activeRef.current = false;
        setListening(false);

        return;
      }

      /*
       * These are normal and should not break the call.
       */
      if (
        event.error === 'no-speech' ||
        event.error === 'aborted'
      ) {
        return;
      }

      setError(event.error);
    };

    // -------------------------------------------------------
    // RECOGNITION ENDED
    // -------------------------------------------------------

    recognition.onend = () => {
      console.log(
        '[VOICE] recognition ended'
      );

      setListening(false);

      /*
       * If we already have text, submit it.
       */
      if (
        transcriptRef.current.trim() &&
        !submittedRef.current
      ) {
        submitTranscript();
        return;
      }

      /*
       * Chrome occasionally ends continuous recognition
       * by itself.
       *
       * If we're SUPPOSED to still be listening,
       * restart it.
       */
      if (
        activeRef.current &&
        !manuallyStoppedRef.current
      ) {
        clearTimeout(
          restartTimerRef.current
        );

        restartTimerRef.current =
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              // Ignore duplicate start
            }
          }, 250);
      }
    };

    recognitionRef.current =
      recognition;

    return () => {
      clearSilenceTimer();

      clearTimeout(
        restartTimerRef.current
      );

      activeRef.current = false;
      manuallyStoppedRef.current = true;

      try {
        recognition.abort();
      } catch {
        // ignore
      }

      recognitionRef.current = null;
    };
  }, [
    lang,
    clearSilenceTimer,
    submitTranscript,
  ]);

  // ---------------------------------------------------------
  // Microphone permission
  // ---------------------------------------------------------

  const ensureMicAccess =
    useCallback(async () => {
      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        return true;
      }

      try {
        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });

        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        setPermission('granted');
        setError(null);

        return true;
      } catch (err) {
        console.error(
          '[VOICE] microphone permission:',
          err
        );

        setPermission('denied');
        setError('not-allowed');

        return false;
      }
    }, []);

  // ---------------------------------------------------------
  // START
  // ---------------------------------------------------------

  const start =
    useCallback(async () => {
      const recognition =
        recognitionRef.current;

      if (!recognition) {
        return;
      }

      if (activeRef.current) {
        return;
      }

      const allowed =
        await ensureMicAccess();

      if (!allowed) {
        return;
      }

      console.log(
        '[VOICE] starting microphone'
      );

      clearSilenceTimer();

      transcriptRef.current = '';
      submittedRef.current = false;
      manuallyStoppedRef.current = false;
      activeRef.current = true;

      setInterim('');
      setError(null);

      try {
        recognition.start();
      } catch (err) {
        if (
          err?.name ===
          'InvalidStateError'
        ) {
          /*
           * Chrome may still be closing the previous session.
           */
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          }, 300);
        } else {
          console.error(
            '[VOICE] start failed:',
            err
          );
        }
      }
    }, [
      ensureMicAccess,
      clearSilenceTimer,
    ]);

  // ---------------------------------------------------------
  // STOP
  // ---------------------------------------------------------

  const stop =
    useCallback(() => {
      console.log(
        '[VOICE] stopping microphone'
      );

      clearSilenceTimer();

      manuallyStoppedRef.current = true;
      activeRef.current = false;

      /*
       * Do NOT submit old transcript when AI intentionally
       * turns microphone off.
       */
      transcriptRef.current = '';
      submittedRef.current = false;

      setInterim('');
      setListening(false);

      try {
        recognitionRef.current?.stop();
      } catch {
        // already stopped
      }
    }, [clearSilenceTimer]);

  // ---------------------------------------------------------
  // TOGGLE
  // ---------------------------------------------------------

  const toggle =
    useCallback(() => {
      if (activeRef.current) {
        stop();
      } else {
        start();
      }
    }, [start, stop]);

  return {
    supported,
    listening,
    interim,
    error,
    permission,
    start,
    stop,
    toggle,
  };
}