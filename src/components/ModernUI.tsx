import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent as RPE, type ReactNode } from "react";
import { Search, CornerDownLeft, Sparkles, ArrowRight } from "lucide-react";

/* ========================================================================== */
/*  ModernUI: drop-in interactive layer for the TwoMinDesign dashboard        */
/*  Put this file at src/components/ModernUI.tsx                              */
/* ========================================================================== */

type IconType = ComponentType<{ size?: number; className?: string }>;

export const MODERN_STYLES = `
/* ---------- Aurora background (moves slowly, follows the theme) ---------- */
.og-aurora{ position:absolute; inset:0 0 auto 0; height:620px; overflow:hidden; pointer-events:none; -webkit-mask-image:linear-gradient(#000 40%,transparent); mask-image:linear-gradient(#000 40%,transparent); }
.og-aurora i{ position:absolute; border-radius:999px; filter:blur(70px); opacity:.5; animation:og-float 14s ease-in-out infinite alternate; }
.og-aurora i:nth-child(1){ width:420px; height:420px; left:8%; top:-160px; background:var(--accent); opacity:.22; }
.og-aurora i:nth-child(2){ width:360px; height:360px; right:6%; top:-120px; background:#7C5CFF; opacity:.18; animation-delay:-5s; }
.og-aurora i:nth-child(3){ width:300px; height:300px; left:44%; top:-60px; background:#14B8A6; opacity:.14; animation-delay:-9s; }
.og-root[data-theme="light"] .og-aurora i{ opacity:.28; }
@keyframes og-float{ from{ transform:translate3d(0,0,0) scale(1); } to{ transform:translate3d(40px,30px,0) scale(1.15); } }

/* ---------- Scroll progress bar ---------- */
.og-progress{ position:fixed; top:0; left:0; height:3px; width:100%; transform-origin:0 50%; transform:scaleX(var(--p,0)); background:linear-gradient(90deg,var(--accent),#FF8A1F,#B06CFF); z-index:60; }

/* ---------- Spotlight + tilt card ---------- */
.og-spot{ position:relative; overflow:hidden; transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition:transform .15s ease-out, border-color .2s, box-shadow .25s; will-change:transform; }
.og-spot::before{ content:""; position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .25s;
  background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%), var(--soft), transparent 70%); }
.og-spot::after{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; opacity:0; transition:opacity .25s; padding:1px;
  background:radial-gradient(180px circle at var(--mx,50%) var(--my,50%), var(--accent), transparent 70%);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.og-spot:hover::before, .og-spot:hover::after{ opacity:1; }
.og-spot:hover{ box-shadow:0 24px 50px -28px rgba(240,180,0,.5); }

/* ---------- Hero ---------- */
.og-hero{ position:relative; overflow:hidden; border-radius:28px; padding:2rem; border:1px solid var(--border);
  background:linear-gradient(135deg,var(--surface),var(--surface-2)); box-shadow:var(--shadow); }
@media(min-width:640px){ .og-hero{ padding:2.75rem; } }
.og-hero-grid{ display:grid; gap:2rem; grid-template-columns:1fr; align-items:center; }
@media(min-width:1024px){ .og-hero-grid{ grid-template-columns:1.15fr .85fr; } }
.og-eyebrow{ display:inline-flex; align-items:center; gap:.5rem; padding:.3rem .75rem; border-radius:999px; font-size:.75rem; font-weight:700; background:var(--soft); color:var(--accent-text); border:1px solid var(--border); }
.og-eyebrow b{ width:7px; height:7px; border-radius:99px; background:#10b981; box-shadow:0 0 0 0 rgba(16,185,129,.6); animation:og-ping 1.8s infinite; }
@keyframes og-ping{ 70%{ box-shadow:0 0 0 8px rgba(16,185,129,0); } 100%{ box-shadow:0 0 0 0 rgba(16,185,129,0); } }
.og-gradient-text{ background:linear-gradient(90deg,var(--accent),#FF8A1F 50%,#B06CFF); -webkit-background-clip:text; background-clip:text; color:transparent; }
.og-caret{ display:inline-block; width:3px; height:.9em; margin-left:3px; vertical-align:-.1em; background:var(--accent); animation:og-blink 1s steps(1) infinite; }
@keyframes og-blink{ 50%{ opacity:0; } }

/* floating design stack in the hero */
.og-stack{ position:relative; height:260px; perspective:1000px; }
.og-stack > div{ position:absolute; width:170px; height:170px; border-radius:22px; overflow:hidden; border:1px solid var(--border); box-shadow:0 30px 50px -25px rgba(0,0,0,.6);
  transition:transform .5s cubic-bezier(.2,.8,.2,1); animation:og-bob 6s ease-in-out infinite; }
.og-stack > div:nth-child(1){ left:4%; top:30px; --r:-9deg; transform:rotate(-9deg); }
.og-stack > div:nth-child(2){ left:30%; top:0; --r:5deg; transform:rotate(5deg); animation-delay:-2s; z-index:2; }
.og-stack > div:nth-child(3){ right:2%; top:56px; --r:12deg; transform:rotate(12deg); animation-delay:-4s; }
.og-hero:hover .og-stack > div:nth-child(1){ transform:rotate(-14deg) translate(-12px,6px); }
.og-hero:hover .og-stack > div:nth-child(2){ transform:rotate(2deg) translateY(-12px) scale(1.05); }
.og-hero:hover .og-stack > div:nth-child(3){ transform:rotate(17deg) translate(12px,6px); }
@keyframes og-bob{ 0%,100%{ translate:0 0; } 50%{ translate:0 -10px; } }

/* ---------- Stats ---------- */
.og-stats{ display:grid; grid-template-columns:repeat(2,1fr); gap:.75rem; }
@media(min-width:768px){ .og-stats{ grid-template-columns:repeat(4,1fr); } }
.og-stat{ padding:1rem 1.1rem; border-radius:18px; background:var(--surface); border:1px solid var(--border); }
.og-stat strong{ display:block; font-size:1.6rem; line-height:1.1; font-weight:800; color:var(--text); font-variant-numeric:tabular-nums; }
.og-stat span{ font-size:.75rem; color:var(--faint); }
.og-bar{ height:6px; border-radius:99px; background:var(--surface-2); overflow:hidden; margin-top:.6rem; }
.og-bar i{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,var(--accent),#FF8A1F); transition:width 1s cubic-bezier(.2,.8,.2,1); }

/* ---------- Marquee of use cases ---------- */
.og-marquee{ overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent); mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent); }
.og-marquee-track{ display:flex; gap:.6rem; width:max-content; animation:og-marq 32s linear infinite; }
.og-marquee:hover .og-marquee-track{ animation-play-state:paused; }
@keyframes og-marq{ to{ transform:translateX(-50%); } }

/* ---------- Shimmer on primary buttons ---------- */
.og-btn{ position:relative; overflow:hidden; }
.og-btn:not(:disabled)::after{ content:""; position:absolute; top:0; left:-60%; width:40%; height:100%; transform:skewX(-20deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); animation:og-shine 3.6s ease-in-out infinite; }
@keyframes og-shine{ 0%,60%{ left:-60%; } 100%{ left:140%; } }

/* ---------- Staggered entrance ---------- */
.og-stagger > *{ animation:og-in .5s ease both; }
.og-stagger > *:nth-child(1){ animation-delay:.02s } .og-stagger > *:nth-child(2){ animation-delay:.07s }
.og-stagger > *:nth-child(3){ animation-delay:.12s } .og-stagger > *:nth-child(4){ animation-delay:.17s }
.og-stagger > *:nth-child(5){ animation-delay:.22s } .og-stagger > *:nth-child(6){ animation-delay:.27s }
.og-stagger > *:nth-child(7){ animation-delay:.32s } .og-stagger > *:nth-child(8){ animation-delay:.37s }

/* ---------- Command palette ---------- */
.og-kbd{ display:inline-flex; align-items:center; padding:.1rem .4rem; border-radius:7px; border:1px solid var(--border); background:var(--surface-2); color:var(--muted); font-size:.7rem; font-weight:600; font-family:ui-monospace,monospace; }
.og-pal-back{ position:fixed; inset:0; z-index:80; display:flex; align-items:flex-start; justify-content:center; padding:12vh 1rem 1rem; background:rgba(5,5,8,.55); backdrop-filter:blur(8px); animation:og-fade .15s ease both; }
.og-pal{ width:100%; max-width:560px; border-radius:22px; overflow:hidden; background:var(--surface); border:1px solid var(--border); box-shadow:0 40px 80px -30px rgba(0,0,0,.8); animation:og-pop .2s cubic-bezier(.2,.9,.3,1.2) both; }
.og-pal-input{ width:100%; background:transparent; border:0; outline:0; padding:1rem 0; color:var(--text); font-size:1rem; }
.og-pal-item{ display:flex; align-items:center; gap:.75rem; width:100%; text-align:left; padding:.6rem .75rem; border-radius:14px; color:var(--muted); }
.og-pal-item[data-sel="true"]{ background:var(--soft); color:var(--text); }
.og-pal-item[data-sel="true"] .og-nav-ico{ background:var(--accent); color:#1B1500; }
@keyframes og-fade{ from{ opacity:0; } to{ opacity:1; } }
@keyframes og-pop{ from{ opacity:0; transform:translateY(10px) scale(.96); } to{ opacity:1; transform:none; } }

/* ---------- Celebration burst when a result is ready ---------- */
.og-burst{ position:fixed; left:50%; top:38%; width:0; height:0; z-index:90; pointer-events:none; }
.og-burst i{ position:absolute; width:9px; height:14px; border-radius:2px; opacity:0; animation:og-conf 1.3s cubic-bezier(.1,.8,.3,1) forwards; animation-delay:var(--d); }
@keyframes og-conf{ 0%{ opacity:1; transform:translate(0,0) rotate(0); } 100%{ opacity:0; transform:translate(var(--x),var(--y)) rotate(var(--r)); } }

/* ---------- Result reveal ---------- */
.og-reveal{ animation:og-reveal .7s cubic-bezier(.2,.8,.2,1) both; }
@keyframes og-reveal{ from{ opacity:0; transform:scale(.96); filter:blur(14px); } to{ opacity:1; transform:none; filter:blur(0); } }

@media (prefers-reduced-motion:reduce){
  .og-aurora i,.og-stack>div,.og-marquee-track,.og-btn::after,.og-eyebrow b{ animation:none !important; }
}
`;

