/**
 * Vibe — organic flowing gradient glow (framework-agnostic canvas engine).
 *
 * Several large, soft radial "blobs" drift on slow looping paths and are
 * composited with a `screen` blend over a pure-black base, giving a subtle,
 * living blue/purple glow. Ported verbatim from the Vibe Bot home-screen
 * prototype (js/background.js) — the drawing math is unchanged; only the
 * canvas backing-store sizing was generalised from the device's fixed 960×960
 * panel to a responsive, devicePixelRatio-aware buffer so it stays crisp at
 * any size in a normal web layout.
 *
 * No dependencies. Drawing is done in logical (CSS-pixel) units.
 */

export type RGB = [number, number, number];

export interface GlowConfig {
  /** Master on/off. When false, draw() paints a black frame. Default true. */
  enabled: boolean;
  /** Upper bound of the breathing intensity, 0..1. Default 0.6. */
  maxIntensity: number;
  /** Lower bound of the breathing intensity, 0..1. Default 0.25. */
  minIntensity: number;
  /** Seconds for one full min↔max intensity breath. Default 12. */
  intensityCycleSec: number;
  /** Drift-speed multiplier. The shipped prototype default is 3.2. */
  speed: number;
  /**
   * 0 = glow concentrates around `focusY` (the prototype's avatar-focused
   * look); 1 = blobs grow and recentre to fill the whole frame. Default 0.
   */
  area: number;
  /**
   * Vertical focus point of the glow as a fraction of height (0 = top,
   * 1 = bottom). The prototype centres the glow on the avatar at 368/480 ≈
   * 0.767. Default 0.7667.
   */
  focusY: number;
  /** Colours the glow slowly cycles through (1–5 recommended). */
  palette: RGB[];
}

/** Blob layout: colour, radius and drift amplitude/speed/phase (all relative). */
const BLOBS = [
  { color: [38, 70, 180] as RGB, r: 0.95, ax: 0.3, ay: 0.22, sx: 0.13, sy: 0.09, ph: 0.0 },
  { color: [70, 46, 150] as RGB, r: 0.84, ax: 0.27, ay: 0.3, sx: 0.09, sy: 0.14, ph: 1.7 },
  { color: [24, 96, 170] as RGB, r: 0.74, ax: 0.34, ay: 0.24, sx: 0.16, sy: 0.11, ph: 3.1 },
  { color: [96, 60, 190] as RGB, r: 0.66, ax: 0.24, ay: 0.27, sx: 0.11, sy: 0.16, ph: 4.6 },
  { color: [30, 120, 200] as RGB, r: 0.56, ax: 0.32, ay: 0.32, sx: 0.18, sy: 0.13, ph: 5.9 },
];

/** The prototype's default palette (matches the deep blue/indigo/violet/cyan blobs). */
export const DEFAULT_PALETTE: RGB[] = BLOBS.map((b) => [...b.color] as RGB);

export const DEFAULT_CONFIG: GlowConfig = {
  enabled: true,
  maxIntensity: 0.6,
  minIntensity: 0.25,
  intensityCycleSec: 12,
  speed: 3.2,
  area: 0,
  focusY: 368 / 480,
  palette: DEFAULT_PALETTE,
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
  /** Render one frame. `tMs` is a timestamp in ms (e.g. the rAF argument). */
  draw(tMs: number): void;
  /** Re-measure the canvas and rebuild the backing store. Call on resize. */
  resize(): void;
  /** Patch any subset of the config. */
  update(patch: Partial<GlowConfig>): void;
  /** Current resolved config (read-only snapshot). */
  getConfig(): GlowConfig;
}

/**
 * Create a glow controller bound to a <canvas>. You own the animation loop:
 * call `resize()` once up front (and on container resize), then `draw(t)` each
 * frame. See GradientGlow.tsx for a React wrapper that does this for you.
 */
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

  // colour for blob i at cycle phase `cyc`, easing slowly through the palette
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
    // Backing store at device resolution; draw in logical CSS pixels.
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx!.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    R = Math.min(W, H) / 2;
  }

  function draw(t: number): void {
    // base wash — pure black so the glow colours stay clean (no grey haze)
    ctx!.globalCompositeOperation = "source-over";
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);

    // breathing intensity: oscillate min↔max over the cycle (smooth cosine)
    const lo = Math.min(cfg.minIntensity, cfg.maxIntensity);
    const hi = Math.max(cfg.minIntensity, cfg.maxIntensity);
    const cycleMs = Math.max(1, cfg.intensityCycleSec) * 1000;
    const phase = (1 - Math.cos((t / cycleMs) * Math.PI * 2)) / 2; // 0..1
    const intensity = lo + (hi - lo) * phase;

    if (!cfg.enabled || hi <= 0.001) return;

    // glow blobs — "screen" blend keeps overlaps vivid instead of muddy
    ctx!.globalCompositeOperation = "screen";
    const time = t * 0.00024 * cfg.speed;
    const cyc = t * 0.00004; // slow colour-cycle through the palette
    const cx = W / 2;
    const cy = H / 2;

    // flow area: grows blobs + drift and recentres from focusY toward centre
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
      // tighter falloff → a defined glow core instead of a broad foggy wash
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.38, `rgba(${cr},${cg},${cb},${a * 0.38})`);
      g.addColorStop(0.7, `rgba(${cr},${cg},${cb},${a * 0.08})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(x, y, rr, 0, Math.PI * 2);
      ctx!.fill();
    }

    // soft vignette to keep the rim dark
    ctx!.globalCompositeOperation = "source-over";
    const vig = ctx!.createRadialGradient(cx, cy, R * (0.72 + area * 0.2), cx, cy, R);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${(0.92 - area * 0.5).toFixed(3)})`);
    ctx!.fillStyle = vig;
    ctx!.fillRect(0, 0, W, H);
  }

  resize();

  return {
    draw,
    resize,
    update: (patch) => Object.assign(cfg, patch),
    getConfig: () => ({ ...cfg }),
  };
}
