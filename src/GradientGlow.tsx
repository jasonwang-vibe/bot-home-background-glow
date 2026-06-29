import { useEffect, useRef } from "react";
import {
  createGradientGlow,
  DEFAULT_CONFIG,
  toRgb,
  type GlowConfig,
  type GlowController,
  type GlowMode,
  type RGB,
} from "./glowEngine";

export interface GradientGlowProps {
  /** Master on/off. Default true. */
  enabled?: boolean;
  /** `breath` (default) or `organic` drifting blobs. */
  mode?: GlowMode;
  /** Upper bound of the breathing glow intensity, 0..1. Default 0.9. */
  maxIntensity?: number;
  /** Lower bound of the breathing glow intensity, 0..1. Default 0.25. */
  minIntensity?: number;
  /** Seconds for one full min↔max intensity breath (organic mode). Default 12. */
  intensityCycleSec?: number;
  /** Drift-speed multiplier (organic mode). Default 3.2. */
  speed?: number;
  /** 0 = focused glow, 1 = fills the frame (organic mode). Default 0. */
  area?: number;
  /** Vertical focus of the glow, 0 (top) … 1 (bottom). Default ~0.767. */
  focusY?: number;
  /** Glow colours for organic mode — hex strings or `[r,g,b]` triples. */
  palette?: Array<string | RGB>;
  /** Pulse with shared breath tempo (breath mode). Default true. */
  breathSync?: boolean;
  /** Breath-speed multiplier (breath mode). Default 1. */
  breathSpeed?: number;
  /**
   * External breath phase in radians — pass to sync with dot-matrix or avatar.
   * When set, internal breath timing is overridden.
   */
  breathPhase?: number | null;
  /** Freeze on a static frame for `prefers-reduced-motion`. Default true. */
  respectReducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaHidden?: boolean;
}

/**
 * Animated home-screen background glow, rendered to a <canvas> that fills its
 * parent. Defaults to the midnight breath halo synced with the dot-matrix tempo.
 */
export function GradientGlow({
  enabled = DEFAULT_CONFIG.enabled,
  mode = DEFAULT_CONFIG.mode,
  maxIntensity = DEFAULT_CONFIG.maxIntensity,
  minIntensity = DEFAULT_CONFIG.minIntensity,
  intensityCycleSec = DEFAULT_CONFIG.intensityCycleSec,
  speed = DEFAULT_CONFIG.speed,
  area = DEFAULT_CONFIG.area,
  focusY = DEFAULT_CONFIG.focusY,
  palette,
  breathSync = DEFAULT_CONFIG.breathSync,
  breathSpeed = DEFAULT_CONFIG.breathSpeed,
  breathPhase = null,
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
  const paletteKey = resolvedPalette
    ? resolvedPalette.map((c) => c.join(",")).join("|")
    : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = createGradientGlow(canvas);
    controllerRef.current = controller;

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
      if (frozen) return;
      raf = requestAnimationFrame(loop);
    };

    const evaluateMotion = () => {
      frozen = !!(respectReducedMotion && mq?.matches);
      cancelAnimationFrame(raf);
      if (frozen) {
        controller.draw(0);
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

  useEffect(() => {
    const patch: Partial<GlowConfig> = {
      enabled,
      mode,
      maxIntensity,
      minIntensity,
      intensityCycleSec,
      speed,
      area,
      focusY,
      breathSync,
      breathSpeed,
    };
    if (resolvedPalette) patch.palette = resolvedPalette;
    controllerRef.current?.update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled, mode, maxIntensity, minIntensity, intensityCycleSec,
    speed, area, focusY, breathSync, breathSpeed, paletteKey,
  ]);

  useEffect(() => {
    controllerRef.current?.setBreathPhase(breathPhase ?? null);
  }, [breathPhase]);

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
