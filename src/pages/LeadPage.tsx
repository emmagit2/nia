import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
} from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface HourRow {
  day: string;
  time: string;
}
interface Socials {
  facebook?: string;
  instagram?: string;
  x?: string;
}
interface Highlight {
  value: string;
  label: string;
}
interface PublicCampaign {
  business_name: string;
  headline: string;
  services: string[];
  custom_fields: CustomField[];
  // Branding and company profile. All optional so older campaigns still work.
  logo_url?: string | null;
  cover_url?: string | null;
  brand_color?: string | null;
  category?: string | null;
  about?: string | null;
  highlights?: Highlight[] | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: HourRow[] | string | null;
  socials?: Socials | null;
}

/* ------------------------------------------------------------------ */
/* Demo data. Open your lead route with the slug "demo" to preview.    */
/* ------------------------------------------------------------------ */

const DEMO: PublicCampaign = {
  business_name: "Maison Noir Studio",
  headline: "Premium grooming and beauty in the heart of Lekki. Book your visit in under a minute.",
  category: "Beauty and Grooming",
  brand_color: "#0A8F5A",
  about:
    "Maison Noir is an appointment-led studio built around skilled stylists, quality products and a calm, private space. Every visit is planned around you, so you walk out looking and feeling your best.",
  highlights: [
    { value: "8+", label: "Years open" },
    { value: "2,400", label: "Happy clients" },
    { value: "4.9", label: "Average rating" },
  ],
  services: ["Haircut and styling", "Beard sculpting", "Braids and locs", "Facials and skincare", "Bridal and event makeup"],
  custom_fields: [],
  phone: "08012345678",
  whatsapp: "08012345678",
  email: "hello@maisonnoir.example",
  address: "14 Admiralty Way, Lekki Phase 1, Lagos",
  hours: [
    { day: "Monday", time: "9:00 AM - 8:00 PM" },
    { day: "Tuesday", time: "9:00 AM - 8:00 PM" },
    { day: "Wednesday", time: "9:00 AM - 8:00 PM" },
    { day: "Thursday", time: "9:00 AM - 8:00 PM" },
    { day: "Friday", time: "9:00 AM - 9:00 PM" },
    { day: "Saturday", time: "10:00 AM - 9:00 PM" },
    { day: "Sunday", time: "Closed" },
  ],
  socials: { facebook: "maisonnoirstudio", instagram: "maisonnoirstudio", x: "maisonnoir" },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ACCENT = "#0A8F5A";

function safeColor(c?: string | null) {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_ACCENT;
}
function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0B1F17" : "#FFFFFF";
}
function waNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
}
function socialUrl(kind: keyof Socials, value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const base = { facebook: "https://facebook.com/", instagram: "https://instagram.com/", x: "https://x.com/" };
  return base[kind] + v.replace(/^@/, "");
}
function handleOf(value: string) {
  const v = value.trim().replace(/\/+$/, "");
  const last = v.split("/").pop() ?? v;
  return "@" + last.replace(/^@/, "");
}
function makeVCard(c: PublicCampaign) {
  const l = ["BEGIN:VCARD", "VERSION:3.0", `FN:${c.business_name}`, `ORG:${c.business_name}`];
  if (c.phone) l.push(`TEL;TYPE=WORK,VOICE:${c.phone}`);
  if (c.email) l.push(`EMAIL:${c.email}`);
  if (c.address) l.push(`ADR;TYPE=WORK:;;${c.address};;;;`);
  l.push("END:VCARD");
  return l.join("\r\n");
}

