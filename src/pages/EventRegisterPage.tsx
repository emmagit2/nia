import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  Users,
} from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PublicEvent {
  title: string; host_name: string; logo_url: string; cover_url: string; brand_color: string;
  visibility: "public" | "private"; date: string; locked: boolean; wrong_code?: boolean;
  // only sent when the event is public or the invite code was right
  description?: string; host_about?: string; host_whatsapp?: string; host_instagram?: string;
  host_facebook?: string; host_x?: string; // optional, shown when the host adds them
  start_time?: string; end_time?: string; venue_name?: string; venue_address?: string; map_link?: string;
  max_guests_per_registration?: number; closed?: boolean; spots_left?: number | null; custom_fields?: CustomField[];
}

/* ------------------------------------------------------------------ */
/* Demo data. Open /e/demo to preview. Extra previews with ?preview=   */
/* locked | full | closed | done                                        */
/* ------------------------------------------------------------------ */

const DEMO: PublicEvent = {
  title: "Amara and Tobi: Wedding Reception",
  host_name: "Amara and Tobi",
  logo_url: "",
  cover_url: "",
  brand_color: "#0A8F5A",
  visibility: "public",
  date: "2026-12-19",
  locked: false,
  description:
    "Join us for an evening of food, music and dancing as we celebrate our wedding. Dress code is elegant traditional or formal. Please register so we can plan seating and meals for every guest.",
  host_about: "Two people who met over jollof arguments and decided to keep the debate going for life. We cannot wait to celebrate with you.",
  host_whatsapp: "08012345678",
  host_instagram: "amaraandtobi",
  host_facebook: "amaraandtobi",
  host_x: "amaraandtobi",
  start_time: "15:00",
  end_time: "21:00",
  venue_name: "The Grand Pavilion",
  venue_address: "Plot 5, Ahmadu Bello Way, Victoria Island, Lagos",
  max_guests_per_registration: 4,
  closed: false,
  spots_left: 42,
  custom_fields: [],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_BRAND = "#0A8F5A";

const safeColor = (c?: string | null) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_BRAND);

const readableOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0B1F17" : "#FFFFFF";
};

const waNumber = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
};

const handle = (v: string) => v.trim().replace(/^@/, "");

const prettyDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const prettyTime = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

