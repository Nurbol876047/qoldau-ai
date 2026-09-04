"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Languages, Square, Play, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";

// --- IN-MEMORY DATABASE MOCK (To simulate Prisma + PostgreSQL MVP) ---
const WORDS_DB = [
  { id: 1, word: "рақмет", targetSound: "р", category: "сонорные", instruction: "Тілдің ұшын таңдайға тигізіп, дірілдет.", lang: "KZ" },
  { id: 2, word: "шар", targetSound: "ш", category: "шипящие", instruction: "Ерінді алға созып, тілді жоғары көтер.", lang: "KZ" },
  { id: 3, word: "ғарыш", targetSound: "ғ", category: "заднеязычные", instruction: "Тілдің түбін тамаққа қарай тартып, жұмсақ айт.", lang: "KZ" },
  { id: 4, word: "қалам", targetSound: "қ", category: "заднеязычные", instruction: "Тілдің түбін тамаққа қатты тигіз.", lang: "KZ" },
  
  { id: 5, word: "рыба", targetSound: "р", category: "сонорные", instruction: "Подними кончик языка к альвеолам и заставь его вибрировать.", lang: "RU" },
  { id: 6, word: "шапка", targetSound: "ш", category: "шипящие", instruction: "Слегка вытяни губы вперед, язык подними вверх.", lang: "RU" },
];

function ArticulationModel({ mode, category }: { mode: "ideal" | "actual", category: string }) {
  const meshRef = useRef<any>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (mode === "ideal") {
        if (category === "сонорные") {
           meshRef.current.distort = 0.5 + Math.sin(state.clock.elapsedTime * 8) * 0.2; // fast vibration for 'R'
        } else if (category === "шипящие") {
           meshRef.current.distort = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1; // steady push for 'Sh'
        } else {
           meshRef.current.distort = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        }
        meshRef.current.speed = 3;
      } else {
        // actual (simulating imperfect articulation)
        meshRef.current.distort = 0.1 + Math.sin(state.clock.elapsedTime * 1) * 0.05;
        meshRef.current.speed = 1;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Sphere args={[1, 64, 64]} scale={mode === "ideal" ? 1.2 : 0.9}>
        <MeshDistortMaterial
          ref={meshRef}
          color={mode === "ideal" ? "#10B981" : "#F59E0B"}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.1}
          roughness={0.5}
          wireframe={mode === "actual"}
        />
      </Sphere>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}

