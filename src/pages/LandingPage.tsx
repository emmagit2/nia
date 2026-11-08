 import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactNode } from "react";
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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Styles. Scoped under .lp and independent of Tailwind.                      */
/*  Colour balance: about 60% white, 30% green, 10% yellow.                    */
/*  Green is used in three blocks only: hero demo card, audience panel, CTA.   */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400;500;600;700&display=swap');

.lp{
  --green-950:#061F15; --green-900:#0A2E1E; --green-800:#0E4430; --green-700:#12603F; --green-600:#177A50; --green-400:#3DDC97;
  --gold:#FFC72C; --gold-soft:#FFF1C2;
  --ink:#14201A; --muted:#55645B; --line:#DDE3DE; --wash:#F4F6F3;
  --display:'Bricolage Grotesque','Figtree',system-ui,sans-serif;
  --body:'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-family:var(--body); color:var(--ink); background:#fff; min-height:100vh;
  line-height:1.55; overflow-x:clip; -webkit-font-smoothing:antialiased; position:relative;
}
.lp *,.lp *::before,.lp *::after{ box-sizing:border-box; }
.lp :where(h1,h2,h3,p,ul,ol,figure,blockquote,dl,dd){ margin:0; padding:0; }
.lp :where(ul,ol){ list-style:none; }
.lp :where(a){ color:inherit; text-decoration:none; }
.lp :where(button){ font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; }
.lp :where(h1,h2,h3){ font-family:var(--display); color:var(--green-950); font-weight:700; letter-spacing:-.03em; line-height:1.08; }
.lp :focus-visible{ outline:2px solid var(--green-700); outline-offset:3px; border-radius:6px; }
.lp-dark :focus-visible{ outline-color:var(--gold); }
.lp-dark :where(h1,h2,h3){ color:#fff; }

.lp-wrap{ max-width:1180px; margin:0 auto; padding:0 20px; }
.lp-section{ padding:80px 0; scroll-margin-top:72px; position:relative; }
.lp-wash{ background:var(--wash); }
.lp-svg{ display:block; width:100%; height:100%; }
.lp-hero-grid,.lp-split,.lp-steps,.lp-tools,.lp-perks,.lp-quotes,.lp-band,.lp-result,.lp-aud-panel{ grid-template-columns:minmax(0,1fr); }
.lp-hero-grid > *,.lp-split > *,.lp-band > *,.lp-aud-panel > *{ min-width:0; }

.lp-eyebrow{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; font-size:.78rem; font-weight:700; letter-spacing:.02em; background:rgba(23,122,80,.1); color:var(--green-700); border:1px solid rgba(23,122,80,.2); margin-bottom:16px; }
.lp-eyebrow i{ width:7px; height:7px; border-radius:99px; background:var(--green-600); animation:lp-ping 1.8s infinite; }
.lp-dark .lp-eyebrow{ background:rgba(255,255,255,.08); color:var(--gold); border-color:rgba(255,255,255,.16); }
.lp-dark .lp-eyebrow i{ background:var(--green-400); }
@keyframes lp-ping{ 70%{ box-shadow:0 0 0 8px rgba(61,220,151,0); } 0%{ box-shadow:0 0 0 0 rgba(61,220,151,.6); } 100%{ box-shadow:0 0 0 0 rgba(61,220,151,0); } }
.lp-head{ max-width:42rem; margin-bottom:44px; }
.lp-head h2{ font-size:clamp(1.9rem,4.6vw,2.9rem); margin-bottom:12px; }
.lp-head p{ color:var(--muted); font-size:1.06rem; }
/* The rotating word sits on white, so it uses a green gradient for contrast. */
.lp-grad{ background:linear-gradient(90deg,var(--green-700),var(--green-400)); -webkit-background-clip:text; background-clip:text; color:transparent; }

/* scroll reveal */
.lp-rv{ opacity:0; transform:translateY(26px); transition:opacity .75s cubic-bezier(.2,.7,.2,1) var(--d,0s), transform .75s cubic-bezier(.2,.7,.2,1) var(--d,0s); }
.lp-rv[data-in="true"]{ opacity:1; transform:none; }

/* progress */
.lp-progress{ position:fixed; top:0; left:0; right:0; height:3px; z-index:70; transform-origin:0 50%; transform:scaleX(var(--p,0)); background:linear-gradient(90deg,var(--gold),#FF9F1C,var(--green-400)); }

/* Header (white) */
.lp-header{ position:sticky; top:0; z-index:60; background:rgba(255,255,255,.82); backdrop-filter:blur(14px); border-bottom:1px solid var(--line); transition:background-color .25s,border-color .25s; }
.lp-header[data-s="true"]{ background:rgba(255,255,255,.96); }
.lp-header-row{ height:66px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.lp-brand{ display:flex; align-items:center; gap:10px; font-family:var(--display); font-weight:700; font-size:1.15rem; letter-spacing:-.02em; color:var(--green-950); }
.lp-mark{ width:34px; height:34px; border-radius:10px; background:linear-gradient(180deg,#FFE27A,var(--gold)); color:var(--green-950); display:grid; place-items:center; font-weight:800; font-size:1.05rem; box-shadow:0 8px 20px -8px rgba(255,199,44,.8); }
.lp-nav{ display:none; gap:6px; }
.lp-nav a{ font-size:.93rem; font-weight:500; color:var(--muted); padding:8px 14px; border-radius:999px; transition:background-color .15s,color .15s; }
.lp-nav a:hover{ color:var(--green-950); background:var(--wash); }
.lp-actions{ display:flex; align-items:center; gap:10px; }
.lp-signin{ display:none; font-size:.93rem; font-weight:500; color:var(--muted); padding:0 8px; }
.lp-signin:hover{ color:var(--green-950); }
.lp-menu-btn{ width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--line); border-radius:10px; color:var(--ink); }
.lp-drawer{ border-top:1px solid var(--line); background:#fff; padding:4px 20px 16px; }
.lp-drawer a{ display:block; padding:14px 0; border-bottom:1px solid var(--line); font-weight:500; color:var(--ink); }
.lp-drawer a:last-child{ border-bottom:0; }
@media (min-width:900px){
  .lp-nav{ display:flex; } .lp-signin{ display:block; }
  .lp-menu-btn,.lp-drawer{ display:none; }
}

/* Buttons */
.lp-btn{ position:relative; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:50px; padding:0 24px; border-radius:12px; font-weight:700; font-size:.98rem; background:var(--green-900); color:#fff; border:1px solid var(--green-900); transition:transform .15s,background-color .15s,border-color .15s,box-shadow .2s; }
.lp-btn:hover{ background:var(--green-700); border-color:var(--green-700); transform:translateY(-2px); }
.lp-btn-line{ background:transparent; color:var(--green-900); border-color:#B9C5BE; }
.lp-btn-line:hover{ background:var(--wash); border-color:var(--green-900); color:var(--green-900); }
.lp-btn-gold{ background:linear-gradient(180deg,#FFE27A,var(--gold) 60%,#F2B300); color:var(--green-950); border-color:var(--gold); box-shadow:0 14px 30px -12px rgba(255,199,44,.75); }
.lp-btn-gold:hover{ background:linear-gradient(180deg,#FFE894,#FFD24A 60%,#F7BC10); border-color:#FFD24A; box-shadow:0 18px 36px -12px rgba(255,199,44,.9); }
.lp-btn-gold::after{ content:""; position:absolute; top:0; left:-60%; width:40%; height:100%; transform:skewX(-20deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent); animation:lp-shine 3.6s ease-in-out infinite; }
@keyframes lp-shine{ 0%,60%{ left:-60%; } 100%{ left:140%; } }
.lp-btn-outline-light{ background:transparent; color:#fff; border-color:rgba(255,255,255,.35); }
.lp-btn-outline-light:hover{ background:rgba(255,255,255,.1); border-color:#fff; }
.lp-btn-sm{ min-height:40px; padding:0 18px; font-size:.9rem; border-radius:10px; }

/* Hero (white, with soft colour) */
.lp-hero{ position:relative; overflow:hidden; background:#fff; color:var(--ink); padding:48px 0 80px; }
.lp-hero::before{ content:""; position:absolute; inset:0; background-image:linear-gradient(rgba(20,32,26,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,32,26,.05) 1px,transparent 1px); background-size:44px 44px; -webkit-mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent); mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent); }
.lp-orb{ position:absolute; border-radius:999px; filter:blur(80px); pointer-events:none; animation:lp-float 14s ease-in-out infinite alternate; }
.lp-orb.a{ width:460px; height:460px; left:-120px; top:-140px; background:var(--green-400); opacity:.18; }
.lp-orb.b{ width:380px; height:380px; right:-80px; top:40px; background:var(--gold); opacity:.28; animation-delay:-5s; }
.lp-orb.c{ width:320px; height:320px; left:40%; bottom:-160px; background:var(--green-600); opacity:.1; animation-delay:-9s; }
@keyframes lp-float{ from{ transform:translate3d(0,0,0) scale(1); } to{ transform:translate3d(50px,36px,0) scale(1.15); } }
.lp-hero-grid{ position:relative; display:grid; gap:48px; align-items:center; }
.lp-h1{ font-size:clamp(2.45rem,9vw,4.2rem); line-height:1; letter-spacing:-.04em; margin-bottom:20px; color:var(--green-950); }
.lp-caret{ display:inline-block; width:4px; height:.85em; margin-left:4px; vertical-align:-.08em; background:var(--green-600); animation:lp-blink 1s steps(1) infinite; }
@keyframes lp-blink{ 50%{ opacity:0; } }
.lp-lead{ font-size:1.12rem; color:var(--muted); max-width:31em; margin-bottom:30px; }
.lp-cta{ display:flex; flex-direction:column; gap:12px; margin-bottom:30px; }
.lp-hero .lp-btn-line{ color:var(--green-900); border-color:#B9C5BE; }
.lp-hero .lp-btn-line:hover{ background:var(--wash); border-color:var(--green-900); }
.lp-facts{ display:flex; flex-wrap:wrap; gap:10px 22px; font-size:.92rem; color:var(--muted); }
.lp-facts li{ display:flex; align-items:center; gap:8px; }
.lp-facts svg{ color:var(--green-600); flex:none; }
.lp-copy > *{ animation:lp-rise .8s cubic-bezier(.2,.7,.2,1) both; }
.lp-copy > :nth-child(2){ animation-delay:.08s; } .lp-copy > :nth-child(3){ animation-delay:.16s; } .lp-copy > :nth-child(4){ animation-delay:.24s; } .lp-copy > :nth-child(5){ animation-delay:.32s; }
@keyframes lp-rise{ from{ opacity:0; transform:translateY(18px); } to{ opacity:1; transform:none; } }
@media (min-width:560px){ .lp-cta{ flex-direction:row; } }
@media (min-width:1000px){
  .lp-hero{ padding:84px 0 110px; }
  .lp-hero-grid{ gap:64px; }
}

/* Hero collage: scattered design samples on white, placed on the left */
.lp-stagewrap{ position:relative; animation:lp-rise .9s .2s cubic-bezier(.2,.7,.2,1) both; }
@keyframes lp-swap{ from{ opacity:0; transform:scale(1.06); filter:blur(14px); } to{ opacity:1; transform:none; filter:blur(0); } }
.lp-collage{ position:relative; width:100%; max-width:560px; aspect-ratio:1; margin:0 auto; }
.lp-cl{ position:absolute; width:52%; aspect-ratio:1; border-radius:18px; overflow:hidden; background:#fff; border:5px solid #fff; box-shadow:0 0 0 1px var(--line),0 30px 50px -26px rgba(6,31,21,.45); transform:rotate(var(--r,0deg)); transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s; }
.lp-cl:hover{ transform:rotate(0deg) scale(1.05); z-index:5; box-shadow:0 0 0 1px var(--line),0 40px 60px -26px rgba(6,31,21,.55); }
.lp-cl.c1{ left:0; top:6%; --r:-6deg; z-index:1; }
.lp-cl.c2{ right:0; top:0; --r:5deg; z-index:2; }
.lp-cl.c3{ left:6%; bottom:0; --r:4deg; z-index:3; }
.lp-cl.c4{ right:2%; bottom:8%; --r:-4deg; z-index:2; }
.lp-float{ display:none; position:absolute; padding:10px 14px; border-radius:14px; background:#fff; color:var(--green-950); font-size:.82rem; font-weight:700; border:1px solid var(--line); box-shadow:0 20px 36px -18px rgba(6,31,21,.35); align-items:center; gap:8px; z-index:6; transform:translate(calc(var(--px,0)*14px),calc(var(--py,0)*14px)); transition:transform .2s ease-out; }
.lp-float svg{ color:var(--green-600); }
.lp-float.f1{ right:-10px; top:44%; } .lp-float.f2{ left:-10px; bottom:4%; } .lp-float.f2 svg{ color:#F2B300; }
@media (min-width:1000px){
  .lp-float{ display:flex; }
  .lp-stagewrap{ order:-1; }
  .lp-hero-grid{ grid-template-columns:1.02fr 1fr; }
}

/* Marquee strip (yellow band) */
.lp-strip{ background:var(--gold-soft); border-top:1px solid #F2DE9A; border-bottom:1px solid #F2DE9A; overflow:hidden; padding:16px 0; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
.lp-strip-track{ display:flex; gap:40px; width:max-content; animation:lp-marq 34s linear infinite; }
.lp-strip:hover .lp-strip-track{ animation-play-state:paused; }
.lp-strip span{ display:inline-flex; align-items:center; gap:40px; font-family:var(--display); font-weight:600; font-size:1.05rem; color:var(--green-900); white-space:nowrap; }
.lp-strip span::after{ content:"✦"; color:#E0A800; font-size:.8rem; }
@keyframes lp-marq{ to{ transform:translateX(-50%); } }

/* Stats */
.lp-stats{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:-46px; position:relative; z-index:2; }
.lp-stat{ background:#fff; border:1px solid var(--line); border-radius:18px; padding:20px; box-shadow:0 24px 40px -28px rgba(8,42,28,.45); }
.lp-stat strong{ display:block; font-family:var(--display); font-size:clamp(1.7rem,4vw,2.4rem); line-height:1; color:var(--green-900); font-variant-numeric:tabular-nums; }
.lp-stat span{ font-size:.88rem; color:var(--muted); }
@media (min-width:800px){ .lp-stats{ grid-template-columns:repeat(4,minmax(0,1fr)); } }

/* Gallery */
.lp-filters{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; }
.lp-chip{ padding:9px 16px; border-radius:999px; font-size:.88rem; font-weight:600; border:1px solid var(--line); background:#fff; color:var(--muted); transition:all .15s; }
.lp-chip:hover{ border-color:var(--green-700); color:var(--green-900); }
.lp-chip[aria-pressed="true"]{ background:var(--green-900); border-color:var(--green-900); color:#fff; }
.lp-gallery{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.lp-shot{ position:relative; border-radius:18px; overflow:hidden; background:#fff; border:1px solid var(--line); transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition:transform .15s ease-out,box-shadow .25s; will-change:transform; animation:lp-rise .5s both; }
.lp-shot:hover{ box-shadow:0 30px 50px -28px rgba(8,42,28,.55); }
.lp-shot-art{ aspect-ratio:1; overflow:hidden; }
.lp-shot-art .lp-svg{ transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.lp-shot:hover .lp-shot-art .lp-svg{ transform:scale(1.07); }
.lp-shot figcaption{ padding:12px 14px 14px; display:flex; flex-direction:column; }
.lp-shot b{ font-weight:600; font-size:.95rem; line-height:1.3; }
.lp-shot span{ font-size:.82rem; color:var(--muted); }
.lp-shot-tag{ position:absolute; left:10px; top:10px; padding:4px 10px; border-radius:999px; background:#000; color:#fff; font-size:.72rem; font-weight:600; }
.lp-shot-price{ position:absolute; right:10px; top:10px; padding:4px 10px; border-radius:999px; background:#fff; color:#000; border:1px solid #000; font-size:.72rem; font-weight:700; }
@media (min-width:900px){ .lp-gallery{ grid-template-columns:repeat(4,minmax(0,1fr)); gap:20px; } }

/* Audiences (interactive tabs) */
.lp-split{ display:grid; gap:36px; }
.lp-aud-list{ display:flex; flex-direction:column; gap:8px; }
.lp-aud-btn{ display:flex; align-items:center; gap:14px; width:100%; text-align:left; padding:16px 18px; border-radius:16px; border:1px solid var(--line); background:#fff; transition:all .2s; }
.lp-aud-btn:hover{ border-color:var(--green-600); transform:translateX(4px); }
.lp-aud-btn svg{ flex:none; color:var(--green-600); }
.lp-aud-btn b{ font-family:var(--display); font-size:1.1rem; font-weight:700; color:var(--green-950); }
.lp-aud-btn[aria-selected="true"]{ background:var(--green-900); border-color:var(--green-900); box-shadow:0 20px 36px -22px rgba(8,42,28,.8); }
.lp-aud-btn[aria-selected="true"] b{ color:#fff; }
.lp-aud-btn[aria-selected="true"] svg{ color:var(--gold); }
.lp-aud-panel{ display:grid; gap:24px; align-items:center; background:var(--green-900); border-radius:24px; padding:22px; color:#fff; min-height:100%; }
.lp-aud-panel > div:first-child{ animation:lp-rise .45s both; }
.lp-aud-panel h3{ font-size:1.6rem; margin-bottom:10px; }
.lp-aud-panel p{ color:rgba(255,255,255,.78); }
.lp-aud-panel .lp-aud-art{ aspect-ratio:1; border-radius:16px; overflow:hidden; max-width:280px; width:100%; justify-self:center; box-shadow:0 30px 50px -24px rgba(0,0,0,.7); animation:lp-swap .5s both; }
@media (min-width:600px){ .lp-aud-panel{ grid-template-columns:minmax(0,1fr) 240px; padding:32px; } }
@media (min-width:980px){
  .lp-split{ grid-template-columns:1fr 1.25fr; gap:56px; align-items:start; }
  .lp-split .lp-head{ grid-column:1 / -1; margin-bottom:0; }
}

/* Steps */
.lp-steps{ display:grid; gap:20px; counter-reset:s; position:relative; }
.lp-steps li{ position:relative; background:#fff; border:1px solid var(--line); border-radius:22px; padding:26px; transition:transform .25s,box-shadow .25s,border-color .25s; }
.lp-steps li:hover{ transform:translateY(-6px); border-color:var(--green-600); box-shadow:0 30px 50px -30px rgba(8,42,28,.55); }
.lp-step-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.lp-step-n{ width:52px; height:52px; border-radius:16px; display:grid; place-items:center; font-family:var(--display); font-size:1.5rem; font-weight:700; background:var(--green-900); color:var(--gold); }
.lp-time{ display:inline-flex; align-items:center; gap:6px; font-size:.82rem; font-weight:600; color:var(--green-700); background:rgba(23,122,80,.1); padding:6px 12px; border-radius:999px; }
.lp-steps h3{ font-size:1.3rem; margin-bottom:8px; }
.lp-steps p{ color:var(--muted); }
@media (min-width:800px){
  .lp-steps{ grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
  .lp-steps::before{ content:""; position:absolute; left:8%; right:8%; top:52px; border-top:2px dashed #B9C5BE; z-index:0; }
  .lp-steps li{ z-index:1; }
}

/* Tools (spotlight bento) */
.lp-tools{ display:grid; gap:16px; }
.lp-tool{ position:relative; overflow:hidden; background:#fff; border:1px solid var(--line); border-radius:20px; padding:24px; display:flex; flex-direction:column; gap:16px; transition:border-color .2s,box-shadow .25s; }
.lp-tool::before{ content:""; position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .25s; background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%),rgba(255,199,44,.22),transparent 70%); }
.lp-tool:hover{ border-color:var(--gold); box-shadow:0 26px 44px -30px rgba(8,42,28,.6); }
.lp-tool:hover::before{ opacity:1; }
.lp-tool-ico{ width:48px; height:48px; border-radius:14px; background:rgba(23,122,80,.1); color:var(--green-700); display:grid; place-items:center; transition:transform .25s; }
.lp-tool:hover .lp-tool-ico{ transform:rotate(-6deg) scale(1.08); }
.lp-tool h3{ font-size:1.12rem; margin-bottom:4px; }
.lp-tool p{ color:var(--muted); font-size:.95rem; }
.lp-perks{ display:grid; gap:14px; margin-top:28px; }
.lp-perks li{ display:flex; gap:14px; align-items:flex-start; padding:20px; border-radius:18px; background:#fff; color:var(--ink); border:1px solid var(--line); }
.lp-perks svg{ flex:none; margin-top:2px; color:var(--green-600); }
.lp-perks b{ display:block; font-weight:700; }
.lp-perks span{ color:var(--muted); font-size:.93rem; }
@media (min-width:620px){ .lp-tools{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:960px){ .lp-tools{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (min-width:720px){ .lp-perks{ grid-template-columns:repeat(3,minmax(0,1fr)); } }

/* Quotes (carousel) */
.lp-quotes{ display:grid; }
.lp-qcard{ position:relative; background:#fff; border:1px solid var(--line); border-radius:28px; padding:32px 24px; box-shadow:0 30px 60px -40px rgba(8,42,28,.5); }
.lp-qcard::before{ content:"“"; position:absolute; right:22px; top:-6px; font-family:var(--display); font-size:8rem; line-height:1; color:var(--gold); opacity:.5; }
.lp-qbody{ animation:lp-rise .5s both; }
.lp-qbody blockquote{ position:relative; font-family:var(--display); font-size:clamp(1.3rem,3vw,1.9rem); line-height:1.32; letter-spacing:-.015em; font-weight:600; color:var(--green-950); margin-bottom:24px; }
.lp-stars{ display:flex; gap:3px; margin-bottom:16px; color:var(--gold); }
.lp-who{ display:flex; align-items:center; gap:14px; }
.lp-avatar{ width:46px; height:46px; border-radius:99px; display:grid; place-items:center; font-weight:800; background:var(--green-900); color:var(--gold); font-family:var(--display); }
.lp-who b{ display:block; font-weight:700; }
.lp-who span{ font-size:.9rem; color:var(--muted); }
.lp-qnav{ display:flex; align-items:center; justify-content:space-between; margin-top:22px; gap:12px; }
.lp-dots{ display:flex; gap:8px; }
.lp-dot{ width:10px; height:10px; border-radius:99px; background:#C9D3CD; transition:all .25s; }
.lp-dot[aria-current="true"]{ width:30px; background:var(--green-900); }
.lp-arrows{ display:flex; gap:8px; }
.lp-arrow{ width:44px; height:44px; border-radius:99px; border:1px solid var(--line); background:#fff; display:grid; place-items:center; transition:all .15s; }
.lp-arrow:hover{ background:var(--green-900); color:#fff; border-color:var(--green-900); }
@media (min-width:768px){ .lp-qcard{ padding:52px 56px; } }

/* CTA + footer */
.lp-band{ position:relative; overflow:hidden; background:var(--green-950); color:#fff; border-radius:28px; padding:44px 26px; display:grid; gap:28px; }
.lp-band::before{ content:""; position:absolute; width:420px; height:420px; right:-100px; top:-160px; border-radius:99px; background:var(--gold); opacity:.18; filter:blur(70px); }
.lp-band::after{ content:""; position:absolute; width:360px; height:360px; left:-80px; bottom:-200px; border-radius:99px; background:#3DDC97; opacity:.16; filter:blur(70px); }
.lp-band > *{ position:relative; z-index:1; }
.lp-band h2{ font-size:clamp(1.9rem,4.4vw,2.8rem); margin-bottom:10px; }
.lp-band p{ color:rgba(255,255,255,.8); font-size:1.05rem; }
.lp-band-btns{ display:flex; flex-direction:column; gap:12px; }
@media (min-width:800px){
  .lp-band{ padding:64px; grid-template-columns:1.4fr 1fr; align-items:center; }
  .lp-band-btns{ max-width:320px; justify-self:end; width:100%; }
}
.lp-footer{ border-top:1px solid var(--line); }
.lp-footer .lp-brand{ color:var(--green-950); }
.lp-footer-row{ padding:30px 0; display:flex; flex-direction:column; align-items:flex-start; gap:14px; font-size:.9rem; color:var(--muted); }
.lp-footer-links{ display:flex; gap:20px; }
.lp-footer-links a:hover{ color:var(--green-700); }
@media (min-width:760px){ .lp-footer-row{ flex-direction:row; align-items:center; justify-content:space-between; } }

@media (min-width:768px){
  .lp-wrap{ padding:0 32px; }
  .lp-section{ padding:104px 0; }
  .lp-head{ margin-bottom:52px; }
}
@media (prefers-reduced-motion:reduce){
  .lp *,.lp *::before,.lp *::after{ animation:none !important; transition:none !important; }
  .lp-rv{ opacity:1; transform:none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Design samples. Real JPGs live in public/samples/. If an image is missing, */
/*  remove its `image` field and the SVG drawing below is used instead.        */
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
  { id: "flyer-barber", title: "Shop opening flyer", type: "Flyer", name: "FRESH CUTS", tag: "Grand opening", pal: { bg: "#0A2E1E", fg: "#FFFFFF", ac: "#FFC93C" }, image: "/samples/flyer-barber.jpg" },
  { id: "logo-tech", title: "Startup logo", type: "Logo", name: "NEXA", tag: "Smart software", pal: { bg: "#0F1B3D", fg: "#FFFFFF", ac: "#FFC93C" }, image: "/samples/logo-tech.jpg" },
  { id: "social-campus", title: "Campus event post", type: "Social Post", name: "Unilag Tech Club", tag: "Campus fest", pal: { bg: "#16A35F", fg: "#FFFFFF", ac: "#FFC93C" }, image: "/samples/social-campus.jpg" },
  { id: "card-eng", title: "Engineer business card", type: "Business Card", name: "A. Bello", tag: "Civil Engineer", pal: { bg: "#0A2E1E", fg: "#FFFFFF", ac: "#7BE0A8" }, image: "/samples/card-eng.jpg" },
  { id: "logo-food", title: "Kitchen logo", type: "Logo", name: "FRESH", tag: "Kitchen", pal: { bg: "#F3FAF6", fg: "#0A2E1E", ac: "#16A35F" }, image: "/samples/logo-food.jpg" },
  { id: "flyer-sale", title: "Weekend sale flyer", type: "Flyer", name: "STYLE HUB", tag: "50% off", pal: { bg: "#FFF6D6", fg: "#0A2E1E", ac: "#0E8A50" }, image: "/samples/flyer-sale.jpg" },
  { id: "social-night", title: "Friday night post", type: "Social Post", name: "Club Nova", tag: "Friday vibes", pal: { bg: "#1A0B3B", fg: "#FFFFFF", ac: "#B06CFF" }, image: "/samples/social-night.jpg" },
  { id: "card-beauty", title: "Beauty brand card", type: "Business Card", name: "Zuri Glow", tag: "Makeup artist", pal: { bg: "#FBEFEA", fg: "#3A2420", ac: "#C9785D" }, image: "/samples/card-beauty.jpg" },
];

function SampleArt({ s }: { s: Sample }) {
  const { bg, fg, ac } = s.pal;
  if (s.image) return <img src={s.image} alt={s.title} className="lp-svg" decoding="async" style={{ objectFit: "cover" }} />;
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

const AUDIENCES = [
  { icon: Store, title: "Small businesses", desc: "Get your logo, flyers and promo posts without paying a designer for each one.", sample: byId("flyer-barber") },
  { icon: PenTool, title: "Graphic designers", desc: "Turn rough ideas into first drafts fast, then clean up client files and backgrounds.", sample: byId("logo-tech") },
  { icon: GraduationCap, title: "Students", desc: "Make posters, society flyers and project covers for school events, at student-friendly cost.", sample: byId("social-campus") },
  { icon: Share2, title: "Social creators", desc: "Keep your page looking sharp with new post designs whenever you need them.", sample: byId("social-night") },
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
  { icon: Zap, t: "Pay only for what you use", d: "Starts at ₦500, about $0.38. No subscriptions you forget about." },
  { icon: Shield, t: "Secure Paystack payment", d: "Pay by card, bank transfer or USSD." },
  { icon: Star, t: "Print-ready quality", d: "Sharp designs that hold up on screen and paper." },
];

const QUOTES = [
  { name: "Emeka O.", role: "Barbershop owner, Lagos", text: "TwoMinDesign help me create my shop logo in one minute. E come out sharp! My customers don dey ask who design am." },
  { name: "Tunde A.", role: "Fashion designer, Abuja", text: "I use am for my Instagram promo flyers. The AI understand Lagos style. Na serious tool be this." },
  { name: "Chidi N.", role: "Restaurant owner, PH", text: "The Hustler plan worth every kobo. 70 credits last me well well for the month." },
];

const POINTS = ["Starts at ₦500", "Pay with Paystack", "Ready in about 2 minutes"];

const NAV = [
  { href: "#who", label: "Who it’s for" },
  { href: "#how", label: "How it works" },
  { href: "#tools", label: "Tools" },
];

const WORDS = ["logo", "flyer", "post", "business card"];
const STRIP = ["Logos", "Flyers", "Social posts", "Business cards", "Certificate fixes", "Background removal", "PDF to image", "PDF to text", "Word and TXT export"];

/* -------------------------------------------------------------------------- */
/*  Small hooks and helpers                                                    */
/* -------------------------------------------------------------------------- */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`lp-rv ${className}`} data-in={on} style={{ "--d": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [ref, on] = useInView<HTMLElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, to]);
  return (
    <strong ref={ref}>
      {prefix}
      {v}
      {suffix}
    </strong>
  );
}

/** Types the given words one letter at a time, then deletes them. */
function useTypewriter(words: string[], speed = 90, hold = 1500) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[i % words.length];
    const t = setTimeout(
      () => {
        if (!del && n < w.length) setN(n + 1);
        else if (!del) setDel(true);
        else if (n > 0) setN(n - 1);
        else {
          setDel(false);
          setI(i + 1);
        }
      },
      !del && n === w.length ? hold : del ? speed / 2 : speed,
    );
    return () => clearTimeout(t);
  }, [n, del, i, words, speed, hold]);
  return words[i % words.length].slice(0, n);
}

/** Cursor glow + slight tilt, set through CSS variables so React does not re-render. */
function tiltHandlers(max = 6) {
  return {
    onPointerMove: (e: RPE<HTMLElement>) => {
      if (e.pointerType === "touch") return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    },
    onPointerLeave: (e: RPE<HTMLElement>) => {
      e.currentTarget.style.setProperty("--rx", "0deg");
      e.currentTarget.style.setProperty("--ry", "0deg");
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Hero collage: four samples scattered on a white background                 */
/* -------------------------------------------------------------------------- */

const COLLAGE = ["flyer-barber", "logo-tech", "social-campus", "card-eng"];

function Collage() {
  return (
    <div className="lp-collage">
      {COLLAGE.map((id, i) => (
        <div key={id} className={`lp-cl c${i + 1}`}>
          <SampleArt s={byId(id)} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const word = useTypewriter(WORDS);

  const [filter, setFilter] = useState<"All" | SampleType>("All");
  const [aud, setAud] = useState(0);
  const [q, setQ] = useState(0);
  const [qPaused, setQPaused] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // scroll progress bar + header style
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      progRef.current?.style.setProperty("--p", String(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight))));
      setScrolled(h.scrollTop > 12);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // rotate testimonials until the visitor takes over
  useEffect(() => {
    if (qPaused) return;
    const t = setInterval(() => setQ((x) => (x + 1) % QUOTES.length), 6500);
    return () => clearInterval(t);
  }, [qPaused]);

  const onHeroMove = (e: RPE<HTMLElement>) => {
    const el = heroRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };

  const types: ("All" | SampleType)[] = ["All", "Logo", "Flyer", "Social Post", "Business Card"];
  const shots = filter === "All" ? SAMPLES : SAMPLES.filter((s) => s.type === filter);
  const A = AUDIENCES[aud];
  const Q = QUOTES[q];
  const go = (dir: number) => {
    setQPaused(true);
    setQ((x) => (x + dir + QUOTES.length) % QUOTES.length);
  };

  return (
    <div className="lp">
      <style>{STYLES}</style>
      <div ref={progRef} className="lp-progress" aria-hidden />

      {/* Header */}
      <header className="lp-header" data-s={scrolled}>
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
            <Link to="/auth" className="lp-btn lp-btn-gold lp-btn-sm">Start free</Link>
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
      <section className="lp-hero" ref={heroRef} onPointerMove={onHeroMove}>
        <div className="lp-orb a" aria-hidden />
        <div className="lp-orb b" aria-hidden />
        <div className="lp-orb c" aria-hidden />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-copy">
            <span className="lp-eyebrow">
              <i />
              AI design studio for Nigerian businesses
            </span>
            <h1 className="lp-h1">
              Your <span className="lp-grad">{word || "\u00A0"}</span>
              <span className="lp-caret" aria-hidden />
              <br />
              ready in two minutes.
            </h1>
            <p className="lp-lead">
              Describe what you need and the AI designs it. Made for small businesses, freelance designers and students.
            </p>
            <div className="lp-cta">
              <Link to="/auth" className="lp-btn lp-btn-gold">
                Start designing free
                <ArrowRight size={18} />
              </Link>
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

          <div className="lp-stagewrap">
            <span className="lp-float f1" aria-hidden>
              <Clock size={16} />
              Ready in about 2 min
            </span>
            <span className="lp-float f2" aria-hidden>
              <Star size={16} />
              Print-ready quality
            </span>
            <Collage />
          </div>
        </div>
      </section>

      {/* Scrolling strip */}
      <div className="lp-strip" aria-hidden>
        <div className="lp-strip-track">
          {[...STRIP, ...STRIP].map((s, idx) => (
            <span key={idx}>{s}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="lp-wrap">
        <div className="lp-stats">
          <Reveal className="lp-stat">
            <Counter to={2} suffix=" min" />
            <span>from idea to finished design</span>
          </Reveal>
          <Reveal className="lp-stat" delay={0.08}>
            <Counter to={500} prefix="₦" />
            <span>starting price, about $0.38</span>
          </Reveal>
          <Reveal className="lp-stat" delay={0.16}>
            <Counter to={4} />
            <span>design types: logo, flyer, post, card</span>
          </Reveal>
          <Reveal className="lp-stat" delay={0.24}>
            <Counter to={TOOLS.length} />
            <span>tools in one dashboard</span>
          </Reveal>
        </div>
      </div>

      {/* Gallery */}
      <section className="lp-section" aria-labelledby="gallery-h">
        <div className="lp-wrap">
          <Reveal className="lp-head">
            <span className="lp-eyebrow"><i />Gallery</span>
            <h2 id="gallery-h">Made with TwoMinDesign</h2>
            <p>Flyers, logos, posts and cards. Each one started as a sentence.</p>
          </Reveal>

          <div className="lp-filters" role="group" aria-label="Filter designs">
            {types.map((t) => (
              <button key={t} className="lp-chip" aria-pressed={filter === t} onClick={() => setFilter(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="lp-gallery">
            {shots.map((s, idx) => (
              <figure key={`${filter}-${s.id}`} className="lp-shot" style={{ animationDelay: `${idx * 0.06}s` }} {...tiltHandlers(8)}>
                <div className="lp-shot-art">
                  <SampleArt s={s} />
                </div>
                <span className="lp-shot-tag">{s.type}</span>
                <span className="lp-shot-price">From ₦500 · $0.38</span>
                <figcaption>
                  <b>{s.title}</b>
                  <span>Made from one sentence</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="who" className="lp-section lp-wash">
        <div className="lp-wrap lp-split">
          <Reveal className="lp-head">
            <span className="lp-eyebrow"><i />Who it’s for</span>
            <h2>Built for people who need good design today</h2>
            <p>Whether you’re selling, freelancing or running a campus event, you get a finished design without the wait.</p>
          </Reveal>

          <div className="lp-aud-list" role="tablist" aria-label="Who it is for">
            {AUDIENCES.map((a, idx) => (
              <button key={a.title} role="tab" aria-selected={idx === aud} className="lp-aud-btn" onClick={() => setAud(idx)}>
                <a.icon size={22} aria-hidden />
                <b>{a.title}</b>
              </button>
            ))}
          </div>

          <div className="lp-aud-panel lp-dark" role="tabpanel">
            <div key={A.title}>
              <h3>{A.title}</h3>
              <p>{A.desc}</p>
              <Link to="/auth" className="lp-btn lp-btn-gold lp-btn-sm" style={{ marginTop: 20 }}>
                Try it free
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="lp-aud-art" key={A.sample.id}>
              <SampleArt s={A.sample} />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-section">
        <div className="lp-wrap">
          <Reveal className="lp-head">
            <span className="lp-eyebrow"><i />How it works</span>
            <h2>From idea to download in about two minutes</h2>
            <p>Three steps. No design skills, and no waiting for a reply on WhatsApp.</p>
          </Reveal>
          <ol className="lp-steps">
            {STEPS.map((s, n) => (
              <Reveal key={s.title} delay={n * 0.12}>
                <li style={{ height: "100%" }}>
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
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="lp-section lp-wash">
        <div className="lp-wrap">
          <Reveal className="lp-head">
            <span className="lp-eyebrow"><i />Tools</span>
            <h2>More than a design generator</h2>
            <p>Everything you need to finish the job is in one dashboard, so you stop jumping between apps.</p>
          </Reveal>
          <div className="lp-tools">
            {TOOLS.map((t, idx) => (
              <Reveal key={t.title} delay={(idx % 3) * 0.08}>
                <div className="lp-tool" {...tiltHandlers(0)}>
                  <span className="lp-tool-ico">
                    <t.icon size={22} aria-hidden />
                  </span>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.desc}</p>
                  </div>
                </div>
              </Reveal>
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
      <section className="lp-section" aria-labelledby="quotes-h">
        <div className="lp-wrap">
          <Reveal className="lp-head">
            <span className="lp-eyebrow"><i />Reviews</span>
            <h2 id="quotes-h">What our users say</h2>
          </Reveal>
          <div className="lp-quotes">
            <figure className="lp-qcard" onPointerEnter={() => setQPaused(true)} onPointerLeave={() => setQPaused(false)}>
              <div className="lp-qbody" key={Q.name}>
                <div className="lp-stars" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} size={18} fill="currentColor" aria-hidden />
                  ))}
                </div>
                <blockquote>“{Q.text}”</blockquote>
                <figcaption className="lp-who">
                  <span className="lp-avatar" aria-hidden>{Q.name[0]}</span>
                  <div>
                    <b>{Q.name}</b>
                    <span>{Q.role}</span>
                  </div>
                </figcaption>
              </div>
              <div className="lp-qnav">
                <div className="lp-dots">
                  {QUOTES.map((x, idx) => (
                    <button key={x.name} className="lp-dot" aria-current={idx === q} aria-label={`Show review from ${x.name}`} onClick={() => { setQPaused(true); setQ(idx); }} />
                  ))}
                </div>
                <div className="lp-arrows">
                  <button className="lp-arrow" onClick={() => go(-1)} aria-label="Previous review">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="lp-arrow" onClick={() => go(1)} aria-label="Next review">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <Reveal>
            <div className="lp-band lp-dark">
              <div>
                <h2>Make your first design today</h2>
                <p>It takes about two minutes. Pick a plan when you need more credits.</p>
              </div>
              <div className="lp-band-btns">
                <Link to="/auth" className="lp-btn lp-btn-gold">
                  Start designing free
                  <ArrowRight size={18} />
                </Link>
                <Link to="/pricing" className="lp-btn lp-btn-outline-light">View plans and pricing</Link>
              </div>
            </div>
          </Reveal>
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