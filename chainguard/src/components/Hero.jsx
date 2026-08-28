import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ParticleField from './ParticleField';

const HEADLINE = 'Securing Digital Evidence with AI & Blockchain';
const HEX = '0123456789abcdef';

export default function Hero() {
  const [revealed, setRevealed] = useState(0);
  const [scramble, setScramble] = useState('');

  useEffect(() => {
    let frame = 0;
    const totalFrames = HEADLINE.length * 3;
    const interval = setInterval(() => {
      frame++;
      const revealCount = Math.floor((frame / totalFrames) * HEADLINE.length);
      setRevealed(revealCount);
      setScramble(
        Array.from({ length: HEADLINE.length - revealCount }, () =>
          HEX[Math.floor(Math.random() * 16)]
        ).join('')
      );
      if (frame >= totalFrames) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-20 lg:px-8 lg:pt-28">
      <ParticleField count={30} />
      <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue/10 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-4 py-1.5 text-xs text-cyan"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Third Year Engineering Project · Live Chain Status: Synced
        </motion.div>

        <h1 className="font-mono text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          <span className="text-gradient">{HEADLINE.slice(0, revealed)}</span>
          <span className="text-frost/25 light:text-navy/25">{scramble}</span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base text-frost/60 light:text-navy/60 sm:text-lg"
        >
          ChainGuard fuses Ethereum smart contracts, SHA-256 fingerprinting, and rule-based
          anomaly detection into one tamper-proof chain of custody — from the evidence locker to
          the courtroom.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue to-cyan px-6 py-3 font-medium text-navy transition-transform hover:scale-[1.03]"
          >
            Get Started
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/verify"
            className="glass flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-frost/80 light:text-navy/80 transition-colors hover:text-frost light:text-navy"
          >
            <FiPlayCircle /> Live Demo
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
