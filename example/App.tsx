import { useState } from "react";
import { GradientGlow } from "../src";
import type { GlowMode } from "../src";

/**
 * Demo harness — mirrors the controls from the Vibe Bot home panel.
 */
export default function App() {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<GlowMode>("breath");
  const [maxIntensity, setMaxIntensity] = useState(0.9);
  const [minIntensity, setMinIntensity] = useState(0.25);
  const [intensityCycleSec, setCycle] = useState(12);
  const [speed, setSpeed] = useState(3.2);
  const [area, setArea] = useState(0);
  const [breathSpeed, setBreathSpeed] = useState(1);
  const [circular, setCircular] = useState(true);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0f", color: "#ddd", fontFamily: "system-ui" }}>
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <div
          style={{
            position: "relative",
            width: "min(70vmin, 600px)",
            aspectRatio: "1 / 1",
            borderRadius: circular ? "50%" : 24,
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <GradientGlow
            enabled={enabled}
            mode={mode}
            maxIntensity={maxIntensity}
            minIntensity={minIntensity}
            intensityCycleSec={intensityCycleSec}
            speed={speed}
            area={area}
            breathSpeed={breathSpeed}
          />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 72, fontWeight: 200, letterSpacing: 1 }}>1:55</div>
              <div style={{ opacity: 0.6 }}>Mar 27 Fri</div>
            </div>
          </div>
        </div>
      </div>

      <aside style={{ width: 300, padding: 20, background: "#111118", borderLeft: "1px solid #222", display: "grid", gap: 16, alignContent: "start" }}>
        <h2 style={{ margin: 0, fontSize: 14, textTransform: "uppercase", letterSpacing: 1, opacity: 0.7 }}>Background Glow</h2>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          <span>Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as GlowMode)}
            style={{ background: "#1a1a22", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 8px" }}
          >
            <option value="breath">Breath glow (midnight)</option>
            <option value="organic">Organic gradient</option>
          </select>
        </label>
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Enabled</span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
        <Slider label="Max intensity" value={maxIntensity} min={0} max={1} step={0.01} onChange={setMaxIntensity} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Min intensity" value={minIntensity} min={0} max={1} step={0.01} onChange={setMinIntensity} fmt={(v) => `${Math.round(v * 100)}%`} />
        {mode === "breath" ? (
          <Slider label="Breath speed" value={breathSpeed} min={0.25} max={2} step={0.05} onChange={setBreathSpeed} fmt={(v) => `${v.toFixed(2)}×`} />
        ) : (
          <>
            <Slider label="Intensity cycle" value={intensityCycleSec} min={3} max={60} step={1} onChange={setCycle} fmt={(v) => `${v}s`} />
            <Slider label="Flow speed" value={speed} min={0.1} max={3.2} step={0.1} onChange={setSpeed} fmt={(v) => `${v.toFixed(1)}×`} />
            <Slider label="Flow area" value={area} min={0} max={1} step={0.01} onChange={setArea} fmt={(v) => `${Math.round(v * 100)}%`} />
          </>
        )}
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Circular mask</span>
          <input type="checkbox" checked={circular} onChange={(e) => setCircular(e.target.checked)} />
        </label>
      </aside>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>{props.label}</span>
        <span style={{ opacity: 0.6 }}>{props.fmt(props.value)}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
