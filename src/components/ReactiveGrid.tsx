import { useEffect, useRef } from "react";

// A living square grid that sits behind the app. A faint grid of cells rests in
// the background, breathing slowly; near the cursor they ignite in the brand
// accent and fade on a lingering trail. Transparent canvas so it composites
// over the app background; pointer-events-none so it never intercepts clicks.

const CELL_SIZE = 26; // grid pitch (CSS px)
const GAP = 1; // hairline between cells

const LINE = "255,255,255"; // resting grid (faint)
const HL = "249,115,22"; // --accent #f97316

const ATTACK = 0.16; // how fast a cell lights
const RELEASE = 0.045; // how slowly it fades (lingering trail)
const POINTER_EASE = 0.14; // cursor smoothing
const AMBIENT_SPD = 0.00045; // idle breathing speed

// Two intensity tiers: subtle behind the working app, a touch stronger behind
// auth. Both kept deliberately faint so the grid reads as ambient texture, never
// a foreground element.
const SUBTLE = { lineAlpha: 0.012, peak: 0.115, glow: 0.014, influence: 2.6, ambient: 0.004 };
const PROMINENT = { lineAlpha: 0.02, peak: 0.22, glow: 0.026, influence: 3.0, ambient: 0.007 };

type Cell = { x: number; y: number; a: number };

export default function ReactiveGrid({ prominent = false }: { prominent?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const cfg = prominent ? PROMINENT : SUBTLE;
    const { lineAlpha: LINE_ALPHA, peak: PEAK, glow: GLOW_ALPHA, influence: INFLUENCE, ambient: AMBIENT } = cfg;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let cells: Cell[] = [];

    let px = -1e4;
    let py = -1e4;
    let sx = -1e4;
    let sy = -1e4;
    let active = false;
    let primed = false;
    let raf = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = width + "px";
      canvas!.style.height = height + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / CELL_SIZE);
      rows = Math.ceil(height / CELL_SIZE);
      cells = new Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          cells[y * cols + x] = { x, y, a: 0 };
        }
      }
      if (reduceMotion) paintResting(0);
    }

    // resting grid (used as the single static frame under reduced motion)
    function paintResting(now: number) {
      ctx!.clearRect(0, 0, width, height);
      const size = CELL_SIZE - GAP;
      const ambPhase = now * AMBIENT_SPD;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const amb = AMBIENT * (0.5 + 0.5 * Math.sin(ambPhase + cell.x * 0.45 + cell.y * 0.55));
        ctx!.fillStyle = `rgba(${LINE},${LINE_ALPHA + amb})`;
        ctx!.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, size, size);
      }
    }

    function setPointer(mx: number, my: number) {
      px = mx;
      py = my;
      active = true;
      if (!primed) {
        sx = mx;
        sy = my;
        primed = true;
      }
    }

    function falloff(d: number) {
      if (d >= INFLUENCE) return 0;
      const t = 1 - d / INFLUENCE;
      return t * t * (3 - 2 * t); // smoothstep
    }

    function draw(now: number) {
      if (active) {
        sx += (px - sx) * POINTER_EASE;
        sy += (py - sy) * POINTER_EASE;
      }

      const cx = sx / CELL_SIZE;
      const cy = sy / CELL_SIZE;
      const minX = Math.floor(cx - INFLUENCE);
      const maxX = Math.ceil(cx + INFLUENCE);
      const minY = Math.floor(cy - INFLUENCE);
      const maxY = Math.ceil(cy + INFLUENCE);

      ctx!.clearRect(0, 0, width, height);
      const size = CELL_SIZE - GAP;
      const ambPhase = now * AMBIENT_SPD;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        let target = 0;
        if (active && cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY) {
          const dx = cell.x + 0.5 - cx;
          const dy = cell.y + 0.5 - cy;
          target = PEAK * falloff(Math.sqrt(dx * dx + dy * dy));
        }

        const a = cell.a;
        cell.a = a + (target - a) * (target > a ? ATTACK : RELEASE);

        const gx = cell.x * CELL_SIZE;
        const gy = cell.y * CELL_SIZE;

        // resting grid + slow spatial breathing so it never looks dead
        const amb = AMBIENT * (0.5 + 0.5 * Math.sin(ambPhase + cell.x * 0.45 + cell.y * 0.55));
        ctx!.fillStyle = `rgba(${LINE},${LINE_ALPHA + amb})`;
        ctx!.fillRect(gx, gy, size, size);

        if (cell.a > 0.004) {
          ctx!.fillStyle = `rgba(${HL},${cell.a})`;
          ctx!.fillRect(gx, gy, size, size);
        }
      }

      // soft warm bloom under the cursor (depth, not flat color)
      if (active) {
        const r = INFLUENCE * CELL_SIZE;
        const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(${HL},${GLOW_ALPHA})`);
        g.addColorStop(1, `rgba(${HL},0)`);
        ctx!.globalCompositeOperation = "lighter";
        ctx!.fillStyle = g;
        ctx!.fillRect(sx - r, sy - r, r * 2, r * 2);
        ctx!.globalCompositeOperation = "source-over";
      }

      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY);
    const onLeave = () => {
      active = false;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    };
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduceMotion) {
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("mouseleave", onLeave);
      window.addEventListener("touchmove", onTouch, { passive: true });
      window.addEventListener("touchend", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [prominent]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
