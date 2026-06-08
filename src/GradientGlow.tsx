import { useEffect, useRef } from "react";
import {
  createGradientGlow,
  DEFAULT_CONFIG,
  toRgb,
  type GlowConfig,
  type GlowController,
  type RGB,
} from "./glowEngine";

export interface GradientGlowProps {
  /** Master on/off. Default true. */
  enabled?: boolean;
  /** Upper bound of the breathing intensity, 0..1. Default 0.6. */
  maxIntensity?: number;
  /** Lower bound of the breathing intensity, 0..1. Default 0.25. */
  minIntensity?: number;
  /** Seconds for one full min↔max intensity breath. Default 12. */
  intensityCycleSec?: number;
  /** Drift-speed multiplier. Default 3.2 (matches the prototype). */
  speed?: number;
  /** 0 = focused glow, 1 = fills the frame. Default 0. */
  area?: number;
  /** Vertical focus of the glow, 0 (top) … 1 (bottom). Default ~0.767. */
  focusY?: number;
  /** Glow colours — hex strings (`#2646b4`) or `[r,g,b]` triples. 1–5. */
  palette?: Array<string | RGB>;
  /**
   * Freeze the animation on a single static frame when the user has
   * `prefers-reduced-motion: reduce`. Default true.
   */
  respectReducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Forwarded to the underlying <canvas> aria. Decorative by default. */
  ariaHidden?: boolean;
}

/**
 * Animated organic gradient-glow background, rendered to a <canvas> that fills
 * its parent. Drop it into any positioned container:
 *
 *   <div style={{ position: "relative" }}>
 *     <GradientGlow />
 *     <YourContent />
 *   </div>
 *
 * The canvas sizes itself to the container (ResizeObserver) and is crisp on
 * HiDPI displays. All props are live — changing them updates the animation in
 * place without remounting or restarting.
 */
export function GradientGlow({
  enabled = DEFAULT_CONFIG.enabled,
  maxIntensity = DEFAULT_CONFIG.maxIntensity,
  minIntensity = DEFAULT_CONFIG.minIntensity,
  intensityCycleSec = DEFAULT_CONFIG.intensityCycleSec,
  speed = DEFAULT_CONFIG.speed,
  area = DEFAULT_CONFIG.area,
  focusY = DEFAULT_CONFIG.focusY,
  palette,
  respectReducedMotion = true,
  className,
  style,
  ariaHidden = true,
}: GradientGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<GlowController | null>(null);

  const resolvedPalette: RGB[] | undefined = palette?.length
    ? palette.map(toRgb)
    : undefined;
  // Stable dependency key so the effect below only reruns when colours change.
  const paletteKey = resolvedPalette
    ? resolvedPalette.map((c) => c.join(",")).join("|")
    : "";

  // Create the controller + run the animation loop. Recreated only on mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = createGradientGlow(canvas);
    controllerRef.current = controller;

    // Keep the backing store matched to the element's box.
    const ro = new ResizeObserver(() => controller.resize());
    ro.observe(canvas);

    const mq =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let raf = 0;
    let frozen = false;

    const loop = (t: number) => {
      controller.draw(t);
      // When reduced motion is requested, draw one frame then stop.
      if (frozen) return;
      raf = requestAnimationFrame(loop);
    };

    const evaluateMotion = () => {
      frozen = !!(respectReducedMotion && mq?.matches);
      cancelAnimationFrame(raf);
      if (frozen) {
        controller.draw(0); // a single representative static frame
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    evaluateMotion();
    mq?.addEventListener?.("change", evaluateMotion);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq?.removeEventListener?.("change", evaluateMotion);
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respectReducedMotion]);

  // Push prop changes into the live controller (no remount).
  useEffect(() => {
    const patch: Partial<GlowConfig> = {
      enabled,
      maxIntensity,
      minIntensity,
      intensityCycleSec,
      speed,
      area,
      focusY,
    };
    if (resolvedPalette) patch.palette = resolvedPalette;
    controllerRef.current?.update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, maxIntensity, minIntensity, intensityCycleSec, speed, area, focusY, paletteKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden={ariaHidden}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}

export default GradientGlow;
