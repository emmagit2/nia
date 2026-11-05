import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Store,
  PenTool,
  GraduationCap,
  Share2,
  Sparkles,
  Award,
  Eraser,
  FileImage,
  ScanText,
  FilePen,
  Zap,
  Clock,
  Shield,
  Star,
  Check,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Styles (scoped, so they do not clash with your dark global classes)        */
/* -------------------------------------------------------------------------- */

const STYLES = `
.lp{
  --g-950:#06241A; --g-900:#0A2E1E; --g-700:#0B6B3F; --g-600:#0E8A50; --g-500:#16A35F;
  --g-100:#E1F3E8; --g-50:#F3FAF6; --y:#FFC93C; --y-soft:#FFF3CC;
  --ink:#0F1F17; --muted:#4A5E53; --line:#DBE8E0;
  background:#fff; color:var(--ink); min-height:100vh; overflow-x:hidden;
}
.lp h1,.lp h2,.lp h3{ color:var(--g-950); letter-spacing:-0.02em; }
.lp-muted{ color:var(--muted); }
.lp-wrap{ max-width:1160px; margin-left:auto; margin-right:auto; padding-left:1rem; padding-right:1rem; }
.lp-hero{ position:relative; overflow:hidden; }
.lp-hero-inner{ padding-top:clamp(2.75rem,7vw,5.5rem); padding-bottom:clamp(3rem,7vw,6rem); }

/* Header */
.lp-header{ position:sticky; top:0; z-index:50; background:rgba(255,255,255,.86); backdrop-filter:blur(14px); border-bottom:1px solid var(--line); }
.lp-link{ color:var(--muted); font-size:.92rem; font-weight:500; padding:.4rem .2rem; }
.lp-link:hover{ color:var(--g-700); }
.lp-logo{ width:34px; height:34px; border-radius:11px; background:linear-gradient(160deg,var(--g-500),var(--g-700)); display:grid; place-items:center; color:#fff; font-weight:800; position:relative; }
.lp-logo::after{ content:""; position:absolute; right:-3px; top:-3px; width:10px; height:10px; border-radius:99px; background:var(--y); border:2px solid #fff; }

/* Buttons */
.lp-btn{ display:inline-flex; align-items:center; justify-content:center; gap:.6rem; padding:.85rem 1.35rem; border-radius:14px; font-weight:700; font-size:.95rem; color:#fff;
  background:linear-gradient(180deg,var(--g-500),var(--g-700)); box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 12px 24px -12px rgba(11,107,63,.75);
  transition:transform .15s, box-shadow .2s, filter .2s; }
.lp-btn:hover{ transform:translateY(-2px); filter:brightness(1.05); box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 16px 28px -12px rgba(11,107,63,.85); }
.lp-btn:active{ transform:translateY(1px); }
.lp-btn-ico{ display:grid; place-items:center; width:26px; height:26px; border-radius:9px; background:rgba(255,255,255,.18); transition:transform .2s; }
.lp-btn:hover .lp-btn-ico{ transform:translateX(3px); }
.lp-btn-ghost{ display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.85rem 1.35rem; border-radius:14px; font-weight:600; font-size:.95rem; color:var(--g-700); background:#fff; border:1.5px solid var(--line); transition:transform .15s, border-color .2s, background-color .2s; }
.lp-btn-ghost:hover{ border-color:var(--g-500); background:var(--g-50); transform:translateY(-2px); }
.lp-btn-sm{ padding:.55rem 1rem; font-size:.85rem; border-radius:12px; }
.lp-btn-yellow{ display:inline-flex; align-items:center; justify-content:center; gap:.6rem; padding:.9rem 1.5rem; border-radius:14px; font-weight:800; font-size:.95rem; color:var(--g-950); background:var(--y); box-shadow:0 12px 24px -12px rgba(255,201,60,.9); transition:transform .15s, filter .2s; }
.lp-btn-yellow:hover{ transform:translateY(-2px); filter:brightness(1.04); }
.lp a:focus-visible,.lp button:focus-visible{ outline:3px solid var(--y); outline-offset:2px; border-radius:12px; }

/* Hero */
.lp-hero-bg{ position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(50% 60% at 85% 10%,rgba(22,163,95,.16),transparent 70%), radial-gradient(40% 40% at 0% 100%,rgba(255,201,60,.14),transparent 70%); }
.lp-pill{ display:inline-flex; align-items:center; gap:.55rem; padding:.4rem .9rem .4rem .5rem; border-radius:99px; background:var(--g-50); border:1px solid var(--line); color:var(--g-700); font-size:.82rem; font-weight:600; }
.lp-pill i{ width:22px; height:22px; border-radius:99px; background:var(--y); display:grid; place-items:center; color:var(--g-950); }
.lp-point{ display:flex; align-items:center; gap:.5rem; font-size:.88rem; color:var(--muted); }
.lp-point b{ width:20px; height:20px; border-radius:99px; background:var(--g-100); color:var(--g-700); display:grid; place-items:center; }

/* Carousel */
.lp-car{ position:relative; }
.lp-car-frame{ overflow:hidden; border-radius:28px; background:#fff; border:1px solid var(--line); box-shadow:0 40px 70px -40px rgba(10,46,30,.45); }
.lp-track{ display:flex; transition:transform .6s cubic-bezier(.3,.7,.2,1); }
.lp-slide{ min-width:100%; }
.lp-sticker{ position:absolute; top:-14px; right:-10px; z-index:2; transform:rotate(8deg); background:var(--y); color:var(--g-950); font-weight:800; font-size:.8rem; padding:.55rem .8rem; border-radius:14px; box-shadow:0 10px 20px -10px rgba(0,0,0,.35); line-height:1.1; text-align:center; }
.lp-dot{ height:8px; width:8px; border-radius:99px; background:var(--line); transition:width .3s, background-color .3s; }
.lp-dot[aria-current="true"]{ width:26px; background:var(--g-600); }
.lp-icon-btn{ width:38px; height:38px; border-radius:12px; display:grid; place-items:center; background:#fff; border:1.5px solid var(--line); color:var(--g-700); transition:border-color .2s, background-color .2s; }
.lp-icon-btn:hover{ border-color:var(--g-500); background:var(--g-50); }

/* Marquee */
.lp-marquee-mask{ overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
.lp-marquee{ display:flex; gap:16px; width:max-content; animation:lp-scroll 46s linear infinite; }
.lp-marquee:hover{ animation-play-state:paused; }
@keyframes lp-scroll{ to{ transform:translateX(calc(-50% - 8px)); } }
.lp-tcard{ width:190px; flex-shrink:0; border-radius:20px; overflow:hidden; background:#fff; border:1px solid var(--line); box-shadow:0 18px 30px -24px rgba(10,46,30,.5); }

/* Cards */
.lp-card{ background:#fff; border:1px solid var(--line); border-radius:24px; transition:transform .2s, border-color .2s, box-shadow .2s; }
.lp-card-hover:hover{ transform:translateY(-4px); border-color:var(--g-500); box-shadow:0 26px 40px -30px rgba(11,107,63,.55); }
.lp-tile{ width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:var(--g-100); color:var(--g-700); }
.lp-tile-y{ background:var(--y-soft); color:#8A6400; }
.lp-soft{ background:var(--g-50); }
.lp-band{ background:linear-gradient(160deg,var(--g-900),var(--g-700)); color:#fff; position:relative; overflow:hidden; border-radius:32px; }
.lp-band h2{ color:#fff; }
.lp-step{ width:34px; height:34px; border-radius:99px; background:var(--g-600); color:#fff; display:grid; place-items:center; font-weight:800; font-size:.9rem; }
.lp-time{ display:inline-flex; align-items:center; gap:.35rem; padding:.2rem .6rem; border-radius:99px; background:var(--y-soft); color:#7A5700; font-size:.75rem; font-weight:700; }

/* Motion */
.lp-rise{ animation:lp-rise .85s cubic-bezier(.2,.7,.2,1) both; animation-delay:var(--d,0s); }
.lp-reveal{ opacity:0; }
.lp-reveal.lp-in{ opacity:1; animation:lp-rise .75s cubic-bezier(.2,.7,.2,1) backwards; animation-delay:var(--d,0s); }
@keyframes lp-rise{ from{ opacity:0; transform:translateY(22px); } to{ opacity:1; } }
@keyframes lp-pop{ from{ opacity:0; transform:scale(.85) translateY(6px); } to{ opacity:1; } }
.lp-float{ animation:lp-float 5s ease-in-out infinite; }
@keyframes lp-float{ 0%,100%{ transform:translateY(0) rotate(8deg); } 50%{ transform:translateY(-9px) rotate(8deg); } }
.lp-bob{ animation:lp-bob 4.5s ease-in-out infinite; }
@keyframes lp-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-8px); } }
.lp-orb{ position:absolute; border-radius:999px; filter:blur(55px); pointer-events:none; animation:lp-drift 14s ease-in-out infinite; }
@keyframes lp-drift{ 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(30px,-26px) scale(1.12); } }
.lp-art{ width:100%; height:100%; }
.lp-slide[data-active="true"] .lp-art{ animation:lp-zoom 6s ease-out both; }
.lp-slide[data-active="true"] .lp-cap{ animation:lp-rise .6s .2s cubic-bezier(.2,.7,.2,1) both; }
@keyframes lp-zoom{ from{ transform:scale(1.12); } to{ transform:scale(1); } }
.lp-prog{ height:4px; border-radius:99px; background:var(--g-100); overflow:hidden; margin-top:16px; }
.lp-prog i{ display:block; height:100%; width:0; background:linear-gradient(90deg,var(--g-500),var(--y)); animation:lp-fill 4.5s linear forwards; }
@keyframes lp-fill{ from{ width:0; } to{ width:100%; } }
.lp-chip{ position:absolute; left:-16px; bottom:96px; z-index:2; }
.lp-chip span{ display:flex; align-items:center; gap:.45rem; background:#fff; border:1px solid var(--line); border-radius:14px; padding:.5rem .8rem; font-size:.78rem; font-weight:700; color:var(--g-700); box-shadow:0 14px 26px -14px rgba(10,46,30,.5); animation:lp-pop .5s cubic-bezier(.2,.7,.2,1) both; }
.lp-chip i{ width:18px; height:18px; border-radius:99px; background:var(--y); color:var(--g-950); display:grid; place-items:center; }
@media (max-width:640px){ .lp-chip{ left:8px; bottom:92px; } }
.lp-btn,.lp-btn-yellow{ position:relative; overflow:hidden; }
.lp-btn::after{ content:""; position:absolute; inset:0; background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.38) 50%,transparent 70%); transform:translateX(-130%); animation:lp-shine 5s ease-in-out infinite; pointer-events:none; }
@keyframes lp-shine{ 0%,55%{ transform:translateX(-130%); } 100%{ transform:translateX(130%); } }

@media (prefers-reduced-motion:reduce){
  .lp-rise,.lp-reveal.lp-in,.lp-float,.lp-bob,.lp-orb,.lp-art,.lp-cap,.lp-btn::after,.lp-chip span{ animation:none !important; }
  .lp-reveal{ opacity:1; }
  .lp-track,.lp-btn,.lp-btn-ghost,.lp-card{ transition:none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Design samples (drawn as SVG, so the page needs no image files)            */
/*  To use real pictures, add `image: "/samples/barbershop.jpg"` to any one.   */
/* -------------------------------------------------------------------------- */

type SampleType = "Logo" | "Flyer" | "Social Post" | "Business Card";

interface Sample {
  id: string;
  title: string;
  type: SampleType;
  name: string;
  tag: string;
  pal: { bg: string; fg: string; ac: string };
  image?: string;
}

const SAMPLES: Sample[] = [
  { id: "flyer-barber", title: "Shop opening flyer", type: "Flyer", name: "FRESH CUTS", tag: "Grand opening", pal: { bg: "#0A2E1E", fg: "#FFFFFF", ac: "#FFC93C" } },
  { id: "logo-tech", title: "Startup logo", type: "Logo", name: "NEXA", tag: "Smart software", pal: { bg: "#0F1B3D", fg: "#FFFFFF", ac: "#FFC93C" } },
  { id: "social-campus", title: "Campus event post", type: "Social Post", name: "Unilag Tech Club", tag: "Campus fest", pal: { bg: "#16A35F", fg: "#FFFFFF", ac: "#FFC93C" } },
  { id: "card-eng", title: "Engineer business card", type: "Business Card", name: "A. Bello", tag: "Civil Engineer", pal: { bg: "#0A2E1E", fg: "#FFFFFF", ac: "#7BE0A8" } },
  { id: "logo-food", title: "Kitchen logo", type: "Logo", name: "FRESH", tag: "Kitchen", pal: { bg: "#F3FAF6", fg: "#0A2E1E", ac: "#16A35F" } },
  { id: "flyer-sale", title: "Weekend sale flyer", type: "Flyer", name: "STYLE HUB", tag: "50% off", pal: { bg: "#FFF6D6", fg: "#0A2E1E", ac: "#0E8A50" } },
  { id: "social-night", title: "Friday night post", type: "Social Post", name: "Club Nova", tag: "Friday vibes", pal: { bg: "#1A0B3B", fg: "#FFFFFF", ac: "#B06CFF" } },
  { id: "card-beauty", title: "Beauty brand card", type: "Business Card", name: "Zuri Glow", tag: "Makeup artist", pal: { bg: "#FBEFEA", fg: "#3A2420", ac: "#C9785D" } },
];

function SampleArt({ s }: { s: Sample }) {
  const { bg, fg, ac } = s.pal;
  if (s.image) return <img src={s.image} alt={s.title} className="w-full h-full object-cover" />;
  const svg = { viewBox: "0 0 200 200", className: "w-full h-full block", role: "img", "aria-label": s.title } as const;
  const font = "system-ui, -apple-system, Segoe UI, sans-serif";

  switch (s.type) {
    case "Logo":
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={bg} />
          <circle cx="100" cy="78" r="38" fill="none" stroke={ac} strokeWidth="5" />
          <circle cx="100" cy="78" r="23" fill={ac} />
          <text x="100" y="87" textAnchor="middle" fontSize="26" fontWeight="800" fill={bg} fontFamily={font}>{s.name[0]}</text>
          <text x="100" y="146" textAnchor="middle" fontSize="21" fontWeight="800" fill={fg} letterSpacing="4" fontFamily={font}>{s.name}</text>
          <text x="100" y="164" textAnchor="middle" fontSize="9" fill={fg} opacity=".65" fontFamily={font}>{s.tag}</text>
        </svg>
      );
    case "Flyer":
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={bg} />
          <polygon points="0,0 200,0 200,64 0,104" fill={ac} />
          <text x="16" y="36" fontSize="15" fontWeight="800" fill={bg} letterSpacing="2" fontFamily={font}>{s.name}</text>
          <text x="16" y="138" fontSize="28" fontWeight="800" fill={fg} fontFamily={font}>{s.tag}</text>
          <rect x="16" y="150" width="90" height="4" rx="2" fill={fg} opacity=".25" />
          <rect x="16" y="160" width="64" height="4" rx="2" fill={fg} opacity=".25" />
          <rect x="16" y="174" width="72" height="18" rx="9" fill={ac} />
          <text x="52" y="187" textAnchor="middle" fontSize="9" fontWeight="700" fill={bg} fontFamily={font}>Book now</text>
          <circle cx="160" cy="130" r="26" fill="none" stroke={ac} strokeWidth="3" />
          <circle cx="160" cy="130" r="14" fill={ac} opacity=".9" />
        </svg>
      );
    case "Social Post":
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={bg} />
          <circle cx="150" cy="52" r="70" fill={ac} opacity=".22" />
          <circle cx="150" cy="52" r="38" fill={ac} opacity=".9" />
          <text x="18" y="108" fontSize="13" fill={fg} opacity=".75" fontFamily={font}>{s.name}</text>
          <text x="18" y="136" fontSize="27" fontWeight="800" fill={fg} fontFamily={font}>{s.tag}</text>
          <rect x="18" y="154" width="78" height="22" rx="11" fill={ac} />
          <text x="57" y="169" textAnchor="middle" fontSize="10" fontWeight="700" fill={bg} fontFamily={font}>Join us</text>
        </svg>
      );
    default:
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={ac} opacity=".2" />
          <g transform="rotate(-7 100 100)">
            <rect x="26" y="54" width="148" height="92" rx="8" fill={ac} opacity=".75" />
          </g>
          <g transform="rotate(4 100 100)">
            <rect x="24" y="52" width="148" height="92" rx="8" fill={bg} />
            <rect x="38" y="68" width="22" height="22" rx="6" fill={ac} />
            <text x="38" y="112" fontSize="14" fontWeight="800" fill={fg} fontFamily={font}>{s.name}</text>
            <text x="38" y="125" fontSize="8" fill={fg} opacity=".7" fontFamily={font}>{s.tag}</text>
            <rect x="110" y="70" width="46" height="3" rx="1.5" fill={fg} opacity=".35" />
            <rect x="120" y="80" width="36" height="3" rx="1.5" fill={fg} opacity=".35" />
            <rect x="112" y="124" width="44" height="3" rx="1.5" fill={ac} />
          </g>
        </svg>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const byId = (id: string) => SAMPLES.find((s) => s.id === id)!;

const SLIDES = [
  { who: "Small businesses", line: "A shop flyer in the time it takes to boil water.", sample: byId("flyer-barber") },
  { who: "Graphic designers", line: "First drafts for clients, ready before the call.", sample: byId("logo-tech") },
  { who: "Students", line: "Posters for your society event, without Canva stress.", sample: byId("social-campus") },
  { who: "Social creators", line: "Fresh post designs every week, same sharp look.", sample: byId("social-night") },
];

const AUDIENCES = [
  { icon: Store, title: "Small businesses", desc: "Get your logo, flyers and promo posts without paying a designer for each one." },
  { icon: PenTool, title: "Graphic designers", desc: "Turn rough ideas into first drafts fast, then clean up client files and backgrounds." },
  { icon: GraduationCap, title: "Students", desc: "Make posters, society flyers and project covers for school events, at student-friendly cost." },
  { icon: Share2, title: "Social creators", desc: "Keep your page looking sharp with new post designs whenever you need them." },
];

const STEPS = [
  { title: "Describe your idea", time: "About 30 seconds", desc: "Type your business name, pick a design type and say the style you want. Or start from a template." },
  { title: "AI designs it", time: "About 1 minute", desc: "TwoMinDesign turns your description into a finished design while you wait." },
  { title: "Download and post", time: "Instant", desc: "Save it as an image and use it on WhatsApp, Instagram, print or anywhere else." },
];

const TOOLS = [
  { icon: Sparkles, title: "AI Designer", desc: "Logos, flyers, social posts and business cards." },
  { icon: Award, title: "Certificate Correction", desc: "Fix names, dates and spelling on a certificate." },
  { icon: Eraser, title: "Background Removal", desc: "Cut out your subject and get a clean PNG." },
  { icon: FileImage, title: "PDF to Image", desc: "Turn every PDF page into a picture." },
  { icon: ScanText, title: "PDF to Editable Text", desc: "Pull text out of PDFs and scanned pages." },
  { icon: FilePen, title: "Document Editor", desc: "Edit the text, then save as TXT or Word." },
];

const TESTIMONIALS = [
  { name: "Emeka O.", role: "Barbershop Owner, Lagos", text: "TwoMinDesign help me create my shop logo in one minute. E come out sharp! My customers don dey ask who design am." },
  { name: "Tunde A.", role: "Fashion Designer, Abuja", text: "I use am for my Instagram promo flyers. The AI understand Lagos style. Na serious tool be this." },
  { name: "Chidi N.", role: "Restaurant Owner, PH", text: "The Hustler plan worth every kobo. 70 credits last me well well for the month." },
];

const POINTS = ["1 credit = 1 design", "Pay with Paystack", "Ready in about 2 minutes"];

/* -------------------------------------------------------------------------- */
/*  Hero carousel                                                             */
/* -------------------------------------------------------------------------- */

const SLIDE_ICONS = [Store, PenTool, GraduationCap, Share2];

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false); // mouse hover or keyboard focus
  const [userPaused, setUserPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const [reduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const running = !hold && !userPaused;
  const count = SLIDES.length;
  const go = (n: number) => setIndex((n + count) % count);

  return (
    <div
      className="lp-car lp-rise"
      style={{ "--d": "300ms" } as CSSProperties}
      role="group"
      aria-roledescription="carousel"
      aria-label="Examples of designs you can make"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHold(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setHold(true)}
      onBlur={() => setHold(false)}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="lp-sticker lp-float" aria-hidden>
        Ready in
        <br />
        2 min
      </div>

      <div className="lp-chip lp-bob" aria-hidden>
        <span key={index}>
          <i>
            <Check size={11} />
          </i>
          {SLIDES[index].sample.type} ready
        </span>
      </div>

      <div className="lp-car-frame">
        <div
          className="lp-track"
          style={{ transform: `translateX(-${index * 100}%)`, transition: reduced ? "none" : undefined }}
          aria-live={running ? "off" : "polite"}
        >
          {SLIDES.map((s, i) => {
            const Icon = SLIDE_ICONS[i];
            return (
              <div
                key={s.who}
                className="lp-slide"
                data-active={i === index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== index}
              >
                <div className="aspect-square sm:aspect-[5/4] overflow-hidden">
                  <div className="lp-art">
                    <SampleArt s={s.sample} />
                  </div>
                </div>
                <div className="lp-cap p-5 flex items-center gap-4">
                  <div className="lp-tile lp-tile-y shrink-0">
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold" style={{ color: "var(--g-950)" }}>{s.who}</p>
                    <p className="text-sm lp-muted">{s.line}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The progress bar is the autoplay timer: when it finishes, the next slide shows. */}
      <div className="lp-prog" aria-hidden>
        <i key={index} style={{ animationPlayState: running ? "running" : "paused" }} onAnimationEnd={() => go(index + 1)} />
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button key={s.who} onClick={() => go(i)} className="lp-dot" aria-label={`Show ${s.who}`} aria-current={i === index} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="lp-icon-btn" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}>
            {userPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button className="lp-icon-btn" onClick={() => go(index - 1)} aria-label="Previous slide">
            <ChevronLeft size={18} />
          </button>
          <button className="lp-icon-btn" onClick={() => go(index + 1)} aria-label="Next slide">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const delay = (i: number) => ({ "--d": `${i * 90}ms` }) as CSSProperties;

export default function LandingPage() {
  const [marqueePaused, setMarqueePaused] = useState(false);

  // Fade sections in as they scroll into view
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".lp .lp-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("lp-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("lp-in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="lp-header">
        <div className="lp-wrap h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="lp-logo">2</span>
            <span className="font-display font-extrabold text-lg" style={{ color: "var(--g-950)" }}>
              TwoMinDesign
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-7">
            <a href="#who" className="lp-link">Who it is for</a>
            <a href="#how" className="lp-link">How it works</a>
            <a href="#tools" className="lp-link">Tools</a>
            <Link to="/pricing" className="lp-link">Pricing</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="lp-link hidden sm:block px-3">Sign in</Link>
            <Link to="/auth" className="lp-btn lp-btn-sm">Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden />
        <span className="lp-orb" aria-hidden style={{ width: 260, height: 260, right: "6%", top: 40, background: "rgba(22,163,95,.28)" }} />
        <span className="lp-orb" aria-hidden style={{ width: 200, height: 200, left: -40, bottom: 20, background: "rgba(255,201,60,.30)", animationDelay: "-6s" }} />

        <div className="lp-wrap lp-hero-inner relative grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <span className="lp-pill lp-rise" style={delay(0)}>
              <i>
                <Zap size={12} />
              </i>
              Two-minute designs for everyone
            </span>

            <h1 className="lp-rise font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-6 mb-5" style={delay(1)}>
              Design your brand in minutes
            </h1>

            <p className="lp-rise lp-muted text-lg leading-relaxed max-w-xl mb-8" style={delay(2)}>
              Logos, flyers, social posts and business cards for small businesses, freelance designers and students.
              Describe what you need and AI go handle the rest.
            </p>

            <div className="lp-rise flex flex-col sm:flex-row gap-3 mb-8" style={delay(3)}>
              <Link to="/auth" className="lp-btn">
                Start designing free
                <span className="lp-btn-ico">
                  <ArrowRight size={16} />
                </span>
              </Link>
              <Link to="/pricing" className="lp-btn-ghost">
                See pricing
              </Link>
            </div>

            <ul className="lp-rise flex flex-wrap gap-x-6 gap-y-2" style={delay(4)}>
              {POINTS.map((p) => (
                <li key={p} className="lp-point">
                  <b>
                    <Check size={12} />
                  </b>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <HeroCarousel />
        </div>
      </section>

      {/* Marquee of designs */}
      <section className="pb-20" aria-label="Designs made with TwoMinDesign">
        <div className="lp-wrap lp-reveal mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl md:text-3xl">Made with TwoMinDesign</h2>
            <p className="lp-muted text-sm mt-1">A few of the looks you can create.</p>
          </div>
          <button className="lp-icon-btn shrink-0" onClick={() => setMarqueePaused((p) => !p)} aria-label={marqueePaused ? "Play design strip" : "Pause design strip"}>
            {marqueePaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
        <div className="lp-marquee-mask">
          <div className="lp-marquee" style={marqueePaused ? { animationPlayState: "paused" } : undefined}>
            {[...SAMPLES, ...SAMPLES].map((s, i) => (
              <figure key={`${s.id}-${i}`} className="lp-tcard" aria-hidden={i >= SAMPLES.length}>
                <div className="aspect-square">
                  <SampleArt s={s} />
                </div>
                <figcaption className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--g-950)" }}>{s.title}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="who" className="lp-soft py-20 scroll-mt-20">
        <div className="lp-wrap">
          <div className="max-w-2xl mb-12 lp-reveal">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-3">Made for people who need good design, fast</h2>
            <p className="lp-muted text-lg">Whether you are selling, freelancing or running a campus event, you get a clean design without a long wait.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AUDIENCES.map((a, i) => (
              <div key={a.title} className="lp-card lp-card-hover lp-reveal p-6" style={delay(i)}>
                <div className="lp-tile mb-5">
                  <a.icon size={22} />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{a.title}</h3>
                <p className="lp-muted text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 scroll-mt-20">
        <div className="lp-wrap">
          <div className="max-w-2xl mb-12 lp-reveal">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-3">Your design in about two minutes</h2>
            <p className="lp-muted text-lg">Three steps. No design skills, no waiting for a reply on WhatsApp.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="lp-card lp-reveal p-6" style={delay(i)}>
                <div className="flex items-center justify-between mb-5">
                  <span className="lp-step">{i + 1}</span>
                  <span className="lp-time">
                    <Clock size={12} />
                    {s.time}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{s.title}</h3>
                <p className="lp-muted text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="lp-soft py-20 scroll-mt-20">
        <div className="lp-wrap">
          <div className="max-w-2xl mb-12 lp-reveal">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-3">More than a design generator</h2>
            <p className="lp-muted text-lg">Everything you need to finish the job is in one dashboard, so you stop jumping between apps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((t, i) => (
              <div key={t.title} className="lp-card lp-card-hover lp-reveal p-6 flex gap-4" style={delay(i)}>
                <div className="lp-tile shrink-0">
                  <t.icon size={22} />
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1">{t.title}</h3>
                  <p className="lp-muted text-sm leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Zap, t: "One credit, one design", d: "Simple pricing. No subscriptions you forget about." },
              { icon: Shield, t: "Secure Paystack payment", d: "Pay by card, bank transfer or USSD." },
              { icon: Star, t: "Print-ready quality", d: "Sharp designs that hold up on screen and paper." },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3 p-4">
                <div className="lp-tile lp-tile-y" style={{ width: 40, height: 40, borderRadius: 13 }}>
                  <f.icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--g-950)" }}>{f.t}</p>
                  <p className="lp-muted text-sm">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="lp-wrap">
          <h2 className="lp-reveal font-display font-bold text-3xl md:text-4xl mb-12 max-w-2xl">What our users say</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className="lp-card lp-reveal p-6" style={delay(i)}>
                <div className="flex gap-0.5 mb-4" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} style={{ color: "var(--y)", fill: "var(--y)" }} />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed mb-5" style={{ color: "var(--ink)" }}>
                  “{t.text}”
                </blockquote>
                <figcaption>
                  <p className="font-semibold text-sm" style={{ color: "var(--g-950)" }}>{t.name}</p>
                  <p className="text-xs lp-muted">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="lp-wrap">
          <div className="lp-band lp-reveal px-6 py-14 md:px-14 md:py-16 grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div
              aria-hidden
              style={{ position: "absolute", right: -80, top: -80, width: 300, height: 300, borderRadius: 999, background: "radial-gradient(circle,rgba(255,201,60,.35),transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl mb-3">Ready to build your brand today?</h2>
              <p style={{ color: "rgba(255,255,255,.78)" }} className="text-lg">
                Make your first design in about two minutes. Pick a plan when you need more credits.
              </p>
            </div>
            <div className="relative flex flex-col sm:flex-row md:flex-col gap-3 md:items-stretch">
              <Link to="/auth" className="lp-btn-yellow">
                Start designing free
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                className="lp-btn-ghost"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.35)" }}
              >
                View plans and pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="lp-wrap py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="lp-logo" style={{ width: 28, height: 28, borderRadius: 9, fontSize: 13 }}>2</span>
            <span className="font-display font-bold text-sm" style={{ color: "var(--g-950)" }}>TwoMinDesign</span>
          </div>
          <p className="text-sm lp-muted">© {new Date().getFullYear()} TwoMinDesign. Design for small businesses, creators and students.</p>
          <div className="flex gap-5 text-sm">
            <Link to="/pricing" className="lp-link">Pricing</Link>
            <Link to="/auth" className="lp-link">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}