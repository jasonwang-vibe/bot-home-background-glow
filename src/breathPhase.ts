/** Shared breath timing — kept in sync between avatar dots and breath glow background. */
export const BREATH_RATE = 0.0009;

export function advanceBreathPhase(phase: number, dt: number, speed: number): number {
  return phase + dt * BREATH_RATE * speed;
}

/** Unified dot scale while breathing (~0.45 exhale … 1.0 inhale at 1× speed). */
export function breathScale(phase: number): number {
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(phase));
}

/** 0 at exhale, 1 at inhale — drives ambient glow intensity. */
export function breathGlow(phase: number): number {
  return (breathScale(phase) - 0.45) / 0.55;
}
