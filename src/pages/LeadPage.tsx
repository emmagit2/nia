import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Clock, Globe, MapPin, MessageCircle, Phone, Send, Mail } from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

interface Socials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  x?: string;
  youtube?: string;
  website?: string;
}

interface PublicCampaign {
  business_name: string;
  headline: string;
  services: string[];
  custom_fields: CustomField[];
  // Branding and company info. All optional, so old campaigns still work.
  logo_url?: string | null;
  brand_color?: string | null;
  about?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
  socials?: Socials | null;
}

const DEFAULT_COLOR = "#F2B900";

/** Accept only a valid #RRGGBB colour, otherwise fall back. */
function safeColor(c?: string | null) {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_COLOR;
}

/** Black or white text, whichever is readable on this colour. */
function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#FFFFFF";
}

/** 0803... becomes 234803... for wa.me links. */
function waNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
}

/** Turn "@handle", "handle" or a full link into a safe https link. */
function socialLink(kind: keyof Socials, value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  const base: Record<string, string> = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://tiktok.com/@",
    x: "https://x.com/",
    youtube: "https://youtube.com/@",
  };
  return kind === "website" ? `https://${v}` : `${base[kind]}${handle}`;
}

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  website: "Website",
};

function SocialIcon({ kind }: { kind: string }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "instagram")
    return (
      <svg {...p}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  if (kind === "facebook")
    return (
      <svg {...p}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  return <Globe size={16} />;
}

/** Public page a customer lands on after scanning the QR. No login. Mobile first. */
export default function LeadPage() {
  const { slug } = useParams();
  const [camp, setCamp] = useState<PublicCampaign | null>(null);
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

  useEffect(() => {
    axios
      .get(`/api/public/campaign/${slug}`)
      .then((r) => setCamp(r.data.campaign))
      .catch(() => setMissing(true));
  }, [slug]);

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
      setDone(true);
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not send. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const brand = safeColor(camp?.brand_color);
  const onBrand = readableOn(brand);
  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4";
  const focusStyle = { ["--tw-ring-color" as string]: `${brand}40` } as React.CSSProperties;

  const socials = Object.entries(camp?.socials ?? {}).filter(([, v]) => v && String(v).trim());
  const mapsLink = camp?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(camp.address)}` : null;

  const actionBtn = "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 bg-white text-gray-800 active:scale-[0.98]";

  const ContactActions = () =>
    camp ? (
      <div className="flex gap-2">
        {camp.phone && (
          <a href={`tel:${camp.phone}`} className={actionBtn}>
            <Phone size={15} /> Call
          </a>
        )}
        {camp.whatsapp && (
          <a href={`https://wa.me/${waNumber(camp.whatsapp)}`} target="_blank" rel="noopener noreferrer" className={actionBtn}>
            <MessageCircle size={15} /> WhatsApp
          </a>
        )}
        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className={actionBtn}>
            <MapPin size={15} /> Directions
          </a>
        )}
      </div>
    ) : null;

  const hasContact = !!(camp?.phone || camp?.whatsapp || mapsLink);

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      // full-screen light layer: a dark app background or navbar can never hide this page
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F3F4F6", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md my-4 bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {missing ? (
          <p className="text-center text-gray-600 py-16 px-6">This link is not active.</p>
        ) : !camp ? (
          <p className="text-center text-gray-500 py-16">Loading...</p>
        ) : (
          <>
            {/* Branded header */}
            <div style={{ background: `linear-gradient(135deg, ${brand}, ${brand}CC)`, color: onBrand }} className="px-6 pt-8 pb-14 text-center">
              <h1 className="text-2xl font-extrabold leading-tight">{camp.business_name}</h1>
              {camp.headline && <p className="mt-1 text-sm opacity-90">{camp.headline}</p>}
            </div>

            {/* Logo overlapping the header */}
            <div className="-mt-10 flex justify-center">
              {camp.logo_url ? (
                <img
                  src={camp.logo_url}
                  alt={`${camp.business_name} logo`}
                  className="h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-lg"
                />
              ) : (
                <div
                  className="h-20 w-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-3xl font-extrabold"
                  style={{ background: brand, color: onBrand }}
                >
                  {camp.business_name.trim().charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="px-6 pb-8 pt-4 flex flex-col gap-5">
              {done ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={52} />
                  <h2 className="text-xl font-bold text-gray-900">Thank you, {name.split(" ")[0]}!</h2>
                  <p className="text-gray-600 mt-2">{camp.business_name} will contact you soon.</p>
                  {hasContact && (
                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Need us sooner?</p>
                      <ContactActions />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* About */}
                  {camp.about && <p className="text-sm leading-relaxed text-gray-600 text-center">{camp.about}</p>}

                  {/* Quick actions */}
                  {hasContact && <ContactActions />}

                  {/* Info rows */}
                  {(camp.address || camp.hours || camp.email) && (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-3 text-sm text-gray-700">
                      {camp.address && (
                        <div className="flex gap-3">
                          <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: brand }} />
                          <span>{camp.address}</span>
                        </div>
                      )}
                      {camp.hours && (
                        <div className="flex gap-3">
                          <Clock size={16} className="mt-0.5 shrink-0" style={{ color: brand }} />
                          <span className="whitespace-pre-line">{camp.hours}</span>
                        </div>
                      )}
                      {camp.email && (
                        <div className="flex gap-3">
                          <Mail size={16} className="mt-0.5 shrink-0" style={{ color: brand }} />
                          <a href={`mailto:${camp.email}`} className="underline underline-offset-2 break-all">{camp.email}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social links */}
                  {socials.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {socials.map(([kind, val]) => (
                        <a
                          key={kind}
                          href={socialLink(kind as keyof Socials, String(val))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
                        >
                          <SocialIcon kind={kind} />
                          {SOCIAL_LABEL[kind] ?? kind}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Form */}
                  <div className="border-t border-gray-100 pt-5 flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Get in touch</h2>
                      <p className="text-sm text-gray-500">Leave your details and we will contact you.</p>
                    </div>

                    <input className={field} style={focusStyle} placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                    <input className={field} style={focusStyle} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />

                    {camp.services.length > 0 && (
                      <select className={field} style={focusStyle} value={interest} onChange={(e) => setInterest(e.target.value)}>
                        <option value="">What are you interested in?</option>
                        {camp.services.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex flex-col gap-2">
                      <input className={field} style={focusStyle} placeholder="Your area, e.g. Ikeja, Lekki" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={120} />
                      <button type="button" onClick={useMyLocation} disabled={geoBusy} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-500">
                        <MapPin size={15} />
                        {geo ? "Location shared" : geoBusy ? "Getting location..." : "Share my exact location (optional)"}
                      </button>
                    </div>

                    <DynamicFields
                      fields={camp.custom_fields ?? []}
                      values={answers}
                      onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                      inputClass={field}
                    />

                    <textarea className={`${field} resize-none`} style={focusStyle} rows={3} placeholder="Anything else? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                    {/* honeypot */}
                    <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                    <button
                      onClick={submit}
                      disabled={sending}
                      className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold disabled:opacity-50 active:scale-[0.99]"
                      style={{ background: brand, color: onBrand }}
                    >
                      <Send size={16} />
                      {sending ? "Sending..." : "Send my details"}
                    </button>
                    <p className="text-xs text-gray-400 text-center">Your details go only to {camp.business_name}.</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}