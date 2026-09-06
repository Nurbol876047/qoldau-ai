"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, AlertCircle, SkipForward, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesetResolver, FaceLandmarker, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

type BlendCategory = { categoryName: string; score: number };

interface Exercise {
  id: number;
  title: string;
  desc: string;
  emoji: string;
  /** returns 0..1 strength of the target expression from the blendshape scores */
  metric: (get: (name: string) => number) => number;
  /** strength at which the pose counts as "done" */
  threshold: number;
}

const EXERCISES: Exercise[] = [
  {
    id: 1,
    title: "Күлімсіреу",
    desc: "Еріндеріңді кең жайып, тістерің көрінетіндей күл. Осылай ұста.",
    emoji: "😁",
    metric: (g) => Math.max(g("mouthSmileLeft"), g("mouthSmileRight")),
    threshold: 0.42,
  },
  {
    id: 2,
    title: "Түтікше (пілдің тұмсығы)",
    desc: "Еріндеріңді алға қарай созып, түтікше жаса.",
    emoji: "😗",
    metric: (g) => Math.max(g("mouthPucker"), g("mouthFunnel") * 0.8),
    threshold: 0.4,
  },
  {
    id: 3,
    title: "Ауызды кең ашу (бегемот)",
    desc: "Ауызыңды үлкен дөңгелек етіп аш.",
    emoji: "😮",
    metric: (g) => g("jawOpen"),
    threshold: 0.45,
  },
  {
    id: 4,
    title: "Щектерді үрлеу",
    desc: "Ауызыңа ауа толтырып, екі щегіңді де үрле (шар сияқты).",
    emoji: "🐡",
    metric: (g) => g("cheekPuff"),
    threshold: 0.18,
  },
  {
    id: 5,
    title: "Сағат тілі (ерін оңға-солға)",
    desc: "Жабық ерніңді бір оңға, бір солға қарай жылжыт.",
    emoji: "↔️",
    metric: (g) => Math.max(g("mouthLeft"), g("mouthRight")),
    threshold: 0.32,
  },
  {
    id: 6,
    title: "Таңданыс (қабақты көтеру)",
    desc: "Қабағыңды жоғары көтеріп, таңданған адам сияқты бол.",
    emoji: "🤨",
    metric: (g) => Math.max(g("browInnerUp"), (g("browOuterUpLeft") + g("browOuterUpRight")) / 2),
    threshold: 0.4,
  },
];

const HOLD_MS = 1200; // how long the pose must be held
type Phase = "intro" | "loading" | "tracking" | "denied" | "finished";

