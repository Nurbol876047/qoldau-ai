"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, PlayCircle, Lock, Volume2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Exercise {
  id: string;
  title: string;
  status: "done" | "current" | "locked";
}

const sounds = ["Р", "Л", "Ш", "Ж", "С", "Қ", "Ғ", "Ң"];

const exercisesList = [
  { id: "ex-1", title: "Сөзді қайтала" },
  { id: "ex-2", title: "Сөзді құрастыр" },
  { id: "ex-3", title: "Көпіршікті жар" },
  { id: "ex-4", title: "Дыбысты тап" },
];

export default function PlayPage() {
  const router = useRouter();
  const [selectedSound, setSelectedSound] = useState<string>("Р");
  const [progress, setProgress] = useState<string[]>([]);

  // Load progress when sound changes
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('playProgress_v2') || '{}');
    setProgress(data[selectedSound] || []);
  }, [selectedSound]);

  return (
    <div className="min-h-screen bg-background relative flex flex-col p-6">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950 -z-10" />
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 relative z-10">
        <Link href="/" className="p-3 rounded-full glass hover:bg-white/50 transition-colors flex items-center gap-2 font-medium">
          <ArrowLeft className="w-5 h-5 text-primary" />
          <span>Артқа</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              localStorage.removeItem('playProgress_v2');
              setProgress([]);
            }}
            className="glass px-4 py-2 rounded-full font-medium text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            Жаңадан бастау (Reset)
          </button>
          <div className="glass px-6 py-2 rounded-full font-bold text-primary flex items-center gap-2">
            <span>Оқушы: Аружан</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 flex items-center justify-center text-white">👧🏻</div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: Sounds */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="font-bold text-xl mb-2">Дыбысты таңдау</h2>
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-3">
            {sounds.map((sound) => (
              <button
                key={sound}
                onClick={() => setSelectedSound(sound)}
                className={`aspect-square rounded-2xl text-2xl font-bold flex items-center justify-center transition-all ${
                  selectedSound === sound 
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                  : "glass hover:bg-primary/10 text-slate-700 dark:text-slate-200"
                }`}
              >
                {sound}
              </button>
            ))}
          </div>
        </aside>

        {/* Main: Exercises */}
        <section className="lg:col-span-9 flex flex-col gap-6">
          <div className="glass p-8 rounded-3xl w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 text-white text-3xl font-bold">
                {selectedSound}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">«{selectedSound}» дыбысын жаттықтыру</h1>
                <p className="text-slate-500 mt-1">Барлық тапсырмаларды орындап, жұлдызшаларды жина!</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {exercisesList.map((ex, idx) => {
                const isDone = progress.includes(ex.id);
                const prevIsDone = idx === 0 || progress.includes(exercisesList[idx - 1].id);
                const isCurrent = prevIsDone && !isDone;
                const isLocked = !isDone && !isCurrent;

                return (
                  <motion.button
                    key={ex.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) router.push(`/play/${selectedSound}/${ex.id}`);
                    }}
                    className={`w-full rounded-2xl p-5 flex items-center justify-between transition-all group
                      ${isDone ? "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20" : ""}
                      ${isCurrent ? "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 transform hover:scale-[1.02]" : ""}
                      ${isLocked ? "bg-slate-100 dark:bg-slate-800/50 opacity-60 cursor-not-allowed border border-slate-200 dark:border-slate-700" : ""}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center
                        ${isDone ? "bg-emerald-100 text-emerald-600" : ""}
                        ${isCurrent ? "bg-white/20 text-white" : ""}
                        ${isLocked ? "bg-slate-200 dark:bg-slate-700 text-slate-400" : ""}
                      `}>
                        {idx + 1}
                      </div>
                      <span className={`text-xl font-bold ${
                        isCurrent ? "text-white" : 
                        isDone ? "text-emerald-700 dark:text-emerald-400" : 
                        "text-slate-700 dark:text-slate-200"
                      }`}>
                        {ex.title}
                      </span>
                    </div>

                    <div className="flex items-center">
                      {isDone && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                      {isCurrent && (
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                          <PlayCircle className="w-5 h-5" />
                          <span className="font-semibold">Бастау</span>
                        </div>
                      )}
                      {isLocked && <Lock className="w-6 h-6 text-slate-400" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
