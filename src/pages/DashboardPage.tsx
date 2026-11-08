import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { useUser as useClerkUser, UserButton } from "@clerk/clerk-react";
import type { RecentImage } from "../components/ImagePicker";
import { Link } from "react-router-dom";
import {
  Zap,
  Download,
  RotateCcw,
  Sparkles,
  History,
  Award,
  FileCheck2,
  Eraser,
  FileImage,
  ScanText,
  FilePen,
  UploadCloud,
  X,
  Copy,
  Check,
  Sun,
  Moon,
  LayoutDashboard,
  ArrowUpRight,
  QrCode,
  Search,
  Wand2,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import axios from "axios";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useUser } from "../hooks/useUser";
import BuyExtraModal from "../components/BuyExtraModal";
import ImageStudio, { STUDIO_IDS, STUDIO_COSTS, type StudioToolId } from "../components/ImageStudio";
import {
  MODERN_STYLES,
  Aurora,
  ScrollProgress,
  SpotlightCard,
  HeroBanner,
  StatsStrip,
  IdeaMarquee,
  CommandPalette,
  Celebrate,
  useCommandK,
  type PaletteItem,
} from "../components/ModernUI";
import EventsTool from "../components/EventsTool";
import LeadsTool from "../components/LeadsTool";
import BookingTool from "../components/BookingTool";
/* -------------------------------------------------------------------------- */
/*  Theme + component styles (scoped to .og-root, no Tailwind config needed)   */
/* -------------------------------------------------------------------------- */

const STYLES = `
.og-root{
  --bg:#0A0A0B; --surface:#131315; --surface-2:#1B1B1F; --input:#0F0F11;
  --border:#26262B; --text:#F5F5F4; --muted:#A1A1AA; --faint:#6B6B73;
  --accent:#FFD21F; --accent-text:#FFD21F; --ring:rgba(255,210,31,.22);
  --soft:rgba(255,210,31,.10); --shadow:0 20px 40px -24px rgba(0,0,0,.8);
  --glow:radial-gradient(60% 50% at 50% 0%,rgba(255,210,31,.10),transparent 70%);
  min-height:100vh; min-height:100dvh; overflow-x:clip; background:var(--bg); color:var(--text); position:relative;
}
.og-root[data-theme="light"]{
  --bg:#F3F4F7; --surface:#FFFFFF; --surface-2:#F0F1F5; --input:#FFFFFF;
  --border:#E3E5EB; --text:#101218; --muted:#586070; --faint:#8A92A2;
  --accent:#F0B400; --accent-text:#8A6400; --ring:rgba(240,180,0,.28);
  --soft:rgba(240,180,0,.14); --shadow:0 18px 36px -26px rgba(16,18,24,.35);
  --glow:radial-gradient(60% 50% at 50% 0%,rgba(240,180,0,.14),transparent 70%);
}
.og-root, .og-root *{ transition-property:background-color,border-color,color,box-shadow; transition-duration:.2s; }
.og-glow{ position:absolute; inset:0 0 auto 0; height:360px; background:var(--glow); pointer-events:none; }
.og-text{color:var(--text)} .og-muted{color:var(--muted)} .og-faint{color:var(--faint)} .og-accent-text{color:var(--accent-text)}
.og-header{ background:color-mix(in srgb,var(--bg) 82%,transparent); backdrop-filter:blur(14px); border-bottom:1px solid var(--border); }
.og-card{ background:var(--surface); border:1px solid var(--border); border-radius:22px; box-shadow:var(--shadow); }
.og-divider{ border-color:var(--border); }
.og-tile{ background:var(--soft); color:var(--accent-text); display:grid; place-items:center; }
.og-input{ width:100%; background:var(--input); border:1px solid var(--border); border-radius:14px; padding:.8rem 1rem; color:var(--text); font-size:.92rem; }
.og-input::placeholder{ color:var(--faint); }
.og-input:focus{ outline:none; border-color:var(--accent); box-shadow:0 0 0 4px var(--ring); }
.og-input:disabled{ opacity:.6; }

/* Primary button */
.og-btn{
  display:flex; align-items:center; justify-content:center; gap:.65rem; width:100%;
  padding:.9rem 1.2rem; border-radius:16px; font-weight:700; font-size:.95rem; color:#1B1500;
  background:linear-gradient(180deg,#FFE680 0%,#FFD21F 55%,#F2B900 100%);
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 -2px 0 rgba(0,0,0,.14) inset, 0 12px 26px -10px rgba(240,180,0,.7);
  transition:transform .15s, box-shadow .2s, filter .2s;
}
.og-btn:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.05); box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 -2px 0 rgba(0,0,0,.14) inset, 0 16px 30px -10px rgba(240,180,0,.85); }
.og-btn:active:not(:disabled){ transform:translateY(1px) scale(.99); }
.og-btn:disabled{ opacity:.45; cursor:not-allowed; box-shadow:none; filter:grayscale(.35); }
.og-btn-icon{ display:grid; place-items:center; width:28px; height:28px; border-radius:10px; background:rgba(27,21,0,.14); }
.og-btn-sm{ width:auto; padding:.55rem .95rem; border-radius:13px; font-size:.82rem; gap:.45rem; }
.og-btn-sm .og-btn-icon{ width:22px; height:22px; border-radius:8px; }

/* Secondary buttons and chips */
.og-ghost{
  display:inline-flex; align-items:center; gap:.45rem; padding:.5rem .85rem; border-radius:12px;
  background:var(--surface); border:1px solid var(--border); color:var(--text); font-size:.8rem; font-weight:600;
  transition:transform .15s, border-color .2s, background-color .2s;
}
.og-ghost:hover:not(:disabled){ border-color:var(--accent); transform:translateY(-1px); }
.og-ghost:disabled{ opacity:.4; cursor:not-allowed; }
.og-chip{ padding:.4rem .8rem; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--muted); font-size:.78rem; font-weight:500; }
.og-chip:hover:not(:disabled){ border-color:var(--accent); color:var(--text); }
.og-chip[data-active="true"]{ background:var(--accent); border-color:var(--accent); color:#1B1500; font-weight:700; }

/* Navigation */
.og-nav{ display:flex; align-items:center; gap:.75rem; width:100%; padding:.6rem .75rem; border-radius:14px; border:1px solid transparent; color:var(--muted); font-size:.9rem; text-align:left; }
.og-nav:hover{ background:var(--surface); color:var(--text); }
.og-nav[aria-current="page"]{ background:var(--surface); border-color:var(--border); color:var(--text); box-shadow:var(--shadow); }
.og-nav[aria-current="page"] .og-nav-ico{ background:var(--accent); color:#1B1500; }
.og-nav-ico{ width:30px; height:30px; border-radius:10px; display:grid; place-items:center; background:var(--surface-2); color:var(--muted); flex-shrink:0; }
.og-pill{ flex-shrink:0; display:flex; align-items:center; gap:.45rem; padding:.5rem .9rem; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--muted); font-size:.85rem; font-weight:500; }
.og-pill[aria-current="page"]{ background:var(--accent); border-color:var(--accent); color:#1B1500; font-weight:700; }

/* Tool + template cards */
.og-lift{ transition:transform .2s, border-color .2s, box-shadow .2s; }
.og-lift:hover{ transform:translateY(-3px); border-color:var(--accent); }
.og-badge{ display:inline-flex; align-items:center; padding:.15rem .55rem; border-radius:999px; font-size:.72rem; font-weight:600; border:1px solid var(--border); color:var(--muted); }
.og-badge[data-free="true"]{ color:#10b981; border-color:rgba(16,185,129,.4); }
.og-badge[data-paid="true"]{ color:var(--accent-text); border-color:var(--accent); }
.og-checker{ background-color:var(--surface-2); background-image:conic-gradient(rgba(128,128,128,.18) 25%,transparent 0 50%,rgba(128,128,128,.18) 0 75%,transparent 0); background-size:20px 20px; }
.og-spin{ width:18px; height:18px; border-radius:999px; border:2px solid currentColor; border-top-color:transparent; animation:og-spin .8s linear infinite; }
.og-spin-lg{ width:40px; height:40px; color:var(--accent); }
.og-switch{ position:relative; width:64px; height:34px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border); flex-shrink:0; }
.og-switch-thumb{ position:absolute; top:3px; left:3px; width:26px; height:26px; border-radius:999px; background:var(--accent); color:#1B1500; display:grid; place-items:center; transition:transform .25s cubic-bezier(.3,.7,.2,1); }
.og-root[data-theme="light"] .og-switch-thumb{ transform:translateX(30px); }
.og-switch-ico{ position:absolute; top:50%; transform:translateY(-50%); color:var(--faint); }
.og-focus:focus-visible, .og-btn:focus-visible, .og-ghost:focus-visible, .og-chip:focus-visible, .og-nav:focus-visible, .og-pill:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
@keyframes og-spin{ to{ transform:rotate(360deg); } }
@keyframes og-in{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
.og-in{ animation:og-in .35s ease both; }
@media (prefers-reduced-motion:reduce){ .og-root *{ animation:none !important; transition:none !important; } }
@media (max-width:640px){ .og-input{ font-size:16px; } }
`;

