import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CalendarDays, CheckCircle2, Clock, MapPin, Send } from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

interface PublicEvent {
  title: string; host_name: string; date: string; start_time: string; end_time: string;
  venue_name: string; venue_address: string; map_link: string; description: string;
  max_guests: number; spots_left: number | null; closed: boolean; custom_fields: CustomField[];
}

const prettyTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const prettyDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Public event registration page opened from the QR code at /e/:slug. No login. Mobile first. */
export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; status: "confirmed" | "waitlist" } | null>(null);

  useEffect(() => {
    axios.get(`/api/public/event/${slug}`).then((r) => setEvent(r.data.event)).catch(() => setMissing(true));
  }, [slug]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email or leave it empty.");
    for (const f of event?.custom_fields ?? []) {
      if (f.required && !(answers[f.id] ?? "").trim()) return setError(`Please answer: ${f.label}`);
    }
    setSending(true);
    try {
      const r = await axios.post(`/api/public/event/${slug}/register`, { name, phone, email, guests, message, answers, website });
      setDone({ code: r.data.code, status: r.data.status ?? "confirmed" });
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not register. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const downloadIcs = () => {
    if (!event) return;
    const day = event.date.replace(/-/g, "");
    const stamp = (t: string) => day + "T" + t.replace(":", "") + "00";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT"];
    if (event.start_time) {
      lines.push(`DTSTART:${stamp(event.start_time)}`);
      if (event.end_time) lines.push(`DTEND:${stamp(event.end_time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day}`);
    }
    lines.push(`SUMMARY:${event.title}`);
    const where = [event.venue_name, event.venue_address].filter(Boolean).join(", ");
    if (where) lines.push(`LOCATION:${where}`);
    lines.push("END:VEVENT", "END:VCALENDAR");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
    a.download = "event.ics";
    a.click();
  };

  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200";
  const maxGuests = Math.max(1, event?.max_guests ?? 1);
  const when = event
    ? `${prettyDate(event.date)}${event.start_time ? ` at ${prettyTime(event.start_time)}` : ""}${event.end_time ? ` to ${prettyTime(event.end_time)}` : ""}`
    : "";

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F9FAFB", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8">
        {missing ? (
          <p className="text-center text-gray-600 py-10">This event link is not active.</p>
        ) : !event ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : done ? (
          <div className="text-center py-6 flex flex-col gap-3">
            <CheckCircle2 className={`mx-auto ${done.status === "waitlist" ? "text-amber-500" : "text-emerald-500"}`} size={52} />
            <h1 className="text-xl font-bold">
              {done.status === "waitlist" ? `You are on the waitlist, ${name.split(" ")[0]}` : `You are registered, ${name.split(" ")[0]}!`}
            </h1>
            <p className="text-gray-600">{event.title}<br />{when}</p>
            {done.status === "waitlist" && <p className="text-sm text-gray-600">The event is full. The host will contact you if a place opens.</p>}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 py-4">
              <p className="text-xs text-gray-500">Your confirmation code</p>
              <p className="text-3xl font-bold tracking-widest">{done.code}</p>
            </div>
            <p className="text-xs text-gray-500">Screenshot this page. Show the code at the door.</p>
            <button onClick={downloadIcs} className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-amber-500">Add to calendar</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              {event.host_name && <p className="text-gray-600 mt-1">Hosted by {event.host_name}</p>}
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-2 text-sm text-gray-700">
              <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0" />{prettyDate(event.date)}</p>
              {event.start_time && (
                <p className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0" />
                  {prettyTime(event.start_time)}{event.end_time ? ` to ${prettyTime(event.end_time)}` : ""}
                </p>
              )}
              {(event.venue_name || event.venue_address) && (
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {event.venue_name}{event.venue_name && event.venue_address ? <br /> : null}{event.venue_address}
                    {event.map_link && (
                      <>
                        <br />
                        <a href={event.map_link} target="_blank" rel="noreferrer" className="font-semibold text-amber-700 underline">Open in Google Maps</a>
                      </>
                    )}
                  </span>
                </p>
              )}
            </div>

            {event.description && <p className="text-sm text-gray-600 whitespace-pre-line">{event.description}</p>}

            {event.closed ? (
              <p className="text-center text-gray-600 py-4 font-medium">Registration is closed. Please contact the host.</p>
            ) : (
              <>
                {event.spots_left !== null && event.spots_left <= 10 && (
                  <p className="text-xs font-semibold text-amber-700">
                    {event.spots_left > 0 ? `Only ${event.spots_left} ${event.spots_left === 1 ? "place" : "places"} left.` : "Event is full. You can join the waitlist."}
                  </p>
                )}

                <input className={field} placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                <input className={field} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />
                <input className={field} placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />

                {maxGuests > 1 && (
                  <select className={field} value={guests} onChange={(e) => setGuests(Number(e.target.value))} aria-label="Number of people">
                    {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "person (just me)" : "people"}</option>
                    ))}
                  </select>
                )}

                <DynamicFields
                  fields={event.custom_fields ?? []}
                  values={answers}
                  onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                  inputClass={field}
                />

                <textarea className={`${field} resize-none`} rows={2} placeholder="Anything the host should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                {/* honeypot */}
                <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                <button onClick={submit} disabled={sending} className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-[#1B1500] disabled:opacity-50" style={{ background: "linear-gradient(180deg,#FFE680,#FFD21F 55%,#F2B900)" }}>
                  <Send size={16} />
                  {sending ? "Registering..." : "Register"}
                </button>
                <p className="text-xs text-gray-400 text-center">Your details go only to {event.host_name || "the host"}.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}