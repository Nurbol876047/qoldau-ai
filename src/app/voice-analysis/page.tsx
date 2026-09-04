"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Languages, Square, Play, AlertCircle, RefreshCw } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function Visualizer3D({ isCorrect, isSpeaking }: { isCorrect: boolean | null, isSpeaking: boolean }) {
  const meshRef = useRef<any>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (isSpeaking) {
        meshRef.current.distort = 0.4 + Math.sin(state.clock.elapsedTime * 10) * 0.2;
        meshRef.current.speed = 4;
      } else if (isCorrect === true) {
        meshRef.current.distort = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.speed = 2;
      } else if (isCorrect === false) {
        meshRef.current.distort = 0.1;
        meshRef.current.speed = 1;
      } else {
        meshRef.current.distort = 0;
        meshRef.current.speed = 1;
      }
    }
  });

  const color = isCorrect === true ? "#10B981" : isCorrect === false ? "#F59E0B" : "#3B82F6";

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Sphere args={[1, 64, 64]} scale={isSpeaking ? 1.2 : 1}>
        <MeshDistortMaterial
          ref={meshRef}
          color={color}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.1}
          roughness={0.5}
        />
      </Sphere>
      <OrbitControls enableZoom={false} autoRotate={!isSpeaking && isCorrect === null} />
    </>
  );
}

export default function VoiceAnalysisPage() {
  const [lang, setLang] = useState<"KZ" | "RU">("KZ");
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing" | "result" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ recognized: string, isCorrect: boolean, accuracy: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const targetWord = lang === "KZ" ? "ҚҰЛЫН" : "СОБАКА";
  
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(248, 250, 252)"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgb(59, 130, 246)"; 
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); 
      setStatus("recording");
      setResult(null);
      setErrorMsg("");
      setAudioUrl(null);

    } catch (err) {
      console.error("Microphone access denied:", err);
      setStatus("error");
      setErrorMsg("Микрофонға рұқсат берілмеді. / Нет доступа к микрофону.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      };
      mediaRecorderRef.current.stop();
      setStatus("idle");
    }
  };

  const getAudioFloat32 = async (blob: Blob): Promise<Float32Array> => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Resample to 16kHz mono 
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const resampled = await offlineCtx.startRendering();
    
    return resampled.getChannelData(0);
  };

  const analyzeAudio = async () => {
    if (!audioUrl) return;
    setStatus("analyzing");
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("targetWord", targetWord);
      formData.append("lang", lang);

      const res = await fetch("/api/analyze-voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "API responded with an error");
      }

      const data = await res.json();
      
      setResult({
        recognized: data.recognizedText || "(белгісіз)",
        isCorrect: data.isCorrect,
        accuracy: data.accuracy,
      });
      setStatus("result");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Қате пайда болды. Сервер қолжетімсіз. / Ошибка соединения.");
    }
  };

  const handleLangToggle = () => {
    setLang(lang === "KZ" ? "RU" : "KZ");
    setResult(null);
    setAudioUrl(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 relative">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
          <span className="text-slate-800">Артқа</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 mr-4">Дауыс анализі</h1>
          <button 
            onClick={handleLangToggle}
            className="bg-white border border-slate-200 px-6 py-2 rounded-full font-bold text-slate-800 flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Languages className="w-5 h-5" />
            {lang === "KZ" ? "Қазақша" : "Русский"}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left column: Record & Audio */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-md flex flex-col items-center">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-medium text-slate-500 mb-2">
              {lang === "KZ" ? "Осы сөзді қайталаңыз:" : "Повторите это слово:"}
            </h2>
            <div className="text-5xl font-extrabold text-blue-600 tracking-wider">
              {targetWord}
            </div>
          </div>

          <div className="w-full h-32 mb-8 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden relative shadow-inner">
             <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
             {status !== "recording" && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  {lang === "KZ" ? "Аудио толқыны" : "Аудио волна"}
                </div>
             )}
          </div>

          {status === "error" && (
            <div className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-200">
               <AlertCircle className="w-6 h-6" />
               <p>{errorMsg}</p>
            </div>
          )}

          <div className="flex items-center gap-6 mb-8">
            {status === "idle" || status === "result" || status === "error" ? (
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                <Mic className="w-8 h-8" />
              </button>
            ) : status === "recording" ? (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg animate-pulse"
              >
                <Square className="w-8 h-8" />
              </button>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center shadow-lg">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}
          </div>

          {audioUrl && status !== "recording" && status !== "analyzing" && (
            <div className="w-full flex flex-col items-center gap-4">
              <audio src={audioUrl} controls className="w-full max-w-sm" />
              <button 
                onClick={analyzeAudio}
                className="w-full max-w-sm bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                {lang === "KZ" ? "Анализге жіберу" : "Отправить на анализ"}
              </button>
            </div>
          )}
        </div>

        {/* Right column: 3D Visualization & Result */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-md flex flex-col">
           <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">
             {lang === "KZ" ? "Визуализация және Нәтиже" : "Визуализация и Результат"}
           </h3>
           
           <div className="flex-1 min-h-[300px] w-full bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative mb-6">
              <Canvas camera={{ position: [0, 0, 3] }}>
                 <Visualizer3D 
                   isSpeaking={status === "recording"} 
                   isCorrect={result ? result.isCorrect : null} 
                 />
              </Canvas>
              
              {status === "analyzing" && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-white px-6 py-3 rounded-full shadow-lg font-bold text-blue-600 flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {lang === "KZ" ? "Талданып жатыр..." : "Анализируем..."}
                  </div>
                </div>
              )}
           </div>

           {result && (
             <div className={`p-6 rounded-2xl border ${result.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="text-2xl font-bold mb-2 flex items-center gap-2">
                  {result.isCorrect ? (
                    <span className="text-emerald-600">Дұрыс айттың! ✅</span>
                  ) : (
                    <span className="text-orange-600">Тағы бір рет көрейік 🔄</span>
                  )}
                </div>
                <div className="text-slate-600">
                  <strong>{lang === "KZ" ? "Сенің сөзің:" : "Ты сказал(а):"}</strong> {result.recognized}
                </div>
                <div className="text-slate-600 mt-1">
                  <strong>{lang === "KZ" ? "Дәлдік:" : "Точность:"}</strong> {result.accuracy}%
                </div>
             </div>
           )}
           
           {!result && status !== "analyzing" && (
             <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50 text-center text-slate-500">
                {lang === "KZ" 
                  ? "Микрофонды басып, сөзді айтыңыз, содан кейін нәтижені күтіңіз." 
                  : "Нажмите на микрофон, произнесите слово, затем отправьте на анализ."}
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
