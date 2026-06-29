# @vibe/gradient-glow

The home-screen background glow from the [Vibe Bot](https://github.com/jasonwang-vibe/vibe-bot-playground),
packaged as a self-contained React component.

**Repo:** https://github.com/jasonwang-vibe/bot-home-background-glow

## What's new

The shipped Vibe Bot home screen now defaults to **breath glow** — a subtle
midnight indigo/violet halo that pulses in sync with the dot-matrix breath tempo.
This package exports that mode (plus the earlier organic gradient style).

| Mode | Description |
| ---- | ----------- |
| **Breath glow** *(default)* | Fixed midnight palette; intensity follows the shared inhale/exhale curve |
| **Organic gradient** | Drifting blue/purple blobs with their own slow intensity cycle |

Both composited with a `screen` blend over pure black.

## Features

- **Zero runtime dependencies** — just a `<canvas>` and React
- **Faithful port** of `vibe-bot-playground/src/engine/background.ts` and `breathPhase.ts`
- **HiDPI-crisp & responsive** — `ResizeObserver` + `devicePixelRatio`
- **Live props** — every knob updates the running animation in place
- Respects `prefers-reduced-motion` (freezes on a static frame)

## Install

Delivered as TypeScript source. Two options:

**A. Copy the files** — drop `src/glowEngine.ts`, `src/breathPhase.ts`, and
`src/GradientGlow.tsx` into your app.

**B. Local/workspace package** — `react` and `react-dom` are peer deps:

```bash
npm install react react-dom
```

## Usage

The canvas fills its parent. Place it in a positioned container behind your content:

```tsx
import { GradientGlow } from "@vibe/gradient-glow";

export function HomeScreen() {
  return (
    <div
      style={{
        position: "relative",
        width: 480,
        height: 480,
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      <GradientGlow />
      <div style={{ position: "relative" }}>
        <Clock />
      </div>
    </div>
  );
}
```

No props needed — defaults match the Vibe Bot personal home (`mode: "breath"`,
90% max / 25% min intensity, focus at avatar `368/480`).

### Sync with dot matrix

Drive the halo from a shared breath phase so background and avatar stay locked:

```tsx
import { useEffect, useRef, useState } from "react";
import {
  GradientGlow,
  advanceBreathPhase,
} from "@vibe/gradient-glow";

function Home() {
  const phaseRef = useRef(0);
  const [, tick] = useState(0);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      phaseRef.current = advanceBreathPhase(phaseRef.current, now - prev, 1);
      prev = now;
      tick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <GradientGlow breathPhase={phaseRef.current} />;
}
```

Or pass `breathSpeed` to match the panel slider (`breathSpeed={dotMatrix.breathSpeed / 100}`).

### Organic mode

```tsx
<GradientGlow mode="organic" speed={3.2} area={0} />
```

## Props

All props are optional.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `enabled` | `boolean` | `true` | Master on/off. When off, paints black. |
| `mode` | `"breath" \| "organic"` | `"breath"` | Breath halo or drifting blobs. |
| `maxIntensity` | `number` (0–1) | `0.9` | Upper bound of glow intensity. |
| `minIntensity` | `number` (0–1) | `0.25` | Lower bound of glow intensity. |
| `intensityCycleSec` | `number` | `12` | Min↔max cycle in seconds *(organic)*. |
| `speed` | `number` | `3.2` | Drift-speed multiplier *(organic)*. |
| `area` | `number` (0–1) | `0` | Focused glow vs fills frame *(organic)*. |
| `focusY` | `number` (0–1) | `0.767` | Vertical focus (`368 / 480`). |
| `palette` | `Array<string \| [r,g,b]>` | brand blues | Colour cycle *(organic only)*. |
| `breathSync` | `boolean` | `true` | Internal breath tempo *(breath)*. |
| `breathSpeed` | `number` | `1` | Breath-speed multiplier. |
| `breathPhase` | `number \| null` | `null` | External phase override for sync. |
| `respectReducedMotion` | `boolean` | `true` | Freeze for `prefers-reduced-motion`. |
| `className` / `style` | — | — | Applied to the `<canvas>`. |
| `ariaHidden` | `boolean` | `true` | Decorative by default. |

### Midnight palette

Breath mode uses a single fixed palette (no colour picker):

| Layer | RGB | Role |
| ----- | --- | ---- |
| Core | `38, 28, 98` | Deep indigo |
| Mid | `28, 48, 128` | Navy wash |
| Fringe | `58, 34, 128` | Soft violet |

## Headless / non-React use

```ts
import { createGradientGlow } from "@vibe/gradient-glow";

const glow = createGradientGlow(canvas, { mode: "breath", breathSpeed: 1 });
glow.resize();

const loop = (t: number) => {
  glow.draw(t);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// later
glow.update({ maxIntensity: 0.8 });
glow.setBreathPhase(phase); // sync with external driver
glow.resize(); // call when the canvas box changes
```

### Exported utilities

```ts
import {
  BREATH_RATE,
  advanceBreathPhase,
  breathScale,
  breathGlow,
} from "@vibe/gradient-glow";
```

## Run the demo

The `example/` folder has a control panel with mode toggle and live sliders.
Wire it into any Vite + React setup:

```bash
npm install
npm install -D vite @vitejs/plugin-react
npx vite   # point index.html at example/App.tsx
npm run typecheck
```

## Files

```
src/
  breathPhase.ts    # shared breath timing (sync with dot matrix)
  glowEngine.ts     # framework-agnostic canvas engine
  GradientGlow.tsx  # React wrapper (rAF, ResizeObserver, reduced motion)
  index.ts          # public exports
example/
  App.tsx           # demo with live controls
```

## Implementation notes

- **Timing** uses absolute `requestAnimationFrame` timestamps; all motion is periodic.
- **Blend mode** is `screen` — assumes a dark backdrop.
- **Vignette** darkens the rim; reads best inside a circular `overflow: hidden` container.
- **Sizing** follows the canvas CSS box; backing store tracks device resolution.

## Source of truth

Ported from `vibe-bot-playground` commit `33fd6e2` (`background.ts`, `breathPhase.ts`).
Default home settings: `mode: "breath"`, `breathPalette: "midnight"`, dot matrix
`mode: "breathing"`, `breathSpeed: 100`.
