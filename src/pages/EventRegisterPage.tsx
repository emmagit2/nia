import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarPlus, CheckCircle2, Clock, Lock, MapPin, MessageCircle, Minus, Plus, Share2, Users } from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

interface PublicEvent {
  title: string; host_name: string; logo_url: string; cover_url: string; brand_color: string;
  visibility: "public" | "private"; date: string; locked: boolean; wrong_code?: boolean;
  description?: string; host_about?: string; host_whatsapp?: string; host_instagram?: string;
  host_facebook?: string; host_x?: string;
  start_time?: string; end_time?: string; venue_name?: string; venue_address?: string; map_link?: string;
  max_guests_per_registration?: number; closed?: boolean; spots_left?: number | null; custom_fields?: CustomField[];
  people_title?: string; people?: { name: string; role?: string; tag?: string; photo_url?: string }[]; // speakers, hosts, team, wedding party, guests of honour
}

/* Demo data: every field is filled, and the page adapts to whatever is sent.
   Open /e/demo. Extra previews: ?preview=locked | full | closed | done */
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
    "Join us for an evening of food, music and dancing as we celebrate our wedding.\nDress code is elegant traditional or formal. Please register so we can plan seating and meals for every guest.",
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
  people_title: "The people of the day",
  people: [
    { name: "Amara Obi", role: "Bride", tag: "Family" },
    { name: "Tobi Adeyemi", role: "Groom", tag: "Family" },
    { name: "Ngozi Eze", role: "Maid of honour", tag: "Wedding party" },
    { name: "Chidi Bello", role: "Best man", tag: "Wedding party" },
  ],
};

const DEFAULT_BRAND = "#0A8F5A";
const safeColor = (c?: string | null) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_BRAND);
const readableOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? "#0B1F17" : "#FFFFFF";
};
const waNumber = (raw: string) => { const d = raw.replace(/\D/g, ""); return d.startsWith("0") ? "234" + d.slice(1) : d; };
const handle = (v: string) => v.trim().replace(/^@/, "");
const prettyDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const prettyTime = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const downloadIcs = (e: PublicEvent) => {
  const stamp = (d: string, t: string) => d.replace(/-/g, "") + "T" + (t || "09:00").replace(":", "") + "00";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${stamp(e.date, e.start_time || "")}`, `DTEND:${stamp(e.date, e.end_time || e.start_time || "")}`, `SUMMARY:${e.title}`, `LOCATION:${[e.venue_name, e.venue_address].filter(Boolean).join(", ")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "event.ics";
  a.click();
};

type SocialKind = "instagram" | "facebook" | "x";
function SocialIcon({ kind }: { kind: SocialKind }) {
  const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "instagram") return (<svg {...s}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" /></svg>);
  if (kind === "facebook") return (<svg {...s}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>);
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>);
}
const SOCIAL_BASE: Record<SocialKind, string> = { instagram: "https://instagram.com/", facebook: "https://facebook.com/", x: "https://x.com/" };
const SOCIAL_NAME: Record<SocialKind, string> = { instagram: "Instagram", facebook: "Facebook", x: "X" };

/* Colour balance: ~80% white surfaces, ~15% green, ~3.5% yellow (small marks only), rest ink. */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;800&display=swap');
.ep{--ink:#0B1F17;--deep:#063D2E;--yellow:#FFD23F;--muted:#5F6F66;--line:#E3EBE6;--soft:#F5F8F6;
  font-family:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased}
.ep *{box-sizing:border-box}
.ep a{color:inherit;text-decoration:none}
.ep button{font-family:inherit;cursor:pointer}
.ep :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.ep-wrap{max-width:1120px;margin:0 auto;padding:16px 18px 110px}
@media(min-width:900px){.ep-wrap{padding:28px 36px 64px}}
.ep-demo{margin:0 0 14px;padding:8px 14px;border-radius:999px;background:var(--soft);border:1px solid var(--line);font-size:12px;text-align:center;color:var(--muted)}

