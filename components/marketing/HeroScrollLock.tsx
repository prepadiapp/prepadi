"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ============================================================================
// TUNE KNOBS — scroll feel for the hero logo reveal
// ============================================================================
/** Scroll distance (px of real page scroll) consumed by the 0 -> 1 logo reveal. */
export const WHEEL_PER_REVEAL = 1200;
/** Extra scroll distance (px) held on the finished card before release. ~1s of wheeling. */
export const HOLD_PX = 500;
/** Glide speed: lerp factor per frame toward the scroll target. Lower = floatier. */
export const EASE = 0.12;

type RevealState = {
  /** Raw scroll-driven target 0..1 (0 = hidden, 1 = fully overlaid). */
  reveal: number;
  /** Eased value actually used for transforms — glides toward `reveal`. */
  eased: number;
  /** True during the HOLD dwell: card is complete, release hasn't happened yet. */
  showPill: boolean;
  /** False on mobile / reduced-motion: overlay renders statically, no pin. */
  enabled: boolean;
  /** False until the client has measured viewport/motion prefs. Overlay stays
      hidden while false so logos never flash on first paint. */
  ready: boolean;
};

const RevealContext = createContext<RevealState>({
  reveal: 0,
  eased: 0,
  showPill: false,
  enabled: false,
  ready: false,
});

export const useReveal = () => useContext(RevealContext);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ============================================================================
// HeroPin — tall scroll track + sticky hero. Native scroll drives everything,
// so wheel / keyboard / touch / pinch-zoom all work with zero hijacking and
// no layout reflow (only transforms animate).
// ============================================================================
export function HeroPin({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState(0);
  const [hold, setHold] = useState(0);
  const [eased, setEased] = useState(0);
  const targetRef = useRef(0);

  // Desktop-only, and off for reduced-motion users (they get the static layout).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setEnabled(mq.matches && !rm.matches);
      setReady(true);
    };
    update();
    mq.addEventListener?.("change", update);
    rm.addEventListener?.("change", update);
    return () => {
      mq.removeEventListener?.("change", update);
      rm.removeEventListener?.("change", update);
    };
  }, []);

  // Scroll -> virtual target. Pin starts when the wrap top hits viewport top.
  useEffect(() => {
    if (!enabled) {
      targetRef.current = 1;
      setReveal(1);
      setHold(1);
      setEased(1);
      return;
    }
    let ticking = false;
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wrapTopDoc =
        wrap.getBoundingClientRect().top + window.scrollY;
      const raw = window.scrollY - wrapTopDoc;
      targetRef.current = clamp01(raw / WHEEL_PER_REVEAL);
      setReveal(targetRef.current);
      setHold(clamp01((raw - WHEEL_PER_REVEAL) / HOLD_PX));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);

  // Glide loop: eased chases the scroll target so motion lags the wheel.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = () => {
      const cur = targetRef.current;
      setEased((prev) => {
        if (Math.abs(cur - prev) < 0.0005) return cur;
        return prev + (cur - prev) * EASE;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  const showPill = enabled && reveal >= 0.999 && hold < 1;

  return (
    <div ref={wrapRef} className="relative">
      <div className="lg:sticky lg:top-0">
        <RevealContext.Provider
          value={{ reveal, eased, showPill, enabled, ready }}
        >
          {children}
        </RevealContext.Provider>
      </div>
      {/* Scroll track: consumed as pin distance on desktop only.
          Pure CSS visibility (no JS measurement) so SSR has no layout shift. */}
      <div
        aria-hidden="true"
        className="hidden lg:block motion-reduce:hidden"
        style={{ height: WHEEL_PER_REVEAL + HOLD_PX }}
      />
    </div>
  );
}

// ============================================================================
// ExamLogosOverlay — JAMB / WAEC / NECO chips gliding up over the photo.
// Render INSIDE the photo frame (which must be relative + overflow-hidden).
// ============================================================================
const LOGOS = [
  { src: "/jamb.png", alt: "JAMB logo", label: "JAMB UTME" },
  { src: "/waec.png", alt: "WAEC logo", label: "WASSCE" },
  { src: "/neco.png", alt: "NECO logo", label: "NECO SSCE" },
];

export function ExamLogosOverlay() {
  const { eased, showPill, enabled, ready } = useReveal();

  // Whole bar rises from below the frame; per-chip stagger on top.
  // Before the client is ready (SSR / first paint) the bar is parked hidden,
  // so the logos never flash on landing.
  const barT = easeOutCubic(clamp01(eased));
  const barY = (1 - barT) * 120; // % of its own height
  const barOpacity = clamp01(eased * 1.6);
  const barStyle = !ready
    ? { transform: "translateY(120%)", opacity: 0 }
    : enabled
      ? { transform: `translateY(${barY}%)`, opacity: barOpacity }
      : { transform: "none", opacity: 1 };

  return (
    <>
      <div
        aria-hidden={!ready || !enabled}
        className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 will-change-transform"
        style={{ ...barStyle, pointerEvents: "none" }}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-white/60 bg-white/95 px-3 py-2.5 shadow-xl shadow-slate-900/15 backdrop-blur-md">
          {LOGOS.map((logo, i) => {
            const local = easeOutCubic(
              clamp01((eased - i * 0.12) / 0.64)
            );
            const chipStyle = !ready
              ? { transform: "translateY(28px)", opacity: 0 }
              : enabled
                ? {
                    transform: `translateY(${(1 - local) * 28}px)`,
                    opacity: local,
                  }
                : { transform: "none", opacity: 1 };
            return (
              <div
                key={logo.src}
                className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5 will-change-transform sm:gap-2.5 sm:px-3 sm:py-2"
                style={chipStyle}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="lazy"
                  className="h-9 w-9 shrink-0 rounded-full bg-white object-contain shadow-sm ring-1 ring-slate-200 sm:h-11 sm:w-11"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-extrabold tracking-tight text-slate-900 sm:text-xs">
                    {logo.label}
                  </span>
                  <span className="block text-[10px] font-semibold text-[#0000FE]">
                    Timed CBT
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showPill && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
          <span className="inline-flex animate-bounce items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
            Scroll to continue ↓
          </span>
        </div>
      )}
    </>
  );
}
