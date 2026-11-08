import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CalendarCheck, CheckCircle2, Send } from "lucide-react";
import DynamicFields from "../components/DynamicFields";
import type { CustomField } from "../components/FieldBuilder";

interface PublicPage {
  business_name: string; headline: string; services: string[]; days: number[];
  advance_days: number; slot_minutes: number; custom_fields: CustomField[]; closed: boolean;
}
interface Slot { time: string; left: number }

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const prettyDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

/** Public booking page opened from the QR code at /b/:slug. No login. Mobile first. */
export default function BookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [missing, setMissing] = useState(false);

  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; date: string; time: string } | null>(null);

  useEffect(() => {
    axios.get(`/api/public/booking/${slug}`).then((r) => setPage(r.data.page)).catch(() => setMissing(true));
  }, [slug]);

  // the next open days, built from the owner's settings
  const dates = useMemo(() => {
    if (!page) return [];
    const out: Date[] = [];
    const start = new Date();
    for (let i = 0; i <= page.advance_days && out.length < 45; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (page.days.includes(d.getDay())) out.push(d);
    }
    return out;
  }, [page]);

  const pickDate = async (d: string) => {
    setDate(d);
    setTime("");
    setSlots(null);
    setError(null);
    setLoadingSlots(true);
    try {
      const r = await axios.get(`/api/public/booking/${slug}?date=${d}`);
      setSlots(r.data.slots ?? []);
    } catch {
      setError("Could not load times. Try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (page && page.services.length && !service) return setError("Pick a service.");
    if (!date) return setError("Pick a date.");
    if (!time) return setError("Pick a time.");
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    setSending(true);
    try {
      const r = await axios.post(`/api/public/booking/${slug}/book`, { name, phone, service, date, time, message, answers, website });
      setDone({ code: r.data.code, date, time });
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not book. Try again." : "Check your connection.");
      if (axios.isAxiosError(e) && e.response?.status === 409 && date) pickDate(date); // slot was taken: refresh times
    } finally {
      setSending(false);
    }
  };

  const downloadIcs = () => {
    if (!page || !done) return;
    const [h, m] = done.time.split(":").map(Number);
    const end = h * 60 + m + page.slot_minutes;
    const stamp = (mins: number) => done.date.replace(/-/g, "") + "T" + pad(Math.floor(mins / 60)) + pad(mins % 60) + "00";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${stamp(h * 60 + m)}`, `DTEND:${stamp(end)}`, `SUMMARY:Appointment at ${page.business_name}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "appointment.ics";
    a.click();
  };

  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200";
  const chip = (active: boolean, disabled = false) =>
    `shrink-0 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${disabled ? "border-gray-200 text-gray-300 line-through" : active ? "border-amber-500 bg-amber-400 text-[#1B1500]" : "border-gray-300 text-gray-700 hover:border-amber-500"}`;

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F9FAFB", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8">
        {missing ? (
          <p className="text-center text-gray-600 py-10">This booking link is not active.</p>
        ) : !page ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : done ? (
          <div className="text-center py-6 flex flex-col gap-3">
            <CheckCircle2 className="mx-auto text-emerald-500" size={52} />
            <h1 className="text-xl font-bold">You are booked, {name.split(" ")[0]}!</h1>
            <p className="text-gray-600">{page.business_name}<br />{prettyDate(done.date)} at {prettyTime(done.time)}</p>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 py-4">
              <p className="text-xs text-gray-500">Your booking code</p>
              <p className="text-3xl font-bold tracking-widest">{done.code}</p>
            </div>
            <p className="text-xs text-gray-500">Screenshot this page. Show the code when you arrive.</p>
            <button onClick={downloadIcs} className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-amber-500">Add to calendar</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">{page.business_name}</h1>
              {page.headline && <p className="text-gray-600 mt-1">{page.headline}</p>}
            </div>

            {page.closed ? (
              <p className="text-center text-gray-600 py-4 font-medium">Bookings are paused right now. Please check back later.</p>
            ) : (
              <>
                {page.services.length > 0 && (
                  <select className={field} value={service} onChange={(e) => setService(e.target.value)} aria-label="Service">
                    <option value="">Choose a service *</option>
                    {page.services.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                )}

                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><CalendarCheck size={15} /> Pick a day</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {dates.map((d) => {
                      const v = iso(d);
                      return (
                        <button key={v} type="button" onClick={() => pickDate(v)} aria-pressed={date === v} className={`${chip(date === v)} text-center min-w-[64px]`}>
                          <span className="block text-xs font-medium opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                          <span className="block">{d.getDate()} {d.toLocaleDateString(undefined, { month: "short" })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {date && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Pick a time</p>
                    {loadingSlots ? (
                      <p className="text-sm text-gray-500">Loading times...</p>
                    ) : slots && slots.length === 0 ? (
                      <p className="text-sm text-gray-500">No times left on this day. Try another day.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(slots ?? []).map((s) => (
                          <button key={s.time} type="button" disabled={s.left === 0} onClick={() => setTime(s.time)} aria-pressed={time === s.time} className={chip(time === s.time, s.left === 0)}>
                            {prettyTime(s.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <input className={field} placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                <input className={field} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />
                <DynamicFields fields={page.custom_fields ?? []} values={answers} onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} inputClass={field} />
                <textarea className={`${field} resize-none`} rows={2} placeholder="Anything we should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

                {/* honeypot */}
                <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                <button onClick={submit} disabled={sending} className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-[#1B1500] disabled:opacity-50" style={{ background: "linear-gradient(180deg,#FFE680,#FFD21F 55%,#F2B900)" }}>
                  <Send size={16} />
                  {sending ? "Booking..." : "Book appointment"}
                </button>
                <p className="text-xs text-gray-400 text-center">Your details go only to {page.business_name}.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}