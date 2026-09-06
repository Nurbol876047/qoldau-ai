"use client";

import React from "react";

interface WaveformBarsProps {
  active?: boolean;
  barCount?: number;
  className?: string;
}

export default function WaveformBars({ active = false, barCount = 12, className = "" }: WaveformBarsProps) {
  return (
    <div className={`waveform ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: active ? `${20 + Math.random() * 28}px` : "8px",
            animationDelay: `${i * 0.08}s`,
            animationPlayState: active ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}
