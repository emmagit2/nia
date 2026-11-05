import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  X,
  Check,
  Clock,
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
  Shield,
  Star,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Styles. Scoped under .lp and independent of Tailwind, so the layout and    */
/*  breakpoints work the same whatever your global config looks like.          */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400;500;600;700&display=swap');

.lp{
  --green-950:#082A1C; --green-900:#0C3B28; --green-700:#12603F; --green-600:#177A50;
  --gold:#FFC72C; --gold-soft:#FFF1C2;
  --ink:#14201A; --muted:#55645B; --line:#DDE3DE; --wash:#F4F6F3;
  --display:'Bricolage Grotesque','Figtree',system-ui,sans-serif;
  --body:'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-family:var(--body); color:var(--ink); background:#fff; min-height:100vh;
  line-height:1.55; overflow-x:hidden; -webkit-font-smoothing:antialiased;
}
.lp *,.lp *::before,.lp *::after{ box-sizing:border-box; }
.lp :where(h1,h2,h3,p,ul,ol,figure,blockquote,dl,dd){ margin:0; padding:0; }
.lp :where(ul,ol){ list-style:none; }
.lp :where(a){ color:inherit; text-decoration:none; }
.lp :where(button){ font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; }
.lp :where(h1,h2,h3){ font-family:var(--display); color:var(--green-950); font-weight:700; letter-spacing:-.025em; line-height:1.1; }
.lp :focus-visible{ outline:2px solid var(--green-700); outline-offset:3px; border-radius:6px; }
.lp-dark :focus-visible{ outline-color:var(--gold); }

.lp-wrap{ max-width:1160px; margin:0 auto; padding:0 20px; }
.lp-section{ padding:72px 0; scroll-margin-top:64px; }
.lp-wash{ background:var(--wash); }
.lp-head{ max-width:40rem; margin-bottom:40px; }
.lp-head h2{ font-size:clamp(1.85rem,4.4vw,2.7rem); margin-bottom:12px; }
.lp-head p{ color:var(--muted); font-size:1.05rem; }
.lp-svg{ display:block; width:100%; height:100%; }

