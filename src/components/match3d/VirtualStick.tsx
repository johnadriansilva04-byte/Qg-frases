import { useRef, useState } from "react";

interface Props {
  /** x/y in [-1,1]; y > 0 = forward (same as W). */
  onChange: (x: number, y: number) => void;
}

/** Touch analog stick. Writes into the SAME move vector as W/A/S/D. */
export function VirtualStick({ onChange }: Props) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const handle = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2;
    let dx = (clientX - cx) / max;
    let dy = (clientY - cy) / max;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    onChange(dx, -dy);
  };

  const stop = () => {
    active.current = false;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={base}
      onPointerDown={(e) => {
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        handle(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current) handle(e.clientX, e.clientY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      className="relative h-32 w-32 touch-none rounded-full border border-hud-line bg-hud/60 backdrop-blur-sm select-none"
      aria-label="Analógico de movimentação"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x * 34}px), calc(-50% + ${knob.y * 34}px))` }}
      />
    </div>
  );
}