/* top bar */
.ep-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ep-brand{display:flex;align-items:center;gap:12px;min-width:0}
.ep-logo{flex:none;width:46px;height:46px;border-radius:14px;background:var(--accent);color:var(--on);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;overflow:hidden}
.ep-logo img{width:100%;height:100%;object-fit:contain;background:#fff}
.ep-brand span{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ep-brand small{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);font-weight:400}
.ep-icon{flex:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#fff;border:1px solid var(--line);color:var(--ink)}

/* hero: contrast of light and heavy type, as in the Figma board */
.ep-hero{position:relative;padding:44px 0 36px}
@media(min-width:900px){.ep-hero{padding:72px 0 56px}}
.ep-cover{height:180px;border-radius:28px;margin-bottom:34px;background:var(--soft) center/cover;position:relative;overflow:hidden}
.ep-cover:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 22px,color-mix(in srgb,var(--accent) 9%,transparent) 22px 23px)}
.ep-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ep-title{margin:0;font-size:clamp(34px,8.4vw,84px);line-height:1.02;letter-spacing:-.035em;font-weight:300}
.ep-title b{display:block;font-weight:800;color:var(--ink)}
.ep-lead{margin:22px 0 0;max-width:520px;font-size:16px;line-height:1.7;color:var(--muted)}
.ep-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.ep-pill{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 15px;border-radius:999px;border:1px solid var(--line);font-size:13px;font-weight:500;background:#fff}
.ep-pill svg{color:var(--accent)}
.ep-pill.hot{background:var(--yellow);border-color:var(--yellow)}
.ep-pill.hot svg{color:var(--ink)}
.ep-cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.ep-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:54px;padding:0 28px;border-radius:999px;border:0;font-size:15px;font-weight:600;transition:transform .15s}
.ep-btn:active{transform:scale(.97)}
.ep-btn:disabled{opacity:.55}
.ep-btn-dark{background:var(--ink);color:#fff}
.ep-btn-accent{background:var(--accent);color:var(--on)}
.ep-btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}

/* body */
.ep-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:56px;margin-top:8px}
@media(min-width:900px){.ep-grid{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:64px;align-items:start}.ep-sticky{position:sticky;top:24px}}
.ep-col{display:flex;flex-direction:column;gap:48px;min-width:0}
.ep-sec{border-top:1px solid var(--line);padding-top:24px}
.ep-h{margin:0;font-size:26px;font-weight:600;letter-spacing:-.025em;line-height:1.2}
.ep-p{margin:14px 0 0;font-size:15px;line-height:1.8;color:var(--muted);white-space:pre-line;max-width:560px}