/* Header */
.lp-header{ position:sticky; top:0; z-index:50; background:rgba(255,255,255,.95); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
.lp-header-row{ height:64px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.lp-brand{ display:flex; align-items:center; gap:10px; font-family:var(--display); font-weight:700; font-size:1.15rem; letter-spacing:-.02em; color:var(--green-950); }
.lp-mark{ width:32px; height:32px; border-radius:8px; background:var(--green-900); color:var(--gold); display:grid; place-items:center; font-weight:800; font-size:1.05rem; }
.lp-nav{ display:none; gap:30px; }
.lp-nav a{ font-size:.95rem; font-weight:500; color:var(--muted); padding:6px 0; }
.lp-nav a:hover{ color:var(--green-700); }
.lp-actions{ display:flex; align-items:center; gap:10px; }
.lp-signin{ display:none; font-size:.95rem; font-weight:500; color:var(--muted); padding:0 8px; }
.lp-signin:hover{ color:var(--green-700); }
.lp-menu-btn{ width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--line); border-radius:8px; }
.lp-drawer{ border-top:1px solid var(--line); background:#fff; padding:4px 20px 16px; }
.lp-drawer a{ display:block; padding:14px 0; border-bottom:1px solid var(--line); font-weight:500; }
.lp-drawer a:last-child{ border-bottom:0; }
@media (min-width:900px){
  .lp-nav{ display:flex; } .lp-signin{ display:block; }
  .lp-menu-btn,.lp-drawer{ display:none; }
}

/* Buttons */
.lp-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:48px; padding:0 22px; border-radius:10px; font-weight:600; font-size:.98rem; background:var(--green-900); color:#fff; border:1px solid var(--green-900); transition:background-color .15s,border-color .15s; }
.lp-btn:hover{ background:var(--green-700); border-color:var(--green-700); }
.lp-btn-line{ background:transparent; color:var(--green-900); border-color:#B9C5BE; }
.lp-btn-line:hover{ background:var(--wash); border-color:var(--green-900); }
.lp-btn-gold{ background:var(--gold); color:var(--green-950); border-color:var(--gold); }
.lp-btn-gold:hover{ background:#FFD35A; border-color:#FFD35A; }
.lp-btn-outline-light{ background:transparent; color:#fff; border-color:rgba(255,255,255,.4); }
.lp-btn-outline-light:hover{ background:rgba(255,255,255,.1); border-color:#fff; }
.lp-btn-sm{ min-height:40px; padding:0 16px; font-size:.9rem; }

/* Hero */
.lp-hero{ padding:36px 0 64px; }
.lp-hero-grid{ display:grid; gap:40px; align-items:center; }
.lp-h1{ font-size:clamp(2.35rem,9vw,3.7rem); line-height:1.02; letter-spacing:-.035em; margin-bottom:20px; }
.lp-lead{ font-size:1.1rem; color:var(--muted); max-width:30em; margin-bottom:28px; }
.lp-cta{ display:flex; flex-direction:column; gap:12px; margin-bottom:28px; }
.lp-facts{ display:flex; flex-wrap:wrap; gap:10px 22px; font-size:.92rem; color:var(--muted); }
.lp-facts li{ display:flex; align-items:center; gap:8px; }
.lp-facts svg{ color:var(--green-600); flex:none; }
.lp-copy > *{ animation:lp-rise .7s cubic-bezier(.2,.7,.2,1) both; }
.lp-copy > :nth-child(2){ animation-delay:.08s; } .lp-copy > :nth-child(3){ animation-delay:.16s; } .lp-copy > :nth-child(4){ animation-delay:.24s; }
.lp-stage{ animation:lp-rise .8s .2s cubic-bezier(.2,.7,.2,1) both; }
@keyframes lp-rise{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:none; } }
@keyframes lp-swap{ from{ opacity:0; transform:scale(.97); } to{ opacity:1; transform:none; } }
@media (min-width:560px){ .lp-cta{ flex-direction:row; } }
@media (min-width:1000px){
  .lp-hero{ padding:72px 0 96px; }
  .lp-hero-grid{ grid-template-columns:1fr 1.02fr; gap:64px; }
}

/* Prompt to design demo */
.lp-stage{ background:var(--green-900); color:#fff; border-radius:20px; padding:14px; max-width:600px; width:100%; }
.lp-tabs{ display:flex; gap:6px; overflow-x:auto; margin-bottom:12px; scrollbar-width:none; }
.lp-tabs::-webkit-scrollbar{ display:none; }
.lp-tab{ flex:none; min-height:40px; padding:0 14px; border-radius:8px; font-size:.9rem; font-weight:600; white-space:nowrap; color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.24); transition:background-color .15s,color .15s,border-color .15s; }
.lp-tab:hover{ color:#fff; border-color:rgba(255,255,255,.55); }
.lp-tab[aria-pressed="true"]{ background:var(--gold); border-color:var(--gold); color:var(--green-950); }
.lp-prompt{ background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:14px 16px; margin-bottom:12px; min-height:7.75rem; }
.lp-prompt small{ display:block; font-size:.82rem; color:rgba(255,255,255,.62); margin-bottom:4px; }
.lp-prompt p{ line-height:1.5; }
.lp-result{ display:grid; gap:14px; }
.lp-art{ aspect-ratio:1; border-radius:12px; overflow:hidden; background:#fff; animation:lp-swap .35s ease-out; }
.lp-meta{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.lp-meta dt{ font-size:.8rem; color:rgba(255,255,255,.62); }
.lp-meta dd{ font-weight:600; font-size:.95rem; }
@media (min-width:560px){
  .lp-stage{ padding:22px; }
  .lp-prompt{ min-height:6.5rem; }
  .lp-result{ grid-template-columns:minmax(0,1fr) 150px; align-items:end; gap:20px; }
  .lp-meta{ grid-template-columns:1fr; gap:16px; }
}

/* Gallery */
.lp-gallery{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 14px; }
.lp-shot-art{ aspect-ratio:1; border-radius:12px; overflow:hidden; border:1px solid var(--line); }
.lp-shot figcaption{ margin-top:10px; display:flex; flex-direction:column; }
.lp-shot b{ font-weight:600; font-size:.95rem; line-height:1.3; }
.lp-shot span{ font-size:.85rem; color:var(--muted); }
@media (min-width:900px){
  .lp-gallery{ grid-template-columns:repeat(4,minmax(0,1fr)); gap:32px 22px; padding-bottom:32px; }
  .lp-shot:nth-child(even){ transform:translateY(32px); }
}

/* Audiences */
.lp-split{ display:grid; gap:8px; }
.lp-rows li{ display:flex; gap:16px; padding:24px 0; border-top:1px solid var(--line); }
.lp-rows li:last-child{ border-bottom:1px solid var(--line); }
.lp-rows svg{ flex:none; margin-top:4px; color:var(--green-600); }
.lp-rows h3{ font-size:1.25rem; margin-bottom:6px; }
.lp-rows p{ color:var(--muted); max-width:34em; }
@media (min-width:900px){
  .lp-split{ grid-template-columns:1fr 1.5fr; gap:80px; }
  .lp-split .lp-head{ position:sticky; top:104px; align-self:start; margin-bottom:0; }
}

/* Steps */
.lp-steps{ display:grid; gap:32px; }
.lp-steps li{ border-top:2px solid var(--green-900); padding-top:20px; }
.lp-step-top{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:14px; }
.lp-step-n{ font-family:var(--display); font-size:2.6rem; font-weight:700; line-height:1; color:var(--green-700); }
.lp-time{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; font-weight:600; color:var(--muted); }
.lp-steps h3{ font-size:1.25rem; margin-bottom:8px; }
.lp-steps p{ color:var(--muted); }
@media (min-width:800px){ .lp-steps{ grid-template-columns:repeat(3,1fr); gap:40px; } }

/* Tools */
.lp-tools{ display:grid; gap:1px; background:var(--line); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.lp-tool{ background:#fff; padding:24px; display:flex; gap:14px; }
.lp-tool svg{ flex:none; margin-top:3px; color:var(--green-700); }
.lp-tool h3{ font-size:1.05rem; margin-bottom:4px; }
.lp-tool p{ color:var(--muted); font-size:.95rem; }
.lp-perks{ display:grid; gap:22px; margin-top:40px; }
.lp-perks li{ display:flex; gap:12px; }
.lp-perks svg{ flex:none; margin-top:3px; color:var(--green-700); }
.lp-perks b{ display:block; font-weight:600; }
.lp-perks span{ color:var(--muted); font-size:.95rem; }
@media (min-width:620px){ .lp-tools{ grid-template-columns:repeat(2,1fr); } }
@media (min-width:960px){ .lp-tools{ grid-template-columns:repeat(3,1fr); } }
@media (min-width:720px){ .lp-perks{ grid-template-columns:repeat(3,1fr); gap:32px; } }

/* Quotes */
.lp-quotes{ display:grid; gap:40px; }
.lp-quote-main::before{ content:""; display:block; width:40px; height:4px; background:var(--gold); margin-bottom:22px; }
.lp-quote-main blockquote{ font-family:var(--display); font-size:clamp(1.35rem,3.2vw,1.95rem); line-height:1.3; letter-spacing:-.015em; font-weight:600; color:var(--green-950); margin-bottom:20px; }
.lp-quote-side{ display:grid; gap:32px; align-content:start; }
.lp-quote-side figure{ border-left:3px solid var(--gold); padding-left:18px; }
.lp-quote-side blockquote{ margin-bottom:12px; }
.lp-who b{ display:block; font-weight:600; }
.lp-who span{ font-size:.9rem; color:var(--muted); }
@media (min-width:900px){ .lp-quotes{ grid-template-columns:1.3fr 1fr; gap:72px; } }

/* CTA + footer */
.lp-band{ background:var(--green-900); color:#fff; border-radius:20px; padding:40px 24px; display:grid; gap:28px; }
.lp-band h2{ color:#fff; font-size:clamp(1.8rem,4.2vw,2.6rem); margin-bottom:10px; }
.lp-band p{ color:rgba(255,255,255,.8); font-size:1.05rem; }
.lp-band-btns{ display:flex; flex-direction:column; gap:12px; }
@media (min-width:800px){
  .lp-band{ padding:56px; grid-template-columns:1.4fr 1fr; align-items:center; }
  .lp-band-btns{ max-width:320px; justify-self:end; width:100%; }
}
.lp-footer{ border-top:1px solid var(--line); }
.lp-footer-row{ padding:28px 0; display:flex; flex-direction:column; align-items:flex-start; gap:14px; font-size:.9rem; color:var(--muted); }
.lp-footer-links{ display:flex; gap:20px; }
.lp-footer-links a:hover{ color:var(--green-700); }
@media (min-width:760px){ .lp-footer-row{ flex-direction:row; align-items:center; justify-content:space-between; } }

@media (min-width:768px){
  .lp-wrap{ padding:0 32px; }
  .lp-section{ padding:96px 0; }
  .lp-head{ margin-bottom:48px; }
}
@media (prefers-reduced-motion:reduce){
  .lp-copy > *,.lp-stage,.lp-art{ animation:none !important; }
  .lp *{ transition:none !important; }
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
  if (s.image) return <img src={s.image} alt={s.title} className="lp-svg" style={{ objectFit: "cover" }} />;
  const svg = { viewBox: "0 0 200 200", className: "lp-svg", role: "img", "aria-label": s.title } as const;
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

const DEMO = [
  { label: "Flyer", sample: byId("flyer-barber"), prompt: "Grand opening flyer for Fresh Cuts barbershop. Saturday, 10am. Dark green and gold." },
  { label: "Logo", sample: byId("logo-tech"), prompt: "Logo for Nexa, a software startup. Simple, navy blue with a yellow accent." },
  { label: "Social post", sample: byId("social-campus"), prompt: "Instagram post for the Unilag Tech Club campus fest. Bright green, bold text." },
  { label: "Business card", sample: byId("card-eng"), prompt: "Business card for A. Bello, civil engineer. Dark green, clean and professional." },
];

const AUDIENCES = [
  { icon: Store, title: "Small businesses", desc: "Get your logo, flyers and promo posts without paying a designer for each one." },
  { icon: PenTool, title: "Graphic designers", desc: "Turn rough ideas into first drafts fast, then clean up client files and backgrounds." },
  { icon: GraduationCap, title: "Students", desc: "Make posters, society flyers and project covers for school events, at student-friendly cost." },
  { icon: Share2, title: "Social creators", desc: "Keep your page looking sharp with new post designs whenever you need them." },
];

const STEPS = [
  { title: "Describe your idea", time: "About 30 seconds", desc: "Type your business name, pick a design type and say the style you want. Or start from a template." },
  { title: "The AI designs it", time: "About 1 minute", desc: "TwoMinDesign turns your description into a finished design while you wait." },
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

const PERKS = [
  { icon: Zap, t: "One credit, one design", d: "Simple pricing. No subscriptions you forget about." },
  { icon: Shield, t: "Secure Paystack payment", d: "Pay by card, bank transfer or USSD." },
  { icon: Star, t: "Print-ready quality", d: "Sharp designs that hold up on screen and paper." },
];

const QUOTES = [
  { name: "Emeka O.", role: "Barbershop owner, Lagos", text: "TwoMinDesign help me create my shop logo in one minute. E come out sharp! My customers don dey ask who design am." },
  { name: "Tunde A.", role: "Fashion designer, Abuja", text: "I use am for my Instagram promo flyers. The AI understand Lagos style. Na serious tool be this." },
  { name: "Chidi N.", role: "Restaurant owner, PH", text: "The Hustler plan worth every kobo. 70 credits last me well well for the month." },
];

const POINTS = ["1 credit = 1 design", "Pay with Paystack", "Ready in about 2 minutes"];

const NAV = [
  { href: "#who", label: "Who it’s for" },
  { href: "#how", label: "How it works" },
  { href: "#tools", label: "Tools" },
];

/* -------------------------------------------------------------------------- */
/*  Hero demo: pick a design type, see the prompt and the result               */
/* -------------------------------------------------------------------------- */

function Studio() {
  const [i, setI] = useState(0);
  const d = DEMO[i];

  return (
    <div className="lp-stage lp-dark">
      <div className="lp-tabs" role="group" aria-label="Choose a design type">
        {DEMO.map((t, n) => (
          <button key={t.label} className="lp-tab" aria-pressed={n === i} onClick={() => setI(n)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="lp-prompt" aria-live="polite">
        <small>You write</small>
        <p key={d.label}>{d.prompt}</p>
      </div>

      <div className="lp-result">
        <div className="lp-art" key={d.sample.id}>
          <SampleArt s={d.sample} />
        </div>
        <dl className="lp-meta">
          <div>
            <dt>You get</dt>
            <dd>{d.sample.type}</dd>
          </div>
          <div>
            <dt>Ready in</dt>
            <dd>About 1 minute</dd>
          </div>
          <div>
            <dt>Costs</dt>
            <dd>1 credit</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const [main, ...others] = QUOTES;

  return (
    <div className="lp">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Link to="/" className="lp-brand">
            <span className="lp-mark" aria-hidden>2</span>
            TwoMinDesign
          </Link>

          <nav aria-label="Main" className="lp-nav">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>{n.label}</a>
            ))}
            <Link to="/pricing">Pricing</Link>
          </nav>

          <div className="lp-actions">
            <Link to="/auth" className="lp-signin">Sign in</Link>
            <Link to="/auth" className="lp-btn lp-btn-sm">Start free</Link>
            <button
              className="lp-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="lp-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="lp-drawer" className="lp-drawer" aria-label="Mobile">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
            ))}
            <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign in</Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-copy">
            <h1 className="lp-h1">Your logo, flyer or post. Ready in two minutes.</h1>
            <p className="lp-lead">
              Describe what you need and the AI designs it. Made for small businesses, freelance designers and students.
            </p>
            <div className="lp-cta">
              <Link to="/auth" className="lp-btn">Start designing free</Link>
              <Link to="/pricing" className="lp-btn lp-btn-line">See pricing</Link>
            </div>
            <ul className="lp-facts">
              {POINTS.map((p) => (
                <li key={p}>
                  <Check size={16} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <Studio />
        </div>
      </section>

      {/* Gallery */}
      <section className="lp-section lp-wash" aria-labelledby="gallery-h">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 id="gallery-h">Made with TwoMinDesign</h2>
            <p>Flyers, logos, posts and cards. Each one started as a sentence.</p>
          </div>
          <div className="lp-gallery">
            {SAMPLES.map((s) => (
              <figure key={s.id} className="lp-shot">
                <div className="lp-shot-art">
                  <SampleArt s={s} />
                </div>
                <figcaption>
                  <b>{s.title}</b>
                  <span>{s.type}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="who" className="lp-section">
        <div className="lp-wrap lp-split">
          <div className="lp-head">
            <h2>Built for people who need good design today</h2>
            <p>Whether you’re selling, freelancing or running a campus event, you get a finished design without the wait.</p>
          </div>
          <ul className="lp-rows">
            {AUDIENCES.map((a) => (
              <li key={a.title}>
                <a.icon size={22} aria-hidden />
                <div>
                  <h3>{a.title}</h3>
                  <p>{a.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-section lp-wash">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2>From idea to download in about two minutes</h2>
            <p>Three steps. No design skills, and no waiting for a reply on WhatsApp.</p>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s, n) => (
              <li key={s.title}>
                <div className="lp-step-top">
                  <span className="lp-step-n" aria-hidden>{n + 1}</span>
                  <span className="lp-time">
                    <Clock size={14} aria-hidden />
                    {s.time}
                  </span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2>More than a design generator</h2>
            <p>Everything you need to finish the job is in one dashboard, so you stop jumping between apps.</p>
          </div>
          <div className="lp-tools">
            {TOOLS.map((t) => (
              <div key={t.title} className="lp-tool">
                <t.icon size={22} aria-hidden />
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <ul className="lp-perks">
            {PERKS.map((f) => (
              <li key={f.t}>
                <f.icon size={20} aria-hidden />
                <div>
                  <b>{f.t}</b>
                  <span>{f.d}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-section lp-wash" aria-labelledby="quotes-h">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 id="quotes-h">What our users say</h2>
          </div>
          <div className="lp-quotes">
            <figure className="lp-quote-main">
              <blockquote>“{main.text}”</blockquote>
              <figcaption className="lp-who">
                <b>{main.name}</b>
                <span>{main.role}</span>
              </figcaption>
            </figure>
            <div className="lp-quote-side">
              {others.map((q) => (
                <figure key={q.name}>
                  <blockquote>“{q.text}”</blockquote>
                  <figcaption className="lp-who">
                    <b>{q.name}</b>
                    <span>{q.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-band lp-dark">
            <div>
              <h2>Make your first design today</h2>
              <p>It takes about two minutes. Pick a plan when you need more credits.</p>
            </div>
            <div className="lp-band-btns">
              <Link to="/auth" className="lp-btn lp-btn-gold">Start designing free</Link>
              <Link to="/pricing" className="lp-btn lp-btn-outline-light">View plans and pricing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <Link to="/" className="lp-brand">
            <span className="lp-mark" aria-hidden>2</span>
            TwoMinDesign
          </Link>
          <p>© {new Date().getFullYear()} TwoMinDesign. Design for small businesses, creators and students.</p>
          <div className="lp-footer-links">
            <Link to="/pricing">Pricing</Link>
            <Link to="/auth">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}