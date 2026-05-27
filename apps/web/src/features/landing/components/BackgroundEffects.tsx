"use client";

import { useEffect, useRef, useState } from 'react';

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  // Ruido pseudo-aleatorio 2D de gradiente
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  // Fractal Brownian Motion (FBM) para dar detalle al fluido
  #define OCTAVES 4
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < OCTAVES; i++) {
      value += amplitude * noise(p * frequency);
      p = p * 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Corregir aspecto para evitar estiramientos
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv;
    p.x *= aspect;
    
    // Velocidad de simulación del fluido
    float t = u_time * 0.045;
    
    // Interacción del mouse con el fluido
    vec2 mouseWebGL = u_mouse;
    mouseWebGL.x *= aspect;
    vec2 mouseForce = vec2(0.0);
    
    if (u_mouse.x > -2.0) {
      float distToMouse = distance(p, mouseWebGL);
      // El mouse empuja y deforma localmente el fluido
      float force = smoothstep(0.45, 0.0, distToMouse);
      mouseForce = normalize(p - mouseWebGL) * force * 0.12;
    }
    
    // Domain Warping: El espacio se distorsiona iterativamente con FBM
    // Primera capa de distorsión (q)
    vec2 q = vec2(
      fbm(p * 2.2 + mouseForce + vec2(0.0, 0.0) + t * 0.9),
      fbm(p * 2.2 + mouseForce + vec2(5.2, 1.3) + t * 0.6)
    );
    
    // Segunda capa de distorsión basándose en la primera (r)
    vec2 r = vec2(
      fbm(p * 2.2 + mouseForce + 4.0 * q + vec2(1.7, 9.2) + t * 1.1),
      fbm(p * 2.2 + mouseForce + 4.0 * q + vec2(8.3, 2.8) + t * 0.8)
    );
    
    // El resultado final del patrón de fluido (ruido distorsionado FBM)
    float f = fbm(p * 1.8 + 4.0 * r);
    
    // Paleta de colores cyber/degradado fluido premium
    vec3 baseColor   = vec3(0.005, 0.012, 0.04);  // Fondo espacial azul-negro muy oscuro
    vec3 cyanColor   = vec3(0.02, 0.28, 0.45);    // Cian/Azul cibernético profundo
    vec3 violetColor = vec3(0.18, 0.12, 0.42);    // Púrpura/Índigo cósmico suave
    vec3 emeraldColor = vec3(0.02, 0.35, 0.25);   // Verde esmeralda cibernético
    
    // Mezclamos los colores basados en la distorsión del fluido (f, q, r)
    // Esto crea vetas e hilos de luz de diferentes tonalidades que se entrelazan de forma definida
    vec3 color = baseColor;
    color = mix(color, cyanColor, clamp(f * 1.8, 0.0, 1.0));
    color = mix(color, violetColor, clamp(length(q) * 1.3, 0.0, 1.0) * 0.45);
    color = mix(color, emeraldColor, clamp(r.y * 1.6, 0.0, 1.0) * 0.35);
    
    // Añadir un sutil brillo interactivo adicional cerca del mouse
    if (u_mouse.x > -2.0) {
      float spot = smoothstep(0.3, 0.0, distance(p, mouseWebGL));
      color += cyanColor * (spot * 0.15);
    }
    
    // Limitar brillo para conservar contraste con los textos del frontend
    color = color * 0.75;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;        // Opacidad actual para el efecto fade-in
  targetAlpha: number;  // Opacidad real final asignada
  colorType: 'emerald' | 'teal' | 'cyan';
}

