import { useMemo } from 'react';

// Lightweight CSS-only particle field — no canvas needed, respects
// prefers-reduced-motion via the .particle keyframes guard in index.css.
export default function ParticleField({ count = 24, className = '' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 5,
        duration: 12 + Math.random() * 18,
        delay: Math.random() * 20,
      })),
    [count]
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            bottom: '-10%',
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
