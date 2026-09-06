"use client";

import React, { useEffect, useRef } from "react";

interface AnimatedBackgroundProps {
  theme?: "dark" | "light";
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
  type: "dot" | "star" | "sparkle";
}

interface BokehOrb {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y - size * 0.6);
  ctx.lineTo(x + size * 0.6, y + size * 0.6);
  ctx.moveTo(x + size * 0.6, y - size * 0.6);
  ctx.lineTo(x - size * 0.6, y + size * 0.6);
  ctx.stroke();
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowBlur = r * 4;
  ctx.shadowColor = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function AnimatedBackground({ theme = "dark" }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bokehRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bokehCanvas = bokehRef.current;
    if (!canvas || !bokehCanvas) return;
    const ctx = canvas.getContext("2d");
    const bCtx = bokehCanvas.getContext("2d");
    if (!ctx || !bCtx) return;

    let animId: number;
    const particles: Particle[] = [];
    const orbs: BokehOrb[] = [];

    const isDark = theme === "dark";

    const darkColors = ["#4dd0ff", "#7c6cf6", "#facc15", "#22c55e", "#ffffff", "#67e8f9", "#ec4899", "#a855f7"];
    const lightColors = ["#38bdf8", "#7c6cf6", "#ec4899", "#22c55e", "#facc15", "#6366f1", "#f472b6", "#06b6d4"];
    const palette = isDark ? darkColors : lightColors;

    const bokehColors = isDark
      ? ["rgba(77,208,255,", "rgba(124,108,246,", "rgba(34,197,94,", "rgba(250,204,21,", "rgba(236,72,153,"]
      : ["rgba(124,108,246,", "rgba(56,189,248,", "rgba(236,72,153,", "rgba(34,197,94,", "rgba(250,204,21,"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      bokehCanvas.width = window.innerWidth;
      bokehCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = isDark ? 180 : 90;
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      const type: Particle["type"] = roll > 0.85 ? "sparkle" : roll > 0.6 ? "star" : "dot";
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: type === "star" ? Math.random() * 3 + 1.5 : type === "sparkle" ? Math.random() * 4 + 2 : Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * (type === "dot" ? 0.35 : 0.12),
        vy: (Math.random() - 0.5) * (type === "dot" ? 0.35 : 0.12),
        alpha: Math.random() * 0.7 + 0.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.06,
        type,
      });
    }

    const orbCount = isDark ? 12 : 8;
    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * (isDark ? 120 : 80) + 60,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        alpha: isDark ? Math.random() * 0.12 + 0.06 : Math.random() * 0.18 + 0.08,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.015,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bCtx.clearRect(0, 0, bokehCanvas.width, bokehCanvas.height);

      // Bokeh orbs layer
      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        o.pulse += o.pulseSpeed;
        if (o.x < -o.r) o.x = canvas.width + o.r;
        if (o.x > canvas.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = canvas.height + o.r;
        if (o.y > canvas.height + o.r) o.y = -o.r;

        const pulseAlpha = o.alpha * (0.7 + 0.3 * Math.sin(o.pulse));
        const grad = bCtx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        grad.addColorStop(0, `${o.color}${pulseAlpha * 1.5})`);
        grad.addColorStop(0.4, `${o.color}${pulseAlpha})`);
        grad.addColorStop(1, `${o.color}0)`);
        bCtx.fillStyle = grad;
        bCtx.beginPath();
        bCtx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        bCtx.fill();
      }

      // Constellation lines (dark only)
      if (isDark) {
        ctx.strokeStyle = "rgba(77,208,255,0.06)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120 && a.type !== "dot" && b.type !== "dot") {
              ctx.globalAlpha = (1 - dist / 120) * 0.15;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        p.twinkle += p.twinkleSpeed;
        const twinkleAlpha = p.alpha * (0.4 + 0.6 * Math.sin(p.twinkle));

        if (p.type === "sparkle") {
          drawSparkle(ctx, p.x, p.y, p.r, twinkleAlpha, p.color);
          if (isDark) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            drawSparkle(ctx, p.x, p.y, p.r * 0.5, twinkleAlpha * 0.5, p.color);
            ctx.shadowBlur = 0;
          }
        } else if (p.type === "star") {
          drawStar(ctx, p.x, p.y, p.r, twinkleAlpha, p.color);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = twinkleAlpha;
          ctx.fill();
          if (isDark) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = twinkleAlpha * 0.12;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep base */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 130% 90% at 50% -10%, #2a1060 0%, #12103a 25%, #0a0e2a 55%, #030510 100%)"
            : "radial-gradient(ellipse 110% 90% at 50% -5%, #dce8ff 0%, #eef4ff 25%, #f0e8ff 55%, #ffffff 100%)",
        }}
      />

      {/* ── DARK: Aurora layers ── */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-[25%] left-[-15%] w-[130%] h-[55%] animate-aurora-1"
            style={{
              background: "linear-gradient(100deg, transparent 5%, rgba(34,197,94,0.25) 20%, rgba(77,208,255,0.35) 40%, rgba(124,108,246,0.3) 60%, rgba(236,72,153,0.15) 80%, transparent 95%)",
              filter: "blur(35px)",
            }}
          />
          <div
            className="absolute -top-[15%] right-[-10%] w-[90%] h-[45%] animate-aurora-2"
            style={{
              background: "linear-gradient(80deg, transparent 5%, rgba(103,232,249,0.3) 25%, rgba(168,85,247,0.25) 50%, rgba(77,208,255,0.2) 75%, transparent 95%)",
              filter: "blur(45px)",
            }}
          />
          <div
            className="absolute top-[5%] left-[20%] w-[60%] h-[30%] animate-aurora-1"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.12), rgba(34,197,94,0.15), transparent)",
              filter: "blur(50px)",
              animationDelay: "4s",
            }}
          />
        </div>
      )}

      {/* ── LIGHT: Pastel washes ── */}
      {!isDark && (
        <>
          {[
            { top: "-25%", left: "-15%", w: "75%", h: "65%", bg: "rgba(124,108,246,0.35)", blur: 70 },
            { top: "5%", right: "-12%", w: "65%", h: "55%", bg: "rgba(56,189,248,0.3)", blur: 60 },
            { bottom: "-15%", left: "10%", w: "55%", h: "45%", bg: "rgba(236,72,153,0.2)", blur: 65 },
            { bottom: "10%", right: "5%", w: "45%", h: "40%", bg: "rgba(34,197,94,0.18)", blur: 55 },
            { top: "40%", left: "35%", w: "35%", h: "30%", bg: "rgba(250,204,21,0.15)", blur: 50 },
          ].map((b, i) => (
            <div
              key={i}
              className={`absolute rounded-full animate-blob-drift-${(i % 3) + 1}`}
              style={{
                top: b.top,
                left: b.left,
                right: b.right,
                bottom: b.bottom,
                width: b.w,
                height: b.h,
                background: `radial-gradient(circle, ${b.bg} 0%, transparent 70%)`,
                filter: `blur(${b.blur}px)`,
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ── DARK: Large neon glow blobs ── */}
      {isDark && (
        <>
          {[
            { t: "-8%", l: "-8%", w: "60%", h: "55%", c: "rgba(0,242,255,0.35)", blur: 90, anim: 1 },
            { t: "15%", r: "-10%", w: "55%", h: "50%", c: "rgba(124,108,246,0.32)", blur: 100, anim: 2 },
            { b: "-8%", l: "20%", w: "50%", h: "42%", c: "rgba(34,197,94,0.22)", blur: 80, anim: 3 },
            { b: "10%", r: "15%", w: "40%", h: "35%", c: "rgba(250,204,21,0.18)", blur: 70, anim: 1 },
            { t: "40%", l: "35%", w: "35%", h: "28%", c: "rgba(236,72,153,0.15)", blur: 65, anim: 2 },
            { t: "60%", l: "-5%", w: "30%", h: "25%", c: "rgba(103,232,249,0.2)", blur: 60, anim: 3 },
          ].map((b, i) => (
            <div
              key={i}
              className={`absolute rounded-full animate-blob-drift-${b.anim}`}
              style={{
                top: b.t, left: b.l, right: b.r, bottom: b.b,
                width: b.w, height: b.h,
                background: `radial-gradient(circle, ${b.c} 0%, transparent 65%)`,
                filter: `blur(${b.blur}px)`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}

          {/* Bottom purple cloud mist */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[35%] animate-aurora-2"
            style={{
              background: "linear-gradient(to top, rgba(42,16,80,0.7) 0%, rgba(124,108,246,0.15) 30%, rgba(77,208,255,0.06) 60%, transparent 100%)",
              filter: "blur(15px)",
            }}
          />
        </>
      )}

      {/* ── Corner neon glow (like cafe UI rim light) ── */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 w-[40%] h-[40%]" style={{
            background: "radial-gradient(circle at 0% 0%, rgba(0,242,255,0.2) 0%, transparent 60%)",
          }} />
          <div className="absolute top-0 right-0 w-[40%] h-[40%]" style={{
            background: "radial-gradient(circle at 100% 0%, rgba(124,108,246,0.18) 0%, transparent 60%)",
          }} />
          <div className="absolute bottom-0 left-0 w-[35%] h-[35%]" style={{
            background: "radial-gradient(circle at 0% 100%, rgba(34,197,94,0.12) 0%, transparent 60%)",
          }} />
          <div className="absolute bottom-0 right-0 w-[35%] h-[35%]" style={{
            background: "radial-gradient(circle at 100% 100%, rgba(250,204,21,0.1) 0%, transparent 60%)",
          }} />
        </>
      )}

      {/* ── Center spotlight ── */}
      <div
        className="absolute inset-0 animate-glow-pulse"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(77,208,255,0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,108,246,0.1) 0%, transparent 70%)",
        }}
      />

      {/* ── Pulsing neon rings ── */}
      {isDark && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-ring-pulse-1" style={{
            border: "1px solid rgba(77,208,255,0.08)",
            boxShadow: "0 0 60px rgba(77,208,255,0.06), inset 0 0 60px rgba(77,208,255,0.03)",
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full animate-ring-pulse-2" style={{
            border: "1px solid rgba(124,108,246,0.05)",
            boxShadow: "0 0 80px rgba(124,108,246,0.04)",
          }} />
        </>
      )}

      {/* ── Light beams ── */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-[-50%] left-[20%] w-[200px] h-[200%] animate-beam-rotate origin-bottom" style={{
            background: "linear-gradient(to bottom, rgba(77,208,255,0.15), transparent 80%)",
            filter: "blur(20px)",
            transform: "rotate(15deg)",
          }} />
          <div className="absolute top-[-50%] right-[25%] w-[150px] h-[200%] animate-beam-rotate-reverse origin-bottom" style={{
            background: "linear-gradient(to bottom, rgba(124,108,246,0.12), transparent 80%)",
            filter: "blur(25px)",
            transform: "rotate(-10deg)",
          }} />
        </div>
      )}

      {/* ── Circuit grid ── */}
      {isDark && (
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#4dd0ff" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="gridFade">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="gridMask">
              <rect width="100%" height="100%" fill="url(#gridFade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
        </svg>
      )}

      {/* ── Neon scan lines ── */}
      {[25, 45, 65, 85].map((top, i) => (
        <div
          key={top}
          className={`absolute left-0 right-0 h-px ${i % 2 === 0 ? "animate-scan-line" : "animate-scan-line-reverse"}`}
          style={{
            top: `${top}%`,
            background: `linear-gradient(90deg, transparent 5%, ${isDark ? "rgba(77,208,255,0.4)" : "rgba(56,189,248,0.15)"} 30%, ${isDark ? "rgba(124,108,246,0.3)" : "rgba(124,108,246,0.1)"} 70%, transparent 95%)`,
            opacity: isDark ? 0.5 + i * 0.1 : 0.2,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}

      {/* ── Sound wave layers ── */}
      {[8, 15].map((bottom, i) => (
        <svg
          key={bottom}
          className="absolute left-0 w-full"
          style={{ bottom: `${bottom}%`, opacity: isDark ? 0.15 + i * 0.05 : 0.08, height: "60px" }}
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={`M0,40 C120,${10 + i * 5} 240,${70 - i * 5} 360,40 S600,${10 + i * 5} 720,40 S960,${70 - i * 5} 1080,40 S1320,${10 + i * 5} 1440,40`}
            stroke={i === 0 ? (isDark ? "#4dd0ff" : "#38bdf8") : (isDark ? "#7c6cf6" : "#a78bfa")}
            strokeWidth={2 - i * 0.5}
            className={i === 0 ? "animate-wave-flow" : "animate-wave-flow-reverse"}
          />
        </svg>
      ))}

      {/* ── Floating decorative stars ── */}
      {[...Array(isDark ? 16 : 10)].map((_, i) => {
        const colors = isDark
          ? ["#facc15", "#4dd0ff", "#7c6cf6", "#22c55e", "#ec4899", "#67e8f9"]
          : ["#facc15", "#7c6cf6", "#38bdf8", "#ec4899", "#22c55e", "#6366f1"];
        const size = 10 + (i % 4) * 6;
        return (
          <div
            key={i}
            className="absolute animate-star-float"
            style={{
              left: `${5 + (i * 6.2) % 90}%`,
              top: `${8 + (i * 7.3) % 85}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3.5 + (i % 5) * 0.8}s`,
              filter: isDark ? `drop-shadow(0 0 ${4 + i % 3 * 2}px ${colors[i % colors.length]})` : "none",
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24">
              <path
                d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z"
                fill={colors[i % colors.length]}
                opacity={isDark ? 0.5 + (i % 3) * 0.15 : 0.35}
              />
            </svg>
          </div>
        );
      })}

      {/* ── Light theme: floating bubbles ── */}
      {!isDark && [...Array(8)].map((_, i) => (
        <div
          key={`bubble-${i}`}
          className="absolute rounded-full animate-star-float"
          style={{
            left: `${10 + i * 11}%`,
            top: `${20 + (i % 4) * 18}%`,
            width: `${20 + (i % 3) * 15}px`,
            height: `${20 + (i % 3) * 15}px`,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${["rgba(124,108,246,0.25)", "rgba(56,189,248,0.25)", "rgba(236,72,153,0.2)", "rgba(34,197,94,0.2)"][i % 4]})`,
            border: "1px solid rgba(255,255,255,0.5)",
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${5 + i}s`,
          }}
        />
      ))}

      {/* ── Edge vignette (lighter so colors show) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 35%, rgba(3,5,16,0.45) 100%)"
            : "radial-gradient(ellipse at center, transparent 55%, rgba(180,190,220,0.12) 100%)",
        }}
      />

      {/* ── Top/bottom neon edge glow ── */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 right-0 h-48" style={{
            background: "linear-gradient(to bottom, rgba(77,208,255,0.12), rgba(124,108,246,0.06), transparent)",
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{
            background: "linear-gradient(to top, rgba(124,108,246,0.14), rgba(34,197,94,0.06), transparent)",
          }} />
        </>
      )}

      {/* ── Noise ── */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: isDark ? 0.04 : 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Canvas layers */}
      <canvas ref={bokehRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