/* -------------------------------------------------------------------------- */
/*  Tool configuration                                                        */
/* -------------------------------------------------------------------------- */

  type ToolId = "design" | "certificate" | "pdfFix" | "bgRemove" | "pdfToImage" | "pdfToText" | "editor" | "leads" | "events" | "booking" | "studio";
 type View = "home" | ToolId;
type IconType = ComponentType<{ size?: number; className?: string }>;

interface Tool {
  id: ToolId;
  label: string;
  blurb: string;
  icon: IconType;
  cost: number; // credits per use, 0 = free
  group: string;
  /** Text for the badge when the tool mixes free and paid parts (Image Studio). */
  note?: string;
  /** Short text for the sidebar. */
  short?: string;
}

// Change the `cost` values to whatever pricing you want.
// Image Studio holds five tools as tabs, so the sidebar stays short.
const TOOLS: Tool[] = [
  { id: "design", label: "AI Designer", blurb: "Logos, flyers, social posts and business cards", icon: Sparkles, cost: 1, group: "Create" },
  { id: "studio", label: "Image Studio", blurb: "Describe, upscale, resize, split text from a design, or turn it into SVG", icon: Wand2, cost: 0, group: "Image tools", note: "Free and 1 to 2 credits", short: "1-2" },
  { id: "bgRemove", label: "Background Removal", blurb: "Cut out the subject and get a transparent PNG", icon: Eraser, cost: 1, group: "Image tools" },
  { id: "certificate", label: "Certificate Correction", blurb: "Fix names, dates, spelling and layout on a certificate", icon: Award, cost: 2, group: "Fix and clean up" },
  { id: "pdfFix", label: "PDF Design Correction", blurb: "Clean up the look of a PDF page or design", icon: FileCheck2, cost: 2, group: "Fix and clean up" },
  { id: "pdfToImage", label: "PDF to Image", blurb: "Turn every PDF page into a PNG", icon: FileImage, cost: 0, group: "PDF and documents" },
  { id: "pdfToText", label: "PDF to Editable Text", blurb: "Pull the text out of a PDF or scanned image", icon: ScanText, cost: 0, group: "PDF and documents" },
  { id: "editor", label: "Document Editor", blurb: "Open, edit and export text as TXT or Word", icon: FilePen, cost: 0, group: "PDF and documents" },
  { id: "leads", label: "Client Leads", blurb: "Put a QR on your design and collect customers who are interested", icon: QrCode, cost: 0, group: "Grow" },
  { id: "events", label: "Event Registration", blurb: "Create a QR for your wedding, party or program so guests can register", icon: CalendarDays, cost: 0, group: "Grow" },
  { id: "booking", label: "Bookings", blurb: "Create a QR so customers can pick a day and time to book you", icon: CalendarClock, cost: 0, group: "Grow" },
];
const GROUPS = ["Create", "Image tools", "Grow", "Fix and clean up", "PDF and documents"];
const STUDIO_LABELS: Record<StudioToolId, string> = {
  describe: "Describe",
  upscale: "Upscale",
  sharpen: "Sharpen",
  layerize: "Edit text",
  vectorize: "To SVG",
};

