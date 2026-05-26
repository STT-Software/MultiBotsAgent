"use client";

import { useEffect, useState } from 'react';

export default function BackgroundEffects() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
      {/* Dynamic Mouse Spotlight with glowing Emerald hue */}
      <div
        className="absolute inset-0 transition-opacity duration-300 opacity-30 md:opacity-50"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.07), transparent 80%)`,
        }}
      />

      {/* Primary Cybernetic Stationary Grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Secondary Animated Cybernetic Traveling Grid (Continuous flow down) */}
      <div className="absolute inset-0 opacity-[0.03] animate-grid-travel"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(20, 184, 166, 0.15) 1px, transparent 1px),
            linear-gradient(to right, rgba(20, 184, 166, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Floating Ambient Glowing Blobs across various heights */}
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[120px] animate-float-slow" />
      <div className="absolute top-[40%] right-[10%] w-[550px] h-[550px] rounded-full bg-teal-500/4 blur-[130px] animate-float-medium" />
      <div className="absolute bottom-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-blue-500/3 blur-[120px] animate-float-slow" />
    </div>
  );
}