/** Builds and downloads an .ics file so guests can add the event to their calendar. */
const downloadIcs = (e: PublicEvent) => {
  const stamp = (d: string, t: string) => d.replace(/-/g, "") + "T" + (t || "09:00").replace(":", "") + "00";
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
    `DTSTART:${stamp(e.date, e.start_time || "")}`,
    `DTEND:${stamp(e.date, e.end_time || e.start_time || "")}`,
    `SUMMARY:${e.title}`,
    `LOCATION:${[e.venue_name, e.venue_address].filter(Boolean).join(", ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "event.ics";
  a.click();
};

type SocialKind = "instagram" | "facebook" | "x";

function SocialIcon({ kind }: { kind: SocialKind }) {
  const s = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_BASE: Record<SocialKind, string> = { instagram: "https://instagram.com/", facebook: "https://facebook.com/", x: "https://x.com/" };
const SOCIAL_NAME: Record<SocialKind, string> = { instagram: "Instagram", facebook: "Facebook", x: "X" };

/* ------------------------------------------------------------------ */
/* Styles (scoped under .ep, no Tailwind needed for this page)         */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
.ep{--ink:#0B1F17;--deep:#063D2E;--yellow:#FFD23F;--muted:#667569;--line:rgba(11,31,23,.08);--bg:#FAFCFA;
  font-family:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;
  background:radial-gradient(900px 420px at 50% -120px,color-mix(in srgb,var(--accent) 10%,transparent),transparent 70%),var(--bg)}
.ep *{box-sizing:border-box}
.ep a{color:inherit;text-decoration:none}
.ep button{font-family:inherit;cursor:pointer}
.ep-wrap{max-width:1100px;margin:0 auto;padding:12px 14px 120px}
@media(min-width:760px){.ep-wrap{padding:36px 28px 64px}}
.ep-demo{margin:0 0 10px;padding:9px 16px;border-radius:999px;background:var(--deep);color:#fff;font-size:12px;font-weight:500;text-align:center}

/* hero */
.ep-hero{position:relative;border-radius:34px;background:linear-gradient(160deg,#FFFFFF,#F4F9F6);border:1px solid var(--line);box-shadow:0 1px 2px rgba(11,31,23,.04),0 28px 56px -32px rgba(11,31,23,.25);padding:10px 10px 22px}
.ep-banner{position:relative;height:150px;border-radius:26px;overflow:hidden;
  background:radial-gradient(420px 200px at 85% 0%,color-mix(in srgb,var(--accent) 30%,#fff),transparent 70%),radial-gradient(360px 180px at 0% 100%,color-mix(in srgb,var(--yellow) 32%,#fff),transparent 70%),#EEF6F1}
.ep-banner:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(11,31,23,.07) 1px,transparent 1.4px);background-size:18px 18px}
.ep-banner img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ep-bt{position:absolute;left:12px;right:12px;top:12px;display:flex;align-items:center;justify-content:space-between}
.ep-pillw{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:11.5px;font-weight:500}
.ep-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid var(--line);color:var(--ink)}
.ep-logo{position:absolute;left:20px;bottom:-38px;width:76px;height:76px;border-radius:24px;background:#fff;object-fit:contain;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:var(--accent);box-shadow:0 14px 28px -10px color-mix(in srgb,var(--accent) 50%,transparent),0 0 0 4px #fff,0 0 0 5px var(--line);overflow:hidden}
.ep-logo img{width:100%;height:100%;object-fit:contain}
.ep-hb{padding:52px 12px 0}
.ep-host{font-size:11.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.ep-title{margin:6px 0 0;font-size:28px;line-height:1.1;font-weight:700;letter-spacing:-.03em}
.ep-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.ep-pill{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:12.5px;font-weight:500}
.ep-pill svg{color:var(--accent)}
.ep-pill.hot{background:color-mix(in srgb,var(--yellow) 30%,#fff);border-color:color-mix(in srgb,var(--yellow) 60%,#fff)}
.ep-pill.hot svg{color:var(--ink)}
.ep-cta{display:flex;gap:10px;margin-top:22px}
.ep-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:52px;padding:0 24px;border-radius:18px;border:0;font-size:14.5px;font-weight:600;transition:transform .15s}
.ep-btn:active{transform:scale(.97)}
.ep-btn-accent{flex:1;background:var(--accent);color:var(--on);box-shadow:0 12px 28px -8px var(--accent)}
.ep-btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.ep-btn:disabled{opacity:.55}
.ep-follow{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
.ep-follow>span{font-size:12px;font-weight:500;color:var(--muted);margin-right:2px}
.ep-follow a{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid var(--line);box-shadow:0 8px 18px -12px rgba(11,31,23,.4);transition:transform .15s,background .15s,color .15s}
.ep-follow a:hover{background:var(--deep);color:#fff;transform:translateY(-2px)}
@media(min-width:760px){
  .ep-hero{padding:14px 14px 34px;border-radius:40px}
  .ep-banner{height:210px;border-radius:30px}
  .ep-logo{width:100px;height:100px;left:34px;bottom:-50px;border-radius:30px;font-size:42px}
  .ep-hb{padding:68px 30px 0}
  .ep-title{font-size:46px}
  .ep-btn-accent{flex:none}
}

/* layout */
.ep-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:14px}
@media(min-width:900px){.ep-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);align-items:start;gap:18px;margin-top:18px}.ep-sticky{position:sticky;top:24px}}
.ep-col{display:flex;flex-direction:column;gap:14px;min-width:0}
@media(min-width:900px){.ep-col{gap:18px}}

/* cards */
.ep-card{background:#fff;border-radius:30px;padding:22px;border:1px solid var(--line);box-shadow:0 1px 2px rgba(11,31,23,.04),0 24px 48px -28px rgba(11,31,23,.22)}
@media(min-width:760px){.ep-card{padding:30px}}
.ep-eyebrow{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:7px}
.ep-h{margin:8px 0 0;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.25}
.ep-p{margin:12px 0 0;font-size:14.5px;line-height:1.8;color:#44524A;white-space:pre-line}

.ep-when{display:flex;gap:16px;align-items:center;margin-top:18px}
.ep-date{flex:none;width:74px;border-radius:22px;overflow:hidden;text-align:center;border:1px solid var(--line);background:#fff;box-shadow:0 12px 24px -16px rgba(11,31,23,.4)}
.ep-date i{display:block;font-style:normal;padding:6px 0;background:var(--accent);color:var(--on);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.ep-date b{display:block;padding:8px 0 10px;font-size:30px;line-height:1;font-weight:700;letter-spacing:-.03em}
.ep-when strong{display:block;font-size:16px;font-weight:600;line-height:1.4}
.ep-when span{display:flex;align-items:center;gap:7px;margin-top:5px;font-size:13.5px;color:var(--muted)}
.ep-venue{display:flex;gap:12px;align-items:flex-start;margin-top:20px;padding:16px;border-radius:20px;background:#F3F7F4;font-size:14.5px;line-height:1.6;color:#44524A}
.ep-venue svg{flex:none;margin-top:3px;color:var(--accent)}
.ep-venue b{display:block;color:var(--ink);font-weight:600}
.ep-map{position:relative;margin:18px -22px -22px;height:230px;border-radius:0 0 30px 30px;overflow:hidden}
@media(min-width:760px){.ep-map{margin:22px -30px -30px;height:270px}}
.ep-map iframe{width:100%;height:100%;border:0;filter:grayscale(.35) contrast(1.03)}
.ep-map a{position:absolute;right:14px;bottom:14px;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;background:var(--deep);color:#fff;font-size:13px;font-weight:600;box-shadow:0 10px 24px rgba(6,61,46,.35)}

.ep-hostbtns{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.ep-chip{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 18px 0 8px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:13.5px;font-weight:500;box-shadow:0 8px 20px -14px rgba(11,31,23,.3)}
.ep-chip i{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,#fff)}

/* form */
.ep-form{padding:0;overflow:hidden}
.ep-fh{padding:26px 22px 20px;background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 12%,#fff),#fff 70%)}
@media(min-width:760px){.ep-fh{padding:32px 30px 22px}}
.ep-fb{display:flex;flex-direction:column;gap:12px;padding:6px 22px 24px}
@media(min-width:760px){.ep-fb{padding:6px 30px 30px}}
.ep-in{width:100%;height:54px;padding:0 18px;border-radius:18px;border:1.5px solid transparent;background:#F3F7F4;font-family:inherit;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s,background .15s,box-shadow .15s}
textarea.ep-in{height:auto;padding:15px 18px;resize:none;line-height:1.6}
.ep-in::placeholder{color:#9BA89F}
.ep-in:focus{background:#fff;border-color:var(--accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 18%,transparent)}
.ep-code-in{text-align:center;letter-spacing:.3em;text-transform:uppercase;font-weight:600}
.ep-step{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 10px 18px;border-radius:18px;background:#F3F7F4;font-size:14px;color:#44524A}
.ep-step div{display:flex;align-items:center;gap:12px}
.ep-step button{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink)}
.ep-step b{width:22px;text-align:center;font-size:16px;font-weight:700;color:var(--ink)}
.ep-err{margin:0;padding:11px 14px;border-radius:14px;background:#FEECEC;color:#C0362C;font-size:13px}
.ep-send{display:flex;align-items:center;justify-content:space-between;height:58px;padding:0 10px 0 24px;margin-top:4px;border:0;border-radius:20px;background:var(--deep);color:#fff;font-size:15px;font-weight:600;box-shadow:0 16px 30px -14px rgba(6,61,46,.7);transition:transform .15s}
.ep-send:active{transform:scale(.98)}.ep-send:disabled{opacity:.6}
.ep-send i{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:14px;background:var(--yellow);color:var(--ink)}
.ep-note{margin:2px 0 0;text-align:center;font-size:12px;color:#9BA89F}
.ep-closed{margin:8px 0 6px;padding:18px;border-radius:20px;background:#F3F7F4;text-align:center;font-size:14.5px;font-weight:500;color:#44524A}

/* confirmation ticket */
.ep-ok{padding:34px 22px 26px;text-align:center}
.ep-okc{display:flex;align-items:center;justify-content:center;width:72px;height:72px;margin:0 auto 16px;border-radius:50%;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent)}
.ep-ok h2{margin:0;font-size:23px;font-weight:700;letter-spacing:-.02em}
.ep-ok p.s{margin:8px auto 0;max-width:300px;font-size:14px;line-height:1.7;color:var(--muted)}
.ep-ticket{position:relative;margin:22px 0 0;padding:20px 16px 18px;border-radius:24px;background:color-mix(in srgb,var(--accent) 8%,#fff);border:1.5px dashed color-mix(in srgb,var(--accent) 45%,#fff)}
.ep-ticket small{display:block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.ep-ticket b{display:block;margin-top:6px;font-size:34px;font-weight:700;letter-spacing:.18em;padding-left:.18em}
.ep-ticket em{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,#fff);transform:translateY(-50%)}
.ep-hint{margin:14px 0 0;font-size:12.5px;color:var(--muted)}
.ep-ok .ep-btn{margin-top:18px;width:100%;height:50px}

/* locked */
.ep-lock{max-width:460px;margin:14px auto 0;text-align:center}
.ep-lockc{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:0 auto 16px;border-radius:22px;background:color-mix(in srgb,var(--yellow) 28%,#fff);color:var(--ink)}
.ep-lock .ep-in{margin-top:18px}
.ep-lock .ep-btn{width:100%;margin-top:12px}

/* floating mobile bar */
.ep-bar{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:10px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(180deg,transparent,rgba(250,252,250,.94) 40%)}
.ep-bar .ep-btn{flex:1;height:54px;background:var(--deep);color:#fff;box-shadow:0 18px 34px -12px rgba(6,61,46,.6)}
@media(min-width:900px){.ep-bar{display:none}}

.ep-foot{margin:34px 0 0;text-align:center;font-size:12px;color:#9BA89F}
.ep-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:var(--deep);color:#fff;font-size:12.5px;font-weight:500;box-shadow:0 12px 30px rgba(0,0,0,.3);z-index:10}
.ep-msg{padding:90px 20px;text-align:center;color:var(--muted);font-size:15px}

@keyframes ep-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ep-rise{animation:ep-rise .55s cubic-bezier(.2,.7,.2,1) both}
`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Public event page, opened from the QR code at /e/:slug. No login. Mobile first. */
export default function EventRegisterPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isDemo = slug === "demo";
  const preview = isDemo ? params.get("preview") : null;

  const [code, setCode] = useState((params.get("code") ?? "").trim());
  const [draft, setDraft] = useState("");
  const [fetched, setFetched] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [demoUnlocked, setDemoUnlocked] = useState(false);

  const [name, setName] = useState(preview === "done" ? "Chinedu Okeke" : "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; code: string } | null>(preview === "done" ? { status: "confirmed", code: "MN4K9Q" } : null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    setBlocked(null);
    axios
      .get(`/api/public/event/${slug}${code ? `?code=${encodeURIComponent(code)}` : ""}`)
      .then((r) => setFetched(r.data.event))
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 429) setBlocked(e.response.data?.error ?? "Too many tries. Please wait a few minutes.");
        else setMissing(true);
      });
  }, [slug, code, isDemo]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Demo preview states
  const ev: PublicEvent | null = useMemo(() => {
    if (!isDemo) return fetched;
    if (preview === "locked" && !demoUnlocked) return { ...DEMO, visibility: "private", locked: true, description: undefined };
    if (preview === "full") return { ...DEMO, spots_left: 0 };
    if (preview === "closed") return { ...DEMO, closed: true };
    return DEMO;
  }, [isDemo, fetched, preview, demoUnlocked]);

  // Bring the ticket into view after registering
  useEffect(() => {
    if (result) document.getElementById("ep-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    for (const f of ev?.custom_fields ?? []) {
      if ((f as { required?: boolean }).required && !(answers[(f as { id: string }).id] ?? "").trim()) return setError(`Please answer: ${(f as { label: string }).label}`);
    }
    setSending(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 700)); // demo: nothing is sent
        setResult({ status: ev?.spots_left === 0 ? "waitlist" : "confirmed", code: "MN4K9Q" });
      } else {
        const r = await axios.post(`/api/public/event/${slug}/register`, { name, phone, email, guests, message, website, answers, code });
        setResult({ status: r.data.status, code: r.data.code });
      }
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not register. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const unlock = () => {
    if (isDemo) return setDemoUnlocked(true);
    setCode(draft.trim());
  };

  const goToForm = () => document.getElementById("ep-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sharePage = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: ev?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
    } catch {
      /* share sheet closed */
    }
  };

  const accent = safeColor(ev?.brand_color);
  const rootVars = { ["--accent" as string]: accent, ["--on" as string]: readableOn(accent) } as React.CSSProperties;

  const full = ev?.spots_left === 0;
  const place = [ev?.venue_name, ev?.venue_address].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(ev?.venue_address || ev?.venue_name || "");
  const mapsLink = ev?.map_link || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null);
  const dt = ev?.date ? new Date(ev.date + "T00:00:00") : null;
  const socials = ([
    ["instagram", ev?.host_instagram],
    ["facebook", ev?.host_facebook],
    ["x", ev?.host_x],
  ] as [SocialKind, string | undefined][]).filter(([, v]) => v && v.trim());
  const hasHost = !!(ev?.host_name || ev?.host_about || ev?.host_whatsapp || socials.length);
  const showFormBar = !!ev && !ev.locked && !result && !ev.closed;

  const Banner = ({ e }: { e: PublicEvent }) => (
    <div className="ep-banner">
      {e.cover_url && <img src={e.cover_url} alt="" />}
      <div className="ep-bt">
        <span className="ep-pillw">
          {e.visibility === "private" ? <Lock size={13} /> : <BadgeCheck size={14} style={{ color: "var(--accent)" }} />}
          {e.visibility === "private" ? "Private event" : "Public event"}
        </span>
        <button className="ep-icon" onClick={sharePage} aria-label="Share this page">
          <Share2 size={16} />
        </button>
      </div>
      <div className="ep-logo">
        {e.logo_url ? <img src={e.logo_url} alt={`${e.host_name || e.title} logo`} /> : (e.host_name || e.title || "?").trim().charAt(0).toUpperCase()}
      </div>
    </div>
  );

  return (
    <div className="ep" style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", colorScheme: "light", ...rootVars }}>
      <style>{CSS}</style>

      <div className="ep-wrap">
        {missing ? (
          <div className="ep-card ep-msg">This event link is not active.</div>
        ) : blocked ? (
          <div className="ep-card ep-msg">{blocked}</div>
        ) : !ev ? (
          <div className="ep-card ep-msg">Loading...</div>
        ) : (
          <>
            {isDemo && <div className="ep-demo">Demo preview. This is how your guests will see your event page.</div>}

            {/* ---------------- HERO ---------------- */}
            <header className="ep-hero ep-rise">
              <Banner e={ev} />
              <div className="ep-hb">
                {ev.host_name && <div className="ep-host">Hosted by {ev.host_name}</div>}
                <h1 className="ep-title">{ev.title}</h1>

                <div className="ep-meta">
                  {ev.date && (
                    <span className="ep-pill">
                      <CalendarDays size={14} /> {prettyDate(ev.date)}
                    </span>
                  )}
                  {!ev.locked && ev.start_time && (
                    <span className="ep-pill">
                      <Clock size={14} /> {prettyTime(ev.start_time)}
                      {ev.end_time && ` to ${prettyTime(ev.end_time)}`}
                    </span>
                  )}
                  {!ev.locked && ev.venue_name && (
                    <span className="ep-pill">
                      <MapPin size={14} /> {ev.venue_name}
                    </span>
                  )}
                  {!ev.locked && ev.spots_left != null && !ev.closed && (
                    <span className="ep-pill hot">
                      <Users size={14} /> {full ? "Full. Waitlist open" : `${ev.spots_left} spots left`}
                    </span>
                  )}
                </div>

                {!ev.locked && (
                  <div className="ep-cta">
                    {showFormBar && (
                      <button className="ep-btn ep-btn-accent" onClick={goToForm}>
                        {full ? "Join the waitlist" : "Register now"} <ArrowRight size={17} />
                      </button>
                    )}
                    <button className="ep-btn ep-btn-ghost" onClick={() => downloadIcs(ev)}>
                      <CalendarPlus size={17} /> Add to calendar
                    </button>
                  </div>
                )}

                {!ev.locked && socials.length > 0 && (
                  <div className="ep-follow">
                    <span>Follow us</span>
                    {socials.map(([kind, val]) => (
                      <a key={kind} href={/^https?:\/\//i.test(val!) ? val : SOCIAL_BASE[kind] + handle(val!)} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_NAME[kind]} title={SOCIAL_NAME[kind]}>
                        <SocialIcon kind={kind} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {/* ---------------- PRIVATE: invite code ---------------- */}
            {ev.locked ? (
              <div className="ep-card ep-lock ep-rise" style={{ animationDelay: ".1s" }}>
                <div className="ep-lockc"><Lock size={26} /></div>
                <h2 className="ep-h" style={{ fontSize: 24 }}>This is a private event</h2>
                <p className="ep-p" style={{ margin: "10px auto 0", maxWidth: 340 }}>
                  Enter the invite code from your invitation to see the details and register.
                </p>
                <input className="ep-in ep-code-in" placeholder="INVITE CODE" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30} autoComplete="off" />
                {ev.wrong_code && code && <p role="alert" className="ep-err" style={{ marginTop: 12 }}>That invite code is not correct.</p>}
                <button className="ep-btn ep-btn-accent" onClick={unlock} disabled={!isDemo && !draft.trim()}>
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              /* ---------------- BODY ---------------- */
              <div className="ep-grid">
                <div className="ep-col">
                  {ev.description && (
                    <section className="ep-card ep-rise" style={{ animationDelay: ".08s" }}>
                      <div className="ep-eyebrow">About</div>
                      <h2 className="ep-h">About this event</h2>
                      <p className="ep-p">{ev.description}</p>
                    </section>
                  )}

                  <section className="ep-card ep-rise" style={{ animationDelay: ".14s" }}>
                    <div className="ep-eyebrow">When and where</div>
                    <h2 className="ep-h">Save the date</h2>
                    {dt && (
                      <div className="ep-when">
                        <div className="ep-date">
                          <i>{dt.toLocaleDateString(undefined, { month: "short" })}</i>
                          <b>{dt.getDate()}</b>
                        </div>
                        <div>
                          <strong>{dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric" })}</strong>
                          {ev.start_time && (
                            <span>
                              <Clock size={14} /> {prettyTime(ev.start_time)}
                              {ev.end_time && ` to ${prettyTime(ev.end_time)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {place && (
                      <div className="ep-venue">
                        <MapPin size={18} />
                        <span>
                          {ev.venue_name && <b>{ev.venue_name}</b>}
                          {ev.venue_address}
                        </span>
                      </div>
                    )}
                    {mapQuery && (
                      <div className="ep-map">
                        <iframe title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`} />
                        {mapsLink && (
                          <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                            Open in Maps <ArrowUpRight size={15} />
                          </a>
                        )}
                      </div>
                    )}
                  </section>

                  {hasHost && (
                    <section className="ep-card ep-rise" style={{ animationDelay: ".2s" }}>
                      <div className="ep-eyebrow">The hosts</div>
                      <h2 className="ep-h">{ev.host_name || "The people behind this event"}</h2>
                      {ev.host_about && <p className="ep-p">{ev.host_about}</p>}
                      {(ev.host_whatsapp || socials.length > 0) && (
                        <div className="ep-hostbtns">
                          {ev.host_whatsapp && (
                            <a className="ep-chip" href={`https://wa.me/${waNumber(ev.host_whatsapp)}`} target="_blank" rel="noopener noreferrer">
                              <i><MessageCircle size={15} /></i> WhatsApp
                            </a>
                          )}
                          {socials.map(([kind, val]) => (
                            <a key={kind} className="ep-chip" href={/^https?:\/\//i.test(val!) ? val : SOCIAL_BASE[kind] + handle(val!)} target="_blank" rel="noopener noreferrer">
                              <i><SocialIcon kind={kind} /></i> {SOCIAL_NAME[kind]}
                            </a>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>

                {/* Registration card */}
                <aside id="ep-form" className="ep-sticky" style={{ scrollMarginTop: 16 }}>
                  <div className="ep-card ep-form ep-rise" style={{ animationDelay: ".1s" }}>
                    {result ? (
                      <div className="ep-ok">
                        <div className="ep-okc"><CheckCircle2 size={36} /></div>
                        <h2>{result.status === "waitlist" ? "You are on the waitlist" : `You are registered, ${name.split(" ")[0] || "friend"}!`}</h2>
                        <p className="s">
                          {result.status === "waitlist"
                            ? "The event is full. The host will contact you if a spot opens."
                            : `${ev.title} on ${prettyDate(ev.date)}.`}
                        </p>
                        <div className="ep-ticket">
                          <em style={{ left: -10 }} />
                          <em style={{ right: -10 }} />
                          <small>Your confirmation code</small>
                          <b>{result.code}</b>
                        </div>
                        <p className="ep-hint">Screenshot this page and show the code at the door.</p>
                        {result.status === "confirmed" && (
                          <button className="ep-btn ep-btn-ghost" onClick={() => downloadIcs(ev)}>
                            <CalendarPlus size={17} /> Add to calendar
                          </button>
                        )}
                      </div>
                    ) : ev.closed ? (
                      <div style={{ padding: 22 }}>
                        <div className="ep-eyebrow">Registration</div>
                        <h2 className="ep-h">Registration is closed</h2>
                        <div className="ep-closed">The host is no longer accepting new guests. Please contact them directly if you need help.</div>
                      </div>
                    ) : (
                      <>
                        <div className="ep-fh">
                          <div className="ep-eyebrow">Reserve your spot</div>
                          <h2 className="ep-h" style={{ fontSize: 26 }}>{full ? "Join the waitlist" : "Register to attend"}</h2>
                          <p className="ep-p" style={{ marginTop: 8 }}>
                            {full ? "The event is full, but we will contact you if a spot opens." : "It takes less than a minute. You will get a confirmation code."}
                          </p>
                        </div>

                        <div className="ep-fb">
                          <input className="ep-in" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                          <input className="ep-in" placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />
                          <input className="ep-in" placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
                          <DynamicFields fields={ev.custom_fields ?? []} values={answers} onChange={(id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }))} inputClass="ep-in" />

                          {(ev.max_guests_per_registration ?? 1) > 1 && (
                            <div className="ep-step">
                              <span>How many people are coming?</span>
                              <div>
                                <button type="button" aria-label="Fewer" onClick={() => setGuests((g) => Math.max(1, g - 1))}><Minus size={15} /></button>
                                <b>{guests}</b>
                                <button type="button" aria-label="More" onClick={() => setGuests((g) => Math.min(ev.max_guests_per_registration ?? 1, g + 1))}><Plus size={15} /></button>
                              </div>
                            </div>
                          )}

                          <textarea className="ep-in" rows={2} placeholder="Anything the host should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                          {/* honeypot */}
                          <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                          {error && <p role="alert" className="ep-err">{error}</p>}

                          <button className="ep-send" onClick={submit} disabled={sending}>
                            {sending ? "Sending..." : full ? "Join waitlist" : "Register"}
                            <i><ArrowRight size={18} /></i>
                          </button>
                          <p className="ep-note">Private. Your details go only to the host.</p>
                        </div>
                      </>
                    )}
                  </div>
                </aside>
              </div>
            )}

            <p className="ep-foot">Powered by TwoMinDesign</p>
          </>
        )}
      </div>

      {/* Floating bar on phones */}
      {showFormBar && (
        <div className="ep-bar">
          <button className="ep-btn" onClick={goToForm}>
            {full ? "Join the waitlist" : "Register now"} <ArrowRight size={17} style={{ color: "var(--yellow)" }} />
          </button>
        </div>
      )}

      {toast && <div className="ep-toast">{toast}</div>}
    </div>
  );
}