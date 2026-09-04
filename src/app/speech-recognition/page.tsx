"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Loader2, Volume2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function SpeechRecognitionPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "stt" | "thinking" | "tts" | "speaking">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  // Stop current audio if playing
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setErrorMsg("");
      setStatus("listening");
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        processAudio();
      };

      // Set up AudioContext for Silence Detection (VAD)
      const audioCtx = new window.AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      let isSilent = true;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setVolume(avg);

        if (avg > 15) { // Threshold for speech
          isSilent = false;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          if (!isSilent && !silenceTimerRef.current) {
            // Started being silent after speaking
            silenceTimerRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
              }
            }, 2000); // 2 seconds of silence triggers stop
          }
        }

        if (mediaRecorder.state === "recording") {
          rafRef.current = requestAnimationFrame(checkAudioLevel);
        }
      };

      mediaRecorder.start(100);
      checkAudioLevel();

    } catch (err) {
      console.error(err);
      setErrorMsg("Микрофонға рұқсат берілмеді немесе қате шықты.");
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const processAudio = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // 1. Speech-to-Text
      setStatus("stt");
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const sttRes = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });
      if (!sttRes.ok) throw new Error("STT қатесі");
      const { text: userText } = await sttRes.json();

      if (!userText) {
        setStatus("idle");
        return; // Үндемеді немесе танылмады
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);

      // 2. Chat / LLM (Thinking)
      setStatus("thinking");
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText })
      });
      if (!chatRes.ok) throw new Error("AI қатесі");
      const { reply: aiText } = await chatRes.json();

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", text: aiText }]);

      // 3. Text-to-Speech
      setStatus("tts");
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText })
      });
      if (!ttsRes.ok) throw new Error("TTS қатесі");
      
      const mp3Blob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(mp3Blob);

      // 4. Playback
      setStatus("speaking");
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setStatus("idle");
      };
      
      await audio.play();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Белгісіз қате пайда болды");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
          <span className="text-slate-800">Артқа</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-purple-500" />
          Ақылды Көмекші
        </h1>
        <div className="w-24" /> {/* Spacer */}
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-6">
        
        {/* Chat History */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6 overflow-y-auto min-h-[400px] flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Mic className="w-16 h-16 opacity-50" />
              <p className="text-lg font-medium text-center max-w-xs">
                Сөйлесуді бастау үшін төмендегі микрофонды басыңыз.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-3xl ${
                    msg.role === "user" 
                      ? "bg-blue-500 text-white rounded-tr-sm" 
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`}>
                    <p className="text-lg font-medium leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {/* Status Indicator */}
          {status !== "idle" && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-start w-full"
            >
              <div className="max-w-[80%] p-4 rounded-3xl bg-slate-50 text-slate-500 rounded-tl-sm border border-slate-200 flex items-center gap-3">
                {status === "listening" && (
                  <>
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    <span>Сізді тыңдап тұрмын... (2 сек. үнсіздік болғанда тоқтайды)</span>
                  </>
                )}
                {status === "stt" && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Сөзіңізді мәтінге айналдыруда (STT)...</span>
                  </>
                )}
                {status === "thinking" && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    <span>Жауап ойлап жатырмын (LLM)...</span>
                  </>
                )}
                {status === "tts" && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                    <span>Жауапты дыбысқа айналдыруда (TTS)...</span>
                  </>
                )}
                {status === "speaking" && (
                  <>
                    <Volume2 className="w-5 h-5 text-emerald-500 animate-pulse" />
                    <span>Сөйлеп жатыр...</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 py-4">
          {errorMsg && (
            <div className="text-red-500 font-medium px-4 py-2 bg-red-50 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="relative">
            {/* Volume rings for active listening */}
            {status === "listening" && (
              <div 
                className="absolute inset-0 bg-blue-400 rounded-full opacity-20"
                style={{ transform: `scale(${1 + volume / 50})`, transition: 'transform 0.1s' }}
              />
            )}
            
            <button
              onClick={status === "listening" ? stopRecording : startListening}
              disabled={status !== "idle" && status !== "listening"}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all
                ${status === "listening" 
                  ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110" 
                  : status !== "idle"
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
                }
              `}
            >
              {status !== "idle" && status !== "listening" ? (
                 <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                 <Mic className="w-10 h-10" />
              )}
            </button>
          </div>
          
          <p className="text-slate-500 font-medium h-6">
            {status === "idle" && "Сөйлеу үшін микрофонды басыңыз"}
            {status === "listening" && "Тыңдауда... (тоқтату үшін қайта басыңыз)"}
          </p>
        </div>
      </main>
    </div>
  );
}
