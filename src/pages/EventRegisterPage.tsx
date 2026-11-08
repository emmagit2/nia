import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CalendarDays, CheckCircle2, Clock, MapPin, Minus, Plus, Send, Users } from "lucide-react";

interface PublicEvent {
  title: string; description: string; host_name: string;
  date: string; start_time: string; end_time: string;
  venue_name: string; venue_address: string; map_link: string;
  max_guests_per_registration: number; closed: boolean; spots_left: number | null;
}

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
    `DTSTART:${stamp(e.date, e.start_time)}`,
    `DTEND:${stamp(e.date, e.end_time || e.start_time)}`,
    `SUMMARY:${e.title}`,
    `LOCATION:${[e.venue_name, e.venue_address].filter(Boolean).join(", ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "event.ics";
  a.click();
};

/** Public event registration page, opened from the QR code at /e/:slug. No login. Mobile first. */
export default function EventRegisterPage() {
  const { slug } = useParams();
  const [ev, setEv] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; code: string } | null>(null);

  useEffect(() => {
    axios.get(`/api/public/event/${slug}`).then((r) => setEv(r.data.event)).catch(() => setMissing(true));
  }, [slug]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    setSending(true);
    try {
      const r = await axios.post(`/api/public/event/${slug}/register`, { name, phone, email, guests, message, website });
      setResult({ status: r.data.status, code: r.data.code });
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not register. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200";
  const full = ev?.spots_left === 0;

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F9FAFB", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8">
        {missing ? (
          <p className="text-center text-gray-600 py-10">This event link is not active.</p>
        ) : !ev ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : result ? (
          <div className="text-center py-6 flex flex-col gap-3">
            <CheckCircle2 className="mx-auto text-emerald-500" size={52} />
            <h1 className="text-xl font-bold">
              {result.status === "waitlist" ? "You are on the waitlist" : `You are registered, ${name.split(" ")[0]}!`}
            </h1>
            <p className="text-gray-600">
              {result.status === "waitlist" ? "The event is full. The host will contact you if a spot opens." : `${ev.title} on ${prettyDate(ev.date)}.`}
            </p>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 py-4">
              <p className="text-xs text-gray-500">Your confirmation code</p>
              <p className="text-3xl font-bold tracking-widest">{result.code}</p>
            </div>
            <p className="text-xs text-gray-500">Screenshot this page and show the code at the door.</p>
            {result.status === "confirmed" && (
              <button onClick={() => downloadIcs(ev)} className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-amber-500">
                Add to calendar
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">{ev.title}</h1>
              {ev.host_name && <p className="text-gray-500 text-sm mt-1">Hosted by {ev.host_name}</p>}
              {ev.description && <p className="text-gray-600 mt-3 text-sm whitespace-pre-line">{ev.description}</p>}
            </div>

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
                    {ev.map_link && <> <a href={ev.map_link} target="_blank" rel="noreferrer" className="text-amber-600 underline">Open in Maps</a></>}
                  </span>
                </p>
              )}
              {ev.spots_left !== null && (
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

                {ev.max_guests_per_registration > 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-gray-300 px-4 py-2.5">
                    <span className="text-gray-700">How many people are coming?</span>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label="Fewer" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="p-1.5 rounded-lg border border-gray-300"><Minus size={14} /></button>
                      <span className="w-4 text-center font-semibold">{guests}</span>
                      <button type="button" aria-label="More" onClick={() => setGuests((g) => Math.min(ev.max_guests_per_registration, g + 1))} className="p-1.5 rounded-lg border border-gray-300"><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                <textarea className={`${field} resize-none`} rows={2} placeholder="Anything the host should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                {/* honeypot */}
                <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                <button onClick={submit} disabled={sending} className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-[#1B1500] disabled:opacity-50" style={{ background: "linear-gradient(180deg,#FFE680,#FFD21F 55%,#F2B900)" }}>
                  <Send size={16} />
                  {sending ? "Sending..." : full ? "Join waitlist" : "Register"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}