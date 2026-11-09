 import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AtSign, CalendarDays, CheckCircle2, Clock, Lock, MapPin, MessageCircle, Minus, Plus, Send, Users } from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

interface PublicEvent {
  title: string; host_name: string; logo_url: string; cover_url: string; brand_color: string;
  visibility: "public" | "private"; date: string; locked: boolean; wrong_code?: boolean;
  // only sent when the event is public or the invite code was right
  description?: string; host_about?: string; host_whatsapp?: string; host_instagram?: string;
  start_time?: string; end_time?: string; venue_name?: string; venue_address?: string; map_link?: string;
  max_guests_per_registration?: number; closed?: boolean; spots_left?: number | null; custom_fields?: CustomField[];
}

const DEFAULT_BRAND = "#F2B900";

const readableOn = (hex: string) => {
  const n = parseInt((hex || DEFAULT_BRAND).slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1B1500" : "#FFFFFF";
};

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

/** Cover banner with the logo sitting on its edge. */
function Banner({ ev }: { ev: PublicEvent }) {
  const brand = ev.brand_color || DEFAULT_BRAND;
  const initial = (ev.host_name || ev.title || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="relative">
      {ev.cover_url ? (
        <img src={ev.cover_url} alt="" className="w-full h-40 sm:h-48 object-cover block" />
      ) : (
        <div className="w-full h-28" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}99)` }} />
      )}
      <div className="absolute left-6 sm:left-8 -bottom-10 w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
        {ev.logo_url ? (
          <img src={ev.logo_url} alt={`${ev.host_name || ev.title} logo`} className="w-full h-full object-contain" />
        ) : (
          <span className="text-3xl font-bold" style={{ color: brand }}>{initial}</span>
        )}
      </div>
    </div>
  );
}

/** "The people behind this event": host name, a short note and ways to reach them. */
function HostCard({ ev }: { ev: PublicEvent }) {
  if (!ev.host_name && !ev.host_about && !ev.host_whatsapp && !ev.host_instagram) return null;
  return (
    <div className="rounded-2xl border border-gray-200 p-4 flex flex-col gap-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">The people behind this event</p>
      {ev.host_name && <p className="font-semibold">{ev.host_name}</p>}
      {ev.host_about && <p className="text-sm text-gray-600 whitespace-pre-line">{ev.host_about}</p>}
      {(ev.host_whatsapp || ev.host_instagram) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {ev.host_whatsapp && (
            <a href={`https://wa.me/${ev.host_whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-500">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {ev.host_instagram && (
            <a href={`https://instagram.com/${ev.host_instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-500">
              <AtSign size={14} /> {ev.host_instagram}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Public event page, opened from the QR code at /e/:slug. No login. Mobile first. */
export default function EventRegisterPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").trim());
  const [draft, setDraft] = useState("");
  const [ev, setEv] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; code: string } | null>(null);

  useEffect(() => {
    setBlocked(null);
    axios
      .get(`/api/public/event/${slug}${code ? `?code=${encodeURIComponent(code)}` : ""}`)
      .then((r) => setEv(r.data.event))
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 429) setBlocked(e.response.data?.error ?? "Too many tries. Please wait a few minutes.");
        else setMissing(true);
      });
  }, [slug, code]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    setSending(true);
    try {
      const r = await axios.post(`/api/public/event/${slug}/register`, { name, phone, email, guests, message, website, answers, code });
      setResult({ status: r.data.status, code: r.data.code });
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not register. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const brand = ev?.brand_color || DEFAULT_BRAND;
  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-200";
  const full = ev?.spots_left === 0;
  const mainBtn = "flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold disabled:opacity-50";
  const btnStyle = { background: brand, color: readableOn(brand) };

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F9FAFB", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden my-auto">
        {missing ? (
          <p className="text-center text-gray-600 py-14 px-6">This event link is not active.</p>
        ) : blocked ? (
          <p className="text-center text-gray-600 py-14 px-6">{blocked}</p>
        ) : !ev ? (
          <p className="text-center text-gray-500 py-14">Loading...</p>
        ) : (
          <>
            <Banner ev={ev} />
            <div className="px-6 sm:px-8 pt-14 pb-6 sm:pb-8 flex flex-col gap-4">
              <div>
                <h1 className="text-2xl font-bold leading-tight">{ev.title}</h1>
                {ev.host_name && <p className="text-gray-500 text-sm mt-1">Hosted by {ev.host_name}</p>}
              </div>

              {ev.locked ? (
                /* private event: details stay hidden until the invite code is right */
                <>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2"><CalendarDays size={15} /> {prettyDate(ev.date)}</p>
                    <p className="flex items-start gap-2"><Lock size={15} className="mt-0.5 shrink-0" /> This is a private event. Enter the invite code from your invitation to see the details and register.</p>
                  </div>
                  <input className={`${field} text-center tracking-widest uppercase`} placeholder="Invite code" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30} autoComplete="off" />
                  {ev.wrong_code && code && <p role="alert" className="text-sm text-red-600">That invite code is not correct.</p>}
                  <button onClick={() => setCode(draft.trim())} disabled={!draft.trim()} className={mainBtn} style={btnStyle}>Continue</button>
                </>
              ) : result ? (
                <div className="text-center py-2 flex flex-col gap-3">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={52} />
                  <h2 className="text-xl font-bold">
                    {result.status === "waitlist" ? "You are on the waitlist" : `You are registered, ${name.split(" ")[0]}!`}
                  </h2>
                  <p className="text-gray-600">
                    {result.status === "waitlist" ? "The event is full. The host will contact you if a spot opens." : `${ev.title} on ${prettyDate(ev.date)}.`}
                  </p>
                  <div className="rounded-2xl border py-4" style={{ background: `${brand}1A`, borderColor: `${brand}66` }}>
                    <p className="text-xs text-gray-500">Your confirmation code</p>
                    <p className="text-3xl font-bold tracking-widest">{result.code}</p>
                  </div>
                  <p className="text-xs text-gray-500">Screenshot this page and show the code at the door.</p>
                  {result.status === "confirmed" && (
                    <button onClick={() => downloadIcs(ev)} className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-500">Add to calendar</button>
                  )}
                  <div className="text-left"><HostCard ev={ev} /></div>
                </div>
              ) : (
                <>
                  {ev.description && <p className="text-gray-600 text-sm whitespace-pre-line">{ev.description}</p>}

                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2"><CalendarDays size={15} /> {prettyDate(ev.date)}</p>
                    {ev.start_time && (
                      <p className="flex items-center gap-2"><Clock size={15} /> {prettyTime(ev.start_time)}{ev.end_time && ` to ${prettyTime(ev.end_time)}`}</p>
                    )}
                    {(ev.venue_name || ev.venue_address) && (
                      <p className="flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span>
                          {ev.venue_name}{ev.venue_address && <><br />{ev.venue_address}</>}
                          {ev.map_link && <> <a href={ev.map_link} target="_blank" rel="noreferrer" className="underline font-medium">Open in Maps</a></>}
                        </span>
                      </p>
                    )}
                    {ev.spots_left != null && (
                      <p className="flex items-center gap-2"><Users size={15} /> {full ? "Event is full. You can join the waitlist." : `${ev.spots_left} spots left`}</p>
                    )}
                  </div>

                  {ev.closed ? (
                    <p className="text-center text-gray-600 py-4 font-medium">Registration is closed.</p>
                  ) : (
                    <>
                      <input className={field} placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                      <input className={field} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />
                      <input className={field} placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
                      <DynamicFields fields={ev.custom_fields ?? []} values={answers} onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} inputClass={field} />

                      {(ev.max_guests_per_registration ?? 1) > 1 && (
                        <div className="flex items-center justify-between rounded-xl border border-gray-300 px-4 py-2.5">
                          <span className="text-gray-700">How many people are coming?</span>
                          <div className="flex items-center gap-3">
                            <button type="button" aria-label="Fewer" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="p-1.5 rounded-lg border border-gray-300"><Minus size={14} /></button>
                            <span className="w-4 text-center font-semibold">{guests}</span>
                            <button type="button" aria-label="More" onClick={() => setGuests((g) => Math.min(ev.max_guests_per_registration ?? 1, g + 1))} className="p-1.5 rounded-lg border border-gray-300"><Plus size={14} /></button>
                          </div>
                        </div>
                      )}

                      <textarea className={`${field} resize-none`} rows={2} placeholder="Anything the host should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                      {/* honeypot */}
                      <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                      <button onClick={submit} disabled={sending} className={mainBtn} style={btnStyle}>
                        <Send size={16} />
                        {sending ? "Sending..." : full ? "Join waitlist" : "Register"}
                      </button>
                    </>
                  )}

                  <HostCard ev={ev} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}