import { useEffect, useRef } from "react";

// x = horizontal start (%), s = size, d = rise duration (s),
// delay = negative so bubbles are already mid-flight on page load,
// drift = sideways travel while rising
const BUBBLES = [
  { x: "6%",  s: "44px", d: "22s", delay: "-4s",  drift: "40px" },
  { x: "14%", s: "86px", d: "30s", delay: "-18s", drift: "-30px" },
  { x: "24%", s: "28px", d: "18s", delay: "-9s",  drift: "24px" },
  { x: "33%", s: "62px", d: "26s", delay: "-2s",  drift: "-46px" },
  { x: "44%", s: "36px", d: "20s", delay: "-14s", drift: "34px" },
  { x: "53%", s: "96px", d: "34s", delay: "-22s", drift: "-24px" },
  { x: "62%", s: "30px", d: "19s", delay: "-7s",  drift: "30px" },
  { x: "70%", s: "58px", d: "27s", delay: "-12s", drift: "-40px" },
  { x: "79%", s: "40px", d: "23s", delay: "-1s",  drift: "26px" },
  { x: "86%", s: "78px", d: "32s", delay: "-20s", drift: "-34px" },
  { x: "92%", s: "32px", d: "21s", delay: "-10s", drift: "22px" },
  { x: "48%", s: "52px", d: "28s", delay: "-16s", drift: "-28px" },
];

export default function AmbientBackground() {
  const glowRef = useRef(null);

  // Soft glow that eases toward the cursor.
  // Writes straight to the element's style (no React re-renders).
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!finePointer || reduceMotion) return;

    const half = el.offsetWidth / 2;
    let targetX = window.innerWidth * 0.6;
    let targetY = window.innerHeight * 0.35;
    let x = targetX;
    let y = targetY;
    let raf = 0;

    const tick = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;

      const settled =
        Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      el.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-orb ambient-orb-three" />
      <div className="ambient-grid" />

      <div className="ambient-bokeh">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            style={{
              "--x": b.x,
              "--s": b.s,
              "--d": b.d,
              "--delay": b.delay,
              "--drift": b.drift,
            }}
          />
        ))}
      </div>

      <div className="ambient-cursor" ref={glowRef} />
    </div>
  );
}