export default function SpeechRecognitionPage() {
  const [lang, setLang] = useState<"KZ" | "RU">("KZ");
  const [words, setWords] = useState(WORDS_DB.filter(w => w.lang === "KZ"));
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing" | "result" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ recognized: string, letters: {char: string, isCorrect: boolean}[] } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setWords(WORDS_DB.filter(w => w.lang === lang));
    setCurrentIndex(0);
    setResult(null);
    setStatus("idle");
  }, [lang]);

  const currentWord = words[currentIndex];

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
      setResult(null);
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(lang === "KZ" ? "Микрофонға рұқсат берілмеді." : "Нет доступа к микрофону.");
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
      formData.append("targetWord", currentWord.word);
      formData.append("lang", lang);

      const res = await fetch("/api/analyze-voice", { method: "POST", body: formData });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const recognizedText = data.recognizedText.toLowerCase().replace(/[^a-zа-яәіңғқүұһ]/gi, '') || "";
      const targetStr = currentWord.word.toLowerCase();

      // Diff logic: check each character of the target word against the recognized text
      // (Simple sequential matching for MVP)
      let recIndex = 0;
      const letterResults = targetStr.split('').map(char => {
        let isCorrect = false;
        const searchBound = Math.min(recIndex + 3, recognizedText.length);
        for(let i = recIndex; i < searchBound; i++) {
          if (recognizedText[i] === char) {
            isCorrect = true;
            recIndex = i + 1;
            break;
          }
        }
        return { char, isCorrect };
      });

      setResult({
        recognized: data.recognizedText,
        letters: letterResults
      });
      setStatus("result");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(lang === "KZ" ? "Талдау қатесі. Шулы орта болуы мүмкін." : "Ошибка анализа. Возможно, слишком шумно.");
    }
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setResult(null);
      setStatus("idle");
    }
  };

  const accuracy = result 
    ? Math.round((result.letters.filter(l => l.isCorrect).length / result.letters.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#F3F6F8] flex flex-col p-6 relative">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
          <span className="text-slate-800">Артқа</span>
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 mr-4">Сөйлеуді тану (Фонетика)</h1>
          <button 
            onClick={() => setLang(lang === "KZ" ? "RU" : "KZ")}
            className="bg-white border border-slate-200 px-6 py-2 rounded-full font-bold text-slate-800 flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Languages className="w-5 h-5" />
            {lang === "KZ" ? "Қазақша" : "Русский"}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Interaction Panel */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-600">
                {lang === "KZ" ? "Сөзді айтыңыз:" : "Произнесите слово:"}
              </h2>
              <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full font-bold text-sm">
                {currentIndex + 1} / {words.length}
              </span>
            </div>
            
            <div className="text-center mb-10">
              <div className="text-7xl font-extrabold text-purple-600 uppercase tracking-widest mb-4">
                {currentWord.word}
              </div>
              <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-600 font-medium">
                🎯 {lang === "KZ" ? "Нысаналы дыбыс" : "Целевой звук"}: <strong className="text-purple-600 text-xl uppercase">"{currentWord.targetSound}"</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
             {status === "error" && (
                <div className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-200">
                   <AlertCircle className="w-6 h-6" />
                   <p>{errorMsg}</p>
                </div>
              )}

             {status === "idle" || status === "result" || status === "error" ? (
                <button
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                >
                  <Mic className="w-10 h-10" />
                </button>
              ) : status === "recording" ? (
                <button
                  onClick={stopRecordingAndAnalyze}
                  className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg animate-pulse"
                >
                  <Square className="w-10 h-10" />
                </button>
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-10 h-10 text-slate-400 animate-spin" />
                </div>
              )}

              <p className="mt-4 text-slate-500 font-medium h-6">
                {status === "recording" && (lang === "KZ" ? "Тыңдап тұрмын (тоқтату үшін басыңыз)..." : "Слушаю (нажмите для остановки)...")}
                {status === "analyzing" && (lang === "KZ" ? "Модель талдап жатыр..." : "Модель анализирует...")}
                {status === "idle" && (lang === "KZ" ? "Жазуды бастау үшін басыңыз" : "Нажмите для начала записи")}
              </p>
          </div>
        </div>

        {/* Visualization Panel */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-md flex flex-col">
           <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-4">
             {lang === "KZ" ? "Артикуляциялық 3D модель және фонемдік талдау" : "Артикуляционная 3D модель и фонемный анализ"}
           </h3>
           
           <div className="flex gap-4 h-64 mb-6">
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative flex flex-col">
                 <div className="absolute top-2 left-2 z-10 bg-white/80 px-2 py-1 rounded text-xs font-bold text-emerald-600 backdrop-blur-sm">Эталон</div>
                 <Canvas camera={{ position: [0, 0, 3] }}>
                    <ArticulationModel mode="ideal" category={currentWord.category} />
                 </Canvas>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative flex flex-col">
                 <div className="absolute top-2 left-2 z-10 bg-white/80 px-2 py-1 rounded text-xs font-bold text-orange-600 backdrop-blur-sm">Сенің артикуляцияң</div>
                 <Canvas camera={{ position: [0, 0, 3] }}>
                    {result ? <ArticulationModel mode={accuracy > 80 ? "ideal" : "actual"} category={currentWord.category} /> : null}
                 </Canvas>
                 {!result && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">{lang === "KZ" ? "Күтуде..." : "Ожидание..."}</div>}
              </div>
           </div>
           
           <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium border border-blue-100 mb-6">
             💡 {currentWord.instruction}
           </div>

           {result && (
             <div className="flex-1 flex flex-col justify-between">
               <div>
                  <p className="text-slate-500 text-sm mb-2">{lang === "KZ" ? "Дыбыстар бойынша нәтиже:" : "Результат по звукам:"}</p>
                  <div className="flex flex-wrap gap-2 text-3xl font-extrabold uppercase">
                    {result.letters.map((l, i) => (
                      <span key={i} className={l.isCorrect ? "text-emerald-500" : "text-red-500"}>
                        {l.char}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    {lang === "KZ" ? "Распознано: " : "Распознано: "} "{result.recognized}"
                  </p>
               </div>
               
               <div className="flex items-center justify-between mt-6">
                 <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{lang === "KZ" ? "Дәлдік:" : "Точность:"}</span>
                    <span className={`text-xl font-black ${accuracy > 80 ? "text-emerald-500" : accuracy > 50 ? "text-orange-500" : "text-red-500"}`}>
                      {accuracy}%
                    </span>
                 </div>
                 
                 {accuracy > 50 && currentIndex < words.length - 1 && (
                   <button onClick={nextWord} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 transition-colors">
                     {lang === "KZ" ? "Келесі сөз" : "Следующее слово"}
                     <ChevronRight className="w-5 h-5" />
                   </button>
                 )}
               </div>
             </div>
           )}
        </div>

      </main>
    </div>
  );
}
