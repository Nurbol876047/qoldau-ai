"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mic } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

const SOUND_DATA: Record<string, {
  repeatWord: string;
  buildWord: { text: string; emoji: string };
  findWords: { text: string; has: boolean; emoji: string }[];
}> = {
  "Р": { repeatWord: "РАУШАН", buildWord: { text: "АРА", emoji: "🐝" }, findWords: [ { text: "АЛМА", has: false, emoji: "🍎" }, { text: "РОБОТ", has: true, emoji: "🤖" }, { text: "КІТАП", has: false, emoji: "📚" } ] },
  "Л": { repeatWord: "ЛАҚ", buildWord: { text: "КӨЛ", emoji: "🏞️" }, findWords: [ { text: "КҮН", has: false, emoji: "☀️" }, { text: "ЛАГЕРЬ", has: true, emoji: "⛺" }, { text: "АҒАШ", has: false, emoji: "🌳" } ] },
  "Ш": { repeatWord: "ШАР", buildWord: { text: "ШАЙ", emoji: "🍵" }, findWords: [ { text: "МЫСЫҚ", has: false, emoji: "🐱" }, { text: "ШАШ", has: true, emoji: "💇‍♀️" }, { text: "ИТ", has: false, emoji: "🐶" } ] },
  "Ж": { repeatWord: "ЖОЛ", buildWord: { text: "ЖАЗ", emoji: "☀️" }, findWords: [ { text: "СУ", has: false, emoji: "💧" }, { text: "ЖЫЛАН", has: true, emoji: "🐍" }, { text: "ОТ", has: false, emoji: "🔥" } ] },
  "С": { repeatWord: "СУ", buildWord: { text: "СИЫР", emoji: "🐄" }, findWords: [ { text: "ТАУ", has: false, emoji: "⛰️" }, { text: "САН", has: true, emoji: "🔢" }, { text: "АЙ", has: false, emoji: "🌙" } ] },
  "Қ": { repeatWord: "ҚАЗ", buildWord: { text: "ҚАР", emoji: "❄️" }, findWords: [ { text: "ШӨП", has: false, emoji: "🌿" }, { text: "ҚОЙ", has: true, emoji: "🐑" }, { text: "ГҮЛ", has: false, emoji: "🌸" } ] },
  "Ғ": { repeatWord: "ҒАРЫШ", buildWord: { text: "АҒАШ", emoji: "🌳" }, findWords: [ { text: "ТАСТАБАҚ", has: false, emoji: "🍽️" }, { text: "БАҒДАРШАМ", has: true, emoji: "🚦" }, { text: "ОҚУШЫ", has: false, emoji: "👨‍🎓" } ] },
  "Ң": { repeatWord: "ШАҢ", buildWord: { text: "ТАҢ", emoji: "🌅" }, findWords: [ { text: "КӨЗ", has: false, emoji: "👁️" }, { text: "ШАҢҒЫ", has: true, emoji: "🎿" }, { text: "ҚОЛ", has: false, emoji: "✋" } ] }
};

