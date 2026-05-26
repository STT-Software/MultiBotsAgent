"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

interface VortexProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  speed?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseHue?: number;
  rangeHue?: number;
  backgroundColor?: string;
}

export const Vortex = (props: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const particleCount = props.particleCount || 700;
  const particlePropCount = 9;
  const particlePropsLength = particleCount * particlePropCount;
  const baseSpeed = props.baseSpeed || 0.0;
  const rangeSpeed = props.rangeSpeed || 1.5;
  const baseHue = props.baseHue || 160; // Default to emerald hue
  const rangeHue = props.rangeHue || 40;
  const backgroundColor = props.backgroundColor || "#030712";

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise3D = createNoise3D();
    let tick = 0;
    const particleProps = new Float32Array(particlePropsLength);

    const initParticle = (i: number, w: number, h: number) => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = 100 + Math.random() * 200;
      const speed = baseSpeed + Math.random() * rangeSpeed;
      const size = 0.5 + Math.random() * 2;
      const hue = baseHue + Math.random() * rangeHue;

      particleProps.set([x, y, vx, vy, life, ttl, speed, size, hue], i);
    };

    const drawParticle = (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      size: number,
      hue: number
    ) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = size;
      ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${1 - life / ttl})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const updateParticle = (i: number, w: number, h: number) => {
      let x = particleProps[i];
      let y = particleProps[i + 1];
      let vx = particleProps[i + 2];
      let vy = particleProps[i + 3];
      let life = particleProps[i + 4];
      const ttl = particleProps[i + 5];
      const speed = particleProps[i + 6];
      const size = particleProps[i + 7];
      const hue = particleProps[i + 8];

      const noise = noise3D(x * 0.003, y * 0.003, tick * 0.0015 * speed);
      const angle = noise * Math.PI * 2;
      const vx2 = Math.cos(angle) * speed;
      const vy2 = Math.sin(angle) * speed;

      // Vector interpolation
      vx = vx * 0.95 + vx2 * 0.05;
      vy = vy * 0.95 + vy2 * 0.05;

      const x2 = x + vx;
      const y2 = y + vy;

      drawParticle(x, y, x2, y2, life, ttl, size, hue);

      life++;

      particleProps[i] = x2;
      particleProps[i + 1] = y2;
      particleProps[i + 2] = vx;
      particleProps[i + 3] = vy;
      particleProps[i + 4] = life;

      if (life > ttl || x2 < 0 || x2 > w || y2 < 0 || y2 > h) {
        initParticle(i, w, h);
      }
    };

    const updateParticles = (w: number, h: number) => {
      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i, w, h);
      }
    };

    const drawBackground = (w: number, h: number) => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
    };

    const draw = (w: number, h: number) => {
      tick++;
      ctx.clearRect(0, 0, w, h);
      drawBackground(w, h);
      updateParticles(w, h);
    };

    // Resize Handling using ResizeObserver
    let width = 0;
    let height = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const entryWidth = Math.floor(entry.contentRect.width);
        const entryHeight = Math.floor(entry.contentRect.height);
        width = entryWidth;
        height = entryHeight;
        canvas.width = entryWidth;
        canvas.height = entryHeight;

        // Re-initialize particles when size changes to distribute them correctly
        for (let i = 0; i < particlePropsLength; i += particlePropCount) {
          initParticle(i, width, height);
        }
      }
    });

    resizeObserver.observe(container);

    // Initial sizes
    const rect = container.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
    canvas.width = width;
    canvas.height = height;

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i, width, height);
    }

    let animationFrameId: number;
    const render = () => {
      draw(width, height);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [particlePropsLength, baseSpeed, rangeSpeed, baseHue, rangeHue, backgroundColor]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", props.containerClassName)} ref={containerRef}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      <div className={cn("relative z-10 h-full w-full", props.className)}>{props.children}</div>
    </div>
  );
};
