"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mic } from "lucide-react";
import { motion } from "framer-motion";

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
      <h2 className="text-2xl font-bold text-slate-800">Осы сөзді қайтала:</h2>
      <div className="text-7xl font-extrabold text-blue-600 mb-4 tracking-widest">{targetWord}</div>
      
      {status === "error" && (
        <div className="text-red-500 font-medium mb-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200 text-center max-w-sm">
          {errorMsg} <br/> <span className="text-sm">Қайтадан көріңіз</span>
        </div>
      )}

      {status !== "success" ? (
        <div className="flex flex-col items-center gap-4 mt-4">
          <button 
            onClick={status === "recording" ? stopRecordingAndAnalyze : startRecording} 
            disabled={status === "analyzing"}
            className={`w-32 h-32 text-white rounded-full flex justify-center items-center shadow-xl transition-all 
              ${status === "recording" ? 'bg-red-500 animate-pulse scale-110' : 
                status === "analyzing" ? 'bg-slate-400 cursor-not-allowed' : 
                'bg-blue-500 hover:bg-blue-600 hover:scale-105'}`}
          >
            {status === "analyzing" ? (
              <span className="text-xl font-bold">...</span>
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
          <p className="text-slate-500 font-medium h-6">
             {status === "recording" && "Тыңдап тұрмын (тоқтату үшін басыңыз)..."}
             {status === "analyzing" && "Талданып жатыр..."}
             {(status === "idle" || status === "error") && "Жазуды бастау үшін басыңыз"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 mt-4">
           <div className="text-emerald-500 font-bold text-2xl flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-200">
             <CheckCircle2 className="w-8 h-8" /> Жарайсың! Өте жақсы шықты!
           </div>
           <button onClick={onComplete} className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105 text-lg">
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
      <h2 className="text-2xl font-bold text-slate-800">Сөзді құрастыр:</h2>
      <div className={`flex gap-3 mb-8 min-h-[90px] p-4 bg-slate-50 rounded-2xl border border-slate-200 ${shake ? 'animate-bounce' : ''}`}>
        {targetWord.split('').map((_, i) => (
          <div key={i} className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-4xl font-black text-orange-500 bg-white shadow-sm">
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
                ${isSelected ? "opacity-0 scale-50" : "bg-white text-slate-800 hover:scale-110 hover:bg-orange-50 hover:text-orange-600 border-slate-200 hover:border-orange-300"}`}
            >
              {item.char}
            </button>
          )
        })}
      </div>
      {selected.length === targetWord.length && selected.map(s => s.char).join('') === targetWord && (
         <div className="text-emerald-500 font-bold text-2xl mt-4 flex items-center gap-2">
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
      <h2 className="text-2xl font-bold text-slate-800">«{sound}» әрпі бар көпіршіктерді жар!</h2>
      <div className="bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-bold text-xl shadow-sm border border-blue-200">
        Ұпай: {score} / 4
      </div>
      
      <div className="absolute inset-0 top-24 overflow-hidden rounded-3xl bg-blue-50/50 border border-blue-100">
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
                className="w-20 h-20 rounded-full bg-cyan-400/80 backdrop-blur-md text-white font-black text-4xl shadow-lg border-2 border-cyan-200 hover:scale-110 hover:bg-cyan-500/90 flex items-center justify-center pb-1"
              >
                {b}
              </button>
            </motion.div>
          )
        })}
      </div>
      {score === 4 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-emerald-100 z-10 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
          <h3 className="text-2xl font-bold text-slate-800">Барлық көпіршікті жардың!</h3>
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
      <h2 className="text-3xl font-bold text-slate-800 mb-4 text-center">Қай сөзде «{sound}» дыбысы бар?</h2>
      
      <div className="flex flex-wrap justify-center gap-6 mt-4 w-full">
        {words.map((w, i) => (
          <button 
            key={i}
            onClick={() => handleClick(w.has, i)}
            className={`w-48 h-56 bg-white rounded-[2rem] shadow-lg border-2 flex flex-col items-center justify-center gap-4 transition-all focus:outline-none
              ${done && w.has ? "border-emerald-500 bg-emerald-50 scale-105" : ""}
              ${wrongIdx === i ? "border-red-500 bg-red-50 animate-bounce" : "border-slate-200 hover:border-purple-300 hover:shadow-xl hover:-translate-y-2"}
            `}
          >
            <div className="text-7xl">{w.emoji}</div>
            <div className="text-2xl font-black text-slate-700">{w.text}</div>
          </button>
        ))}
      </div>
      {done && (
         <div className="text-emerald-500 font-bold text-3xl mt-8 flex items-center gap-3 bg-emerald-50 px-8 py-4 rounded-3xl border border-emerald-200">
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
    <div className="min-h-screen bg-[#F3F6F8] p-6 flex flex-col relative overflow-hidden">
      <header className="mb-8 relative z-10">
        <Link href="/play" className="inline-flex p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors items-center gap-2 font-medium shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
          <span className="text-slate-800">Артқа</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto flex items-center justify-center relative z-10">
        <div className="bg-white w-full rounded-[3rem] p-12 shadow-2xl border border-slate-200 min-h-[600px] flex flex-col items-center justify-center">
           {id === 'ex-1' && <RepeatWordGame sound={sound} targetWord={data.repeatWord} onComplete={handleComplete} />}
           {id === 'ex-2' && <BuildWordGame sound={sound} targetWord={data.buildWord} onComplete={handleComplete} />}
           {id === 'ex-3' && <BubblesGame sound={sound} onComplete={handleComplete} />}
           {id === 'ex-4' && <FindSoundGame sound={sound} words={data.findWords} onComplete={handleComplete} />}
        </div>
      </main>
    </div>
  );
}
