import { useEffect, useRef, useState } from 'react';

/** Web Speech API voice assistant hook: speech-to-text input + text-to-speech output. */
export function useVoice() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef< any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(typeof SR !== 'undefined' && typeof window.speechSynthesis !== 'undefined');
  }, []);

  const startListening = (onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignore */ }
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignore */ }
    }
    setListening(false);
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { listening, speaking, supported, startListening, stopListening, speak, stopSpeaking };
}
