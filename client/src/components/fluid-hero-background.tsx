import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity;   // 0..1 — overall color punch
uniform float uSpeed;       // time multiplier
uniform float uDetail;      // 0..1 — texture detail (drives octave count blend)

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Lower-octave fbm — softer, less busy than the original 5-octave version
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);

  float t = uTime * uSpeed;

  // Domain warping for fluid distortion (single-pass, less detail)
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t),
                fbm(p + vec2(5.2, 1.3) - t * 0.5));

  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.4),
                fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.3));

  float n = fbm(p + 2.5 * r);
  n = n * 0.5 + 0.5;

  // Brand palette
  vec3 black     = vec3(0.020, 0.020, 0.024);
  vec3 purple    = vec3(0.549, 0.322, 1.000);
  vec3 deepBlue  = vec3(0.067, 0.110, 0.290);
  vec3 coolBlue  = vec3(0.227, 0.525, 1.000);
  vec3 aqua      = vec3(0.133, 0.882, 1.000);
  vec3 silver    = vec3(0.910, 0.933, 0.961);

  // Calmer color stack — narrower bands, less aqua/silver pop
  vec3 col = black;
  col = mix(col, deepBlue,  smoothstep(0.35, 0.75, n) * uIntensity);
  col = mix(col, purple,    smoothstep(0.55, 0.85, n) * 0.65 * uIntensity);
  col = mix(col, coolBlue,  smoothstep(0.50, 0.70, length(q)) * 0.20 * uIntensity);
  col = mix(col, aqua,      smoothstep(0.78, 0.96, length(r)) * 0.12 * uIntensity);

  // Subtle gloss highlight — pulled back from 0.45 → 0.20
  float gloss = pow(smoothstep(0.82, 0.97, n), 3.0);
  col = mix(col, silver, gloss * 0.20 * uIntensity);

  // Soft radial fade so the effect bleeds toward dark at the edges
  float vig = smoothstep(1.30, 0.30, length(p));
  col *= 0.45 + 0.55 * vig;

  // Slight grain to avoid banding on dark areas
  float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.010;
  col += grain;

  col = max(col, black * 0.85);

  gl_FragColor = vec4(col, 1.0);
}
`;

interface FluidHeroBackgroundProps {
  className?: string;
  /** When true, renders a calmer, softer version intended for use inside a contained card */
  subtle?: boolean;
}

export default function FluidHeroBackground({ className = "", subtle = false }: FluidHeroBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: Renderer | null = null;
    let program: Program | null = null;
    let mesh: Mesh | null = null;
    let rafId = 0;
    let running = true;
    let visible = true;
    const startTime = performance.now();
    let pausedTime = 0;
    let pauseStart = 0;

    try {
      renderer = new Renderer({
        alpha: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
    } catch (e) {
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0.02, 0.02, 0.024, 1);
    container.appendChild(gl.canvas);
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [container.clientWidth, container.clientHeight] },
        uIntensity: { value: subtle ? 0.85 : 1.0 },
        uSpeed: { value: subtle ? 0.022 : 0.06 },
        uDetail: { value: subtle ? 0.6 : 1.0 },
      },
    });
    mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      if (!renderer || !program) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const render = () => {
      if (!running || !visible || !renderer || !program || !mesh) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const now = performance.now();
      program.uniforms.uTime.value = (now - startTime - pausedTime) / 1000;
      renderer.render({ scene: mesh });
      rafId = requestAnimationFrame(render);
    };

    if (reduced) {
      program.uniforms.uTime.value = 4.2;
      renderer.render({ scene: mesh });
    } else {
      rafId = requestAnimationFrame(render);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!visible) {
              pausedTime += performance.now() - pauseStart;
            }
            visible = true;
          } else {
            if (visible) pauseStart = performance.now();
            visible = false;
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onVis = () => {
      if (document.hidden) {
        if (running) pauseStart = performance.now();
        running = false;
      } else {
        if (!running) pausedTime += performance.now() - pauseStart;
        running = true;
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      try {
        const ext = gl.getExtension("WEBGL_lose_context");
        ext?.loseContext();
      } catch {}
      if (gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, [subtle]);

  // Soft radial mask so the canvas feathers into the surrounding dark background
  // instead of ending in a hard rectangle inside the card
  const maskStyle = subtle
    ? {
        WebkitMaskImage:
          "radial-gradient(ellipse 75% 75% at 50% 45%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)",
        maskImage:
          "radial-gradient(ellipse 75% 75% at 50% 45%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)",
      }
    : {};

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        background:
          "radial-gradient(60% 80% at 30% 30%, rgba(140,82,255,0.14) 0%, transparent 60%), radial-gradient(50% 70% at 75% 70%, rgba(58,134,255,0.10) 0%, transparent 65%), #050506",
        ...maskStyle,
      }}
      data-testid="fluid-hero-background"
    />
  );
}
