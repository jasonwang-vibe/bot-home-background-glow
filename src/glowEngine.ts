/**
 * Vibe — home-screen background glow (framework-agnostic canvas engine).
 *
 * Two styles:
 *   • breath  — subtle dark blue/purple halo that pulses with the dot-matrix breath
 *   • organic — drifting colour blobs with their own slow intensity cycle
 *
 * Composited with a `screen` blend over pure black. Drawing is done in logical
 * (CSS-pixel) units; the backing store follows devicePixelRatio for crisp output.
 *
 * No dependencies.
 */

import { advanceBreathPhase, breathGlow } from "./breathPhase";

export type RGB = [number, number, number];
export type GlowMode = "breath" | "organic";

export interface GlowConfig {
  /** Master on/off. When false, draw() paints a black frame. Default true. */
  enabled: boolean;
  /** `breath` (default) or `organic` drifting blobs. */
  mode: GlowMode;
  /** Upper bound of the breathing glow intensity, 0..1. Default 0.6. */
  maxIntensity: number;
  /** Lower bound of the breathing glow intensity, 0..1. Default 0.25. */
  minIntensity: number;
  /** Seconds for one full min↔max intensity breath (organic mode). Default 12. */
  intensityCycleSec: number;
  /** Drift-speed multiplier (organic mode). Default 3.2. */
  speed: number;
  /**
   * 0 = glow concentrates around `focusY` (avatar-focused look);
   * 1 = blobs grow and recentre to fill the whole frame (organic mode). Default 0.
   */
  area: number;
  /**
   * Vertical focus point as a fraction of height (0 = top, 1 = bottom).
   * The prototype centres on the avatar at 368/480 ≈ 0.767. Default 0.7667.
   */
  focusY: number;
  /** Colours the organic glow slowly cycles through (1–5 recommended). */
  palette: RGB[];
  /** Pulse with shared breath tempo (breath mode). Default true. */
  breathSync: boolean;
  /** Breath-speed multiplier (breath mode). Default 1. */
  breathSpeed: number;
}

interface BreathHalo {
  color: RGB;
  r: number;
  weight: number;
}

/** Midnight breath halo — deep indigo core, navy wash, soft violet fringe. */
const MIDNIGHT_HALOS: BreathHalo[] = [
  { color: [38, 28, 98], r: 0.48, weight: 1.0 },
  { color: [28, 48, 128], r: 0.68, weight: 0.62 },
  { color: [58, 34, 128], r: 0.86, weight: 0.38 },
];

/** Blob layout for organic mode. */
const BLOBS = [
  { color: [38, 70, 180] as RGB, r: 0.95, ax: 0.3, ay: 0.22, sx: 0.13, sy: 0.09, ph: 0.0 },
  { color: [70, 46, 150] as RGB, r: 0.84, ax: 0.27, ay: 0.3, sx: 0.09, sy: 0.14, ph: 1.7 },
  { color: [24, 96, 170] as RGB, r: 0.74, ax: 0.34, ay: 0.24, sx: 0.16, sy: 0.11, ph: 3.1 },
  { color: [96, 60, 190] as RGB, r: 0.66, ax: 0.24, ay: 0.27, sx: 0.11, sy: 0.16, ph: 4.6 },
  { color: [30, 120, 200] as RGB, r: 0.56, ax: 0.32, ay: 0.32, sx: 0.18, sy: 0.13, ph: 5.9 },
];

export const DEFAULT_PALETTE: RGB[] = BLOBS.map((b) => [...b.color] as RGB);

export const DEFAULT_CONFIG: GlowConfig = {
  enabled: true,
  mode: "breath",
  maxIntensity: 0.6,
  minIntensity: 0.25,
  intensityCycleSec: 12,
  speed: 3.2,
  area: 0,
  focusY: 368 / 480,
  palette: DEFAULT_PALETTE,
  breathSync: true,
  breathSpeed: 1,
};

