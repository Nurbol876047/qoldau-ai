"use client";

import React, { useState } from "react";
import {
  Sparkles, Bell, User, Mic, Check, ArrowRight, Play,
  Home, BookOpen, Activity, Hand,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import PageShell from "@/components/PageShell";

const NAV = [
  { href: "/", label: "Басты бет", icon: Home },
  { href: "/play", label: "Сөздер әлемі", icon: BookOpen },
  { href: "/gymnastics", label: "AR Гимнастика", icon: User },
  { href: "/voice-analysis", label: "Дауыс анализі", icon: Activity },
  { href: "/gestures", label: "Ым-ишарат", icon: Hand },
];

type Word = {
  text: string;
  emoji: string;
  scene: string[];
  syllables: { s: string; score: number }[];
  accuracy: number;
  praise: string;
};

const WORDS: Word[] = [
  {
    text: "КӨБЕЛЕК",
    emoji: "🦋",
    scene: ["🦋", "🦋", "🌸", "✨", "🦋", "🌼"],
    syllables: [
      { s: "КӨ", score: 100 },
      { s: "БЕ", score: 93 },
      { s: "ЛЕК", score: 89 },
    ],
    accuracy: 94,
    praise: "Көбелектерді толық жандандырдың!",
  },
  {
    text: "КҮН",
    emoji: "☀️",
    scene: ["☀️", "✨", "🌤️", "⭐", "✨"],
    syllables: [{ s: "КҮН", score: 97 }],
    accuracy: 97,
    praise: "Күн шуағын жаққа шығардың!",
  },
  {
    text: "ГҮЛ",
    emoji: "🌸",
    scene: ["🌸", "🌼", "🌷", "🌻", "🐝"],
    syllables: [{ s: "ГҮЛ", score: 92 }],
    accuracy: 92,
    praise: "Гүлдер бүршік жарды!",
  },
  {
    text: "ҚҰС",
    emoji: "🐦",
    scene: ["🐦", "🕊️", "☁️", "✨", "🐤"],
    syllables: [{ s: "ҚҰС", score: 88 }],
    accuracy: 88,
    praise: "Құстар қанат қақты!",
  },
  {
    text: "КЕМПІРҚОСАҚ",
    emoji: "🌈",
    scene: ["🌈", "☁️", "✨", "💧", "🌦️"],
    syllables: [
      { s: "КЕМ", score: 90 },
      { s: "ПІР", score: 85 },
      { s: "ҚО", score: 88 },
      { s: "САҚ", score: 91 },
    ],
    accuracy: 89,
    praise: "Аспанда кемпірқосақ жанды!",
  },
];

function Ring({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" className="shrink-0">
      <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="5" />
      <circle
        cx="27" cy="27" r={r} fill="none"
        stroke={value >= 90 ? "var(--success)" : "var(--gold)"}
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 27 27)"
        style={{ filter: "drop-shadow(0 0 5px currentColor)" }}
      />
      <text x="27" y="31" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">
        {value}%
      </text>
    </svg>
  );
}

function MiniWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {[6, 12, 20, 10, 16, 8, 14, 6].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-accent"
          style={{
            height: h,
            opacity: active ? 0.9 : 0.4,
            animation: active ? `wave-pulse 1.1s ease-in-out ${i * 0.08}s infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [idx, setIdx] = useState(0);
  const word = WORDS[idx];

  return (
    <PageShell theme="dark" className="overflow-x-hidden">
      {/* ── Top nav ── */}
      <header className="relative z-20 px-4 sm:px-8 pt-4">
        <nav className="hud-panel hud-clip mx-auto max-w-7xl flex items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-ai-purple flex items-center justify-center neon-ring">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-wide text-foreground">
              QOLDAU <span className="title-glow-cyan">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  n.href === "/"
                    ? "bg-accent/15 text-accent-bright border border-accent/30"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                }`}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full glass flex items-center justify-center hover:text-accent">
              <Bell className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full glass flex items-center justify-center hover:text-accent">
              <User className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 px-4 sm:px-8 py-8">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[0.95fr_1.15fr_0.9fr] gap-6 items-start">

          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            <div>
              <h1 className="title-glow-cyan text-4xl sm:text-5xl leading-tight mb-3">
                Сөзіңді жандандыр
              </h1>
              <p className="text-foreground-muted text-lg leading-relaxed">
                Дұрыс айтылған әр сөз экранда тірі әлемге айналады.
              </p>
            </div>

            <div className="hud-panel hud-corner p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">👄</div>
                <div>
                  <p className="font-display font-bold text-accent-bright">Артикуляция көмекшісі</p>
                  <p className="text-sm text-foreground-muted">
                    Ерінді дөңгелетіп, дыбысты анық айт.
                  </p>
                </div>
              </div>
            </div>

            <div className="hud-panel p-5 flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-accent/30 blur-xl animate-glow-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center neon-ring">
                  <Mic className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">AI тыңдап тұр…</p>
                <MiniWave active />
              </div>
            </div>

            <Link href="/play" className="btn-primary justify-center py-4 text-lg hud-clip">
              <Play className="w-5 h-5" /> Жаттығуды бастау
            </Link>
          </motion.div>

          {/* CENTER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center gap-5"
          >
            <p className="font-display font-extrabold tracking-[0.35em] text-accent-bright text-sm uppercase drop-shadow-[0_0_10px_rgba(55,214,255,0.5)]">
              Бүгінгі сөз
            </p>

            <div className="hud-panel hud-panel--gold hud-clip hud-sweep relative px-8 py-4 w-full max-w-md text-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={word.text}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="title-glow-gold text-4xl sm:text-5xl"
                >
                  {word.text}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* holographic scene */}
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 rounded-full neon-ring animate-ring-pulse-1" />
              <div className="absolute inset-6 rounded-full border border-accent/20 animate-ring-pulse-2" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 45%, rgba(55,214,255,0.22), rgba(139,123,255,0.12) 45%, transparent 72%)",
                  filter: "blur(4px)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={word.text}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 flex items-center justify-center text-8xl drop-shadow-[0_0_25px_rgba(55,214,255,0.5)]">
                    {word.emoji}
                  </div>
                  {word.scene.map((e, i) => {
                    const angle = (i / word.scene.length) * Math.PI * 2;
                    const rad = 38;
                    return (
                      <motion.div
                        key={i}
                        className="absolute text-3xl"
                        style={{
                          left: `${50 + Math.cos(angle) * rad}%`,
                          top: `${50 + Math.sin(angle) * rad}%`,
                          transform: "translate(-50%,-50%)",
                        }}
                        animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                      >
                        {e}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
              {/* podium glow */}
              <div
                className="absolute left-1/2 bottom-[-6%] -translate-x-1/2 w-3/4 h-10 rounded-[50%]"
                style={{ background: "radial-gradient(ellipse, rgba(55,214,255,0.5), transparent 70%)", filter: "blur(10px)" }}
              />
            </div>

            {/* word chooser */}
            <div className="w-full">
              <p className="font-display font-bold text-center text-foreground-muted mb-3">
                Келесі сөзді таңда
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {WORDS.map((w, i) => (
                  <button
                    key={w.text}
                    onClick={() => setIdx(i)}
                    className={`word-chip ${i === idx ? "!border-gold/70 !shadow-[0_0_28px_rgba(255,207,58,0.35)]" : ""}`}
                  >
                    <span className="text-2xl">{w.emoji}</span>
                    <span>{w.text}</span>
                    <ArrowRight className="w-4 h-4 opacity-70" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT — analysis HUD */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hud-panel hud-clip p-5 w-full"
          >
            <p className="font-display font-bold text-center text-accent-bright tracking-wide mb-4">
              Дыбыстық талдау
            </p>

            <div className="flex flex-col divide-y divide-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={word.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  {word.syllables.map((syl) => (
                    <div key={syl.s} className="flex items-center gap-3 py-2.5">
                      <span className="font-display font-extrabold text-lg w-16 title-glow-cyan">
                        {syl.s}
                      </span>
                      <span className={syl.score >= 90 ? "text-success" : "text-gold"}>
                        <Ring value={syl.score} />
                      </span>
                      <MiniWave active={false} />
                      <Check
                        className={`w-5 h-5 ml-auto ${syl.score >= 85 ? "text-success" : "text-gold"}`}
                      />
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="text-center mt-4 mb-4">
              <p className="text-sm text-foreground-muted">Айтылым дәлдігі:</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={word.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`font-display font-extrabold text-4xl ${
                    word.accuracy >= 90 ? "text-success" : "text-gold"
                  }`}
                >
                  {word.accuracy}%
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="hud-panel hud-panel--gold p-4 flex items-start gap-3">
              <div className="text-2xl">⭐</div>
              <div>
                <p className="title-glow-gold text-lg">Тамаша!</p>
                <p className="text-sm text-foreground-muted">{word.praise}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </PageShell>
  );
}
