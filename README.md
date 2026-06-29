# @vibe/gradient-glow

The home-screen background glow from the Vibe Bot, packaged as a self-contained
React component. Two styles:

- **Breath glow** (default) — a subtle midnight indigo/violet halo that pulses
  in sync with the dot-matrix breath tempo.
- **Organic gradient** — soft blue/purple radial blobs drift on slow looping
  paths, breathe in intensity, and cycle through a colour palette.

Both composited with a `screen` blend over pure black for a clean, living glow.

- **Zero runtime dependencies** (just a `<canvas>` and React).
- **Faithful port** of the Vibe Bot engine (`background.ts` / `breathPhase.ts`).
- **HiDPI-crisp & responsive** — sizes to its container via `ResizeObserver`
  and `devicePixelRatio`.
- **Live props** — every knob updates the running animation in place.
- Respects `prefers-reduced-motion` (freezes on a static frame).

## Install

This is delivered as source (TypeScript). Two ways to use it:

**A. Copy the files.** Drop `src/glowEngine.ts`, `src/breathPhase.ts`, and
`src/GradientGlow.tsx` into your app.

**B. As a workspace/local package.** `react` and `react-dom` are peer deps:

```bash
npm install react react-dom
```

## Usage

The canvas fills its parent, so put it in a positioned container behind your
content:

```tsx
import { GradientGlow } from "@vibe/gradient-glow";

export function HomeScreen() {
  return (
    <div style={{ position: "relative", width: 480, height: 480, borderRadius: "50%", overflow: "hidden" }}>
      <GradientGlow />
      <div style={{ position: "relative" }}>
        <Clock />
      </div>
    </div>
  );
}
```

Breath glow is the default — no props needed. To sync with an external breath
phase (e.g. dot matrix):

```tsx
import { advanceBreathPhase, breathGlow } from "@vibe/gradient-glow";

<GradientGlow breathPhase={phase} />
```

For organic mode:

```tsx
<GradientGlow mode="organic" speed={3.2} area={0} />
```

## Props

All props are optional. Defaults match the shipped Vibe Bot home screen.

| Prop                   | Type                          | Default     | Description |
| ---------------------- | ----------------------------- | ----------- | ----------- |
| `enabled`              | `boolean`                     | `true`      | Master on/off. When off, paints black. |
| `mode`                 | `"breath" \| "organic"`       | `"breath"`  | Breath halo or drifting blobs. |
| `maxIntensity`         | `number` (0–1)                | `0.6`       | Upper bound of glow intensity. |
| `minIntensity`         | `number` (0–1)                | `0.25`      | Lower bound of glow intensity. |
| `intensityCycleSec`    | `number`                      | `12`        | Seconds per full min↔max breath (organic). |
| `speed`                | `number`                      | `3.2`       | Drift-speed multiplier (organic). |
| `area`                 | `number` (0–1)                | `0`         | Focused glow vs fills frame (organic). |
| `focusY`               | `number` (0–1)                | `0.767`     | Vertical focus (avatar at 368/480). |
| `palette`              | `Array<string \| [r,g,b]>`    | brand blues | Organic mode colour cycle. |
| `breathSync`           | `boolean`                     | `true`      | Internal breath tempo (breath mode). |
| `breathSpeed`          | `number`                      | `1`         | Breath-speed multiplier. |
| `breathPhase`          | `number \| null`              | `null`      | External phase override for sync. |
| `respectReducedMotion` | `boolean`                     | `true`      | Freeze for `prefers-reduced-motion`. |
| `className` / `style`  | —                             | —           | Applied to the `<canvas>`. |
| `ariaHidden`           | `boolean`                     | `true`      | Decorative by default. |

### Midnight palette

Breath mode ships with a single fixed palette — deep indigo core, navy wash,
soft violet fringe — matching the Vibe Bot `midnight` preset.

## Headless / non-React use

```ts
import { createGradientGlow } from "@vibe/gradient-glow";

const glow = createGradientGlow(canvas, { mode: "breath", breathSpeed: 1 });
glow.resize();
const loop = (t: number) => { glow.draw(t); requestAnimationFrame(loop); };
requestAnimationFrame(loop);
```

## Run the demo

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
npx vite
npm run typecheck
```

## Files

```
src/
  breathPhase.ts    # shared breath timing (sync with dot matrix)
  glowEngine.ts     # framework-agnostic canvas engine
  GradientGlow.tsx  # React wrapper (rAF loop, ResizeObserver, reduced motion)
  index.ts          # public exports
example/
  App.tsx           # demo with live controls
```

## Implementation notes

- **Blend mode** is `screen` — assumes a dark backdrop.
- **The vignette** darkens the rim; reads best inside a circular container.
- **Sizing** is driven by the canvas CSS box; backing store follows device resolution.
