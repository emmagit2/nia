import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, MapPin, Send } from "lucide-react";

interface PublicCampaign {
  business_name: string;
  headline: string;
  services: string[];
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
        website,
      });
      setDone(true);
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not send. Try again." : "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200";

  return (
    <div
      className="flex items-start sm:items-center justify-center p-4"
      // full-screen light layer: a dark app background or navbar can never hide this page
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "#F9FAFB", color: "#111827", colorScheme: "light" }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8">
        {missing ? (
          <p className="text-center text-gray-600 py-10">This link is not active.</p>
        ) : !camp ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : done ? (
          <div className="text-center py-8">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={52} />
            <h1 className="text-xl font-bold text-gray-900">Thank you, {name.split(" ")[0]}!</h1>
            <p className="text-gray-600 mt-2">{camp.business_name} will contact you soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{camp.business_name}</h1>
              <p className="text-gray-600 mt-1">{camp.headline}</p>
            </div>

            <input className={field} placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            <input className={field} placeholder="Phone number *" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" />

            {camp.services.length > 0 && (
              <select className={field} value={interest} onChange={(e) => setInterest(e.target.value)}>
                <option value="">What are you interested in?</option>
                {camp.services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <div className="flex flex-col gap-2">
              <input className={field} placeholder="Your area, e.g. Ikeja, Lekki" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={120} />
              <button type="button" onClick={useMyLocation} disabled={geoBusy} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-amber-500">
                <MapPin size={15} />
                {geo ? "Location shared" : geoBusy ? "Getting location..." : "Share my exact location (optional)"}
              </button>
            </div>

            <textarea className={`${field} resize-none`} rows={3} placeholder="Anything else? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />

            {/* honeypot */}
            <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button onClick={submit} disabled={sending} className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-[#1B1500] disabled:opacity-50" style={{ background: "linear-gradient(180deg,#FFE680,#FFD21F 55%,#F2B900)" }}>
              <Send size={16} />
              {sending ? "Sending..." : "Send my details"}
            </button>
            <p className="text-xs text-gray-400 text-center">Your details go only to {camp.business_name}.</p>
          </div>
        )}
      </div>
    </div>
  );
}