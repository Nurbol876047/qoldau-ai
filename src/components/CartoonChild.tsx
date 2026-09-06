"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface CartoonChildProps {
  size?: number;
  className?: string;
  speaking?: boolean;
}

export default function CartoonChild({ size = 320, className = "", speaking = true }: CartoonChildProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size * 1.25 }}>
      {/* Character glow */}
      <div
        className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full animate-glow-pulse"
        style={{
          background: "radial-gradient(ellipse, rgba(77,208,255,0.35) 0%, rgba(124,108,246,0.15) 50%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Ground shadow */}
      <div
        className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[55%] h-[12px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)" }}
      />

      {/* 3D mascot image */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="relative z-10 w-full h-full"
      >
        <Image
          src="/mascot-boy.png"
          alt="Qoldau AI маскот — балалар кейіпкері"
          width={size}
          height={Math.round(size * 1.25)}
          priority
          className="w-full h-full object-contain object-bottom drop-shadow-[0_20px_40px_rgba(77,208,255,0.25)]"
          style={{
            filter: "brightness(1.05) contrast(1.02)",
          }}
        />
      </motion.div>

      {/* Speech sound waves */}
      {speaking && (
        <div className="absolute top-[22%] right-[8%] flex items-end gap-0.5 z-20">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-accent"
              animate={{ height: [3, 10 + i * 2, 3] }}
              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.08, ease: "easeInOut" }}
              style={{ boxShadow: "0 0 8px rgba(77,208,255,0.7)" }}
            />
          ))}
        </div>
      )}

      {/* Sparkle accents */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-gold z-20 pointer-events-none"
          style={{
            left: `${8 + i * 22}%`,
            top: `${5 + (i % 2) * 12}%`,
            fontSize: `${10 + i * 3}px`,
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
          transition={{ repeat: Infinity, duration: 2 + i * 0.4, delay: i * 0.5 }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}
