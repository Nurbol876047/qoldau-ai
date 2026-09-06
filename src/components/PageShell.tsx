"use client";

import React from "react";
import AnimatedBackground from "./AnimatedBackground";

interface PageShellProps {
  theme?: "dark" | "light";
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ theme = "dark", children, className = "" }: PageShellProps) {
  return (
    <div className={`theme-${theme} page-bg min-h-screen flex flex-col relative ${className}`}>
      <AnimatedBackground theme={theme} />
      {children}
    </div>
  );
}
