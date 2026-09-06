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
  buildWord: string;
  findWords: { text: string; has: boolean; emoji: string }[];
}> = {
  "Р": { repeatWord: "РАУШАН", buildWord: "РАҚМЕТ", findWords: [ { text: "АЛМА", has: false, emoji: "🍎" }, { text: "РОБОТ", has: true, emoji: "🤖" }, { text: "КІТАП", has: false, emoji: "📚" } ] },
  "Л": { repeatWord: "ЛАҚ", buildWord: "ЛАШЫН", findWords: [ { text: "КҮН", has: false, emoji: "☀️" }, { text: "ЛАГЕРЬ", has: true, emoji: "⛺" }, { text: "АҒАШ", has: false, emoji: "🌳" } ] },
  "Ш": { repeatWord: "ШАР", buildWord: "ШАНА", findWords: [ { text: "МЫСЫҚ", has: false, emoji: "🐱" }, { text: "ШАШ", has: true, emoji: "💇‍♀️" }, { text: "ИТ", has: false, emoji: "🐶" } ] },
  "Ж": { repeatWord: "ЖОЛ", buildWord: "ЖУСАН", findWords: [ { text: "СУ", has: false, emoji: "💧" }, { text: "ЖЫЛАН", has: true, emoji: "🐍" }, { text: "ОТ", has: false, emoji: "🔥" } ] },
  "С": { repeatWord: "СУ", buildWord: "САҒАТ", findWords: [ { text: "ТАУ", has: false, emoji: "⛰️" }, { text: "САН", has: true, emoji: "🔢" }, { text: "АЙ", has: false, emoji: "🌙" } ] },
  "Қ": { repeatWord: "ҚАЗ", buildWord: "ҚАЛАМ", findWords: [ { text: "ШӨП", has: false, emoji: "🌿" }, { text: "ҚОЙ", has: true, emoji: "🐑" }, { text: "ГҮЛ", has: false, emoji: "🌸" } ] },
  "Ғ": { repeatWord: "ҒАРЫШ", buildWord: "ҒАЛЫМ", findWords: [ { text: "ТАСТАБАҚ", has: false, emoji: "🍽️" }, { text: "БАҒДАРШАМ", has: true, emoji: "🚦" }, { text: "ОҚУШЫ", has: false, emoji: "👨‍🎓" } ] },
  "Ң": { repeatWord: "ШАҢ", buildWord: "ЖАҢҒАҚ", findWords: [ { text: "КӨЗ", has: false, emoji: "👁️" }, { text: "ШАҢҒЫ", has: true, emoji: "🎿" }, { text: "ҚОЛ", has: false, emoji: "✋" } ] }
};