/* ------------------------------ helpers/hooks ----------------------------- */

/** Counts up to a number so stats feel alive. */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const from = v;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return v;
}

/** Types words one letter at a time, then deletes them. */
export function useTypewriter(words: string[], speed = 85, hold = 1400) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[i % words.length];
    const t = setTimeout(
      () => {
        if (!del && n < word.length) setN(n + 1);
        else if (!del) setDel(true);
        else if (n > 0) setN(n - 1);
        else {
          setDel(false);
          setI(i + 1);
        }
      },
      !del && n === word.length ? hold : del ? speed / 2 : speed,
    );
    return () => clearTimeout(t);
  }, [n, del, i, words, speed, hold]);
  return words[i % words.length].slice(0, n);
}

/** Thin bar at the top of the page showing how far the user has scrolled. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      ref.current?.style.setProperty("--p", String(Math.min(1, Math.max(0, p))));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <div ref={ref} className="og-progress" aria-hidden />;
}

/** Soft animated background. Put it inside .og-root in place of .og-glow. */
export const Aurora = () => (
  <div className="og-aurora" aria-hidden>
    <i />
    <i />
    <i />
  </div>
);

/* -------------------------- Spotlight / tilt card -------------------------- */

export function SpotlightCard({
  onClick,
  className = "",
  style,
  children,
  tilt = 6,
}: {
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  tilt?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: RPE<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--ry", `${(x - 0.5) * tilt}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * tilt}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <button ref={ref} onClick={onClick} onPointerMove={move} onPointerLeave={leave} className={`og-card og-spot og-focus ${className}`} style={style}>
      {children}
    </button>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

export function HeroBanner({
  name,
  onStart,
  onOpenPalette,
  art,
}: {
  name?: string | null;
  onStart: () => void;
  onOpenPalette: () => void;
  /** three small design previews, e.g. <TemplateArt t={TEMPLATES[0]} /> */
  art: ReactNode[];
}) {
  const word = useTypewriter(["logo", "flyer", "business card", "social post", "certificate"]);
  return (
    <section className="og-hero og-in">
      <div className="og-hero-grid">
        <div>
          <span className="og-eyebrow">
            <b />
            AI studio is online
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold og-text mt-4 leading-[1.08]">
            {name ? `Oga ${name}, ` : "Oga, "}
            <br className="hidden sm:block" />
            make your <span className="og-gradient-text">{word || "\u00A0"}</span>
            <span className="og-caret" aria-hidden />
            <br />
            in two minutes.
          </h1>
          <p className="og-muted text-sm sm:text-base mt-4 max-w-lg">
            Design, fix and convert in one place, then put a QR on your work and collect real customers from it.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button onClick={onStart} className="og-btn og-focus" style={{ width: "auto", padding: ".9rem 1.4rem" }}>
              <span className="og-btn-icon">
                <Sparkles size={16} />
              </span>
              Start a new design
              <ArrowRight size={16} />
            </button>
            <button onClick={onOpenPalette} className="og-ghost og-focus" style={{ padding: ".8rem 1rem" }}>
              <Search size={14} />
              Search tools
              <span className="og-kbd">Ctrl K</span>
            </button>
          </div>
        </div>
        <div className="og-stack" aria-hidden>
          {art.slice(0, 3).map((a, i) => (
            <div key={i}>{a}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Stats --------------------------------- */

export function StatsStrip({ credits, tools, freeTools, packSize = 50 }: { credits: number; tools: number; freeTools: number; packSize?: number }) {
  const c = useCountUp(credits);
  const t = useCountUp(tools);
  const f = useCountUp(freeTools);
  const pct = Math.min(100, Math.round((credits / packSize) * 100));
  return (
    <div className="og-stats og-stagger">
      <div className="og-stat">
        <strong>{c}</strong>
        <span>credits left</span>
        <div className="og-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="og-stat">
        <strong>{t}</strong>
        <span>tools in one place</span>
      </div>
      <div className="og-stat">
        <strong>{f}</strong>
        <span>free tools, no credits</span>
      </div>
      <div className="og-stat">
        <strong>~2 min</strong>
        <span>average time to a design</span>
      </div>
    </div>
  );
}

/** Endless scrolling row of ideas that tells new users what is possible. */
export function IdeaMarquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="og-marquee" aria-hidden>
      <div className="og-marquee-track">
        {row.map((s, i) => (
          <span key={i} className="og-chip">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Command palette ---------------------------- */

export interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: IconType;
  run: () => void;
}

/** Ctrl/Cmd + K to open, "/" also works when you are not typing. */
export function useCommandK(open: () => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);
}

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)) : items;
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const pick = (i?: PaletteItem) => {
    if (!i) return;
    onClose();
    i.run();
  };

  return (
    <div className="og-pal-back" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Search tools">
      <div className="og-pal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b og-divider">
          <Search size={17} className="og-faint" />
          <input
            ref={inputRef}
            className="og-pal-input"
            placeholder="Jump to a tool..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(list.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter") pick(list[sel]);
            }}
          />
          <span className="og-kbd">Esc</span>
        </div>
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {list.length === 0 && <p className="og-faint text-sm text-center py-8">No tool found</p>}
          {list.map((it, i) => (
            <button key={it.id} className="og-pal-item" data-sel={i === sel} onMouseEnter={() => setSel(i)} onClick={() => pick(it)}>
              <span className="og-nav-ico">
                <it.icon size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{it.label}</span>
                <span className="block text-xs og-faint truncate">{it.hint}</span>
              </span>
              {i === sel && <CornerDownLeft size={14} className="og-faint" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Celebration ------------------------------- */

const COLORS = ["#FFD21F", "#FF8A1F", "#B06CFF", "#14B8A6", "#F0442E", "#4DA3FF"];

/** Pass a number that changes each time something succeeds (e.g. Date.now()). */
export function Celebrate({ trigger }: { trigger: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    setShown(trigger);
    const t = setTimeout(() => setShown(0), 1700);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!shown) return null;
  return (
    <div className="og-burst" aria-hidden key={shown}>
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const d = 120 + ((i * 37) % 160);
        return (
          <i
            key={i}
            style={
              {
                background: COLORS[i % COLORS.length],
                "--x": `${Math.cos(a) * d}px`,
                "--y": `${Math.sin(a) * d + 90}px`,
                "--r": `${(i * 53) % 540}deg`,
                "--d": `${(i % 6) * 0.03}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}