function SocialIcon({ kind }: { kind: keyof Socials }) {
  const s = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "instagram")
    return (
      <svg {...s}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" />
      </svg>
    );
  if (kind === "facebook")
    return (
      <svg {...s}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
const SOCIAL_NAME: Record<keyof Socials, string> = { facebook: "Facebook", instagram: "Instagram", x: "X" };

/* ------------------------------------------------------------------ */
/* Styles (scoped under .lp, no Tailwind needed for this page)         */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
.lp{--ink:#0B1F17;--deep:#063D2E;--yellow:#FFD23F;--muted:#667569;--line:rgba(11,31,23,.08);--bg:#FAFCFA;
  font-family:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;
  background:radial-gradient(900px 420px at 50% -120px,color-mix(in srgb,var(--accent) 10%,transparent),transparent 70%),var(--bg)}
.lp *{box-sizing:border-box}
.lp a{color:inherit;text-decoration:none}
.lp button{font-family:inherit;cursor:pointer}
.lp-wrap{max-width:1100px;margin:0 auto;padding:12px 14px 120px}
@media(min-width:760px){.lp-wrap{padding:36px 28px 64px}}

.lp-demo{margin:0 0 10px;padding:9px 16px;border-radius:999px;background:var(--deep);color:#fff;font-size:12px;font-weight:500;text-align:center}

/* hero */
.lp-hero{position:relative;overflow:hidden;border-radius:34px;background:linear-gradient(160deg,#FFFFFF,#F4F9F6);color:var(--ink);border:1px solid var(--line);box-shadow:0 1px 2px rgba(11,31,23,.04),0 28px 56px -32px rgba(11,31,23,.25);padding:22px 20px 22px;isolation:isolate}
.lp-hero:before{content:"";position:absolute;z-index:-1;width:460px;height:460px;right:-140px;top:-190px;border-radius:50%;background:var(--accent);filter:blur(110px);opacity:.16}
.lp-hero:after{content:"";position:absolute;z-index:-1;width:360px;height:360px;left:-140px;bottom:-190px;border-radius:50%;background:var(--yellow);filter:blur(110px);opacity:.12}
.lp-cover{position:absolute;inset:0;z-index:-1;width:100%;height:100%;object-fit:cover;opacity:.22}
.lp-grain{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.92))}
.lp-top{display:flex;align-items:center;justify-content:space-between}
.lp-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,#fff);border:1px solid color-mix(in srgb,var(--accent) 22%,#fff);color:var(--deep);font-size:11.5px;font-weight:500}
.lp-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid var(--line);color:var(--ink)}
.lp-id{display:flex;align-items:center;gap:14px;margin-top:30px}
.lp-logo{flex:none;width:68px;height:68px;border-radius:22px;object-fit:cover;background:#fff;box-shadow:0 12px 28px -10px color-mix(in srgb,var(--accent) 55%,transparent),0 0 0 1px var(--line)}
.lp-logo-fb{display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;background:var(--accent);color:var(--on)}
.lp-cat{font-size:11.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.lp-name{margin:4px 0 0;font-size:30px;line-height:1.05;font-weight:700;letter-spacing:-.03em}
.lp-sub{margin:18px 0 0;max-width:520px;font-size:14.5px;line-height:1.7;color:#44524A}
.lp-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.lp-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:12px;font-weight:500;color:var(--ink)}
.lp-dot{width:7px;height:7px;border-radius:50%;background:#35E08A;box-shadow:0 0 0 4px rgba(53,224,138,.2)}
.lp-cta-row{display:flex;gap:10px;margin-top:24px}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:52px;padding:0 24px;border-radius:18px;border:0;font-size:14.5px;font-weight:600;transition:transform .15s,box-shadow .15s}
.lp-btn:active{transform:scale(.97)}
.lp-btn-accent{flex:1;background:var(--accent);color:var(--on);box-shadow:0 12px 28px -8px var(--accent)}
.lp-btn-white{flex:1;background:#fff;color:var(--deep);box-shadow:0 12px 28px -10px rgba(0,0,0,.4)}
.lp-btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
@media(min-width:760px){
  .lp-hero{padding:34px 44px 40px;border-radius:40px}
  .lp-logo{width:92px;height:92px;border-radius:28px}.lp-logo-fb{font-size:40px}
  .lp-id{gap:20px;margin-top:44px}
  .lp-name{font-size:56px}
  .lp-sub{font-size:16px}
  .lp-btn-accent,.lp-btn-white{flex:none}
}

/* layout */
.lp-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:14px}
@media(min-width:900px){.lp-grid{grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr);align-items:start;gap:18px;margin-top:18px}.lp-sticky{position:sticky;top:24px}}
.lp-col{display:flex;flex-direction:column;gap:14px;min-width:0}
@media(min-width:900px){.lp-col{gap:18px}}

/* quick actions */
.lp-actions{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px}
.lp-actions::-webkit-scrollbar{display:none}
.lp-chip{flex:none;display:inline-flex;align-items:center;gap:9px;height:48px;padding:0 18px 0 8px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:13.5px;font-weight:500;color:var(--ink);box-shadow:0 8px 20px -14px rgba(16,20,40,.3);transition:transform .15s}
.lp-chip:active{transform:scale(.96)}
.lp-chip i{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,#fff);color:var(--ink)}

/* cards */
.lp-card{background:#fff;border-radius:30px;padding:22px;border:1px solid var(--line);box-shadow:0 1px 2px rgba(16,20,40,.04),0 24px 48px -28px rgba(16,20,40,.22)}
@media(min-width:760px){.lp-card{padding:30px}}
.lp-eyebrow{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:7px}
.lp-h{margin:8px 0 0;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.25}
.lp-p{margin:12px 0 0;font-size:14.5px;line-height:1.8;color:#44524A}

.lp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}
.lp-stat{padding:16px 10px;border-radius:22px;background:#F3F7F4;text-align:center}
.lp-stat:first-child{background:var(--accent);color:var(--on)}
.lp-stat b{display:block;font-size:24px;font-weight:700;letter-spacing:-.03em}
.lp-stat span{display:block;margin-top:2px;font-size:11.5px;opacity:.7}

.lp-svc{list-style:none;margin:16px 0 0;padding:0}
.lp-svc li{display:flex;align-items:center;gap:14px;padding:15px 2px;border-bottom:1px solid var(--line);font-size:15px;font-weight:500}
.lp-svc li:last-child{border-bottom:0;padding-bottom:2px}
.lp-svc em{font-style:normal;font-size:12px;font-weight:600;color:var(--muted);width:24px}
.lp-svc svg{margin-left:auto;color:var(--muted)}

.lp-map{position:relative;margin:18px -22px -22px;height:240px;border-radius:0 0 30px 30px;overflow:hidden}
@media(min-width:760px){.lp-map{margin:22px -30px -30px;height:280px}}
.lp-map iframe{width:100%;height:100%;border:0;filter:grayscale(.35) contrast(1.03)}
.lp-map a{position:absolute;right:14px;bottom:14px;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;background:var(--deep);color:#fff;font-size:13px;font-weight:600;box-shadow:0 10px 24px rgba(6,61,46,.35)}
.lp-addr{display:flex;gap:12px;align-items:flex-start;margin-top:14px;font-size:14.5px;line-height:1.6;color:#44524A}
.lp-addr svg{flex:none;margin-top:3px;color:var(--accent)}

.lp-hours{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.lp-hours li{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-radius:16px;font-size:13.5px;color:#44524A}
.lp-hours li.today{background:color-mix(in srgb,var(--accent) 12%,#fff);color:var(--ink);font-weight:600}
.lp-hours small{margin-left:8px;padding:2px 8px;border-radius:999px;background:var(--yellow);color:var(--ink);font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.lp-mail{display:flex;align-items:center;gap:12px;margin-top:14px;padding:14px 16px;border-radius:18px;background:#F3F7F4;font-size:13.5px;word-break:break-all}
.lp-mail svg{flex:none;color:var(--accent)}

.lp-soc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.lp-soc a{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:22px;background:#F3F7F4;transition:transform .15s,background .15s;min-width:0}
.lp-soc a:hover{background:#E8F0EA}
.lp-soc i{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:14px;background:var(--deep);color:#fff}
.lp-soc b{display:block;font-size:13.5px;font-weight:600}
.lp-soc span{display:block;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* form */
.lp-form{padding:0;overflow:hidden}
.lp-form-head{padding:26px 22px 20px;background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 14%,#fff),#fff 70%)}
@media(min-width:760px){.lp-form-head{padding:32px 30px 22px}}
.lp-form-body{display:flex;flex-direction:column;gap:12px;padding:6px 22px 24px}
@media(min-width:760px){.lp-form-body{padding:6px 30px 30px}}
.lp-in{width:100%;height:54px;padding:0 18px;border-radius:18px;border:1.5px solid transparent;background:#F3F7F4;font-family:inherit;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s,background .15s,box-shadow .15s}
textarea.lp-in{height:auto;padding:15px 18px;resize:none;line-height:1.6}
select.lp-in{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7080' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
.lp-in::placeholder{color:#9BA89F}
.lp-in:focus{background:#fff;border-color:var(--accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 18%,transparent)}
.lp-geo{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:16px;border:1.5px dashed #CFDAD2;background:transparent;font-size:13px;font-weight:500;color:var(--muted)}
.lp-err{margin:0;padding:11px 14px;border-radius:14px;background:#FEECEC;color:#C0362C;font-size:13px}
.lp-send{display:flex;align-items:center;justify-content:space-between;height:58px;padding:0 10px 0 24px;margin-top:4px;border:0;border-radius:20px;background:var(--deep);color:#fff;font-size:15px;font-weight:600;box-shadow:0 16px 30px -14px rgba(6,61,46,.7);transition:transform .15s}
.lp-send:active{transform:scale(.98)}.lp-send:disabled{opacity:.6}
.lp-send i{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:14px;background:var(--yellow);color:var(--ink)}
.lp-note{margin:2px 0 0;text-align:center;font-size:12px;color:#9BA89F}

.lp-done{padding:46px 26px 40px;text-align:center}
.lp-done .ok{display:flex;align-items:center;justify-content:center;width:76px;height:76px;margin:0 auto 18px;border-radius:50%;background:color-mix(in srgb,#35E08A 18%,#fff);color:#17B26A}
.lp-done h2{margin:0;font-size:24px;font-weight:700;letter-spacing:-.02em}
.lp-done p{margin:10px auto 0;max-width:290px;font-size:14px;line-height:1.7;color:var(--muted)}
.lp-done .lp-btn{margin-top:24px;height:50px}

/* floating mobile bar */
.lp-bar{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:10px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(180deg,transparent,rgba(250,252,250,.94) 40%)}
.lp-bar .lp-btn{height:54px;box-shadow:0 18px 34px -12px rgba(11,12,20,.6)}
.lp-bar .lp-btn-dark{flex:1;background:var(--deep);color:#fff}
.lp-bar .lp-btn-round{width:54px;padding:0;background:#fff;color:var(--ink);border:1px solid var(--line)}
@media(min-width:900px){.lp-bar{display:none}}

.lp-foot{margin:34px 0 0;text-align:center;font-size:12px;color:#9BA89F}
.lp-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:var(--deep);color:#fff;font-size:12.5px;font-weight:500;box-shadow:0 12px 30px rgba(0,0,0,.3);z-index:10}
.lp-msg{padding:90px 20px;text-align:center;color:var(--muted);font-size:15px}

@keyframes lp-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.lp-rise{animation:lp-rise .55s cubic-bezier(.2,.7,.2,1) both}
`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Public page a customer lands on after scanning the QR. No login. Mobile first. */
export default function LeadPage() {
  const { slug } = useParams();
  const isDemo = slug === "demo";

  const [camp, setCamp] = useState<PublicCampaign | null>(isDemo ? DEMO : null);
  const [missing, setMissing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [locationText, setLocationText] = useState("");
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    axios
      .get(`/api/public/campaign/${slug}`)
      .then((r) => setCamp(r.data.campaign))
      .catch(() => setMissing(true));
  }, [slug, isDemo]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const accent = safeColor(camp?.brand_color);
  const onAccent = readableOn(accent);
  const rootVars = { ["--accent" as string]: accent, ["--on" as string]: onAccent } as React.CSSProperties;

  const todayName = useMemo(() => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()], []);

  const socials = (Object.entries(camp?.socials ?? {}) as [keyof Socials, string | undefined][]).filter(([, v]) => v && v.trim());
  const mapQuery = camp?.address ? encodeURIComponent(camp.address) : null;
  const directions = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null;
  const hourRows = Array.isArray(camp?.hours) ? (camp?.hours as HourRow[]) : [];
  const hoursText = typeof camp?.hours === "string" ? camp.hours : "";
  const todayRow = hourRows.find((h) => h.day.toLowerCase().startsWith(todayName.slice(0, 3).toLowerCase()));
  const closedToday = !!todayRow && /closed/i.test(todayRow.time);
  const rating = camp?.highlights?.find((h) => /rating/i.test(h.label));
  const shortPlace = camp?.address ? camp.address.split(",").slice(-2).join(",").trim() : "";
  const primaryContact = camp?.phone
    ? { href: `tel:${camp.phone}`, label: "Call", icon: <Phone size={17} /> }
    : camp?.whatsapp
      ? { href: `https://wa.me/${waNumber(camp.whatsapp)}`, label: "WhatsApp", icon: <MessageCircle size={17} /> }
      : null;

  const goToForm = () => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const saveContact = () => {
    if (!camp) return;
    const blob = new Blob([makeVCard(camp)], { type: "text/vcard" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${camp.business_name.replace(/\s+/g, "-")}.vcf`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast("Contact saved");
  };

  const sharePage = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: camp?.business_name, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
    } catch {
      /* share sheet closed */
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("Your phone does not support location sharing.");
    setGeoBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoBusy(false);
      },
      () => {
        setGeoBusy(false);
        setError("Could not get your location. You can type your area instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    for (const f of camp?.custom_fields ?? []) {
      if (f.required && !(answers[f.id] ?? "").trim()) return setError(`Please answer: ${f.label}`);
    }
    setSending(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 700)); // demo: nothing is sent
      } else {
        await axios.post(`/api/public/lead/${slug}`, {
          name,
          phone,
          interest,
          message,
          locationText,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          answers,
          website,
        });
      }
      setDone(true);
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not send. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="lp" style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", colorScheme: "light", ...rootVars }}>
      <style>{CSS}</style>

      <div className="lp-wrap">
        {missing ? (
          <div className="lp-card lp-msg">This link is not active.</div>
        ) : !camp ? (
          <div className="lp-card lp-msg">Loading...</div>
        ) : (
          <>
            {isDemo && <div className="lp-demo">Demo preview. This is how your customers will see your page.</div>}

            {/* ---------------- HERO ---------------- */}
            <header className="lp-hero lp-rise">
              {camp.cover_url && <img className="lp-cover" src={camp.cover_url} alt="" />}
              <div className="lp-grain" />

              <div className="lp-top">
                <span className="lp-badge">
                  <BadgeCheck size={14} style={{ color: "var(--accent)" }} /> Verified business
                </span>
                <button className="lp-icon" onClick={sharePage} aria-label="Share this page">
                  <Share2 size={16} />
                </button>
              </div>

              <div className="lp-id">
                {camp.logo_url ? (
                  <img className="lp-logo" src={camp.logo_url} alt={`${camp.business_name} logo`} />
                ) : (
                  <div className="lp-logo lp-logo-fb">{camp.business_name.trim().charAt(0).toUpperCase()}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  {camp.category && <div className="lp-cat">{camp.category}</div>}
                  <h1 className="lp-name">{camp.business_name}</h1>
                </div>
              </div>

              {camp.headline && <p className="lp-sub">{camp.headline}</p>}

              <div className="lp-meta">
                {rating && (
                  <span className="lp-pill">
                    <Star size={13} fill="currentColor" style={{ color: "#FFC83D" }} /> {rating.value} rating
                  </span>
                )}
                {shortPlace && (
                  <span className="lp-pill">
                    <MapPin size={13} /> {shortPlace}
                  </span>
                )}
                {todayRow && (
                  <span className="lp-pill">
                    <span className="lp-dot" style={closedToday ? { background: "#FF6B6B", boxShadow: "0 0 0 4px rgba(255,107,107,.2)" } : undefined} />
                    {closedToday ? "Closed today" : `Open today · ${todayRow.time}`}
                  </span>
                )}
              </div>

              <div className="lp-cta-row">
                <button className="lp-btn lp-btn-accent" onClick={goToForm}>
                  Request a callback <ArrowRight size={17} />
                </button>
                {primaryContact && (
                  <a className="lp-btn lp-btn-ghost" href={primaryContact.href}>
                    {primaryContact.icon} {primaryContact.label}
                  </a>
                )}
              </div>
            </header>

            {/* ---------------- BODY ---------------- */}
            <div className="lp-grid">
              <div className="lp-col">
                {/* Quick actions */}
                <div className="lp-actions lp-rise" style={{ animationDelay: ".05s" }}>
                  {camp.whatsapp && (
                    <a className="lp-chip" href={`https://wa.me/${waNumber(camp.whatsapp)}`} target="_blank" rel="noopener noreferrer">
                      <i><MessageCircle size={16} /></i> WhatsApp
                    </a>
                  )}
                  {directions && (
                    <a className="lp-chip" href={directions} target="_blank" rel="noopener noreferrer">
                      <i><MapPin size={16} /></i> Directions
                    </a>
                  )}
                  <button className="lp-chip" onClick={saveContact}>
                    <i><BookmarkPlus size={16} /></i> Save contact
                  </button>
                  <button className="lp-chip" onClick={sharePage}>
                    <i><Share2 size={16} /></i> Share
                  </button>
                </div>

                {/* About */}
                {(camp.about || (camp.highlights?.length ?? 0) > 0) && (
                  <section className="lp-card lp-rise" style={{ animationDelay: ".1s" }}>
                    <div className="lp-eyebrow">About us</div>
                    <h2 className="lp-h">Who we are</h2>
                    {camp.about && <p className="lp-p">{camp.about}</p>}
                    {(camp.highlights?.length ?? 0) > 0 && (
                      <div className="lp-stats">
                        {camp.highlights!.slice(0, 3).map((h) => (
                          <div key={h.label} className="lp-stat">
                            <b>{h.value}</b>
                            <span>{h.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Services */}
                {camp.services.length > 0 && (
                  <section className="lp-card lp-rise" style={{ animationDelay: ".15s" }}>
                    <div className="lp-eyebrow">Services</div>
                    <h2 className="lp-h">What we do</h2>
                    <ul className="lp-svc">
                      {camp.services.map((s, i) => (
                        <li key={s}>
                          <em>{String(i + 1).padStart(2, "0")}</em>
                          {s}
                          <ArrowUpRight size={17} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Location */}
                {camp.address && (
                  <section className="lp-card lp-rise" style={{ animationDelay: ".2s" }}>
                    <div className="lp-eyebrow">Location</div>
                    <h2 className="lp-h">Find us</h2>
                    <div className="lp-addr">
                      <MapPin size={18} />
                      <span>{camp.address}</span>
                    </div>
                    <div className="lp-map">
                      <iframe title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`} />
                      {directions && (
                        <a href={directions} target="_blank" rel="noopener noreferrer">
                          Get directions <ArrowUpRight size={15} />
                        </a>
                      )}
                    </div>
                  </section>
                )}

                {/* Hours */}
                {(hourRows.length > 0 || hoursText || camp.email) && (
                  <section className="lp-card lp-rise" style={{ animationDelay: ".25s" }}>
                    {(hourRows.length > 0 || hoursText) && (
                      <>
                        <div className="lp-eyebrow"><Clock size={13} /> Opening hours</div>
                        <h2 className="lp-h">When to visit</h2>
                        {hourRows.length > 0 ? (
                          <ul className="lp-hours">
                            {hourRows.map((h) => {
                              const isToday = h.day.toLowerCase().startsWith(todayName.slice(0, 3).toLowerCase());
                              return (
                                <li key={h.day} className={isToday ? "today" : undefined}>
                                  <span>
                                    {h.day}
                                    {isToday && <small>Today</small>}
                                  </span>
                                  <span>{h.time}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="lp-p" style={{ whiteSpace: "pre-line" }}>{hoursText}</p>
                        )}
                      </>
                    )}
                    {camp.email && (
                      <a className="lp-mail" href={`mailto:${camp.email}`}>
                        <Mail size={17} /> {camp.email}
                      </a>
                    )}
                  </section>
                )}

                {/* Social */}
                {socials.length > 0 && (
                  <section className="lp-card lp-rise" style={{ animationDelay: ".3s" }}>
                    <div className="lp-eyebrow">Social</div>
                    <h2 className="lp-h">Follow along</h2>
                    <div className="lp-soc">
                      {socials.map(([kind, val]) => (
                        <a key={kind} href={socialUrl(kind, val!)} target="_blank" rel="noopener noreferrer">
                          <i><SocialIcon kind={kind} /></i>
                          <div>
                            <b>{SOCIAL_NAME[kind]}</b>
                            <span>{handleOf(val!)}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Lead form */}
              <aside id="lead-form" className="lp-sticky" style={{ scrollMarginTop: 16 }}>
                <div className="lp-card lp-form lp-rise" style={{ animationDelay: ".12s" }}>
                  {done ? (
                    <div className="lp-done">
                      <div className="ok"><CheckCircle2 size={38} /></div>
                      <h2>Thank you, {name.split(" ")[0]}</h2>
                      <p>{camp.business_name} has your details and will be in touch shortly.</p>
                      {(camp.whatsapp || camp.phone) && (
                        <a
                          className="lp-btn lp-btn-accent"
                          style={{ display: "inline-flex", flex: "none" }}
                          href={camp.whatsapp ? `https://wa.me/${waNumber(camp.whatsapp)}` : `tel:${camp.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {camp.whatsapp ? <MessageCircle size={17} /> : <Phone size={17} />}
                          {camp.whatsapp ? "Chat on WhatsApp now" : "Call now"}
                        </a>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="lp-form-head">
                        <div className="lp-eyebrow">Get in touch</div>
                        <h2 className="lp-h" style={{ fontSize: 26 }}>Request a callback</h2>
                        <p className="lp-p" style={{ marginTop: 8 }}>Leave your details and we will reach out. Most replies come the same day.</p>
                      </div>

                      <div className="lp-form-body">
                        <input className="lp-in" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                        <input className="lp-in" placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />

                        {camp.services.length > 0 && (
                          <select className="lp-in" value={interest} onChange={(e) => setInterest(e.target.value)}>
                            <option value="">What are you interested in?</option>
                            {camp.services.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}

                        <input className="lp-in" placeholder="Your area, e.g. Ikeja, Lekki" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={120} />
                        <button type="button" className="lp-geo" onClick={useMyLocation} disabled={geoBusy}>
                          <MapPin size={15} />
                          {geo ? "Location shared" : geoBusy ? "Getting location..." : "Share my exact location (optional)"}
                        </button>

                        <DynamicFields
                          fields={camp.custom_fields ?? []}
                          values={answers}
                          onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                          inputClass="lp-in"
                        />

                        <textarea className="lp-in" rows={3} placeholder="Anything else we should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                        {/* honeypot */}
                        <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                        {error && <p role="alert" className="lp-err">{error}</p>}

                        <button className="lp-send" onClick={submit} disabled={sending}>
                          {sending ? "Sending..." : "Send my details"}
                          <i><ArrowRight size={18} /></i>
                        </button>
                        <p className="lp-note">Private. Your details go only to {camp.business_name}.</p>
                      </div>
                    </>
                  )}
                </div>
              </aside>
            </div>

            <p className="lp-foot">Powered by TwoMinDesign</p>
          </>
        )}
      </div>

      {/* Floating bar on phones */}
      {camp && !done && !missing && (
        <div className="lp-bar">
          {primaryContact && (
            <a className="lp-btn lp-btn-round" href={primaryContact.href} aria-label={primaryContact.label}>
              {primaryContact.icon}
            </a>
          )}
          <button className="lp-btn lp-btn-dark" onClick={goToForm}>
            Request a callback <ArrowRight size={17} style={{ color: "var(--yellow)" }} />
          </button>
        </div>
      )}

      {toast && <div className="lp-toast">{toast}</div>}
    </div>
  );
}