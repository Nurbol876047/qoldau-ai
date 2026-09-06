"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, RotateCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

interface Exercise {
  id: number;
  title: string;
  desc: string;
  target: "smile" | "open" | "pucker";
}

const EXERCISES: Exercise[] = [
  { id: 1, title: "Күлімсіреу", desc: "Еріндеріңді тістерің көрінетіндей етіп соз. Осылай ұста.", target: "smile" },
  { id: 2, title: "Түтікше", desc: "Еріндеріңді алға қарай соз (пілдің тұмсығы сияқты).", target: "pucker" },
  { id: 3, title: "Ауызды кең ашу", desc: "Ауызыңды үлкен етіп аш (бегемот сияқты).", target: "open" },
];

export default function GymnasticsPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "try_again">("idle");
  const [successCount, setSuccessCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef(-1);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const initCameraAndModel = async () => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setIsTracking(true);
      }

      // Init Face Landmarker
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      
      landmarkerRef.current = landmarker;
      
      videoRef.current?.addEventListener("loadeddata", predictWebcam);

    } catch (err: any) {
      console.error(err);
      setHasPermission(false);
      setErrorMsg("Камераға рұқсат берілмеді немесе қате шықты.");
    }
  };

  const predictWebcam = async () => {
    const video = videoRef.current;
    if (!video || !landmarkerRef.current) return;

    if (video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      const results = landmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        drawLandmarks(results.faceLandmarks[0]);
        checkExercise(results.faceBlendshapes ? results.faceBlendshapes[0] : null);
      } else {
        setFeedback("idle");
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const drawLandmarks = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw only mouth landmarks
    const mouthIndices = [61, 291, 13, 14, 0, 17, 78, 308];
    ctx.fillStyle = "#22c55e";
    
    mouthIndices.forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const checkExercise = (blendshapes: any) => {
    if (!blendshapes || !blendshapes.categories) return;

    const target = EXERCISES[currentExIndex].target;
    let isSuccess = false;

    // Helper to get score from blendshapes array
    const getScore = (name: string) => {
      const cat = blendshapes.categories.find((c: any) => c.categoryName === name);
      return cat ? cat.score : 0;
    };

    // Blendshape scores go from 0.0 to 1.0. 
    // Usually > 0.4 is a very clear expression.
    if (target === "smile") {
      const smileL = getScore("mouthSmileLeft");
      const smileR = getScore("mouthSmileRight");
      // Егер сәл ғана жымиса да қабылдаймыз (0.35)
      if (smileL > 0.35 || smileR > 0.35) isSuccess = true;
    } 
    else if (target === "pucker") {
      const pucker = getScore("mouthPucker");
      if (pucker > 0.4) isSuccess = true;
    } 
    else if (target === "open") {
      const jawOpen = getScore("jawOpen");
      if (jawOpen > 0.3) isSuccess = true;
    }

    if (isSuccess) {
      setFeedback("correct");
      setSuccessCount(prev => prev + 1);
    } else {
      setFeedback("try_again");
      setSuccessCount(0); // reset if they drop the pose
    }
  };

  // Auto-progress to next exercise if holding correct pose for a bit
  useEffect(() => {
    if (successCount > 25) { // Roughly 1 second at 30fps
      setSuccessCount(0);
      setFeedback("idle");
      if (currentExIndex < EXERCISES.length - 1) {
        setCurrentExIndex(prev => prev + 1);
      } else {
        // Finished all
        alert("Жарайсың! Барлық жаттығулар сәтті аяқталды! 🎉");
        stopCamera();
        setIsTracking(false);
        setCurrentExIndex(0);
      }
    }
  }, [successCount, currentExIndex]);

  const currentExercise = EXERCISES[currentExIndex];

  return (
    <PageShell theme="dark" className="p-6">
      <header className="flex items-center justify-between mb-8 relative z-10">
        <Link href="/" className="btn-ghost">
          <ArrowLeft className="w-5 h-5 text-success" />
          <span className="text-success">Артқа</span>
        </Link>
        <div className="text-center">
          <h1 className="heading-lg text-2xl text-success">AR Гимнастика</h1>
          <p className="text-success/70 font-medium">
            Жаттығу {currentExIndex + 1} / {EXERCISES.length}
          </p>
        </div>
        <div className="w-24"></div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <GlassCard strong className="p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] border-success/20 shadow-success/10">
          
          {!isTracking && hasPermission !== false && (
            <div className="text-center">
              <Camera className="w-20 h-20 text-success/40 mx-auto mb-4" />
              <button 
                onClick={initCameraAndModel}
                className="btn-primary px-8 py-4 text-xl rounded-full"
              >
                Камераны қосу
              </button>
            </div>
          )}

          {hasPermission === false && (
            <div className="text-center p-8">
              <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-6">
                {errorMsg}
              </p>
              <button 
                onClick={initCameraAndModel}
                className="btn-secondary px-8 py-3 rounded-full"
              >
                Қайта көру
              </button>
            </div>
          )}

          {/* Video element (always rendered but hidden if not tracking) */}
          <div className={`relative w-full h-full rounded-2xl overflow-hidden ${isTracking ? 'block' : 'hidden'}`}>
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
            
            {/* Feedback overlay */}
            <AnimatePresence>
              {feedback === "correct" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-success text-white px-8 py-3 rounded-full font-bold text-2xl flex items-center gap-3 shadow-2xl shadow-success/40 z-20"
                >
                  <CheckCircle2 className="w-8 h-8" />
                  Дұрыс! ✅
                </motion.div>
              )}
              {feedback === "try_again" && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-warning text-white px-8 py-3 rounded-full font-bold text-xl flex items-center gap-3 shadow-2xl z-20"
                >
                  <RotateCw className="w-6 h-6 animate-spin" />
                  Қайталап көрейік...
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Progress Bar for current exercise hold */}
            {successCount > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 progress-bar z-20">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(successCount / 25) * 100}%` }}
                />
              </div>
            )}
          </div>
        </GlassCard>

        {/* Instructions */}
        <GlassCard className="p-8 flex flex-col min-h-[500px]">
          <h2 className="heading-lg text-3xl mb-4 text-success">
            {currentExercise.title}
          </h2>
          <p className="text-xl text-muted mb-8 font-medium">
            {currentExercise.desc}
          </p>
          
          <div className="flex-1 glass rounded-3xl border border-success/20 flex flex-col items-center justify-center relative overflow-hidden">
             
             <motion.div 
               key={currentExIndex}
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: "spring", bounce: 0.5 }}
               className="text-9xl mb-4"
             >
               {currentExercise.target === 'smile' ? '😁' : 
                currentExercise.target === 'pucker' ? '😗' : '😮'}
             </motion.div>

             <div className="badge-success font-bold text-lg px-6 py-2">
               Маған қарап қайтала!
             </div>
          </div>
        </GlassCard>
      </main>
    </PageShell>
  );
}