export default function GymnasticsPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [errorMsg, setErrorMsg] = useState("");
  const [exIndex, setExIndex] = useState(0);
  const [faceVisible, setFaceVisible] = useState(false);
  const [score, setScore] = useState(0);          // smoothed 0..1 strength of current target
  const [holdProgress, setHoldProgress] = useState(0); // 0..1 toward completing the hold
  const [justCompleted, setJustCompleted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);

  // live values the RAF loop needs without re-subscribing
  const exIndexRef = useRef(0);
  const smoothRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const lockedRef = useRef(false); // freezes detection during the "success" animation

  useEffect(() => { exIndexRef.current = exIndex; }, [exIndex]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const advance = useCallback(() => {
    holdStartRef.current = null;
    smoothRef.current = 0;
    lockedRef.current = true;
    setJustCompleted(true);
    setHoldProgress(0);
    setScore(0);

    setTimeout(() => {
      setJustCompleted(false);
      lockedRef.current = false;
      setExIndex((prev) => {
        if (prev < EXERCISES.length - 1) return prev + 1;
        // finished everything
        stopCamera();
        setPhase("finished");
        return prev;
      });
    }, 1400);
  }, [stopCamera]);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const lm = landmarkerRef.current;

    if (video && lm && video.readyState >= 2 && video.videoWidth > 0) {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        let res: FaceLandmarkerResult | null = null;
        try {
          res = lm.detectForVideo(video, performance.now());
        } catch {
          res = null;
        }

        const hasFace = !!res && res.faceLandmarks.length > 0;
        setFaceVisible(hasFace);

        if (hasFace && !lockedRef.current) {
          drawFace(res!.faceLandmarks[0]);

          const cats: BlendCategory[] =
            res!.faceBlendshapes && res!.faceBlendshapes.length > 0
              ? (res!.faceBlendshapes[0].categories as BlendCategory[])
              : [];
          const get = (name: string) => cats.find((c) => c.categoryName === name)?.score ?? 0;

          const ex = EXERCISES[exIndexRef.current];
          const raw = Math.min(1, ex.metric(get));
          // exponential moving average -> smooth, less jitter
          smoothRef.current = smoothRef.current * 0.6 + raw * 0.4;
          const s = smoothRef.current;
          setScore(s);

          // hysteresis: start the hold at threshold, keep it while above 60% of it
          const enter = ex.threshold;
          const keep = ex.threshold * 0.6;
          const now = performance.now();

          if (holdStartRef.current === null) {
            if (s >= enter) holdStartRef.current = now;
          } else if (s < keep) {
            holdStartRef.current = null;
          }

          const p = holdStartRef.current === null ? 0 : Math.min(1, (now - holdStartRef.current) / HOLD_MS);
          setHoldProgress(p);
          if (p >= 1) advance();
        } else if (!hasFace) {
          clearCanvas();
          smoothRef.current = 0;
          holdStartRef.current = null;
          setScore(0);
          setHoldProgress(0);
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [advance]);

  const start = useCallback(async () => {
    setErrorMsg("");
    setPhase("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("video error"));
        setTimeout(() => resolve(), 4000); // safety
      });
      await video.play();

      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");

      let landmarker: FaceLandmarker | null = null;
      for (const delegate of ["GPU", "CPU"] as const) {
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
          break;
        } catch (e) {
          console.warn(`FaceLandmarker ${delegate} init failed`, e);
        }
      }
      if (!landmarker) throw new Error("model init failed");

      landmarkerRef.current = landmarker;
      lastVideoTimeRef.current = -1;
      smoothRef.current = 0;
      holdStartRef.current = null;
      lockedRef.current = false;
      runningRef.current = true;
      setExIndex(0);
      setPhase("tracking");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      stopCamera();
      setErrorMsg(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Камераға рұқсат берілмеді. Браузер параметрінен рұқсат беріңіз."
          : "Камера немесе AI моделін жүктеу кезінде қате шықты. Қайта көріңіз."
      );
      setPhase("denied");
    }
  }, [loop, stopCamera]);

  const restart = useCallback(() => {
    setExIndex(0);
    setJustCompleted(false);
    start();
  }, [start]);

  // ---- canvas drawing ----
  const clearCanvas = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const drawFace = (landmarks: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // face bounding box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    ctx.strokeStyle = "rgba(34,197,94,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(minX * canvas.width, minY * canvas.height, (maxX - minX) * canvas.width, (maxY - minY) * canvas.height);

    // lips outline
    const lipRing = [
      61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, // outer lower
      409, 270, 269, 267, 0, 37, 39, 40, 185, 61, // outer upper
    ];
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    lipRing.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = pt.x * canvas.width;
      const y = pt.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // brows
    ctx.fillStyle = "#a78bfa";
    [70, 63, 105, 66, 107, 336, 296, 334, 293, 300].forEach((idx) => {
      const pt = landmarks[idx];
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const currentExercise = EXERCISES[exIndex];
  const pct = Math.round(score * 100);
  const targetPct = Math.round(currentExercise.threshold * 100);

  return (
    <PageShell theme="dark" className="p-6">
      <header className="flex items-center justify-between mb-8 relative z-10">
        <Link href="/" className="btn-ghost" onClick={stopCamera}>
          <ArrowLeft className="w-5 h-5 text-success" />
          <span className="text-success">Артқа</span>
        </Link>
        <div className="text-center">
          <h1 className="heading-lg text-2xl text-success">AR Гимнастика</h1>
          <p className="text-success/70 font-medium">
            Жаттығу {Math.min(exIndex + 1, EXERCISES.length)} / {EXERCISES.length}
          </p>
        </div>
        <div className="w-24" />
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <GlassCard strong className="p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] border-success/20 shadow-success/10">
          {phase === "intro" && (
            <div className="text-center">
              <Camera className="w-20 h-20 text-success/40 mx-auto mb-4" />
              <p className="text-muted mb-6 max-w-xs">
                Камераны қосыңыз — AI бетіңізді танып, жаттығуларды дұрыс орындағаныңызды тексереді.
              </p>
              <button onClick={start} className="btn-primary px-8 py-4 text-xl rounded-full">
                Камераны қосу
              </button>
            </div>
          )}

          {phase === "loading" && (
            <div className="text-center">
              <RefreshCw className="w-16 h-16 text-success mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium text-foreground">AI моделі жүктелуде...</p>
            </div>
          )}

          {phase === "denied" && (
            <div className="text-center p-8">
              <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-6">{errorMsg}</p>
              <button onClick={start} className="btn-secondary px-8 py-3 rounded-full">
                Қайта көру
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="text-center p-8">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-8xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="heading-lg text-3xl text-success mb-2">Жарайсың!</h2>
              <p className="text-muted mb-6">Барлық {EXERCISES.length} жаттығуды сәтті орындадың.</p>
              <button onClick={restart} className="btn-primary px-8 py-3 rounded-full">
                Қайтадан бастау
              </button>
            </div>
          )}

          {/* Video (rendered while tracking / loading so metadata can load) */}
          <div
            className={`relative w-full h-full rounded-2xl overflow-hidden ${
              phase === "tracking" || phase === "loading" ? "block" : "hidden"
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none z-10"
            />

            {/* no face hint */}
            {phase === "tracking" && !faceVisible && !justCompleted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                <p className="text-white font-bold text-xl text-center px-6">
                  Бетіңізді камераға толық көрсетіңіз 🙂
                </p>
              </div>
            )}

            {/* live strength meter */}
            {phase === "tracking" && faceVisible && !justCompleted && (
              <div className="absolute left-4 right-4 bottom-4 z-20">
                <div className="flex justify-between text-xs font-semibold text-white/90 mb-1">
                  <span>Қазір: {pct}%</span>
                  <span>Керек: {targetPct}%+</span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{
                      width: `${pct}%`,
                      background: score >= currentExercise.threshold ? "#22c55e" : "#eab308",
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                    style={{ left: `${targetPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* hold progress ring */}
            {phase === "tracking" && holdProgress > 0 && !justCompleted && (
              <svg className="absolute top-4 left-1/2 -translate-x-1/2 z-20" width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - holdProgress)}
                  transform="rotate(-90 32 32)"
                />
              </svg>
            )}

            <AnimatePresence>
              {justCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="absolute inset-0 flex items-center justify-center bg-success/20 backdrop-blur-sm z-30"
                >
                  <div className="bg-success text-white px-8 py-4 rounded-full font-bold text-2xl flex items-center gap-3 shadow-2xl">
                    <CheckCircle2 className="w-8 h-8" /> Керемет! ✅
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Instructions */}
        <GlassCard className="p-8 flex flex-col min-h-[500px]">
          <h2 className="heading-lg text-3xl mb-4 text-success">{currentExercise.title}</h2>
          <p className="text-xl text-muted mb-6 font-medium">{currentExercise.desc}</p>

          <div className="flex-1 glass rounded-3xl border border-success/20 flex flex-col items-center justify-center relative overflow-hidden p-6">
            <motion.div
              key={exIndex}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-9xl mb-6"
            >
              {currentExercise.emoji}
            </motion.div>

            {phase === "tracking" ? (
              <div className="w-full max-w-xs text-center">
                <div className="badge-success font-bold text-lg px-6 py-2 mb-4">Маған қарап қайтала!</div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-success transition-[width] duration-75"
                    style={{ width: `${Math.round(holdProgress * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  {faceVisible ? "Дұрыс позаны 1 секунд ұста" : "Бет табылмады"}
                </p>
              </div>
            ) : (
              <div className="badge-success font-bold text-lg px-6 py-2">Маған қарап қайтала!</div>
            )}
          </div>

          {phase === "tracking" && (
            <button
              onClick={() => {
                if (exIndex < EXERCISES.length - 1) {
                  holdStartRef.current = null;
                  smoothRef.current = 0;
                  setScore(0);
                  setHoldProgress(0);
                  setExIndex((p) => p + 1);
                } else {
                  stopCamera();
                  setPhase("finished");
                }
              }}
              className="btn-ghost mt-4 self-center px-6 py-2 text-sm"
            >
              <SkipForward className="w-4 h-4" /> Өткізіп жіберу
            </button>
          )}
        </GlassCard>
      </main>
    </PageShell>
  );
}
