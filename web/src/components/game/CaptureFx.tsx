'use client';

import { useRef, useCallback, useEffect } from 'react';

type Part = 
  | { t: 'spark'; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; col: string }
  | { t: 'ring'; x: number; y: number; cr: number; maxR: number; life: number; maxLife: number; col: string }
  | { t: 'flash'; x: number; y: number; cr: number; maxR: number; life: number; maxLife: number; col: string }
  | { t: 'debris'; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; rot: number; rotV: number; col: string }
  | { t: 'slash'; x: number; y: number; ax: number; ay: number; len: number; life: number; maxLife: number; col: string };

export function CaptureFx() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partsRef = useRef<Part[]>([]);
  const lastTRef = useRef(0);

  const trigger = useCallback((x: number, y: number, atkColor: string, defColor: string) => {
    const parts = partsRef.current;
    for (let i = 0; i < 52; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 8;
      parts.push({
        t: 'spark',
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 1.5,
        life: 0.5 + Math.random() * 0.7,
        maxLife: 1.2,
        r: 1.5 + Math.random() * 4,
        col: Math.random() < 0.55 ? atkColor : defColor,
      });
    }
    parts.push({ t: 'ring', x, y, cr: 5, maxR: 85, life: 0.6, maxLife: 0.6, col: atkColor });
    parts.push({ t: 'flash', x, y, cr: 0, maxR: 55, life: 0.22, maxLife: 0.22, col: '#ffffff' });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 5;
      parts.push({
        t: 'debris', x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2.5,
        life: 0.9 + Math.random() * 0.6,
        maxLife: 1.5,
        r: 2 + Math.random() * 3.5,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.35,
        col: defColor,
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const len = 22 + Math.random() * 44;
      parts.push({ t: 'slash', x, y, ax: Math.cos(a), ay: Math.sin(a), len, life: 0.28, maxLife: 0.28, col: atkColor });
    }
  }, []);

  useEffect(() => {
    (window as unknown as { triggerCaptureFx?: (x: number, y: number, atk: string, def: string) => void }).triggerCaptureFx = trigger;
    return () => {
      delete (window as unknown as { triggerCaptureFx?: (x: number, y: number, atk: string, def: string) => void }).triggerCaptureFx;
    };
  }, [trigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId: number;
    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      const FX = canvas.getContext('2d');
      if (!FX) return;
      const dt = Math.min((ts - lastTRef.current) / 1000, 0.05);
      lastTRef.current = ts;
      FX.clearRect(0, 0, canvas.width, canvas.height);
      const parts = partsRef.current;
      partsRef.current = parts.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        const t = p.life / p.maxLife;
        FX.save();
        FX.globalAlpha = t * 0.9;
        if (p.t === 'spark') {
          const s = p as Part & { vx: number; vy: number; r: number };
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 9 * dt;
          FX.fillStyle = p.col;
          FX.shadowColor = p.col;
          FX.shadowBlur = s.r * 4;
          FX.beginPath();
          FX.arc(s.x, s.y, s.r * t, 0, Math.PI * 2);
          FX.fill();
        } else if (p.t === 'ring') {
          const r = p as Part & { cr: number; maxR: number };
          r.cr = r.maxR * (1 - t);
          FX.strokeStyle = p.col;
          FX.lineWidth = 3.5 * t;
          FX.shadowColor = p.col;
          FX.shadowBlur = 14;
          FX.beginPath();
          FX.arc(p.x, p.y, r.cr, 0, Math.PI * 2);
          FX.stroke();
        } else if (p.t === 'flash') {
          const f = p as Part & { cr: number; maxR: number };
          f.cr = f.maxR * (1 - t);
          const g = FX.createRadialGradient(p.x, p.y, 0, p.x, p.y, f.cr);
          g.addColorStop(0, 'rgba(255,255,255,.92)');
          g.addColorStop(0.35, 'rgba(255,220,150,.5)');
          g.addColorStop(1, 'transparent');
          FX.fillStyle = g;
          FX.beginPath();
          FX.arc(p.x, p.y, f.cr, 0, Math.PI * 2);
          FX.fill();
        } else if (p.t === 'debris') {
          const d = p as Part & { vx: number; vy: number; rot: number; rotV: number; r: number };
          d.x += d.vx;
          d.y += d.vy;
          d.vy += 6 * dt;
          d.rot += d.rotV;
          FX.fillStyle = p.col;
          FX.translate(p.x, p.y);
          FX.rotate(d.rot);
          FX.fillRect(-d.r / 2, -d.r / 2, d.r, d.r);
        } else if (p.t === 'slash') {
          const s = p as Part & { ax: number; ay: number; len: number };
          FX.strokeStyle = p.col;
          FX.lineWidth = 1.8;
          FX.shadowColor = p.col;
          FX.shadowBlur = 7;
          FX.beginPath();
          FX.moveTo(p.x, p.y);
          FX.lineTo(p.x + s.ax * s.len * (1 - t), p.y + s.ay * s.len * (1 - t));
          FX.stroke();
        }
        FX.restore();
        return true;
      });
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[9998]" />;
}
