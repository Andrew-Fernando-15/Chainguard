import { useEffect, useState } from 'react';

const HEX = '0123456789abcdef';
const randomHash = () =>
  Array.from({ length: 32 }, () => HEX[Math.floor(Math.random() * 16)]).join('');

export default function Loader({ onDone }) {
  const [hash, setHash] = useState(randomHash());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const hashInterval = setInterval(() => setHash(randomHash()), 90);
    const start = performance.now();
    const durationMs = 1400;

    let frame;
    const tick = (now) => {
      const pct = Math.min(100, ((now - start) / durationMs) * 100);
      setProgress(pct);
      if (pct < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        clearInterval(hashInterval);
        setTimeout(onDone, 200);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      clearInterval(hashInterval);
      cancelAnimationFrame(frame);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl border-2 border-blue/30" />
        <div className="absolute inset-0 rounded-2xl border-t-2 border-cyan animate-spin" />
        <span className="text-lg font-bold text-cyan">CG</span>
      </div>
      <p className="mt-6 font-mono text-xs tracking-widest text-frost/50 light:text-navy/50">HASHING BLOCK</p>
      <p className="mt-1 font-mono text-sm text-cyan">{hash}</p>
      <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-slate">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue to-cyan transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
