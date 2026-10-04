import { useEffect, useRef } from "react";
import type { StrokeRef } from "@/lib/types";

interface Props {
  model: StrokeRef[];
  clearNonce: number;
  undoNonce: number;
  onStrokeCountChange: (n: number) => void;
}

interface Pt {
  x: number; // 0..1 normalized to the drawing stage
  y: number;
}

const INK = "#7db2f9";

/** freehand drawing surface — pointer events (finger/mouse/pen), offline.
 *  Ink stored as normalized point arrays so phase-2 scoring can reuse it. */
export default function PracticeCanvas({ model, clearNonce, undoNonce, onStrokeCountChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<Pt[][]>([]);
  const activeRef = useRef<number | null>(null);
  void model;

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = canvas.width * 0.055; // matches the model's 6/109 width
    for (const stroke of inkRef.current) {
      if (!stroke.length) continue;
      ctx.beginPath();
      for (let i = 0; i < stroke.length; i++) {
        const x = stroke[i].x * canvas.width;
        const y = stroke[i].y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (stroke.length === 1) {
        // a tap is a dot, not an invisible zero-length line
        ctx.beginPath();
        ctx.arc(stroke[0].x * canvas.width, stroke[0].y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // size for device pixel ratio; keep ink across resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    resize();
    // fresh mounts start empty — report that immediately so the counter resets
    onStrokeCountChange(inkRef.current.length);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!undoNonce) return;
    inkRef.current.pop();
    redraw();
    onStrokeCountChange(inkRef.current.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoNonce]);

  useEffect(() => {
    if (!clearNonce) return;
    inkRef.current = [];
    redraw();
    onStrokeCountChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearNonce]);

  const norm = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  return (
    <canvas
      ref={canvasRef}
      className="practice-canvas"
      onPointerDown={(e) => {
        if (activeRef.current !== null) return; // ignore palm / second touches
        activeRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        inkRef.current.push([norm(e)]);
        redraw();
        onStrokeCountChange(inkRef.current.length);
      }}
      onPointerMove={(e) => {
        if (activeRef.current !== e.pointerId) return;
        inkRef.current[inkRef.current.length - 1]?.push(norm(e));
        redraw();
      }}
      onPointerUp={(e) => {
        if (activeRef.current !== e.pointerId) return;
        activeRef.current = null;
        redraw();
      }}
      onPointerCancel={() => {
        // a stroke cut short by a system gesture still counts as attempted
        activeRef.current = null;
      }}
    />
  );
}
