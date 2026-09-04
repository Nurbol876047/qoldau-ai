"use client";

import React from "react";
import { Play, Sparkles, User, Brain, ArrowRight, ShieldCheck, Gamepad2, Activity, Hand } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/50 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-200/40 dark:bg-amber-900/20 rounded-full blur-[150px]" />

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/20 dark:border-slate-700/50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">
              QOLDAU <span className="text-primary">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-medium">
            <a href="#features" className="hover:text-primary transition-colors">Платформа туралы</a>
            <a href="#demo" className="hover:text-primary transition-colors">Қалай жұмыс істейді</a>
            <a href="#therapists" className="hover:text-primary transition-colors">Логопедтерге</a>
          </div>

          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 transition-all">
              Кіру
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 container mx-auto px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-primary font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Сөйлеуді дамытуға арналған ақылды көмекші</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
            Таза әрі көңілді <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              сөйлеуге үйренеміз!
            </span>
          </h1>
          


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-2xl mx-auto lg:mx-0">
            <Link href="/play" className="bg-white text-slate-800 p-6 rounded-3xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all flex flex-col items-center text-center gap-3 group border border-slate-200">
              <Gamepad2 className="w-12 h-12 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl">Дыбыстар ойындары</span>
            </Link>
            
            <Link href="/gymnastics" className="bg-white text-slate-800 p-6 rounded-3xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all flex flex-col items-center text-center gap-3 group border border-slate-200">
              <User className="w-12 h-12 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl">AR Гимнастика</span>
            </Link>

            <Link href="/voice-analysis" className="bg-white text-slate-800 p-6 rounded-3xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all flex flex-col items-center text-center gap-3 group border border-slate-200">
              <Activity className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl">Дауыс анализі</span>
            </Link>

            <Link href="/speech-recognition" className="bg-white text-slate-800 p-6 rounded-3xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all flex flex-col items-center text-center gap-3 group border border-slate-200">
              <Brain className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl">Сөйлеуді тану</span>
            </Link>

            <Link href="/gestures" className="bg-white text-slate-800 p-6 rounded-3xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all flex flex-col items-center text-center gap-3 group border border-slate-200 sm:col-span-2 lg:col-span-1">
              <Hand className="w-12 h-12 text-pink-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl">Ым-ишарат тілі</span>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 relative w-full max-w-lg lg:max-w-none"
        >
          {/* Abstract 3D Mockup Container */}
          <div className="relative aspect-square w-full rounded-[3rem] glass p-4 shadow-2xl animate-float">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-[2.5rem] overflow-hidden">
               {/* Decorative Avatar Placeholder */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-secondary to-orange-300 rounded-full blur-2xl opacity-60" />
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  
                  {/* Animated Avatar Icon */}
                  <motion.div 
                    animate={{ y: [0, -15, 0], rotate: [0, 3, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-48 h-48 bg-white dark:bg-slate-800 rounded-full shadow-2xl border-4 border-white/50 flex items-center justify-center mb-6 relative"
                  >
                    <span className="text-6xl">🦊</span>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-success rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-1" />
                    </div>
                  </motion.div>

                  <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3">
                    <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                    <span className="font-bold text-lg">"Р" дыбысын тыңдап тұрмын...</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </main>
      

    </div>
  );
}