// Game 1: Repeat Word
function RepeatWordGame({ sound, targetWord, onComplete }: { sound: string, targetWord: string, onComplete: () => void }) {
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(100);
      setStatus("recording");
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Микрофонға рұқсат берілмеді.");
    }
  };

  const stopRecordingAndAnalyze = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.onstop = async () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        await analyzeAudio();
      };
      mediaRecorderRef.current.stop();
      setStatus("analyzing");
    }
  };

  const analyzeAudio = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("targetWord", targetWord);
      formData.append("lang", "KZ");

      const res = await fetch("/api/analyze-voice", { method: "POST", body: formData });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      
      if (data.accuracy > 50) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(`Қате айтылды немесе естілмеді. (Танылған сөз: ${data.recognizedText || '...'})`);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Талдау кезінде қате пайда болды.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="heading-lg text-2xl">Осы сөзді қайтала:</h2>
      <div className="text-7xl font-extrabold gradient-text mb-4 tracking-widest">{targetWord}</div>
      
      {status === "error" && (
        <div className="banner-error font-medium mb-2 px-4 py-2 text-center max-w-sm">
          {errorMsg} <br/> <span className="text-sm">Қайтадан көріңіз</span>
        </div>
      )}

      {status !== "success" ? (
        <div className="flex flex-col items-center gap-4 mt-4">
          <button 
            onClick={status === "recording" ? stopRecordingAndAnalyze : startRecording} 
            disabled={status === "analyzing"}
            className={`w-32 h-32 text-white rounded-full flex justify-center items-center shadow-xl transition-all 
              ${status === "recording" ? 'bg-error animate-pulse scale-110 shadow-error/40' : 
                status === "analyzing" ? 'bg-white/10 cursor-not-allowed' : 
                'bg-gradient-to-br from-accent to-accent-hover hover:scale-105 shadow-accent/40'}`}
          >
            {status === "analyzing" ? (
              <span className="text-xl font-bold">...</span>
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
          <p className="text-muted font-medium h-6">
             {status === "recording" && "Тыңдап тұрмын (тоқтату үшін басыңыз)..."}
             {status === "analyzing" && "Талданып жатыр..."}
             {(status === "idle" || status === "error") && "Жазуды бастау үшін басыңыз"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 mt-4">
           <div className="banner-success font-bold text-2xl flex items-center gap-3 px-6 py-3">
             <CheckCircle2 className="w-8 h-8" /> Жарайсың! Өте жақсы шықты!
           </div>
           <button onClick={onComplete} className="btn-primary px-10 py-4 text-lg rounded-full">
             Келесі тапсырма
           </button>
        </div>
      )}
    </div>
  );
}

// Game 2: Build Word
function BuildWordGame({ sound, targetWord, onComplete }: { sound: string, targetWord: string, onComplete: () => void }) {
  const [scrambled, setScrambled] = useState<{char: string, id: number}[]>([]);
  const [selected, setSelected] = useState<{char: string, id: number}[]>([]);
  const [shake, setShake] = useState(false);
  
  useEffect(() => {
    const letters = targetWord.split('').map((char, index) => ({ char, id: index }));
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setScrambled(shuffled);
    setSelected([]);
  }, [targetWord]);

  const handleSelect = (item: {char: string, id: number}) => {
    setSelected([...selected, item]);
  };

  useEffect(() => {
    if (selected.length === targetWord.length && selected.length > 0) {
      if (selected.map(s => s.char).join('') === targetWord) {
        setTimeout(onComplete, 1500);
      } else {
        setShake(true);
        setTimeout(() => {
          setSelected([]);
          setShake(false);
        }, 1000);
      }
    }
  }, [selected, targetWord, onComplete]);

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <h2 className="heading-lg text-2xl">Сөзді құрастыр:</h2>
      <div className={`flex gap-3 mb-8 min-h-[90px] p-4 glass rounded-2xl ${shake ? 'animate-bounce' : ''}`}>
        {targetWord.split('').map((_, i) => (
          <div key={i} className="w-16 h-16 border-2 border-dashed border-accent/30 rounded-xl flex items-center justify-center text-4xl font-black text-gold bg-white/5 shadow-sm">
            {selected[i]?.char || ""}
          </div>
        ))}
      </div>
      
      <div className="flex gap-4 flex-wrap justify-center max-w-lg">
        {scrambled.map((item) => {
          const isSelected = selected.some(s => s.id === item.id);
          return (
            <button 
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={isSelected}
              className={`w-20 h-20 rounded-2xl text-4xl font-bold shadow-md transition-all border
                ${isSelected ? "opacity-0 scale-50" : "glass text-foreground hover:scale-110 hover:border-gold/40 hover:text-gold"}`}
            >
              {item.char}
            </button>
          )
        })}
      </div>
      {selected.length === targetWord.length && selected.map(s => s.char).join('') === targetWord && (
         <div className="banner-success font-bold text-2xl mt-4 flex items-center gap-2 px-6 py-3">
           <CheckCircle2 className="w-8 h-8" /> Керемет құрастырдың!
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
           {id === 'ex-2' && <BuildWordGame sound={sound} targetWord={data.buildWord} onComplete={handleComplete} />}
           {id === 'ex-3' && <BubblesGame sound={sound} onComplete={handleComplete} />}
           {id === 'ex-4' && <FindSoundGame sound={sound} words={data.findWords} onComplete={handleComplete} />}
        </GlassCard>
      </main>
    </PageShell>
  );
}
