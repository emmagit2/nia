import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BadgeCheck,
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
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
/* Demo data: open /<your-lead-route>/demo to preview the design        */
/* ------------------------------------------------------------------ */

const DEMO: PublicCampaign = {
  business_name: "Maison Noir Studio",
  headline: "Premium grooming and beauty, done properly.",
  category: "Beauty and Grooming",
  brand_color: "#C8A24A",
  about:
    "Maison Noir is a appointment-led studio in the heart of Lekki. We combine skilled stylists, quality products and a calm, private space, so every visit feels considered. Walk in as a stranger, leave as a regular.",
  highlights: [
    { value: "8+", label: "Years open" },
    { value: "2,400", label: "Clients served" },
    { value: "4.9", label: "Average rating" },
  ],
  services: ["Haircut and styling", "Beard sculpting", "Braids and locs", "Facials", "Bridal and event makeup"],
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

const DEFAULT_ACCENT = "#C8A24A";
const INK = "#0F1218";

function safeColor(c?: string | null) {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_ACCENT;
}

function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#FFFFFF";
}

function waNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
}

function socialUrl(kind: keyof Socials, value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, "");
  const base = { facebook: "https://facebook.com/", instagram: "https://instagram.com/", x: "https://x.com/" };
  return base[kind] + h;
}