/* date: green block + mini calendar */
.ep-when{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:22px}
@media(min-width:620px){.ep-when{grid-template-columns:200px minmax(0,1fr)}}
.ep-big{border-radius:28px;background:var(--accent);color:var(--on);padding:22px;display:flex;flex-direction:column;justify-content:space-between;min-height:200px}
.ep-big b{font-size:78px;line-height:.9;font-weight:800;letter-spacing:-.05em}
.ep-big span{font-size:14px;font-weight:500;line-height:1.5}
.ep-cal{border:1px solid var(--line);border-radius:28px;padding:20px}
.ep-cal h3{margin:0 0 12px;font-size:14px;font-weight:500;color:var(--muted);text-align:center}
.ep-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:12px}
.ep-days i{font-style:normal;color:#93A399;padding-bottom:4px}
.ep-days span{display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:50%;color:var(--muted)}
.ep-days span.on{background:var(--ink);color:#fff;font-weight:600;box-shadow:0 0 0 3px var(--yellow)}
.ep-time{display:flex;align-items:center;gap:8px;margin-top:18px;font-size:14px;color:var(--muted)}
.ep-time svg{color:var(--accent)}
.ep-venue{display:flex;gap:12px;align-items:flex-start;margin-top:18px;font-size:15px;line-height:1.6;color:var(--muted)}
.ep-venue svg{flex:none;margin-top:4px;color:var(--accent)}
.ep-venue b{display:block;color:var(--ink);font-weight:600}
.ep-map{position:relative;margin-top:22px;height:240px;border-radius:28px;overflow:hidden;border:1px solid var(--line)}
.ep-map iframe{width:100%;height:100%;border:0;filter:grayscale(.6) contrast(1.02)}
.ep-map a{position:absolute;right:14px;bottom:14px;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:999px;background:var(--ink);color:#fff;font-size:13px;font-weight:600}

.ep-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
.ep-chip{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 18px 0 8px;border-radius:999px;border:1px solid var(--line);font-size:14px;font-weight:500;background:#fff;transition:background .15s}
.ep-chip:hover{background:var(--soft)}
.ep-chip i{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent)}

/* form: the green panel is the one bold block on the page */
.ep-form{border-radius:32px;overflow:hidden;background:#fff;border:1px solid var(--line)}
.ep-fh{padding:28px 26px 24px;background:var(--accent);color:var(--on)}
.ep-fh .ep-h{font-size:30px;font-weight:800;letter-spacing:-.03em}
.ep-fh p{margin:8px 0 0;font-size:14px;line-height:1.6;opacity:.88}
.ep-fb{display:flex;flex-direction:column;gap:6px;padding:22px 26px 26px}
.ep-lab{font-size:12.5px;font-weight:500;color:var(--muted);margin-top:8px}
.ep-in{width:100%;height:50px;padding:0 2px;border:0;border-bottom:1.5px solid var(--line);border-radius:0;background:transparent;font-family:inherit;font-size:16px;color:var(--ink);outline:none;transition:border-color .15s}
textarea.ep-in{height:auto;padding:10px 2px;resize:none;line-height:1.6}
.ep-in::placeholder{color:#A4B1A9}
.ep-in:focus{border-color:var(--accent)}
.ep-code-in{text-align:center;letter-spacing:.3em;text-transform:uppercase;font-weight:600}
.ep-step{display:flex;align-items:center;justify-content:space-between;padding:12px 0;font-size:14px;color:var(--muted);border-bottom:1.5px solid var(--line)}
.ep-step div{display:flex;align-items:center;gap:14px}
.ep-step button{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink)}
.ep-step b{width:22px;text-align:center;font-size:17px;font-weight:600;color:var(--ink)}
.ep-err{margin:8px 0 0;padding:11px 14px;border-radius:14px;background:#FEECEC;color:#B3261E;font-size:13px}
.ep-send{display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 10px 0 28px;margin-top:20px;border:0;border-radius:999px;background:var(--ink);color:#fff;font-size:16px;font-weight:600}
.ep-send:disabled{opacity:.6}
.ep-send i{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:var(--yellow);color:var(--ink)}
.ep-note{margin:10px 0 0;text-align:center;font-size:12px;color:#8A9A91}
.ep-closed{margin-top:14px;padding:18px;border-radius:20px;background:var(--soft);font-size:14.5px;color:var(--muted)}

/* confirmation */
.ep-ok{padding:36px 26px 28px;text-align:center}
.ep-okc{display:flex;align-items:center;justify-content:center;width:68px;height:68px;margin:0 auto 16px;border-radius:50%;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent)}
.ep-ok h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em}
.ep-ok .s{margin:8px auto 0;max-width:300px;font-size:14px;line-height:1.7;color:var(--muted)}
.ep-ticket{position:relative;margin:24px 0 0;padding:20px 16px;border-radius:22px;border:1.5px dashed var(--accent)}
.ep-ticket small{display:block;font-size:12px;font-weight:500;color:var(--muted)}
.ep-ticket b{display:block;margin-top:6px;font-size:36px;font-weight:800;letter-spacing:.16em;padding-left:.16em}
.ep-hint{margin:14px 0 0;font-size:12.5px;color:var(--muted)}
.ep-ok .ep-btn{margin-top:18px;width:100%;height:50px}

/* locked */
.ep-lock{max-width:440px;margin:20px auto 0;text-align:center;border:1px solid var(--line);border-radius:32px;padding:34px 26px}
.ep-lockc{display:flex;align-items:center;justify-content:center;width:62px;height:62px;margin:0 auto 16px;border-radius:50%;background:var(--yellow);color:var(--ink)}
.ep-lock .ep-btn{width:100%;margin-top:16px}

.ep-bar{position:fixed;left:0;right:0;bottom:0;z-index:5;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(180deg,transparent,#fff 45%)}
.ep-bar .ep-btn{width:100%}
@media(min-width:900px){.ep-bar{display:none}}
.ep-foot{margin:56px 0 0;text-align:center;font-size:12px;color:#8A9A91}
.ep-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:var(--ink);color:#fff;font-size:13px;z-index:10}
.ep-msg{padding:90px 20px;text-align:center;color:var(--muted);font-size:15px}

html .ep,.ep{scroll-behavior:smooth}
.ep-sec{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.ep-sec.in{opacity:1;transform:none}
.ep-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:22px}
.ep-person{display:flex;align-items:stretch;justify-content:space-between;gap:12px;min-height:150px;border:1px solid var(--line);border-radius:28px;padding:18px;background:#fff;transition:border-color .3s,transform .3s}
.ep-person:hover{border-color:var(--accent);transform:translateY(-3px)}
.ep-pi{display:flex;flex-direction:column;justify-content:space-between;gap:10px;min-width:0}
.ep-pi b{display:block;font-size:17px;font-weight:600;letter-spacing:-.015em;line-height:1.25}
.ep-pi span{display:block;margin-top:3px;font-size:13.5px;color:var(--muted)}
.ep-pi em{align-self:flex-start;font-style:normal;font-size:12px;font-weight:500;padding:5px 12px;border-radius:999px;border:1.5px solid var(--ink)}
.ep-ph{flex:none;width:104px;border-radius:20px;background:var(--accent) center/cover;color:var(--on);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;overflow:hidden}
.ep-ph img{width:100%;height:100%;object-fit:cover}
.ep-swap{animation:ep-fade .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes ep-fade{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.ep-sec{opacity:1;transform:none;transition:none}.ep-swap{animation:none}.ep-person{transition:none}}
@keyframes ep-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.ep-rise{animation:ep-rise .6s cubic-bezier(.2,.7,.2,1) both}
@media(prefers-reduced-motion:reduce){.ep-rise{animation:none}.ep-btn{transition:none}}
`;

/** Public event page at /e/:slug. No login. Mobile first. With no slug or slug "demo" it runs on DEMO data and sends nothing. */
export default function EventRegisterPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isDemo = !slug || slug === "demo";
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
  const [website, setWebsite] = useState("");
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

  const ev: PublicEvent | null = useMemo(() => {
    if (!isDemo) return fetched;
    if (preview === "locked" && !demoUnlocked) return { ...DEMO, visibility: "private", locked: true, description: undefined };
    if (preview === "full") return { ...DEMO, spots_left: 0 };
    if (preview === "closed") return { ...DEMO, closed: true };
    return DEMO;
  }, [isDemo, fetched, preview, demoUnlocked]);

  useEffect(() => {
    if (result) document.getElementById("ep-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  // Smooth reveal: any section fades in as it scrolls into view, so dynamic content never pops in.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".ep-sec:not(.in)"));
    if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("in"));
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ev, result]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    for (const f of ev?.custom_fields ?? []) {
      if ((f as { required?: boolean }).required && !(answers[(f as { id: string }).id] ?? "").trim()) return setError(`Please answer: ${(f as { label: string }).label}`);
    }
    setSending(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 700));
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

  const unlock = () => (isDemo ? setDemoUnlocked(true) : setCode(draft.trim()));
  const goToForm = () => document.getElementById("ep-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sharePage = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: ev?.title, url });
      else { await navigator.clipboard.writeText(url); setToast("Link copied"); }
    } catch { /* share sheet closed */ }
  };

  const accent = safeColor(ev?.brand_color);
  const rootVars = { ["--accent" as string]: accent, ["--on" as string]: readableOn(accent) } as React.CSSProperties;
  const full = ev?.spots_left === 0;
  const place = [ev?.venue_name, ev?.venue_address].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(ev?.venue_address || ev?.venue_name || "");
  const mapsLink = ev?.map_link || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null);
  const dt = ev?.date ? new Date(ev.date + "T00:00:00") : null;
  const socials = ([["instagram", ev?.host_instagram], ["facebook", ev?.host_facebook], ["x", ev?.host_x]] as [SocialKind, string | undefined][]).filter(([, v]) => v && v.trim());
  const hasHost = !!(ev?.host_name || ev?.host_about || ev?.host_whatsapp || socials.length);
  const showFormBar = !!ev && !ev.locked && !result && !ev.closed;

  // "Host: Event name" shows as light + heavy type; titles without a colon stay heavy.
  const [t1, t2] = ev?.title.includes(":") ? [ev.title.split(":")[0], ev.title.split(":").slice(1).join(":").trim()] : ["", ev?.title ?? ""];
  const socialHref = (kind: SocialKind, val: string) => (/^https?:\/\//i.test(val) ? val : SOCIAL_BASE[kind] + handle(val));

  const calendar = () => {
    if (!dt) return null;
    const first = new Date(dt.getFullYear(), dt.getMonth(), 1).getDay();
    const total = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    const cells = [...Array(first).fill(0), ...Array.from({ length: total }, (_, i) => i + 1)];
    return (
      <div className="ep-cal">
        <h3>{dt.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <div className="ep-days">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <i key={i}>{d}</i>)}
          {cells.map((d, i) => <span key={i} className={d === dt.getDate() ? "on" : ""}>{d || ""}</span>)}
        </div>
      </div>
    );
  };

  return (
    <div className="ep" style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", colorScheme: "light", ...rootVars }}>
      <style>{CSS}</style>
      <div className="ep-wrap">
        {missing ? (
          <div className="ep-msg">This event link is not active.</div>
        ) : blocked ? (
          <div className="ep-msg">{blocked}</div>
        ) : !ev ? (
          <div className="ep-msg">Loading...</div>
        ) : (
          <>
            {isDemo && <div className="ep-demo">Demo preview. This is how your guests will see your event page.</div>}

            <div className="ep-top">
              <div className="ep-brand">
                <div className="ep-logo">{ev.logo_url ? <img src={ev.logo_url} alt={`${ev.host_name || ev.title} logo`} /> : (ev.host_name || ev.title || "?").trim().charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <span>{ev.host_name || ev.title}</span>
                  <small>{ev.visibility === "private" ? <Lock size={12} /> : <BadgeCheck size={13} style={{ color: "var(--accent)" }} />}{ev.visibility === "private" ? "Private event" : "Public event"}</small>
                </div>
              </div>
              <button className="ep-icon" onClick={sharePage} aria-label="Share this page"><Share2 size={17} /></button>
            </div>

            <header className="ep-hero ep-rise">
              <div className="ep-cover">{ev.cover_url && <img src={ev.cover_url} alt="" />}</div>
              <h1 className="ep-title">{t1}<b>{t2}</b></h1>

              {!ev.locked && (
                <>
                  <div className="ep-meta">
                    {ev.date && <span className="ep-pill"><Clock size={14} />{prettyDate(ev.date)}</span>}
                    {ev.start_time && <span className="ep-pill"><Clock size={14} />{prettyTime(ev.start_time)}{ev.end_time && ` to ${prettyTime(ev.end_time)}`}</span>}
                    {ev.venue_name && <span className="ep-pill"><MapPin size={14} />{ev.venue_name}</span>}
                    {ev.spots_left != null && !ev.closed && <span className="ep-pill hot"><Users size={14} />{full ? "Full. Waitlist open" : `${ev.spots_left} spots left`}</span>}
                  </div>
                  <div className="ep-cta">
                    {showFormBar && <button className="ep-btn ep-btn-dark" onClick={goToForm}>{full ? "Join the waitlist" : "Register now"} <ArrowRight size={17} /></button>}
                    <button className="ep-btn ep-btn-ghost" onClick={() => downloadIcs(ev)}><CalendarPlus size={17} /> Add to calendar</button>
                  </div>
                </>
              )}
            </header>

            {ev.locked ? (
              <div className="ep-lock ep-rise">
                <div className="ep-lockc"><Lock size={26} /></div>
                <h2 className="ep-h">This is a private event</h2>
                <p className="ep-p" style={{ margin: "10px auto 0" }}>Enter the invite code from your invitation to see the details and register.</p>
                <input className="ep-in ep-code-in" placeholder="INVITE CODE" aria-label="Invite code" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30} autoComplete="off" style={{ marginTop: 18 }} />
                {ev.wrong_code && code && <p role="alert" className="ep-err">That invite code is not correct.</p>}
                <button className="ep-btn ep-btn-dark" onClick={unlock} disabled={!isDemo && !draft.trim()}>Continue <ArrowRight size={17} /></button>
              </div>
            ) : (
              <div className="ep-grid">
                <div className="ep-col">
                  {ev.description && (
                    <section className="ep-sec">
                      <h2 className="ep-h">About this event</h2>
                      <p className="ep-p">{ev.description}</p>
                    </section>
                  )}

                  {!!ev.people?.length && (
                    <section className="ep-sec">
                      <h2 className="ep-h">{ev.people_title || "People"}</h2>
                      <div className="ep-people">
                        {ev.people.map((p, i) => (
                          <div className="ep-person" key={p.name + i}>
                            <div className="ep-pi">
                              <div><b>{p.name}</b>{p.role && <span>{p.role}</span>}</div>
                              {p.tag && <em>{p.tag}</em>}
                            </div>
                            <div className="ep-ph">{p.photo_url ? <img src={p.photo_url} alt={p.name} loading="lazy" /> : p.name.trim().charAt(0).toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="ep-sec">
                    <h2 className="ep-h">When and where</h2>
                    {dt && (
                      <div className="ep-when">
                        <div className="ep-big">
                          <span>{dt.toLocaleDateString(undefined, { weekday: "long" })}</span>
                          <b>{dt.getDate()}</b>
                          <span>{dt.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                        </div>
                        {calendar()}
                      </div>
                    )}
                    {ev.start_time && <div className="ep-time"><Clock size={16} />{prettyTime(ev.start_time)}{ev.end_time && ` to ${prettyTime(ev.end_time)}`}</div>}
                    {place && (
                      <div className="ep-venue">
                        <MapPin size={18} />
                        <span>{ev.venue_name && <b>{ev.venue_name}</b>}{ev.venue_address}</span>
                      </div>
                    )}
                    {mapQuery && (
                      <div className="ep-map">
                        <iframe title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`} />
                        {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer">Open in Maps <ArrowUpRight size={15} /></a>}
                      </div>
                    )}
                  </section>

                  {hasHost && (
                    <section className="ep-sec">
                      <h2 className="ep-h">{ev.host_name || "The people behind this event"}</h2>
                      {ev.host_about && <p className="ep-p">{ev.host_about}</p>}
                      {(ev.host_whatsapp || socials.length > 0) && (
                        <div className="ep-chips">
                          {ev.host_whatsapp && <a className="ep-chip" href={`https://wa.me/${waNumber(ev.host_whatsapp)}`} target="_blank" rel="noopener noreferrer"><i><MessageCircle size={15} /></i> WhatsApp</a>}
                          {socials.map(([kind, val]) => (
                            <a key={kind} className="ep-chip" href={socialHref(kind, val!)} target="_blank" rel="noopener noreferrer"><i><SocialIcon kind={kind} /></i> {SOCIAL_NAME[kind]}</a>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>

                <aside id="ep-form" className="ep-sticky" style={{ scrollMarginTop: 16 }}>
                  <div className="ep-form ep-swap" key={result ? "ok" : ev.closed ? "closed" : "form"}>
                    {result ? (
                      <div className="ep-ok">
                        <div className="ep-okc"><CheckCircle2 size={34} /></div>
                        <h2>{result.status === "waitlist" ? "You are on the waitlist" : `You are registered, ${name.split(" ")[0] || "friend"}!`}</h2>
                        <p className="s">{result.status === "waitlist" ? "The event is full. The host will contact you if a spot opens." : `${ev.title} on ${prettyDate(ev.date)}.`}</p>
                        <div className="ep-ticket"><small>Your confirmation code</small><b>{result.code}</b></div>
                        <p className="ep-hint">Screenshot this page and show the code at the door.</p>
                        {result.status === "confirmed" && <button className="ep-btn ep-btn-ghost" onClick={() => downloadIcs(ev)}><CalendarPlus size={17} /> Add to calendar</button>}
                      </div>
                    ) : ev.closed ? (
                      <div style={{ padding: 26 }}>
                        <h2 className="ep-h">Registration is closed</h2>
                        <div className="ep-closed">The host is no longer accepting new guests. Contact them directly if you need help.</div>
                      </div>
                    ) : (
                      <>
                        <div className="ep-fh">
                          <h2 className="ep-h">{full ? "Join the waitlist" : "Register to attend"}</h2>
                          <p>{full ? "The event is full. We will contact you if a spot opens." : "It takes less than a minute. You will get a confirmation code."}</p>
                        </div>
                        <div className="ep-fb">
                          <label className="ep-lab" htmlFor="ep-name">Full name</label>
                          <input id="ep-name" className="ep-in" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                          <label className="ep-lab" htmlFor="ep-phone">Phone number</label>
                          <input id="ep-phone" className="ep-in" placeholder="0801 234 5678" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />
                          <label className="ep-lab" htmlFor="ep-email">Email (optional)</label>
                          <input id="ep-email" className="ep-in" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
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

                          <label className="ep-lab" htmlFor="ep-msg">Note for the host (optional)</label>
                          <textarea id="ep-msg" className="ep-in" rows={2} placeholder="Allergies, seating, anything else" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

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

      {showFormBar && (
        <div className="ep-bar">
          <button className="ep-btn ep-btn-dark" onClick={goToForm}>{full ? "Join the waitlist" : "Register now"} <ArrowRight size={17} style={{ color: "var(--yellow)" }} /></button>
        </div>
      )}
      {toast && <div className="ep-toast">{toast}</div>}
    </div>
  );
}