const toolBadge = (t: Tool) => t.note ?? (t.cost === 0 ? "Free" : `${t.cost} ${t.cost === 1 ? "credit" : "credits"}`);
const sideLabel = (t: Tool) => t.short ?? (t.cost === 0 ? "Free" : String(t.cost));

type DesignType = "Logo" | "Flyer" | "Social Post" | "Business Card";
const DESIGN_TYPES: DesignType[] = ["Logo", "Flyer", "Social Post", "Business Card"];

const PLACEHOLDERS: Record<DesignType, string> = {
  Logo: "e.g: Modern minimalist logo for my tech startup, blue and gold, clean design",
  Flyer: "e.g: Grand opening promo for my barbershop, Lagos style, gold and black colors",
  "Social Post": "e.g: Instagram promo post for my restaurant special offer, Friday night vibes",
  "Business Card": "e.g: Professional business card for civil engineer, corporate style, navy blue",
};

const FIX_CHIPS: Record<"certificate" | "pdfFix", string[]> = {
  certificate: ["Correct the spelling of the name", "Change the date", "Fix alignment and spacing", "Make the text sharper", "Remove stains and marks"],
  pdfFix: ["Straighten and align everything", "Fix fonts and spacing", "Improve colors and contrast", "Clean up the background", "Make it print-ready"],
};

/* -------------------------------------------------------------------------- */
/*  Templates (drawn as SVG so they work with no image files)                  */
/*  To use real previews, set `image: "/templates/barbershop.jpg"` on any one. */
/* -------------------------------------------------------------------------- */

interface Template {
  id: string;
  title: string;
  type: DesignType;
  prompt: string;
  name: string;
  tag: string;
  pal: { bg: string; fg: string; ac: string };
  image?: string;
}

const TEMPLATES: Template[] = [
  { id: "logo-tech", title: "Tech startup", type: "Logo", name: "NEXA", tag: "Smart software", pal: { bg: "#0F1B3D", fg: "#FFFFFF", ac: "#FFC83D" }, prompt: "Modern minimalist logo for my tech startup, navy blue and gold, clean geometric design" },
  { id: "logo-food", title: "Fresh kitchen", type: "Logo", name: "FRESH", tag: "Kitchen", pal: { bg: "#F4EFE4", fg: "#173F2B", ac: "#2E9B5F" }, prompt: "Friendly logo for a fresh food kitchen, green and cream, hand-crafted feel" },
  { id: "flyer-barber", title: "Barbershop opening", type: "Flyer", name: "FRESH CUTS", tag: "Grand opening", pal: { bg: "#0B0B0C", fg: "#FFFFFF", ac: "#FFD21F" }, prompt: "Grand opening promo for my barbershop, Lagos style, gold and black colors" },
  { id: "flyer-sale", title: "Weekend sale", type: "Flyer", name: "STYLE HUB", tag: "50% off", pal: { bg: "#FFF3F0", fg: "#1A1A1A", ac: "#F0442E" }, prompt: "Bold weekend sale flyer for a fashion store, red and white, 50% off, strong headline" },
  { id: "social-food", title: "Restaurant special", type: "Social Post", name: "Mama's Pot", tag: "Today's special", pal: { bg: "#2B1408", fg: "#FFF4E6", ac: "#FF8A1F" }, prompt: "Instagram promo post for my restaurant special offer, warm orange tones, appetizing" },
  { id: "social-night", title: "Friday night", type: "Social Post", name: "Club Nova", tag: "Friday vibes", pal: { bg: "#1A0B3B", fg: "#FFFFFF", ac: "#B06CFF" }, prompt: "Friday night event post for a lounge, purple neon, party vibes, bold type" },
  { id: "card-eng", title: "Civil engineer", type: "Business Card", name: "A. Bello", tag: "Civil Engineer", pal: { bg: "#10264F", fg: "#FFFFFF", ac: "#4DA3FF" }, prompt: "Professional business card for a civil engineer, corporate style, navy blue" },
  { id: "card-beauty", title: "Beauty brand", type: "Business Card", name: "Zuri Glow", tag: "Makeup artist", pal: { bg: "#FBEFEA", fg: "#3A2420", ac: "#C9785D" }, prompt: "Elegant business card for a makeup artist, soft rose and ivory, minimal and luxurious" },
];

function TemplateArt({ t }: { t: Template }) {
  const { bg, fg, ac } = t.pal;
  if (t.image) return <img src={t.image} alt={t.title} className="w-full h-full object-cover" />;
  const svg = { viewBox: "0 0 200 200", className: "w-full h-full block", role: "img", "aria-label": t.title } as const;
  const font = "system-ui, -apple-system, Segoe UI, sans-serif";

  switch (t.type) {
    case "Logo":
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={bg} />
          <circle cx="100" cy="78" r="38" fill="none" stroke={ac} strokeWidth="5" />
          <circle cx="100" cy="78" r="23" fill={ac} />
          <text x="100" y="87" textAnchor="middle" fontSize="26" fontWeight="800" fill={bg} fontFamily={font}>{t.name[0]}</text>
          <text x="100" y="146" textAnchor="middle" fontSize="21" fontWeight="800" fill={fg} letterSpacing="4" fontFamily={font}>{t.name}</text>
          <text x="100" y="164" textAnchor="middle" fontSize="9" fill={fg} opacity=".65" fontFamily={font}>{t.tag}</text>
        </svg>
      );
    case "Flyer":
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={bg} />
          <polygon points="0,0 200,0 200,64 0,104" fill={ac} />
          <text x="16" y="36" fontSize="15" fontWeight="800" fill={bg} letterSpacing="2" fontFamily={font}>{t.name}</text>
          <text x="16" y="138" fontSize="28" fontWeight="800" fill={fg} fontFamily={font}>{t.tag}</text>
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
          <text x="18" y="108" fontSize="13" fill={fg} opacity=".7" fontFamily={font}>{t.name}</text>
          <text x="18" y="136" fontSize="27" fontWeight="800" fill={fg} fontFamily={font}>{t.tag}</text>
          <rect x="18" y="154" width="78" height="22" rx="11" fill={ac} />
          <text x="57" y="169" textAnchor="middle" fontSize="10" fontWeight="700" fill={bg} fontFamily={font}>Order now</text>
        </svg>
      );
    default:
      return (
        <svg {...svg}>
          <rect width="200" height="200" fill={ac} opacity=".18" />
          <rect width="200" height="200" fill={bg} opacity=".12" />
          <g transform="rotate(-7 100 100)">
            <rect x="26" y="54" width="148" height="92" rx="8" fill={ac} opacity=".75" />
          </g>
          <g transform="rotate(4 100 100)">
            <rect x="24" y="52" width="148" height="92" rx="8" fill={bg} />
            <rect x="38" y="68" width="22" height="22" rx="6" fill={ac} />
            <text x="38" y="112" fontSize="14" fontWeight="800" fill={fg} fontFamily={font}>{t.name}</text>
            <text x="38" y="125" fontSize="8" fill={fg} opacity=".7" fontFamily={font}>{t.tag}</text>
            <rect x="110" y="70" width="46" height="3" rx="1.5" fill={fg} opacity=".35" />
            <rect x="120" y="80" width="36" height="3" rx="1.5" fill={fg} opacity=".35" />
            <rect x="112" y="124" width="44" height="3" rx="1.5" fill={ac} />
          </g>
        </svg>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) => f.type.startsWith("image/");

