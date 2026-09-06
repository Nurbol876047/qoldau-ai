"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Hand } from "lucide-react";
import { motion } from "framer-motion";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

// Define mapping for the predefined gestures in the model
const GESTURE_MAP: Record<string, { kz: string, emoji: string, ru: string }> = {
  "None": { kz: "Қимыл жоқ", ru: "Нет жеста", emoji: "👀" },
  "Closed_Fist": { kz: "Тоқта! / Күш", ru: "Кулак / Стоп", emoji: "✊" },
  "Open_Palm": { kz: "Сәлем!", ru: "Привет!", emoji: "👋" },
  "Pointing_Up": { kz: "Назар аудар!", ru: "Внимание!", emoji: "☝️" },
  "Thumb_Down": { kz: "Нашар", ru: "Плохо", emoji: "👎" },
  "Thumb_Up": { kz: "Керемет!", ru: "Супер!", emoji: "👍" },
  "Victory": { kz: "Жеңіс!", ru: "Победа!", emoji: "✌️" },
  "ILoveYou": { kz: "Мен сені жақсы көремін", ru: "Я тебя люблю", emoji: "🤟" }
};

export default function GesturesPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [gesture, setGesture] = useState<string>("None");
  const [lang, setLang] = useState<"KZ" | "RU">("KZ");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSpoken, setLastSpoken] = useState<string>("None");

  const requestRef = useRef<number>(0);

  // Architecture for Nurgul Neuro TTS (Connected to our Edge TTS Backend)
  const playTTS = async (text: string) => {
    try {
      // 1. Бэкендке сұраныс жібереміз (Edge TTS - қазақша AigulNeural дауысы)
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });
      
      if (!response.ok) throw new Error("TTS API қатесі");
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Бұрынғы оқылып жатқан дыбысты тоқтату
      if ((window as any).currentAudio) {
        (window as any).currentAudio.pause();
      }
      (window as any).currentAudio = audio;
      
      try {
        await audio.play();
      } catch (playErr: any) {
        console.error("Autoplay қатесі:", playErr);
        if (playErr.name === "NotAllowedError") {
          setErrorMsg("Браузер дыбысты бұғаттады. Дыбыс шығу үшін экранның кез келген жерін бір рет шертіңіз (click)!");
        }
      }
      
    } catch (err) {
      console.error("TTS қатесі:", err);
    }
  };

  // Жай ғана жаңа қимыл танылғанда дауыстап оқу логикасы (спам болмас үшін)
  useEffect(() => {
    if (gesture !== "None" && gesture !== lastSpoken) {
      // Жаңа қимыл шықты
      setLastSpoken(gesture);
      const textToSpeak = lang === "KZ" ? GESTURE_MAP[gesture].kz : GESTURE_MAP[gesture].ru;
      
      // Сөзді оқу
      playTTS(textToSpeak);
      
    } else if (gesture === "None" && lastSpoken !== "None") {
      // Қолды түсіргенде, қайтадан оқуға дайын болу үшін тазарту
      setLastSpoken("None");
    }
  }, [gesture, lastSpoken, lang]);


  useEffect(() => {
    let active = true;

    // MediaPipe WASM logs INFO messages as console.error, which triggers Next.js error overlay.
    // We suppress specifically the XNNPACK log.
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
      originalError(...args);
    };

    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        if (active) {
          recognizerRef.current = recognizer;
          setIsLoaded(true);
          startCamera();
        }
      } catch (error) {
        console.error("Error loading gesture recognizer:", error);
        if (active) setErrorMsg("Модельді жүктеу кезінде қате пайда болды.");
      }
    };

    initModel();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    } catch (err) {
      console.error(err);
      setErrorMsg("Камераға рұқсат жоқ немесе камера табылмады.");
    }
  };

  const handleVideoPlay = () => {
    const predictWebcam = async () => {
      if (!videoRef.current || !recognizerRef.current) return;
      if (videoRef.current.readyState !== 4) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
      }

      const nowInMs = Date.now();
      const results = recognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);

      if (results.gestures && results.gestures.length > 0) {
        const recognizedGesture = results.gestures[0][0].categoryName;
        if (recognizedGesture) {
          setGesture(recognizedGesture);
        }
      } else {
        setGesture("None");
      }

      // Draw landmarks
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          if (results.landmarks && results.landmarks.length > 0) {
            ctx.fillStyle = "#38bdf8";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            for (const landmarks of results.landmarks) {
              for (const landmark of landmarks) {
                const x = landmark.x * canvasRef.current.width;
                const y = landmark.y * canvasRef.current.height;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
              }
            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(predictWebcam);
    };

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const currentDisplay = GESTURE_MAP[gesture] || GESTURE_MAP["None"];

  return (
    <PageShell theme="light" className="p-6">
      <header className="flex items-center justify-between mb-8 relative z-10">
        <Link href="/" className="btn-ghost">
          <ArrowLeft className="w-5 h-5 text-foreground" />
          <span>Артқа</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <h1 className="heading-lg text-2xl mr-4 flex items-center gap-2">
            <Hand className="w-6 h-6 text-ai-purple" />
            Ым-ишарат тілі
          </h1>
          <button 
            onClick={() => playTTS("Дыбыс жұмыс істеп тұр!")}
            className="btn-ghost font-bold text-accent"
          >
            🔊 Тексеру
          </button>
          <button 
            onClick={() => setLang(lang === "KZ" ? "RU" : "KZ")}
            className="btn-ghost font-bold"
          >
            {lang === "KZ" ? "Қазақша" : "Русский"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Section */}
        <GlassCard className="p-6 flex flex-col items-center">
          <h2 className="heading-lg text-xl mb-4">
            {lang === "KZ" ? "Камераға қолыңызды көрсетіңіз" : "Покажите жест в камеру"}
          </h2>
          
          <div className="relative w-full max-w-[640px] aspect-video glass rounded-3xl overflow-hidden">
            {!isLoaded && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted gap-3 z-20">
                <Loader2 className="w-10 h-10 animate-spin text-ai-purple" />
                <span className="font-medium">
                  {lang === "KZ" ? "Модель жүктелуде..." : "Загрузка модели..."}
                </span>
              </div>
            )}
            
            {errorMsg && (
              <div className="absolute inset-0 flex items-center justify-center text-error p-6 text-center z-20 banner-error">
                {errorMsg}
              </div>
            )}
            
            <video
              ref={videoRef}
              onPlay={handleVideoPlay}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
            
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 z-10 pointer-events-none"
            />
          </div>
        </GlassCard>

        {/* Result Section */}
        <GlassCard strong className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-ai-purple" />
          
          <h3 className="text-2xl font-bold text-muted mb-8 uppercase tracking-widest">
             {lang === "KZ" ? "ТАНЫЛҒАН ҚИМЫЛ" : "РАСПОЗНАННЫЙ ЖЕСТ"}
          </h3>

          <motion.div 
            key={gesture}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="text-[150px] leading-none drop-shadow-2xl filter">
              {currentDisplay.emoji}
            </div>
            
            <div className={`text-4xl md:text-5xl font-black ${gesture !== 'None' ? 'gradient-text' : 'text-muted'}`}>
              {lang === "KZ" ? currentDisplay.kz : currentDisplay.ru}
            </div>
          </motion.div>
          
          {gesture === 'None' && (
             <p className="mt-8 text-muted font-medium max-w-xs">
               {lang === "KZ" 
                 ? "Камера алдында қолыңызбен 'Сәлем' немесе басқа белгі көрсетіңіз." 
                 : "Покажите рукой 'Привет' или другой жест перед камерой."}
             </p>
          )}

          {/* Available Gestures List */}
          <div className="w-full mt-auto pt-10">
            <p className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">
              {lang === "KZ" ? "Қолжетімді қимылдар:" : "Доступные жесты:"}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(GESTURE_MAP).filter(([key]) => key !== "None").map(([key, data]) => {
                const isActive = gesture === key;
                return (
                  <div 
                    key={key} 
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      isActive 
                        ? "glass border-ai-purple scale-110 shadow-lg shadow-ai-purple/20" 
                        : "glass opacity-60 border-transparent"
                    }`}
                    title={lang === "KZ" ? data.kz : data.ru}
                  >
                    <span className="text-3xl mb-1">{data.emoji}</span>
                    <span className={`text-[10px] font-bold ${isActive ? "text-ai-purple" : "text-muted"}`}>
                      {lang === "KZ" ? data.kz : data.ru}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      </main>
    </PageShell>
  );
}