function makeVCard(c: PublicCampaign) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${c.business_name}`, `ORG:${c.business_name}`];
  if (c.phone) lines.push(`TEL;TYPE=WORK,VOICE:${c.phone}`);
  if (c.email) lines.push(`EMAIL:${c.email}`);
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${c.address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Small icon set (inline so no extra dependency)                      */
/* ------------------------------------------------------------------ */

function SocialIcon({ kind }: { kind: keyof Socials }) {
  const stroke = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "instagram")
    return (
      <svg {...stroke}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" />
      </svg>
    );
  if (kind === "facebook")
    return (
      <svg {...stroke}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_NAME: Record<keyof Socials, string> = { facebook: "Facebook", instagram: "Instagram", x: "X" };

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

  const todayName = useMemo(() => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()], []);

  const socials = (Object.entries(camp?.socials ?? {}) as [keyof Socials, string | undefined][]).filter(([, v]) => v && v.trim());
  const mapQuery = camp?.address ? encodeURIComponent(camp.address) : null;
  const directions = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null;
  const hourRows = Array.isArray(camp?.hours) ? (camp?.hours as HourRow[]) : [];
  const hoursText = typeof camp?.hours === "string" ? camp.hours : "";

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
      /* user closed the share sheet */
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

  /* ---------- styles ---------- */
  const card = "rounded-3xl bg-white border border-black/5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_16px_40px_-16px_rgba(16,24,40,.14)]";
  const field =
    "w-full rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3.5 text-[15px] text-neutral-900 placeholder-neutral-400 transition focus:bg-white focus:outline-none focus:ring-4";
  const ring = { ["--tw-ring-color" as string]: `${accent}33`, ["--tw-ring-offset-color" as string]: accent } as React.CSSProperties;
  const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400";

  const actionBtn =
    "group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-black/5 bg-white py-3 text-[12px] font-medium text-neutral-700 shadow-sm transition active:scale-95 hover:border-black/10";

  const actions: { key: string; label: string; icon: React.ReactNode; href?: string; onClick?: () => void }[] = [];
  if (camp?.phone) actions.push({ key: "call", label: "Call", icon: <Phone size={18} />, href: `tel:${camp.phone}` });
  if (camp?.whatsapp) actions.push({ key: "wa", label: "WhatsApp", icon: <MessageCircle size={18} />, href: `https://wa.me/${waNumber(camp.whatsapp)}` });
  if (directions) actions.push({ key: "dir", label: "Directions", icon: <MapPin size={18} />, href: directions });
  actions.push({ key: "save", label: "Save", icon: <BookmarkPlus size={18} />, onClick: saveContact });
  actions.push({ key: "share", label: "Share", icon: <Share2 size={18} />, onClick: sharePage });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F5F4F1", color: "#111827", colorScheme: "light", fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        .lp-serif { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; letter-spacing: -0.01em; }
        @keyframes lp-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .lp-rise { animation: lp-rise .5s ease both; }
      `}</style>

      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:py-10">
        {missing ? (
          <div className={`${card} mx-auto max-w-md py-20 text-center text-neutral-600`}>This link is not active.</div>
        ) : !camp ? (
          <div className={`${card} mx-auto max-w-md py-20 text-center text-neutral-500`}>Loading...</div>
        ) : (
          <>
            {isDemo && (
              <div className="mb-3 rounded-full bg-neutral-900 px-4 py-2 text-center text-xs font-medium text-white">
                Demo preview. This is how your customers will see your page.
              </div>
            )}

            {/* ---------------- HERO ---------------- */}
            <header className="lp-rise relative overflow-hidden rounded-[28px] text-white" style={{ background: INK }}>
              {camp.cover_url ? (
                <img src={camp.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(900px 380px at 85% -10%, ${accent}55, transparent 60%), radial-gradient(600px 300px at 0% 110%, ${accent}26, transparent 60%)`,
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,18,24,.2), rgba(15,18,24,.85))" }} />

              <div className="relative flex flex-col items-center px-6 pb-9 pt-10 text-center sm:px-12 sm:pb-12 sm:pt-14">
                {camp.logo_url ? (
                  <img src={camp.logo_url} alt={`${camp.business_name} logo`} className="h-20 w-20 rounded-2xl bg-white object-cover shadow-xl ring-1 ring-white/20 sm:h-24 sm:w-24" />
                ) : (
                  <div
                    className="lp-serif flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-xl ring-1 ring-white/20 sm:h-24 sm:w-24"
                    style={{ background: accent, color: onAccent }}
                  >
                    {camp.business_name.trim().charAt(0).toUpperCase()}
                  </div>
                )}

                {camp.category && (
                  <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] backdrop-blur">
                    <BadgeCheck size={13} style={{ color: accent }} />
                    {camp.category}
                  </span>
                )}

                <h1 className="lp-serif mt-4 text-[32px] font-semibold leading-[1.1] sm:text-5xl">{camp.business_name}</h1>
                {camp.headline && <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/75 sm:text-base">{camp.headline}</p>}

                <button
                  onClick={goToForm}
                  className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition active:scale-95"
                  style={{ background: accent, color: onAccent }}
                >
                  Request a callback
                  <ArrowRight size={16} />
                </button>
              </div>
            </header>

            {/* ---------------- BODY ---------------- */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              {/* Left: company profile */}
              <div className="flex flex-col gap-4">
                {/* Quick actions */}
                <div className="lp-rise grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 5)}, minmax(0, 1fr))`, animationDelay: ".05s" }}>
                  {actions.map((a) =>
                    a.href ? (
                      <a key={a.key} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={actionBtn}>
                        <span style={{ color: accent }}>{a.icon}</span>
                        {a.label}
                      </a>
                    ) : (
                      <button key={a.key} type="button" onClick={a.onClick} className={actionBtn}>
                        <span style={{ color: accent }}>{a.icon}</span>
                        {a.label}
                      </button>
                    ),
                  )}
                </div>

                {/* About */}
                {(camp.about || (camp.highlights?.length ?? 0) > 0) && (
                  <section className={`${card} lp-rise p-6 sm:p-8`} style={{ animationDelay: ".1s" }}>
                    <p className={sectionTitle}>About us</p>
                    {camp.about && <p className="mt-3 text-[15px] leading-[1.75] text-neutral-600">{camp.about}</p>}
                    {(camp.highlights?.length ?? 0) > 0 && (
                      <div className="mt-6 grid grid-cols-3 divide-x divide-neutral-100 rounded-2xl bg-neutral-50 py-4">
                        {camp.highlights!.slice(0, 3).map((h) => (
                          <div key={h.label} className="px-2 text-center">
                            <div className="lp-serif text-2xl font-semibold text-neutral-900">{h.value}</div>
                            <div className="mt-0.5 text-[11px] text-neutral-500">{h.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Services */}
                {camp.services.length > 0 && (
                  <section className={`${card} lp-rise p-6 sm:p-8`} style={{ animationDelay: ".15s" }}>
                    <p className={sectionTitle}>What we do</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {camp.services.map((s) => (
                        <span key={s} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700">
                          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: accent }} />
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Location */}
                {camp.address && (
                  <section className={`${card} lp-rise overflow-hidden`} style={{ animationDelay: ".2s" }}>
                    <div className="p-6 pb-4 sm:p-8 sm:pb-4">
                      <p className={sectionTitle}>Find us</p>
                      <div className="mt-3 flex items-start gap-3">
                        <MapPin size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />
                        <p className="text-[15px] leading-relaxed text-neutral-700">{camp.address}</p>
                      </div>
                    </div>
                    <iframe
                      title="Map"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                      className="h-56 w-full border-0 grayscale-[35%]"
                    />
                    {directions && (
                      <a href={directions} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t border-neutral-100 py-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">
                        Get directions <ArrowRight size={15} />
                      </a>
                    )}
                  </section>
                )}

                {/* Hours + contact */}
                {(hourRows.length > 0 || hoursText || camp.email) && (
                  <section className={`${card} lp-rise p-6 sm:p-8`} style={{ animationDelay: ".25s" }}>
                    {(hourRows.length > 0 || hoursText) && (
                      <>
                        <p className={`${sectionTitle} flex items-center gap-2`}>
                          <Clock size={13} /> Opening hours
                        </p>
                        {hourRows.length > 0 ? (
                          <ul className="mt-4 divide-y divide-neutral-100">
                            {hourRows.map((h) => {
                              const isToday = h.day.toLowerCase().startsWith(todayName.slice(0, 3).toLowerCase());
                              return (
                                <li key={h.day} className="flex items-center justify-between py-2.5 text-sm">
                                  <span className={isToday ? "font-semibold text-neutral-900" : "text-neutral-500"}>
                                    {h.day}
                                    {isToday && (
                                      <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${accent}26`, color: "#7A5F14" }}>
                                        Today
                                      </span>
                                    )}
                                  </span>
                                  <span className={isToday ? "font-semibold text-neutral-900" : "text-neutral-600"}>{h.time}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{hoursText}</p>
                        )}
                      </>
                    )}
                    {camp.email && (
                      <a href={`mailto:${camp.email}`} className="mt-5 flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                        <Mail size={16} style={{ color: accent }} />
                        <span className="break-all">{camp.email}</span>
                      </a>
                    )}
                  </section>
                )}

                {/* Social */}
                {socials.length > 0 && (
                  <section className={`${card} lp-rise p-6 sm:p-8`} style={{ animationDelay: ".3s" }}>
                    <p className={sectionTitle}>Follow us</p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {socials.map(([kind, val]) => (
                        <a
                          key={kind}
                          href={socialUrl(kind, val!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-full border border-neutral-200 py-2 pl-3 pr-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-400"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: INK, color: "#fff" }}>
                            <SocialIcon kind={kind} />
                          </span>
                          {SOCIAL_NAME[kind]}
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right: lead form */}
              <aside id="lead-form" className="lg:sticky lg:top-6 scroll-mt-4">
                <div className={`${card} lp-rise overflow-hidden`} style={{ animationDelay: ".12s" }}>
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />
                  {done ? (
                    <div className="px-6 py-12 text-center sm:px-8">
                      <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={54} />
                      <h2 className="lp-serif text-2xl font-semibold text-neutral-900">Thank you, {name.split(" ")[0]}</h2>
                      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
                        {camp.business_name} has your details and will be in touch shortly.
                      </p>
                      {(camp.whatsapp || camp.phone) && (
                        <a
                          href={camp.whatsapp ? `https://wa.me/${waNumber(camp.whatsapp)}` : `tel:${camp.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                          style={{ background: accent, color: onAccent }}
                        >
                          {camp.whatsapp ? <MessageCircle size={15} /> : <Phone size={15} />}
                          {camp.whatsapp ? "Chat on WhatsApp now" : "Call now"}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5 p-6 sm:p-8">
                      <div className="mb-1">
                        <h2 className="lp-serif text-2xl font-semibold text-neutral-900">Request a callback</h2>
                        <p className="mt-1 text-sm text-neutral-500">Leave your details. We usually respond the same day.</p>
                      </div>

                      <input className={field} style={ring} placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                      <input className={field} style={ring} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />

                      {camp.services.length > 0 && (
                        <select className={field} style={ring} value={interest} onChange={(e) => setInterest(e.target.value)}>
                          <option value="">What are you interested in?</option>
                          {camp.services.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}

                      <input className={field} style={ring} placeholder="Your area, e.g. Ikeja, Lekki" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={120} />
                      <button type="button" onClick={useMyLocation} disabled={geoBusy} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-2.5 text-[13px] font-medium text-neutral-600 hover:border-neutral-400">
                        <MapPin size={14} />
                        {geo ? "Location shared" : geoBusy ? "Getting location..." : "Share my exact location (optional)"}
                      </button>

                      <DynamicFields
                        fields={camp.custom_fields ?? []}
                        values={answers}
                        onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                        inputClass={field}
                      />

                      <textarea className={`${field} resize-none`} style={ring} rows={3} placeholder="Anything else we should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                      {/* honeypot */}
                      <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                      <button
                        onClick={submit}
                        disabled={sending}
                        className="mt-1 flex items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold shadow-md transition active:scale-[0.99] disabled:opacity-50"
                        style={{ background: INK, color: "#fff" }}
                      >
                        {sending ? "Sending..." : "Send my details"}
                        {!sending && <ArrowRight size={16} style={{ color: accent }} />}
                      </button>
                      <p className="text-center text-xs text-neutral-400">Private. Your details go only to {camp.business_name}.</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <p className="mt-8 text-center text-xs text-neutral-400">Powered by TwoMinDesign</p>
          </>
        )}
      </div>

      {/* Floating call to action on phones */}
      {camp && !done && !missing && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center p-4 lg:hidden">
          <button
            onClick={goToForm}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold shadow-2xl"
            style={{ background: INK, color: "#fff" }}
          >
            Request a callback <ArrowRight size={15} style={{ color: accent }} />
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 top-5 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}