// Game 1: Repeat Word — records the child's voice and auto-stops when they finish speaking
function RepeatWordGame({ sound, targetWord, onComplete }: { sound: string, targetWord: string, onComplete: () => void }) {
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ recognizedText: string; accuracy: number } | null>(null);
  const [level, setLevel] = useState(0); // live mic level 0..1 for the visualiser

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  // Silence-detection tuning
  const SPEECH_THRESHOLD = 0.025;   // RMS above this = the child is speaking
  const SILENCE_HANG_MS = 1400;     // stop this long after speech stops
  const NO_SPEECH_TIMEOUT_MS = 6000; // give up if nothing is said at all
  const MAX_RECORDING_MS = 12000;   // hard cap

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => cleanup, []);

  const stopRecording = () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setLevel(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    setErrorMsg("");
    setResult(null);
    stoppedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        cleanup();
        analyzeAudio();
      };

      // --- Web Audio analyser for silence detection ---
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      const startedAt = performance.now();
      let hasSpoken = false;
      let lastLoudAt = performance.now();

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 8));

        const now = performance.now();
        if (rms > SPEECH_THRESHOLD) {
          hasSpoken = true;
          lastLoudAt = now;
        }

        const elapsed = now - startedAt;
        const silenceFor = now - lastLoudAt;

        if (elapsed > MAX_RECORDING_MS) return stopRecording();
        if (!hasSpoken && elapsed > NO_SPEECH_TIMEOUT_MS) {
          setErrorMsg("Дауыс естілмеді. Микрофонға жақынырақ сөйлеп көр.");
          return stopRecording();
        }
        if (hasSpoken && silenceFor > SILENCE_HANG_MS) return stopRecording();

        rafRef.current = requestAnimationFrame(tick);
      };

      mediaRecorder.start();
      setStatus("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Микрофонға рұқсат берілмеді.");
    }
  };

  const analyzeAudio = async () => {
    setStatus("analyzing");
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (audioBlob.size < 1200) {
        setStatus("error");
        setErrorMsg((prev) => prev || "Жазба тым қысқа. Қайта айтып көр.");
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("targetWord", targetWord);
      formData.append("lang", "KZ");

      const res = await fetch("/api/analyze-voice", { method: "POST", body: formData });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setResult({ recognizedText: data.recognizedText || "", accuracy: data.accuracy ?? 0 });

      if (data.isCorrect || data.accuracy >= 60) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(
          data.recognizedText
            ? `Сен «${data.recognizedText}» дедің. Дұрысы — «${targetWord}».`
            : "Сөз анық естілмеді. Тағы бір рет байқап көр."
        );
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Талдау кезінде қате пайда болды. Қайтадан көріңіз.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="heading-lg text-2xl">Осы сөзді қайтала:</h2>
      <div className="text-7xl font-extrabold gradient-text mb-2 tracking-widest">{targetWord}</div>

      {status === "error" && (
        <div className="banner-error font-medium mb-1 px-4 py-2 text-center max-w-sm">
          {errorMsg}
        </div>
      )}

      {status !== "success" ? (
        <div className="flex flex-col items-center gap-4 mt-2">
          <button
            onClick={status === "recording" ? stopRecording : startRecording}
            disabled={status === "analyzing"}
            className={`relative w-32 h-32 text-white rounded-full flex justify-center items-center shadow-xl transition-all
              ${status === "recording" ? "bg-error scale-110 shadow-error/40" :
                status === "analyzing" ? "bg-white/10 cursor-not-allowed" :
                "bg-gradient-to-br from-accent to-accent-hover hover:scale-105 shadow-accent/40"}`}
          >
            {status === "recording" && (
              <span
                className="absolute inset-0 rounded-full border-4 border-white/40"
                style={{ transform: `scale(${1 + level * 0.6})`, transition: "transform 80ms linear" }}
              />
            )}
            {status === "analyzing" ? (
              <span className="text-xl font-bold animate-pulse">...</span>
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
          <p className="text-muted font-medium h-6">
            {status === "recording" && "Тыңдап тұрмын... айтып бол, өзім тоқтаймын"}
            {status === "analyzing" && "Талданып жатыр..."}
            {(status === "idle" || status === "error") && "Жазуды бастау үшін басыңыз"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 mt-2">
          <div className="banner-success font-bold text-2xl flex items-center gap-3 px-6 py-3">
            <CheckCircle2 className="w-8 h-8" /> Жарайсың! Өте жақсы шықты!
          </div>
          {result && (
            <p className="text-muted text-sm">
              Танылған сөз: <span className="text-foreground font-semibold">{result.recognizedText || "—"}</span>
              {"  ·  "}Дәлдік: {Math.round(result.accuracy)}%
            </p>
          )}
          <button onClick={onComplete} className="btn-primary px-10 py-4 text-lg rounded-full">
            Келесі тапсырма
          </button>
        </div>
      )}
    </div>
  );
}

// Game 2: Build Word — short words + picture clue + guided letter-by-letter placing
function BuildWordGame({ targetWord, emoji, onComplete }: { targetWord: string, emoji: string, onComplete: () => void }) {
  const [scrambled, setScrambled] = useState<{ char: string, id: number }[]>([]);
  const [placed, setPlaced] = useState<{ char: string, id: number }[]>([]);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const letters = targetWord.split('');
  const done = placed.length === letters.length;

  useEffect(() => {
    const items = letters.map((char, index) => ({ char, id: index }));
    // shuffle, but make sure it isn't already in order
    let shuffled = items;
    for (let i = 0; i < 8 && shuffled.map(s => s.char).join('') === targetWord; i++) {
      shuffled = [...items].sort(() => Math.random() - 0.5);
    }
    setScrambled(shuffled);
    setPlaced([]);
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWord]);

  const speak = () => {
    fetch("/api/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: targetWord }),
    })
      .then((r) => r.blob())
      .then((b) => new Audio(URL.createObjectURL(b)).play())
      .catch(() => {});
  };

  const handleSelect = (item: { char: string, id: number }) => {
    if (done || placed.some(p => p.id === item.id)) return;
    const nextChar = letters[placed.length];
    if (item.char === nextChar) {
      setPlaced([...placed, item]);
    } else {
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  const undo = () => setPlaced(placed.slice(0, -1));

  useEffect(() => {
    if (done) {
      speak();
      const t = setTimeout(onComplete, 1800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h2 className="heading-lg text-2xl">Сөзді құрастыр:</h2>

      {/* Picture clue */}
      <button onClick={speak} title="Тыңдау" className="text-7xl leading-none hover:scale-110 transition-transform">
        {emoji}
      </button>

      {/* Slots */}
      <div className={`flex gap-3 p-4 glass rounded-2xl ${done ? 'ring-2 ring-success/50' : ''}`}>
        {letters.map((ch, i) => {
          const isFilled = i < placed.length;
          const isNext = i === placed.length && !done;
          return (
            <div
              key={i}
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl font-black bg-white/5 border-2 transition-all
                ${isFilled ? 'border-gold text-gold' :
                  isNext ? 'border-accent border-solid animate-pulse text-accent/40' :
                  'border-dashed border-accent/25 text-accent/20'}`}
            >
              {isFilled ? placed[i].char : showHint ? ch : ''}
            </div>
          );
        })}
      </div>

      {/* Letter tiles */}
      <div className="flex gap-4 flex-wrap justify-center max-w-lg min-h-[88px]">
        {scrambled.map((item) => {
          const isUsed = placed.some(p => p.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={isUsed || done}
              className={`w-20 h-20 rounded-2xl text-4xl font-bold shadow-md transition-all border
                ${isUsed ? "opacity-0 scale-50 pointer-events-none" :
                  wrongId === item.id ? "bg-error/20 border-error animate-bounce text-error" :
                  "glass text-foreground hover:scale-110 hover:border-gold/40 hover:text-gold"}`}
            >
              {item.char}
            </button>
          );
        })}
      </div>

      {/* Helpers */}
      {!done && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowHint(v => !v)}
            className="btn-ghost px-5 py-2 text-sm"
          >
            {showHint ? "Көмекті жасыру" : "💡 Көмек"}
          </button>
          {placed.length > 0 && (
            <button onClick={undo} className="btn-ghost px-5 py-2 text-sm">
              ↶ Артқа
            </button>
          )}
        </div>
      )}

      {done && (
        <div className="banner-success font-bold text-2xl mt-2 flex items-center gap-2 px-6 py-3">
          <CheckCircle2 className="w-8 h-8" /> Керемет! «{targetWord}» — дұрыс!
        </div>
      )}
    </div>
  );
}

// Game 3: Pop bubbles
function BubblesGame({ sound, onComplete }: { sound: string, onComplete: () => void }) {
  const [score, setScore] = useState(0);
  const bubbles = [sound, "О", "А", sound, "У", sound, "Е", "Ы", sound];
  const [popped, setPopped] = useState<number[]>([]);

  const handlePop = (letter: string, idx: number) => {
    if (popped.includes(idx)) return;
    setPopped([...popped, idx]);
    if (letter === sound) {
      setScore(s => s + 1);
    }
  };

  useEffect(() => {
    if (score === 4) setTimeout(onComplete, 1500);
  }, [score, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 w-full relative h-[450px]">
      <h2 className="heading-lg text-2xl">«{sound}» әрпі бар көпіршіктерді жар!</h2>
      <div className="badge text-xl px-6 py-2">
        Ұпай: {score} / 4
      </div>
      
      <div className="absolute inset-0 top-24 overflow-hidden rounded-3xl glass border border-accent/10">
        {bubbles.map((b, i) => {
          if (popped.includes(i)) return null;
          return (
            <motion.div
              key={i}
              initial={{ y: 400, x: Math.random() * 300 - 150 }}
              animate={{ y: -100, x: Math.random() * 300 - 150 }}
              transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, ease: "linear" }}
              className="absolute left-1/2"
            >
              <button 
                onClick={() => handlePop(b, i)}
                className="w-20 h-20 rounded-full bg-accent/60 backdrop-blur-md text-white font-black text-4xl shadow-lg shadow-accent/30 border-2 border-accent/40 hover:scale-110 hover:bg-accent/80 flex items-center justify-center pb-1"
              >
                {b}
              </button>
            </motion.div>
          )
        })}
      </div>
      {score === 4 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-strong p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-success/30 z-10 text-center">
          <CheckCircle2 className="w-16 h-16 text-success mb-4" />
          <h3 className="heading-lg text-2xl">Барлық көпіршікті жардың!</h3>
        </div>
      )}
    </div>
  );
}

// Game 4: Find sound
function FindSoundGame({ sound, words, onComplete }: { sound: string, words: {text: string, has: boolean, emoji: string}[], onComplete: () => void }) {
  const [done, setDone] = useState(false);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const handleClick = (has: boolean, idx: number) => {
    if (has) {
      setDone(true);
      setTimeout(onComplete, 2000);
    } else {
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h2 className="heading-lg text-3xl mb-4 text-center">Қай сөзде «{sound}» дыбысы бар?</h2>
      
      <div className="flex flex-wrap justify-center gap-6 mt-4 w-full">
        {words.map((w, i) => (
          <button 
            key={i}
            onClick={() => handleClick(w.has, i)}
            className={`w-48 h-56 glass rounded-[2rem] shadow-lg border-2 flex flex-col items-center justify-center gap-4 transition-all focus:outline-none
              ${done && w.has ? "border-success bg-success/10 scale-105 shadow-success/20" : ""}
              ${wrongIdx === i ? "border-error bg-error/10 animate-bounce" : "border-white/10 hover:border-accent/40 hover:shadow-xl hover:-translate-y-2"}
            `}
          >
            <div className="text-7xl">{w.emoji}</div>
            <div className="text-2xl font-black text-foreground">{w.text}</div>
          </button>
        ))}
      </div>
      {done && (
         <div className="banner-success font-bold text-3xl mt-8 flex items-center gap-3 px-8 py-4">
           <CheckCircle2 className="w-10 h-10" /> Дұрыс таптың! Жарайсың!
         </div>
      )}
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  
  const sound = decodeURIComponent(params.sound as string).toUpperCase();
  const id = params.id as string;

  const data = SOUND_DATA[sound] || SOUND_DATA["Р"];

  const handleComplete = () => {
    const progress = JSON.parse(localStorage.getItem('playProgress_v2') || '{}');
    if (!progress[sound]) progress[sound] = [];
    if (!progress[sound].includes(id)) {
      progress[sound].push(id);
    }
    localStorage.setItem('playProgress_v2', JSON.stringify(progress));
    
    router.push('/play');
  };

  return (
    <PageShell theme="dark" className="p-6 overflow-hidden">
      <header className="mb-8 relative z-10">
        <Link href="/play" className="btn-ghost">
          <ArrowLeft className="w-5 h-5 text-accent" />
          <span>Артқа</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto flex items-center justify-center relative z-10">
        <GlassCard strong className="w-full p-12 min-h-[600px] flex flex-col items-center justify-center">
           {id === 'ex-1' && <RepeatWordGame sound={sound} targetWord={data.repeatWord} onComplete={handleComplete} />}
           {id === 'ex-2' && <BuildWordGame targetWord={data.buildWord.text} emoji={data.buildWord.emoji} onComplete={handleComplete} />}
           {id === 'ex-3' && <BubblesGame sound={sound} onComplete={handleComplete} />}
           {id === 'ex-4' && <FindSoundGame sound={sound} words={data.findWords} onComplete={handleComplete} />}
        </GlassCard>
      </main>
    </PageShell>
  );
}
