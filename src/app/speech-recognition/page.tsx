"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Loader2, Volume2, Sparkles, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioUrl?: string;
};

type Status = "idle" | "listening" | "stt" | "thinking" | "tts" | "speaking";

const GREETING =
  "Сәлем! Мен — Қолдау, сенің әңгімелесетін досыңмын. Микрофонды басып, маған кез келген нәрсені айт. Мен тыңдап тұрмын!";

const STARTERS = [
  "Сәлем! Менің атым Айдар.",
  "Бүгін көңіл-күйім жақсы.",
  "Маған қысқа ертегі айтып бер.",
  "Менің сүйікті жануарым — мысық.",
];

const STATUS_TEXT: Record<Exclude<Status, "idle">, string> = {
  listening: "Тыңдап тұрмын... айтып болған соң күт",
  stt: "Сөзіңді түсінуге тырысып жатырмын...",
  thinking: "Ойланып жатырмын...",
  tts: "Жауап дайындап жатырмын...",
  speaking: "Қолдау сөйлеп жатыр...",
};

export default function SpeechPracticePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "greeting", role: "assistant", text: GREETING },
  ]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    rafRef.current = null;
    silenceTimerRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      currentAudioRef.current?.pause();
    };
  }, [cleanup]);

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const startListening = async () => {
    setErrorMsg("");
    currentAudioRef.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        setVolume(0);
        processAudio();
      };

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let hasSpoken = false;
      const startedAt = performance.now();

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg);

        const elapsed = performance.now() - startedAt;

        if (avg > 15) {
          hasSpoken = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpoken && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
          }, 1600);
        }

        // give up if the child never speaks
        if (!hasSpoken && elapsed > 7000) {
          setErrorMsg("Дауыс естілмеді. Микрофонға жақынырақ сөйлеп көр.");
          if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
          return;
        }
        // hard cap
        if (elapsed > 20000) {
          if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
          return;
        }

        if (mediaRecorder.state === "recording") {
          rafRef.current = requestAnimationFrame(checkAudioLevel);
        }
      };

      mediaRecorder.start(100);
      setStatus("listening");
      checkAudioLevel();
    } catch (err) {
      console.error(err);
      setErrorMsg("Микрофонға рұқсат берілмеді. Браузер параметрінен рұқсат беріңіз.");
      setStatus("idle");
    }
  };

  const speak = useCallback(async (text: string, messageId: string): Promise<string | null> => {
    try {
      const ttsRes = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!ttsRes.ok) return null;
      const url = URL.createObjectURL(await ttsRes.blob());
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, audioUrl: url } : m)));
      return url;
    } catch {
      return null;
    }
  }, []);

  const playUrl = (url: string) => {
    currentAudioRef.current?.pause();
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.play().catch(() => {});
  };

  const sendToAssistant = useCallback(
    async (userText: string) => {
      const history = messagesRef.current.filter((m) => m.id !== "greeting");
      setStatus("thinking");
      try {
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userText, history }),
        });
        if (!chatRes.ok) throw new Error("AI жауап бере алмады");
        const { reply } = await chatRes.json();

        const aiId = `a-${Date.now()}`;
        setMessages((prev) => [...prev, { id: aiId, role: "assistant", text: reply }]);

        setStatus("tts");
        const url = await speak(reply, aiId);

        setStatus("speaking");
        if (url) {
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => setStatus("idle");
          audio.onerror = () => setStatus("idle");
          await audio.play().catch(() => setStatus("idle"));
        } else {
          setStatus("idle");
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Қате пайда болды. Қайта көр.");
        setStatus("idle");
      }
    },
    [speak]
  );

  const processAudio = async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    if (blob.size < 1400) {
      setStatus("idle");
      return;
    }
    setStatus("stt");
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      const sttRes = await fetch("/api/speech-to-text", { method: "POST", body: formData });
      if (!sttRes.ok) throw new Error("Сөзіңді тани алмадым");
      const { text: userText } = await sttRes.json();

      if (!userText || !userText.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: "assistant",
            text: "Естімедім 🙈 Микрофонға жақынырақ, анық айтып көрші.",
          },
        ]);
        setStatus("idle");
        return;
      }

      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: userText.trim() }]);
      await sendToAssistant(userText.trim());
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Қате пайда болды. Қайта көр.");
      setStatus("idle");
    }
  };

  const sendStarter = (text: string) => {
    if (status !== "idle") return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    sendToAssistant(text);
  };

  const resetConversation = () => {
    cleanup();
    currentAudioRef.current?.pause();
    setStatus("idle");
    setErrorMsg("");
    setMessages([{ id: "greeting", role: "assistant", text: GREETING }]);
  };

  const conversationStarted = messages.some((m) => m.role === "user");
  const busy = status !== "idle" && status !== "listening";

  return (
    <PageShell theme="light" className="p-6">
      <header className="flex items-center justify-between mb-6 relative z-10">
        <Link href="/" className="btn-ghost" onClick={cleanup}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
          <span>Артқа</span>
        </Link>
        <h1 className="heading-lg text-2xl flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-ai-purple" />
          Әңгімелесу жаттығуы
        </h1>
        <div className="w-24" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full relative z-10 flex flex-col gap-5">
        {/* What is this */}
        {!conversationStarted && (
          <GlassCard className="p-6">
            <p className="text-lg font-semibold mb-2">Бұл бөлім не үшін керек?</p>
            <p className="text-muted mb-4">
              Мұнда бала «Қолдау» деген жасанды интеллект досымен еркін сөйлеседі. Ол
              баланы тыңдап, түсінікті сұрақтар қойып отырады — сонда бала толық
              сөйлеммен сөйлеуге, ойын жеткізуге үйренеді.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                ["1", "Микрофонды бас", "Төмендегі көк батырманы бас"],
                ["2", "Анық сөйле", "Айтып болған соң тоқта — жүйе өзі тыңдауды бітіреді"],
                ["3", "Жауабын тыңда", "Қолдау жауап беріп, жаңа сұрақ қояды"],
              ].map(([n, t, d]) => (
                <div key={n} className="glass rounded-2xl p-3">
                  <div className="w-6 h-6 rounded-full bg-ai-purple text-white text-xs font-bold flex items-center justify-center mb-2">
                    {n}
                  </div>
                  <p className="font-semibold text-foreground">{t}</p>
                  <p className="text-muted text-xs mt-1">{d}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Chat History */}
        <GlassCard strong className="flex-1 p-6 overflow-y-auto min-h-[340px] max-h-[46vh] flex flex-col gap-4" >
          <div ref={scrollRef} className="flex flex-col gap-4 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-4 ${
                      msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                    }`}
                  >
                    <p className="text-lg font-medium leading-relaxed">{msg.text}</p>
                    {msg.role === "assistant" && msg.audioUrl && (
                      <button
                        onClick={() => playUrl(msg.audioUrl!)}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-ai-purple font-semibold hover:opacity-80"
                      >
                        <Volume2 className="w-4 h-4" /> Тыңдау
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {status !== "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
                <div className="max-w-[80%] p-4 rounded-3xl glass text-muted rounded-tl-sm flex items-center gap-3">
                  {status === "listening" ? (
                    <div className="w-4 h-4 rounded-full bg-error animate-pulse" />
                  ) : status === "speaking" ? (
                    <Volume2 className="w-5 h-5 text-success animate-pulse" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin text-ai-purple" />
                  )}
                  <span>{STATUS_TEXT[status]}</span>
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>

        {/* Starters */}
        {!conversationStarted && status === "idle" && (
          <div className="flex flex-wrap gap-2 justify-center">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => sendStarter(s)}
                className="px-4 py-2 rounded-full glass text-sm font-medium hover:border-ai-purple/40 hover:text-ai-purple transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3 pb-4">
          {errorMsg && <div className="banner-error font-medium px-4 py-2 text-center">{errorMsg}</div>}

          <div className="relative">
            {status === "listening" && (
              <div
                className="absolute inset-0 bg-accent rounded-full opacity-20"
                style={{ transform: `scale(${1 + volume / 50})`, transition: "transform 0.1s" }}
              />
            )}
            <button
              onClick={status === "listening" ? stopListening : startListening}
              disabled={busy}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all
                ${
                  status === "listening"
                    ? "bg-error scale-110"
                    : busy
                    ? "bg-black/20 cursor-not-allowed"
                    : "bg-gradient-to-br from-accent to-accent-hover hover:scale-105 shadow-accent/30"
                }`}
            >
              {busy ? <Loader2 className="w-10 h-10 animate-spin" /> : <Mic className="w-10 h-10" />}
            </button>
          </div>

          <p className="text-muted font-medium h-6 text-center">
            {status === "idle" && "Сөйлеу үшін микрофонды бас"}
            {status === "listening" && "Айтып болған соң тоқта — өзім тыңдауды бітіремін"}
            {busy && STATUS_TEXT[status as Exclude<Status, "idle">]}
          </p>

          {conversationStarted && status === "idle" && (
            <button onClick={resetConversation} className="btn-ghost text-sm px-4 py-2">
              <RotateCcw className="w-4 h-4" /> Әңгімені бастан бастау
            </button>
          )}
        </div>
      </main>
    </PageShell>
  );
}