async function loadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

async function renderPdfPages(file: File, scale = 2): Promise<string[]> {
  const pdf = await loadPdf(file);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push(canvas.toDataURL("image/png"));
  }
  return pages;
}

async function ocr(source: string | File, onProgress?: (p: number) => void): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(source, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  return data.text;
}

async function extractText(file: File, onProgress?: (p: number) => void): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) return file.text();
  if (isImage(file)) return ocr(file, onProgress);

  const pdf = await loadPdf(file);
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ").trim() + "\n\n";
  }
  // Scanned PDF (no real text) -> OCR the rendered pages
  if (text.replace(/\s/g, "").length < 20) {
    const pages = await renderPdfPages(file, 2);
    text = "";
    for (let i = 0; i < pages.length; i++) {
      text += (await ocr(pages[i], (p) => onProgress?.((i + p) / pages.length))).trim() + "\n\n";
    }
  }
  return text.trim();
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadUrl(url: string, name: string) {
  try {
    const res = await fetch(url);
    saveBlob(await res.blob(), name);
  } catch {
    window.open(url, "_blank");
  }
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                           */
/* -------------------------------------------------------------------------- */

function Btn({
  onClick,
  disabled,
  loading,
  loadingText,
  icon: Icon,
  small,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: IconType;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`og-btn ${small ? "og-btn-sm" : ""}`}>
      {loading ? (
        <>
          <span className="og-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {Icon && (
            <span className="og-btn-icon">
              <Icon size={small ? 13 : 16} />
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
}

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}

function UploadZone({
  accept,
  file,
  onFile,
  disabled,
  hint,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const dropStyle: CSSProperties = {
    borderColor: drag ? "var(--accent)" : "var(--border)",
    background: drag ? "var(--soft)" : "var(--input)",
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="og-card flex items-center gap-3 p-3.5" style={{ boxShadow: "none" }}>
          <div className="og-tile w-11 h-11 rounded-xl shrink-0">
            <FileCheck2 size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold og-text truncate">{file.name}</p>
            <p className="text-xs og-faint">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={() => onFile(null)} disabled={disabled} aria-label="Remove file" className="og-ghost" style={{ padding: ".45rem" }}>
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={dropStyle}
          className="og-focus w-full rounded-2xl border-2 border-dashed py-9 px-4 flex flex-col items-center gap-2 hover:!border-[var(--accent)]"
        >
          <div className="og-tile w-12 h-12 rounded-2xl">
            <UploadCloud size={22} />
          </div>
          <span className="text-sm font-semibold og-text">Upload a file or drop it here</span>
          <span className="text-xs og-faint">{hint}</span>
        </button>
      )}
    </div>
  );
}

function Placeholder({ icon: Icon, title, sub, spin }: { icon: IconType; title: string; sub: string; spin?: boolean }) {
  return (
    <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
      {spin ? (
        <span className="og-spin og-spin-lg" />
      ) : (
        <div className="og-tile w-16 h-16 rounded-2xl">
          <Icon size={28} />
        </div>
      )}
      <p className="og-muted text-sm text-center font-medium">{title}</p>
      <p className="og-faint text-xs text-center">{sub}</p>
    </div>
  );
}

function ThemeSwitch({ theme, onToggle }: { theme: "dark" | "light"; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={theme === "light"}
      aria-label="Switch between dark and light mode"
      onClick={onToggle}
      className="og-switch og-focus"
    >
      <Moon size={13} className="og-switch-ico" style={{ left: 9 }} />
      <Sun size={13} className="og-switch-ico" style={{ right: 9 }} />
      <span className="og-switch-thumb">{theme === "light" ? <Sun size={14} /> : <Moon size={14} />}</span>
    </button>
  );
}

function CreditsCard({ credits }: { credits: number }) {
  const low = credits < 10;
  return (
    <div className="og-card p-4" style={{ boxShadow: "none" }}>
      <div className="flex items-center gap-3">
        <div className="og-tile w-10 h-10 rounded-xl">
          <Zap size={18} />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold og-text leading-none">{credits}</p>
          <p className="text-xs og-faint mt-1">credits left</p>
        </div>
      </div>
      <Link to="/pricing" className="og-ghost w-full justify-center mt-3" style={low ? { borderColor: "var(--accent)" } : undefined}>
        {low ? "Running low. Buy more" : "Buy more credits"}
      </Link>
    </div>
  );
}

function TemplateGallery({
  onPick,
  activeId,
  filter,
}: {
  onPick: (t: Template) => void;
  activeId?: string | null;
  filter: DesignType | "All";
}) {
  const list = filter === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.type === filter);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 og-stagger">
      {list.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t)}
          aria-pressed={activeId === t.id}
          className="og-card og-lift og-focus group text-left overflow-hidden"
          style={activeId === t.id ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" } : undefined}
        >
          <div className="aspect-square overflow-hidden relative">
            <div className="w-full h-full transition-transform duration-300 group-hover:scale-105">
              <TemplateArt t={t} />
            </div>
            <span className="absolute inset-x-3 bottom-3 og-btn og-btn-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 transition-all justify-center">
              Use this template
            </span>
          </div>
          <div className="p-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text truncate">{t.title}</p>
            <span className="og-badge shrink-0">{t.type}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
 
export default function DashboardPage() {
  const { user: clerkUser } = useClerkUser();
  const { dbUser, setDbUser, refreshUser } = useUser();
  const [recent, setRecent] = useState<RecentImage[]>([]);

const addRecent = (url: string, label: string) => {
  setRecent((prev) => {
    const updated = [
      { id: `${Date.now()}-${Math.random()}`, url, label },
      ...prev.filter((item) => item.url !== url),
    ];
    return updated.slice(0, 12);
  });
};

  // theme (saved on the device)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("og-theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* ignore */
    }
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    try {
      localStorage.setItem("og-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const [view, setView] = useState<View>("home");
  const tool = TOOLS.find((t) => t.id === view);
  const toolId = tool?.id;

  // Image Studio: which of its five tools is open
  const [studioTool, setStudioTool] = useState<StudioToolId>("describe");

  // shared state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // inputs
  const [businessName, setBusinessName] = useState("");
  const [designType, setDesignType] = useState<DesignType>("Logo");
  const [description, setDescription] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<DesignType | "All">("All");
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [lastDesign, setLastDesign] = useState<string | null>(null);

  // outputs
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [copied, setCopied] = useState(false);

  // modern UI: command palette + celebration
  const [palette, setPalette] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  useCommandK(() => setPalette(true));
  useEffect(() => {
    if (resultImage || pages.length) setCelebrateKey(Date.now());
  }, [resultImage, pages.length]);

  const creditsLeft = dbUser?.credits_left ?? 0;
  const firstName = clerkUser?.firstName;

  const clearResults = () => {
    setResultImage(null);
    setPages([]);
    setError(null);
    setProgress(null);
  };

  const goTo = (next: View) => {
    if (loading) return;
    setView(next);
    setFile(null);
    setInstructions("");
    clearResults();
    if (next !== "editor" && next !== "pdfToText") setText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openStudio = (id: StudioToolId) => {
    setStudioTool(id);
    goTo("studio");
  };

  const paletteItems: PaletteItem[] = [
    { id: "home", label: "Home", hint: "Back to your dashboard", icon: LayoutDashboard, run: () => goTo("home") },
    ...TOOLS.map((t) => ({ id: t.id, label: t.label, hint: t.blurb, icon: t.icon, run: () => goTo(t.id) })),
    // each Image Studio tool is also searchable on its own
    ...STUDIO_IDS.map((id) => ({
      id: `studio-${id}`,
      label: `Image Studio: ${STUDIO_LABELS[id]}`,
      hint: STUDIO_COSTS[id] === 0 ? "Free" : `${STUDIO_COSTS[id]} credits`,
      icon: Wand2,
      run: () => openStudio(id),
    })),
  ];

  const pickTemplate = (t: Template) => {
    setActiveTemplate(t.id);
    setDesignType(t.type);
    setDescription(t.prompt);
    if (view !== "design") goTo("design");
  };

  const setCredits = (n: unknown) => {
    if (dbUser && typeof n === "number") setDbUser({ ...dbUser, credits_left: n });
  };

  /** Charge credits for client-side tools that cost something. */
  const charge = async (cost: number): Promise<boolean> => {
    if (cost === 0) return true;
    if (creditsLeft < cost) {
      setShowBuyModal(true);
      return false;
    }
    try {
      const res = await axios.post("/api/use-credit", { clerkId: clerkUser?.id, amount: cost });
      setCredits(res.data.credits_left);
      return true;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 402) setShowBuyModal(true);
      else setError("Could not use your credits. Try again.");
      return false;
    }
  };

  const refund = async (amount: number) => {
    if (amount === 0) return;
    try {
      await axios.post("/api/refund-credit", { clerkId: clerkUser?.id, amount });
      await refreshUser();
    } catch {
      /* ignore */
    }
  };

  const handleServerError = async (err: unknown, refundAmount: number) => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 402) setShowBuyModal(true);
      else setError(err.response?.data?.error ?? "Something went wrong. Try again.");
      if (err.response?.status === 500) await refund(refundAmount);
    } else {
      setError("Network error. Check your connection.");
    }
  };

  /* ------------------------------ actions -------------------------------- */

  const runDesign = async () => {
    if (creditsLeft < 1) return setShowBuyModal(true);
    if (!businessName.trim()) return;
    setLoading(true);
    clearResults();
    try {
      const res = await axios.post("/api/generate", {
        businessName: businessName.trim(),
        type: designType,
        description: description.trim(),
        clerkId: clerkUser?.id,
      });
      setResultImage(res.data.image_url);
      setLastDesign(res.data.image_url);
      setCredits(res.data.credits_left);
    } catch (err) {
      await handleServerError(err, 1);
    } finally {
      setLoading(false);
    }
  };

  const runCorrection = async () => {
    if (!file || !tool || (toolId !== "certificate" && toolId !== "pdfFix")) return;
    if (creditsLeft < tool.cost) return setShowBuyModal(true);
    setLoading(true);
    clearResults();
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", toolId === "certificate" ? "certificate" : "pdf");
      form.append("instructions", instructions.trim());
      form.append("clerkId", clerkUser?.id ?? "");
      // Server deducts credits itself, like /api/generate
      const res = await axios.post("/api/correct-design", form);
      setResultImage(res.data.image_url);
      setCredits(res.data.credits_left);
    } catch (err) {
      await handleServerError(err, tool.cost);
    } finally {
      setLoading(false);
    }
  };

  const runBgRemove = async () => {
    if (!file || !tool) return;
    if (!(await charge(tool.cost))) return;
    setLoading(true);
    clearResults();
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          if (total) setProgress(current / total);
        },
      });
      setResultImage(URL.createObjectURL(blob));
    } catch {
      setError("Could not remove the background. Try a clearer image.");
      await refund(tool.cost);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const runPdfToImage = async () => {
    if (!file) return;
    setLoading(true);
    clearResults();
    try {
      setPages(await renderPdfPages(file, 2));
    } catch {
      setError("Could not read this PDF. Check that the file is not damaged or locked.");
    } finally {
      setLoading(false);
    }
  };

  const runExtract = async (f: File | null = file) => {
    if (!f) return;
    setLoading(true);
    clearResults();
    try {
      const out = await extractText(f, setProgress);
      setText(out);
      if (!out.trim()) setError("No text found in this file.");
    } catch {
      setError("Could not read this file. Try another one.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const onEditorFile = (f: File | null) => {
    setFile(f);
    if (f) runExtract(f);
  };

  const applyReplace = () => {
    if (findText) setText((t) => t.split(findText).join(replaceText));
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadTxt = () => saveBlob(new Blob([text], { type: "text/plain" }), `twomindesign_${Date.now()}.txt`);

  const downloadDocx = async () => {
    const { Document, Packer, Paragraph } = await import("docx");
    const doc = new Document({ sections: [{ children: text.split("\n").map((line) => new Paragraph(line)) }] });
    saveBlob(await Packer.toBlob(doc), `twomindesign_${Date.now()}.docx`);
  };

  /* ------------------------------- views --------------------------------- */

  const needsCredits = !!tool && tool.cost > 0 && creditsLeft < tool.cost;
  const costLabel = !tool ? "" : toolBadge(tool);

  const renderHome = () => (
    <div className="flex flex-col gap-10 og-in">
      {/* Hero */}
      <HeroBanner
        name={firstName}
        onStart={() => goTo("design")}
        onOpenPalette={() => setPalette(true)}
        art={[<TemplateArt key="a" t={TEMPLATES[2]} />, <TemplateArt key="b" t={TEMPLATES[0]} />, <TemplateArt key="c" t={TEMPLATES[4]} />]}
      />

      {/* Live stats + ideas */}
      <section className="flex flex-col gap-4">
        <StatsStrip credits={creditsLeft} tools={TOOLS.length} freeTools={TOOLS.filter((t) => t.cost === 0 && !t.note).length} />
        <IdeaMarquee items={["Barbershop flyer", "Restaurant promo", "Tech logo", "Wedding certificate", "Church programme", "Makeup artist card", "Sales poster", "Event flyer", "Business card"]} />
      </section>

      {/* Tools */}
      <section>
        <h2 className="text-lg font-bold og-text mb-4">Your tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 og-stagger">
          {TOOLS.map((t) => (
            <SpotlightCard key={t.id} onClick={() => goTo(t.id)} className="text-left p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="og-tile w-12 h-12 rounded-2xl">
                  <t.icon size={22} />
                </div>
                <ArrowUpRight size={18} className="og-faint" />
              </div>
              <div>
                <p className="font-semibold og-text">{t.label}</p>
                <p className="text-sm og-muted mt-1">{t.blurb}</p>
              </div>
              <span className="og-badge self-start" data-free={t.cost === 0 && !t.note} data-paid={t.cost > 0 || !!t.note}>
                {toolBadge(t)}
              </span>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold og-text">Start from a template</h2>
            <p className="text-sm og-muted">Pick one and we fill in the brief for you. You can change it before generating.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["All", ...DESIGN_TYPES] as const).map((f) => (
              <button key={f} className="og-chip og-focus" data-active={galleryFilter === f} onClick={() => setGalleryFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <TemplateGallery onPick={pickTemplate} activeId={activeTemplate} filter={galleryFilter} />
      </section>
    </div>
  );

  const renderForm = () => {
    switch (toolId) {
      case "design":
        return (
          <>
            <div>
              <Label>Business name *</Label>
              <input
                type="text"
                className="og-input"
                placeholder="e.g: Emeka's Barbershop, Lagos Fresh Kitchen"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Design type</Label>
              <div className="grid grid-cols-2 gap-2">
                {DESIGN_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDesignType(type)}
                    disabled={loading}
                    data-active={designType === type}
                    className="og-chip og-focus !rounded-xl !py-2.5 !text-sm !font-semibold"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label note="(optional but recommended)">Description</Label>
              <textarea
                className="og-input resize-none"
                rows={4}
                placeholder={PLACEHOLDERS[designType]}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setActiveTemplate(null);
                }}
                disabled={loading}
              />
            </div>
            <Btn icon={Sparkles} onClick={runDesign} loading={loading} loadingText="Oga, AI dey cook..." disabled={!businessName.trim() || needsCredits}>
              Generate design · 1 credit
            </Btn>
          </>
        );

      case "certificate":
      case "pdfFix": {
        const chips = FIX_CHIPS[toolId];
        const isCert = toolId === "certificate";
        return (
          <>
            <div>
              <Label>{isCert ? "Certificate" : "PDF or design"} *</Label>
              <UploadZone
                accept="application/pdf,image/*"
                file={file}
                onFile={(f) => {
                  setFile(f);
                  clearResults();
                }}
                disabled={loading}
                hint="PDF, PNG or JPG, up to 10 MB"
              />
            </div>
            <div>
              <Label>What should be corrected?</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {chips.map((c) => (
                  <button
                    key={c}
                    disabled={loading}
                    className="og-chip og-focus"
                    data-active={instructions.includes(c)}
                    onClick={() => setInstructions((v) => (v.includes(c) ? v : v ? `${v}. ${c}` : c))}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <textarea
                className="og-input resize-none"
                rows={4}
                placeholder={isCert ? "e.g: Change the name to Chidinma Okafor and the date to 12 March 2025" : "e.g: Align the header, use one font, make the logo sharper"}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={loading}
              />
            </div>
            <Btn icon={FileCheck2} onClick={runCorrection} loading={loading} loadingText="Oga, AI dey correct am..." disabled={!file || !instructions.trim() || needsCredits}>
              Correct it · {tool?.cost} credits
            </Btn>
          </>
        );
      }

      case "bgRemove":
        return (
          <>
            <div>
              <Label>Image *</Label>
              <UploadZone
                accept="image/*"
                file={file}
                onFile={(f) => {
                  setFile(f);
                  clearResults();
                }}
                disabled={loading}
                hint="PNG, JPG or WEBP"
              />
            </div>
            <Btn
              icon={Eraser}
              onClick={runBgRemove}
              loading={loading}
              loadingText={progress !== null ? `Working ${Math.round(progress * 100)}%` : "Removing background..."}
              disabled={!file || !isImage(file) || needsCredits}
            >
              Remove background · 1 credit
            </Btn>
          </>
        );

      case "pdfToImage":
        return (
          <>
            <div>
              <Label>PDF file *</Label>
              <UploadZone
                accept="application/pdf"
                file={file}
                onFile={(f) => {
                  setFile(f);
                  clearResults();
                }}
                disabled={loading}
                hint="Every page becomes a PNG. Files stay on your device."
              />
            </div>
            <Btn icon={FileImage} onClick={runPdfToImage} loading={loading} loadingText="Converting pages..." disabled={!file || !isPdf(file)}>
              Convert to images
            </Btn>
          </>
        );

      case "pdfToText":
      case "editor":
        return (
          <>
            <div>
              <Label>{toolId === "editor" ? "Open a file (optional)" : "PDF or scanned image *"}</Label>
              <UploadZone
                accept={toolId === "editor" ? "application/pdf,image/*,.txt,text/plain" : "application/pdf,image/*"}
                file={file}
                onFile={(f) => {
                  if (toolId === "editor") onEditorFile(f);
                  else {
                    setFile(f);
                    clearResults();
                  }
                }}
                disabled={loading}
                hint={toolId === "editor" ? "PDF, image or TXT. Or just type in the editor." : "Scanned files are read with OCR on your device"}
              />
            </div>
            {toolId === "pdfToText" && (
              <Btn
                icon={ScanText}
                onClick={() => runExtract()}
                loading={loading}
                loadingText={progress !== null ? `Reading ${Math.round(progress * 100)}%` : "Reading file..."}
                disabled={!file}
              >
                Extract text
              </Btn>
            )}
            {toolId === "editor" && loading && (
              <p className="text-sm og-muted">Reading file{progress !== null ? ` ${Math.round(progress * 100)}%` : "..."}</p>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!tool) return null;

    if (toolId === "pdfToText" || toolId === "editor") {
      return (
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">{toolId === "editor" ? "Editor" : "Extracted text"}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyText} disabled={!text} className="og-ghost">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={downloadTxt} disabled={!text} className="og-ghost">
                <Download size={14} />
                TXT
              </button>
              <Btn small icon={Download} onClick={downloadDocx} disabled={!text}>
                Word
              </Btn>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="og-input flex-1" placeholder="Find" value={findText} onChange={(e) => setFindText(e.target.value)} />
              <input className="og-input flex-1" placeholder="Replace with" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} />
              <button onClick={applyReplace} disabled={!findText} className="og-ghost justify-center">
                Replace all
              </button>
            </div>
            <textarea
              className="og-input resize-y min-h-[320px] font-mono text-sm leading-relaxed"
              placeholder="Your text will show here. You can edit it freely."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs og-faint">{text.trim() ? text.trim().split(/\s+/).length : 0} words</p>
          </div>
        </div>
      );
    }

    if (toolId === "pdfToImage") {
      return (
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">{pages.length ? `${pages.length} ${pages.length === 1 ? "page" : "pages"}` : "Pages"}</p>
            {pages.length > 1 && (
              <Btn small icon={Download} onClick={() => pages.forEach((p, i) => downloadUrl(p, `twomindesign_page_${i + 1}.png`))}>
                Download all
              </Btn>
            )}
          </div>
          {loading ? (
            <Placeholder icon={FileImage} title="Converting your pages..." sub="Big files can take a few seconds" spin />
          ) : pages.length ? (
            <div className="p-4 grid grid-cols-2 gap-3 og-in">
              {pages.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border og-divider bg-white">
                  <img src={p} alt={`Page ${i + 1}`} className="w-full block" />
                  <button
                    onClick={() => downloadUrl(p, `twomindesign_page_${i + 1}.png`)}
                    aria-label={`Download page ${i + 1}`}
                    className="og-ghost absolute bottom-2 right-2"
                    style={{ padding: ".4rem .6rem" }}
                  >
                    <Download size={14} />
                    {i + 1}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Placeholder icon={FileImage} title="Your pages will appear here" sub="Upload a PDF and convert it" />
          )}
        </div>
      );
    }

    const isCutout = toolId === "bgRemove";
    return (
      <div className="og-card overflow-hidden">
        <div className="p-4 border-b og-divider">
          <p className="text-sm font-semibold og-text">Result</p>
        </div>
        {loading ? (
          <Placeholder
            icon={tool.icon}
            title="AI dey work for you..."
            sub={isCutout ? "The first run downloads the model, so it takes a bit longer" : "This go take about 15-30 seconds"}
            spin
          />
        ) : resultImage ? (
          <>
            <div className={isCutout ? "og-checker" : ""}>
              <img src={resultImage} alt="Result" className={`w-full aspect-square block og-reveal ${isCutout ? "object-contain" : "object-cover"}`} />
            </div>
            <div className="p-4 flex gap-3 border-t og-divider">
              <div className="flex-1">
                <Btn icon={Download} onClick={() => downloadUrl(resultImage, `twomindesign_${toolId}_${Date.now()}.${isCutout ? "png" : "jpg"}`)}>
                  Download
                </Btn>
              </div>
              <button onClick={clearResults} aria-label="Start over" className="og-ghost" style={{ padding: "0 1rem", borderRadius: 16 }}>
                <RotateCcw size={16} />
              </button>
            </div>
          </>
        ) : (
          <Placeholder icon={tool.icon} title="Your result will appear here" sub="Fill the form and run the tool" />
        )}
      </div>
    );
  };

  const renderTool = () => {
    if (!tool) return null;

    if (toolId === "studio") {
      return (
        <div className="flex flex-col gap-8 og-in">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold og-text">{tool.label}</h1>
            <p className="og-muted text-sm mt-1">{tool.blurb}.</p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Image Studio tools">
            {STUDIO_IDS.map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={studioTool === id}
                data-active={studioTool === id}
                onClick={() => setStudioTool(id)}
                className="og-chip og-focus !py-2 !px-4 !text-sm"
              >
                {STUDIO_LABELS[id]}
                <span className="opacity-70"> · {STUDIO_COSTS[id] === 0 ? "Free" : `${STUDIO_COSTS[id]} cr`}</span>
              </button>
            ))}
          </div>

          {/* key resets a tool when you switch tabs; remove it if you want each tab to keep its upload */}
          <ImageStudio
  key={studioTool}
  tool={studioTool}
  ctx={{
    creditsLeft,
    charge,
    refund,
    onUseBrief: (b) => {
      setDesignType(b.type);
      setDescription(b.description);
      setActiveTemplate(null);
      goTo("design");
    },
    recent,
    addRecent,
  }}
/>
        </div>
      );
    }

    if (toolId === "leads") {
      return (
        <div className="flex flex-col gap-8 og-in">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold og-text">{tool.label}</h1>
            <p className="og-muted text-sm mt-1">{tool.blurb}.</p>
          </div>
          <LeadsTool lastDesign={lastDesign} />
        </div>
      );
    }

        if (toolId === "events") {
      return (
        <div className="flex flex-col gap-8 og-in">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold og-text">{tool.label}</h1>
            <p className="og-muted text-sm mt-1">{tool.blurb}.</p>
          </div>
          <EventsTool lastDesign={lastDesign} />
        </div>
      );
    }

    if (toolId === "booking") {
      return (
        <div className="flex flex-col gap-8 og-in">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold og-text">{tool.label}</h1>
            <p className="og-muted text-sm mt-1">{tool.blurb}.</p>
          </div>
          <BookingTool lastDesign={lastDesign} />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8 og-in">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold og-text">{tool.label}</h1>
            <span className="og-badge" data-free={tool.cost === 0} data-paid={tool.cost > 0}>
              {costLabel}
            </span>
          </div>
          <p className="og-muted text-sm">{tool.blurb}.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
            {renderForm()}

            {error && (
              <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>
                {error}
              </div>
            )}

            {needsCredits && (
              <p className="text-center og-faint text-xs">
                You need {tool.cost} credits for this tool.{" "}
                <Link to="/pricing" className="og-accent-text font-semibold hover:underline">
                  Buy a plan to continue
                </Link>
              </p>
            )}
          </section>

          <section className="xl:col-span-3 min-w-0">{renderResult()}</section>
        </div>

        {tool.id === "design" && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold og-text">Templates</h2>
                <p className="text-sm og-muted">Not sure what to write? Pick a look and we fill in the brief.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["All", ...DESIGN_TYPES] as const).map((f) => (
                  <button key={f} className="og-chip og-focus" data-active={galleryFilter === f} onClick={() => setGalleryFilter(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <TemplateGallery onPick={pickTemplate} activeId={activeTemplate} filter={galleryFilter} />
          </section>
        )}
      </div>
    );
  };

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="og-root" data-theme={theme}>
      <style>{STYLES}{MODERN_STYLES}</style>
      <Aurora />
      <ScrollProgress />
      <Celebrate trigger={resultImage || pages.length ? celebrateKey : 0} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} items={paletteItems} />

      {/* Header */}
      <header className="og-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 og-focus rounded-lg">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(180deg,#FFE680,#F2B900)" }}>
              <span className="font-bold text-sm font-display" style={{ color: "#1B1500" }}>2</span>
            </div>
            <span className="font-display font-bold text-lg og-text hidden sm:block">
              TwoMin<span className="og-accent-text">Design</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="og-ghost og-focus" onClick={() => setPalette(true)} aria-label="Search tools">
              <Search size={14} />
              <span className="hidden sm:block">Search</span>
            </button>
            <ThemeSwitch theme={theme} onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
            <Link to="/history" className="og-ghost">
              <History size={15} />
              <span className="hidden sm:block">History</span>
            </Link>
            <Link to="/pricing" className="og-ghost" style={creditsLeft < 10 ? { borderColor: "var(--accent)" } : undefined}>
              <Zap size={14} className="og-accent-text" />
              {creditsLeft}
              <span className="hidden sm:block">credits</span>
            </Link>
            <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-10">
        {/* Navigation */}
        <nav aria-label="Tools" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {/* Mobile: scrolling pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <button onClick={() => goTo("home")} aria-current={view === "home" ? "page" : undefined} className="og-pill og-focus">
              <LayoutDashboard size={15} />
              Home
            </button>
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => goTo(t.id)} aria-current={view === t.id ? "page" : undefined} className="og-pill og-focus">
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Desktop: grouped sidebar */}
          <div className="hidden lg:flex flex-col gap-6">
            <button onClick={() => goTo("home")} aria-current={view === "home" ? "page" : undefined} className="og-nav og-focus">
              <span className="og-nav-ico">
                <LayoutDashboard size={16} />
              </span>
              Home
            </button>

            {GROUPS.map((g) => (
              <div key={g}>
                <p className="px-3 mb-2 text-xs font-semibold og-faint">{g}</p>
                <div className="flex flex-col gap-1">
                  {TOOLS.filter((t) => t.group === g).map((t) => (
                    <button key={t.id} onClick={() => goTo(t.id)} aria-current={view === t.id ? "page" : undefined} className="og-nav og-focus">
                      <span className="og-nav-ico">
                        <t.icon size={16} />
                      </span>
                      <span className="flex-1">{t.label}</span>
                      <span className="text-[11px]" style={{ color: t.cost === 0 && !t.note ? "#10b981" : "var(--faint)" }}>
                        {sideLabel(t)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <CreditsCard credits={creditsLeft} />
          </div>
        </nav>

        <main className="min-w-0">{view === "home" ? renderHome() : renderTool()}</main>
      </div>

      {showBuyModal && <BuyExtraModal onClose={() => setShowBuyModal(false)} onSuccess={refreshUser} />}
    </div>
  );
}