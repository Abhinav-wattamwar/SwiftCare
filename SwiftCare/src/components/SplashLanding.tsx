import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { HeartPulse, ShieldCheck } from 'lucide-react';

interface SplashLandingProps {
  durationMs?: number;
  onComplete: () => void;
}

const SPLASH_STAGES = [
  { atPercent: 0, label: 'Initializing Heart-Link Care Engine...' },
  { atPercent: 38, label: 'Calibrating ABHA & NABL Price Network...' },
  { atPercent: 76, label: 'Preparing Secure Patient Gateway...' },
];

export function SplashLanding({ durationMs = 3000, onComplete }: SplashLandingProps) {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let rafId = 0;
    let completed = false;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs && !completed) {
        completed = true;
        onComplete();
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [durationMs, onComplete]);

  const activeStage =
    [...SPLASH_STAGES].reverse().find((s) => progress >= s.atPercent) ?? SPLASH_STAGES[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading SwiftCare — A connection direct to heart"
      className="relative min-h-[100svh] w-full overflow-hidden bg-gradient-to-b from-[#f6faf9] via-white to-[#f0f4f3] flex flex-col items-center justify-center px-5 py-10"
    >
      {/* Subtle clinical radial atmosphere matching logo violet-magenta + teal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[540px] h-[540px] rounded-full bg-[#029185]/8 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[420px] h-[420px] rounded-full bg-[#be185d]/6 blur-3xl" />
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center"
      >
        {/* Clinical Emblem Ring + Logo */}
        <div className="relative flex items-center justify-center mb-5">
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              initial={{ scale: 0.9, opacity: 0.35 }}
              animate={{ scale: [0.95, 1.07, 0.95], opacity: [0.28, 0.55, 0.28] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-44 h-28 rounded-full border border-[#029185]/25 bg-white/60"
            />
          )}

          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative px-6 py-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm"
          >
            <img
              src="/assets/aistudio/logo_d3f7ff45.png"
              alt="SwiftCare Logo"
              className="h-20 sm:h-24 w-auto object-contain brightness-105 contrast-110 mix-blend-multiply mx-auto"
            />
          </motion.div>
        </div>

        {/* Animated Cardiac ECG Pulse Trace */}
        <div className="w-64 h-10 mb-3 flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 260 44" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="swiftcare-ecg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b0764" />
                <stop offset="50%" stopColor="#029185" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
            <path
              d="M4 24 L68 24 L82 24 L92 10 L102 36 L114 6 L124 38 L134 20 L144 24 L256 24"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <motion.path
              d="M4 24 L68 24 L82 24 L92 10 L102 36 L114 6 L124 38 L134 20 L144 24 L256 24"
              fill="none"
              stroke="url(#swiftcare-ecg-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        {/* Exact Brand Tagline */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#029185]">
            <HeartPulse className="w-4 h-4 text-[#db2777]" />
            <span>Care Price Transparency</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Swiftcare - A connection direct to heart
          </h1>

          <p className="text-xs text-slate-600">
            ABDM &amp; ABHA Linked · NABL Diagnostics · Bioequivalent Generics
          </p>
        </motion.div>

        {/* Calibrated 3-second Progress Bar */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="w-full max-w-xs mt-7 space-y-2.5"
        >
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#029185] via-[#0D9488] to-[#10B981] transition-[width] duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="truncate pr-2">{activeStage.label}</span>
            <span className="font-mono font-semibold text-[#029185] tabular-nums shrink-0">
              {progress}%
            </span>
          </div>
        </motion.div>

        {/* Bottom Trust Footer + Subtle Skip */}
        <div className="mt-8 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Encrypted Patient Session</span>
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onComplete}
            className="font-semibold text-[#029185] hover:text-[#0D9488] underline underline-offset-2 py-1"
          >
            Continue to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
