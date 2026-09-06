"use client";

import React from "react";
import { Sparkles, User, Brain, Gamepad2, Activity, Hand } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import CartoonChild from "@/components/CartoonChild";

const features = [
  { href: "/play", icon: Gamepad2, label: "Дыбыстар ойындары", color: "text-gold", glow: "rgba(250,204,21,0.2)" },
  { href: "/gymnastics", icon: User, label: "AR Гимнастика", color: "text-success", glow: "rgba(34,197,94,0.2)" },
  { href: "/voice-analysis", icon: Activity, label: "Дауыс анализі", color: "text-accent", glow: "rgba(77,208,255,0.2)" },
  { href: "/speech-recognition", icon: Brain, label: "Сөйлеуді тану", color: "text-ai-purple", glow: "rgba(124,108,246,0.2)" },
  { href: "/gestures", icon: Hand, label: "Ым-ишарат тілі", color: "text-accent-bright", glow: "rgba(103,232,249,0.2)" },
];

export default function LandingPage() {
  return (
    <PageShell theme="dark">
      {/* Header */}
      <header className="relative z-10 glass border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-ai-purple rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">
              QOLDAU <span className="gradient-text">AI</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 container mx-auto px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-accent font-medium mb-6 border border-accent/20">
            <Sparkles className="w-4 h-4" />
            <span>Сөйлеуді дамытуға арналған ақылды көмекші</span>
          </div>

          <h1 className="heading-xl text-5xl lg:text-7xl leading-tight mb-6">
            Таза әрі көңілді <br />
            <span className="gradient-text">сөйлеуге үйренеміз!</span>
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-2xl mx-auto lg:mx-0">
            {features.map((feat, i) => (
              <motion.div
                key={feat.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <Link
                  href={feat.href}
                  className="feature-card p-6 flex flex-col items-center text-center gap-3 group"
                >
                  <feat.icon className={`w-12 h-12 ${feat.color} group-hover:scale-110 transition-transform`} />
                  <span className="font-bold text-xl text-foreground">{feat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 relative w-full max-w-lg lg:max-w-none"
        >
          <GlassCard className="relative aspect-square w-full p-4 shadow-2xl animate-float overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-ai-purple/10 rounded-[18px] overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-tr from-gold/30 to-accent/20 rounded-full blur-3xl opacity-70" />

              {/* Decorative stars around character */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-gold"
                  style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 20}%`, fontSize: `${14 + i * 2}px` }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2 + i * 0.3, delay: i * 0.4 }}
                >
                  ✦
                </motion.div>
              ))}

              <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                <CartoonChild size={300} speaking />

                <GlassCard className="px-6 py-3 flex items-center gap-3 mt-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse shadow-sm shadow-success/60" />
                  <span className="font-bold text-lg text-foreground">&quot;Р&quot; дыбысын тыңдап тұрмын...</span>
                </GlassCard>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </main>
    </PageShell>
  );
}
