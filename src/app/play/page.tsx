"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, PlayCircle, Lock, Star } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import ProgressRing from "@/components/ProgressRing";

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

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("playProgress_v2") || "{}");
    setProgress(data[selectedSound] || []);
  }, [selectedSound]);

  const progressPercent = Math.round((progress.length / exercisesList.length) * 100);

  return (
    <PageShell theme="dark" className="p-6">
      <header className="flex items-center justify-between mb-8 relative z-10">
        <Link href="/" className="btn-ghost">
          <ArrowLeft className="w-5 h-5 text-accent" />
          <span>Артқа</span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              localStorage.removeItem("playProgress_v2");
              setProgress([]);
            }}
            className="btn-ghost text-muted text-sm"
          >
            Жаңадан бастау
          </button>
          <div className="glass px-5 py-2 rounded-full font-bold text-accent flex items-center gap-2">
            <span>Оқушы: Аружан</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold to-warning flex items-center justify-center text-base">👧🏻</div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Sounds */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="heading-lg text-xl mb-2">Дыбысты таңдау</h2>
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-3">
            {sounds.map((sound) => (
              <button
                key={sound}
                onClick={() => setSelectedSound(sound)}
                className={`aspect-square rounded-2xl text-2xl font-bold flex items-center justify-center transition-all ${
                  selectedSound === sound
                    ? "bg-gradient-to-br from-accent to-accent-hover text-white shadow-lg shadow-accent/40 scale-105"
                    : "glass text-muted hover:text-accent hover:border-accent/30"
                }`}
              >
                {sound}
              </button>
            ))}
          </div>

          {/* Progress widget */}
          <GlassCard className="p-5 mt-4 flex flex-col items-center gap-3">
            <ProgressRing value={progressPercent} color="var(--accent)" label="Прогресс" />
            <div className="flex items-center gap-1">
              {Array.from({ length: exercisesList.length }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < progress.length ? "text-gold fill-gold" : "text-white/20"}`}
                />
              ))}
            </div>
          </GlassCard>
        </aside>

        {/* Main: Exercises */}
        <section className="lg:col-span-9 flex flex-col gap-6">
          <GlassCard strong className="p-8 w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-ai-purple rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 text-white text-3xl font-bold">
                {selectedSound}
              </div>
              <div>
                <h1 className="heading-lg text-3xl">«{selectedSound}» дыбысын жаттықтыру</h1>
                <p className="text-muted mt-1">Барлық тапсырмаларды орындап, жұлдызшаларды жина!</p>
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
                      ${isDone ? "banner-success" : ""}
                      ${isCurrent ? "bg-gradient-to-r from-gold to-warning text-[#1a1a2e] shadow-lg shadow-gold/30 transform hover:scale-[1.02]" : ""}
                      ${isLocked ? "glass opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold
                        ${isDone ? "bg-success/20 text-success" : ""}
                        ${isCurrent ? "bg-black/10 text-[#1a1a2e]" : ""}
                        ${isLocked ? "bg-white/5 text-muted" : ""}
                      `}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={`text-xl font-bold ${
                          isCurrent ? "text-[#1a1a2e]" : isDone ? "text-success" : "text-foreground"
                        }`}
                      >
                        {ex.title}
                      </span>
                    </div>

                    <div className="flex items-center">
                      {isDone && <CheckCircle2 className="w-8 h-8 text-success" />}
                      {isCurrent && (
                        <div className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-full">
                          <PlayCircle className="w-5 h-5" />
                          <span className="font-semibold">Бастау</span>
                        </div>
                      )}
                      {isLocked && <Lock className="w-6 h-6 text-muted" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        </section>
      </main>
    </PageShell>
  );
}