export default function BackgroundEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 }); // Coordenadas en píxeles para fallback/spotlight
  const [webglFailed, setWebglFailed] = useState(false);
  const [webglOpacity, setWebglOpacity] = useState(0); // Inicia en 0 para revelar suavemente el color sólido de fondo
  
  const animationFrameId = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);

  // Transición suave cinematográfica de entrada para el fluido WebGL al entrar
  useEffect(() => {
    const timer = setTimeout(() => {
      setWebglOpacity(0.65);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Escuchar posición del mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      setMousePos(pos);
      mouseRef.current = pos;
    };

    const handleMouseLeave = () => {
      const pos = { x: -1000, y: -1000 };
      setMousePos(pos);
      mouseRef.current = pos;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Inicializar WebGL y Constelación 2D con optimización e IntersectionObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const particlesCanvas = particlesCanvasRef.current;
    if (!canvas || !particlesCanvas) return;

    const gl = canvas.getContext('webgl', { 
      alpha: false, 
      depth: false, 
      stencil: false, 
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power"
    });

    if (!gl) {
      console.warn("WebGL no soportado, usando fallback CSS.");
      setWebglFailed(true);
      return;
    }

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compilando shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(VERTEX_SHADER_SOURCE, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(FRAGMENT_SHADER_SOURCE, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      setWebglFailed(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglFailed(true);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Error linkeando programa WebGL:", gl.getProgramInfoLog(program));
      setWebglFailed(true);
      return;
    }

    gl.useProgram(program);

    // Buffer de posición
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");

    // Lógica e inicialización del canvas 2D de partículas
    const ctx = particlesCanvas.getContext('2d');
    if (!ctx) return;

    // Aumentamos a 110 partículas para una constelación densa y llena de conexiones
    const PARTICLE_COUNT = 110;
    
    const initParticles = (_w: number, _h: number) => {
      // Comenzamos con la red vacía para que se vaya poblando dinámicamente
      particlesRef.current = [];
    };

    let animationActive = true;
    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;
      
      // Escalado WebGL a 0.65x (un poco más alto para mejorar definición del fluido sin penalizar performance)
      const renderScale = 0.65;
      width = Math.floor(displayWidth * renderScale);
      height = Math.floor(displayHeight * renderScale);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      // Escalado Canvas 2D a 1x para mantener la constelación nítida
      if (particlesCanvas.width !== displayWidth || particlesCanvas.height !== displayHeight) {
        particlesCanvas.width = displayWidth;
        particlesCanvas.height = displayHeight;
        initParticles(displayWidth, displayHeight);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Loop de render
    const startTime = performance.now();
    let frameCount = 0;
    
    const render = () => {
      if (!animationActive) return;

      const currentTime = (performance.now() - startTime) * 0.001;
      const mouse = mouseRef.current;

      // 1. Renderizar WebGL (Fluido de fondo)
      const normalizedMouseX = mouse.x !== -1000 ? mouse.x / window.innerWidth : -10.0;
      const normalizedMouseY = mouse.x !== -1000 ? (window.innerHeight - mouse.y) / window.innerHeight : -10.0;

      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(mouseLocation, normalizedMouseX, normalizedMouseY);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // 2. Renderizar Canvas 2D (Red Neuronal de Agentes)
      const w2d = particlesCanvas.width;
      const h2d = particlesCanvas.height;
      ctx.clearRect(0, 0, w2d, h2d);

      const particles = particlesRef.current;
      
      // Poblado suave: añadir un nodo cada 5 frames hasta alcanzar el límite
      frameCount++;
      if (particles.length < PARTICLE_COUNT && frameCount % 5 === 0) {
        const colors: ('emerald' | 'teal' | 'cyan')[] = ['emerald', 'teal', 'cyan'];
        particles.push({
          x: Math.random() * w2d,
          y: Math.random() * h2d,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: Math.random() * 2.2 + 1.2,
          alpha: 0, // Nace invisible
          targetAlpha: Math.random() * 0.45 + 0.25, // Destino de brillo
          colorType: colors[Math.floor(Math.random() * 3)],
        });
      }
      
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        // Transición de fade-in para la aparición suave del nodo
        if (p1.alpha < p1.targetAlpha) {
          p1.alpha += (p1.targetAlpha - p1.alpha) * 0.04;
          if (p1.alpha > p1.targetAlpha) p1.alpha = p1.targetAlpha;
        }
        
        // Movimiento base
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Rebotes en los bordes
        if (p1.x < 0 || p1.x > w2d) p1.vx *= -1;
        if (p1.y < 0 || p1.y > h2d) p1.vy *= -1;

        // Interacción física con el mouse: atracción suave
        if (mouse.x !== -1000) {
          const dx = mouse.x - p1.x;
          const dy = mouse.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            // Atracción magnética sutil proporcional a la proximidad
            const force = (200 - dist) / 200;
            p1.x += (dx / dist) * force * 0.45;
            p1.y += (dy / dist) * force * 0.45;
          }
        }

        // Obtener color según su tipo
        let fillColor = '';
        if (p1.colorType === 'emerald') fillColor = `rgba(16, 185, 129, ${p1.alpha})`;
        else if (p1.colorType === 'teal') fillColor = `rgba(20, 184, 166, ${p1.alpha})`;
        else fillColor = `rgba(6, 182, 212, ${p1.alpha})`;

        // Dibujar el nodo (agente) con un sutil efecto de resplandor glow
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        
        // Añadir brillo a las partículas más grandes
        if (p1.size > 2.0) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p1.colorType === 'emerald' ? '#10b981' : p1.colorType === 'teal' ? '#14b8a6' : '#06b6d4';
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Resetear para que no afecte a las líneas

        // 1. Encontrar el vecino más cercano para asegurar que no haya puntos sueltos
        let minDist = Infinity;
        let nearestIndex = -1;

        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < minDist) {
            minDist = dist;
            nearestIndex = j;
          }
        }

        // Trazar conexión obligatoria con el vecino más cercano
        if (nearestIndex !== -1) {
          const pNearest = particles[nearestIndex];
          const dist = minDist;
          const lineAlpha = dist < 190 
            ? (190 - dist) / 190 * 0.15 
            : Math.max(0.04, (350 - dist) / 350 * 0.08); // Hilo más tenue si está lejos
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(pNearest.x, pNearest.y);
          ctx.strokeStyle = `rgba(20, 184, 166, ${lineAlpha})`;
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }

        // 2. Buscar conexiones adicionales por proximidad (con otros nodos a menos de 190px)
        for (let j = i + 1; j < particles.length; j++) {
          if (j === nearestIndex) continue; // Ya conectado
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 190) {
            const lineAlpha = (190 - dist) / 190 * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(20, 184, 166, ${lineAlpha})`;
            ctx.lineWidth = 0.45;
            ctx.stroke();
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    // Pausar si no es visible para optimizar recursos del sistema
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!animationActive) {
            animationActive = true;
            animationFrameId.current = requestAnimationFrame(render);
          }
        } else {
          animationActive = false;
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
          }
        }
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      animationActive = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      observer.disconnect();
      
      // Cleanup WebGL
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [webglFailed]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
      {/* Capa base WebGL o Fallback de gradiente estático / animado por CSS si WebGL falla */}
      {webglFailed ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#091b3a] to-[#020617] bg-[length:300%_300%] animate-gradient-flow" />
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[4000ms] ease-out"
          style={{ 
            opacity: webglOpacity,
            filter: 'blur(3px)' 
          }} // Inicia opaco (color sólido de fondo) y se va fundiendo en 4 segundos
        />
      )}

      {/* Capa 2D: Red Neuronal de Agentes (Constelación Interactiva) */}
      {!webglFailed && (
        <canvas
          ref={particlesCanvasRef}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Dynamic Mouse Spotlight con tono esmeralda brillante (encima de la capa de fluido) */}
      <div
        className="absolute inset-0 transition-opacity duration-300 opacity-20 md:opacity-40"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.07), transparent 80%)`,
        }}
      />

      {/* Cuadrícula cibernética primaria fija */}
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
      
      {/* Cuadrícula cibernética secundaria en movimiento (Flujo continuo hacia abajo) */}
      <div className="absolute inset-0 opacity-[0.03] animate-grid-travel"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(20, 184, 166, 0.15) 1px, transparent 1px),
            linear-gradient(to right, rgba(20, 184, 166, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Fallback de orbes estáticos por si WebGL falla, para no perder profundidad */}
      {webglFailed && (
        <>
          <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[120px] animate-float-slow" />
          <div className="absolute top-[40%] right-[10%] w-[550px] h-[550px] rounded-full bg-teal-500/4 blur-[130px] animate-float-medium" />
          <div className="absolute bottom-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-blue-500/3 blur-[120px] animate-float-slow" />
        </>
      )}
    </div>
  );
}