/** Parse `#rgb` / `#rrggbb` (or an `[r,g,b]` passthrough) into an RGB triple. */
export function toRgb(c: string | RGB): RGB {
  if (Array.isArray(c)) return [c[0], c[1], c[2]];
  let h = c.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface GlowController {
  draw(tMs: number): void;
  resize(): void;
  update(patch: Partial<GlowConfig>): void;
  /** Inject an external breath phase (radians) to sync with other elements. Pass null to resume internal timing. */
  setBreathPhase(phase: number | null): void;
  getConfig(): GlowConfig;
}

export function createGradientGlow(
  canvas: HTMLCanvasElement,
  initial: Partial<GlowConfig> = {},
): GlowController {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("createGradientGlow: 2D context unavailable");

  const cfg: GlowConfig = { ...DEFAULT_CONFIG, ...initial };
  let W = 0;
  let H = 0;
  let R = 0;
  let breathPhase = 0;
  let externalBreathPhase: number | null = null;
  let prevT = 0;

  function blobColor(i: number, cyc: number): RGB {
    const pal = cfg.palette.length ? cfg.palette : DEFAULT_PALETTE;
    const L = pal.length;
    if (L === 1) return pal[0];
    const p = ((((cyc + i / BLOBS.length) % 1) + 1) % 1) * L;
    const i0 = Math.floor(p) % L;
    const i1 = (i0 + 1) % L;
    const f = p - Math.floor(p);
    const a = pal[i0];
    const b = pal[i1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx!.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    R = Math.min(W, H) / 2;
  }

  function drawVignette(cx: number, cy: number, rimOpacity = 0.92): void {
    const area = clamp01(cfg.area);
    ctx!.globalCompositeOperation = "source-over";
    const vig = ctx!.createRadialGradient(cx, cy, R * (0.72 + area * 0.2), cx, cy, R);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${(rimOpacity - area * 0.5).toFixed(3)})`);
    ctx!.fillStyle = vig;
    ctx!.fillRect(0, 0, W, H);
  }

  function drawOrganic(t: number): void {
    const lo = Math.min(cfg.minIntensity, cfg.maxIntensity);
    const hi = Math.max(cfg.minIntensity, cfg.maxIntensity);
    const cycleMs = Math.max(1, cfg.intensityCycleSec) * 1000;
    const phase = (1 - Math.cos((t / cycleMs) * Math.PI * 2)) / 2;
    const intensity = lo + (hi - lo) * phase;

    if (!cfg.enabled || hi <= 0.001) return;

    ctx!.globalCompositeOperation = "screen";
    const time = t * 0.00024 * cfg.speed;
    const cyc = t * 0.00004;
    const cx = W / 2;
    const cy = H / 2;
    const area = clamp01(cfg.area);
    const aMul = 1 + area * 1.3;
    const driftMul = 1 + area * 0.6;
    const focusBaseY = H * cfg.focusY;
    const fx = W * 0.5;
    const fy = focusBaseY + (H * 0.5 - focusBaseY) * area;

    for (let i = 0; i < BLOBS.length; i++) {
      const b = BLOBS[i];
      const x = fx + Math.cos(time * (b.sx * 10) + b.ph) * (R * b.ax * driftMul);
      const y = fy + Math.sin(time * (b.sy * 10) + b.ph * 1.3) * (R * b.ay * driftMul);
      const radius = R * b.r * aMul;
      const breathe = 0.85 + 0.15 * Math.sin(time * 6 + b.ph * 2);
      const rr = radius * breathe;
      const col = blobColor(i, cyc);
      const cr = col[0] | 0;
      const cg = col[1] | 0;
      const cb = col[2] | 0;
      const a = 0.5 * intensity;
      const g = ctx!.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.38, `rgba(${cr},${cg},${cb},${a * 0.38})`);
      g.addColorStop(0.7, `rgba(${cr},${cg},${cb},${a * 0.08})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(x, y, rr, 0, Math.PI * 2);
      ctx!.fill();
    }

    drawVignette(cx, cy);
  }

  function drawBreath(t: number): void {
    const lo = Math.min(cfg.minIntensity, cfg.maxIntensity);
    const hi = Math.max(cfg.minIntensity, cfg.maxIntensity);
    if (!cfg.enabled || hi <= 0.001) return;

    if (!prevT) prevT = t;
    const dt = Math.min(100, t - prevT);
    prevT = t;

    const phase = externalBreathPhase ?? (cfg.breathSync
      ? (breathPhase = advanceBreathPhase(breathPhase, dt, cfg.breathSpeed))
      : breathPhase);
    const inhale = cfg.breathSync ? breathGlow(phase) : 0.12;
    const eased = inhale * inhale * (3 - 2 * inhale);
    const intensity = lo + (hi - lo) * eased;

    const fx = W * 0.5;
    const fy = H * cfg.focusY;
    const cx = W / 2;
    const cy = H / 2;
    const spread = 0.96 + 0.08 * eased;

    ctx!.globalCompositeOperation = "screen";
    for (const h of MIDNIGHT_HALOS) {
      const radius = R * h.r * spread;
      const g = ctx!.createRadialGradient(fx, fy, 0, fx, fy, radius);
      const [r, gr, bl] = h.color;
      const peak = 0.62 * intensity * h.weight;
      const floor = peak * 0.32;
      const a = floor + (peak - floor) * eased;
      g.addColorStop(0, `rgba(${r},${gr},${bl},${a})`);
      g.addColorStop(0.28, `rgba(${r},${gr},${bl},${a * 0.55})`);
      g.addColorStop(0.55, `rgba(${r},${gr},${bl},${a * 0.18})`);
      g.addColorStop(1, `rgba(${r},${gr},${bl},0)`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(fx, fy, radius, 0, Math.PI * 2);
      ctx!.fill();
    }

    drawVignette(cx, cy, 0.86);
  }

  function draw(t: number): void {
    ctx!.globalCompositeOperation = "source-over";
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);

    if (cfg.mode === "breath") drawBreath(t);
    else drawOrganic(t);
  }

  resize();

  return {
    draw,
    resize,
    update: (patch) => {
      if (patch.mode !== undefined && patch.mode !== cfg.mode) {
        prevT = 0;
        breathPhase = 0;
      }
      Object.assign(cfg, patch);
    },
    setBreathPhase: (phase) => { externalBreathPhase = phase; },
    getConfig: () => ({ ...cfg }),
  };
}
