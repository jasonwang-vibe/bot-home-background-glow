# @vibe/gradient-glow

The organic flowing gradient-glow background from the Vibe Bot home screen,
packaged as a self-contained React component. Soft blue/purple radial blobs
drift on slow looping paths, breathe in intensity, and slowly cycle through a
colour palette — composited with a `screen` blend over pure black for a clean,
living glow.

- **Zero runtime dependencies** (just a `<canvas>` and React).
- **Faithful port** of the prototype's rendering math (`js/background.js`).
- **HiDPI-crisp & responsive** — sizes to its container via `ResizeObserver`
  and `devicePixelRatio` (the prototype's fixed 960×960 device buffer was the
  only thing generalised).
- **Live props** — every knob updates the running animation in place.
- Respects `prefers-reduced-motion` (freezes on a static frame).

## Install

This is delivered as source (TypeScript). Two ways to use it:

**A. Copy the files.** Drop `src/glowEngine.ts` and `src/GradientGlow.tsx`
into your app. That's the whole component.

**B. As a workspace/local package.** `react` and `react-dom` are peer deps:

```bash
npm install react react-dom
```

## Usage

The canvas fills its parent, so put it in a positioned container behind your
content:

```tsx
import { GradientGlow } from "@vibe/gradient-glow"; // or your copied path

export function HomeScreen() {
  return (
    <div style={{ position: "relative", width: 480, height: 480, borderRadius: "50%", overflow: "hidden" }}>
      <GradientGlow />
      <div style={{ position: "relative" /* sits above the glow */ }}>
        <Clock />
      </div>
    </div>
  );
}
```

For a full-bleed page background, use a fixed wrapper:

```tsx
<div style={{ position: "fixed", inset: 0, zIndex: -1 }}>
  <GradientGlow area={1} />
</div>
```

## Props

All props are optional. Defaults match the shipped prototype exactly.

| Prop                   | Type                          | Default     | Description |
| ---------------------- | ----------------------------- | ----------- | ----------- |
| `enabled`              | `boolean`                     | `true`      | Master on/off. When off, paints black. |
| `maxIntensity`         | `number` (0–1)                | `0.6`       | Upper bound of the breathing glow intensity. |
| `minIntensity`         | `number` (0–1)                | `0.25`      | Lower bound of the breathing glow intensity. |
| `intensityCycleSec`    | `number`                      | `12`        | Seconds per full min↔max breath. |
| `speed`                | `number`                      | `3.2`       | Drift-speed multiplier. |
| `area`                 | `number` (0–1)                | `0`         | `0` = focused glow (around `focusY`); `1` = fills the frame. |
| `focusY`               | `number` (0–1)                | `0.767`     | Vertical focus point (the prototype centres on the avatar at 368/480). |
| `palette`              | `Array<string \| [r,g,b]>`    | brand blues | 1–5 colours the glow cycles through. Hex or RGB. |
| `respectReducedMotion` | `boolean`                     | `true`      | Freeze on a static frame for `prefers-reduced-motion`. |
| `className` / `style`  | —                             | —           | Applied to the `<canvas>`. |
| `ariaHidden`           | `boolean`                     | `true`      | It's decorative by default. |

### Custom palette

```tsx
<GradientGlow palette={["#2646b4", "#462e96", "#1860aa", "#603cbe", "#1e78c8"]} />
```

## Headless / non-React use

The rendering engine is framework-agnostic. Drive it yourself:

```ts
import { createGradientGlow } from "@vibe/gradient-glow";

const glow = createGradientGlow(canvas, { speed: 3.2, area: 0 });
glow.resize();
const loop = (t: number) => { glow.draw(t); requestAnimationFrame(loop); };
requestAnimationFrame(loop);

// later
glow.update({ maxIntensity: 0.8 });
glow.resize(); // call when the canvas box changes
```

## Run the demo

The `example/` folder has a control panel mirroring the original prototype.
Point any Vite + React setup at `example/App.tsx` (or copy it into one):

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
npx vite        # with an index.html that mounts example/App.tsx
npm run typecheck
```

## Files

```
src/
  glowEngine.ts     # framework-agnostic canvas engine (the port)
  GradientGlow.tsx  # React wrapper (rAF loop, ResizeObserver, reduced motion)
  index.ts          # public exports
example/
  App.tsx           # demo with live controls (delete when integrating)
```

## Implementation notes for the integrating dev

- **Timing** uses the absolute `requestAnimationFrame` timestamp; all motion is
  periodic, so there's no first-frame jump and nothing to seed.
- **Blend mode** is `screen` — the component assumes a **dark backdrop**. Over a
  light background the glow will wash out; keep the container background dark
  (the engine itself paints black first, so a plain mount is fine).
- **The vignette** darkens the rim, which reads best inside a circular or
  rounded, `overflow: hidden` container — but it works in a rectangle too.
- **Sizing** is driven entirely by the canvas's CSS box. Give the parent a real
  width/height; the backing store follows automatically at device resolution.
