import { useEffect, useRef, useState } from "react";
import { Globe, ImagePlus, Lock, MessageCircle, Trash2 } from "lucide-react";
import { Label } from "./toolUtils";

/* "Event page" tab: logo, cover, colour, host details and public / private. Uses the dashboard (og-*) classes. */

type Api = <T>(method: "get" | "post" | "patch", url: string, data?: unknown) => Promise<T>;

const SWATCHES = ["#F2B900", "#E11D48", "#2563EB", "#059669", "#7C3AED", "#111827"];
const DEFAULT_BRAND = "#F2B900";

const readableOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1B1500" : "#FFFFFF";
};

/** Shrinks a picture so it can be stored with the event. Tries smaller sizes until it fits the limit. */
async function shrink(file: File, kind: "logo" | "cover"): Promise<string> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("load"));
      i.src = src;
    });
    const sizes = kind === "logo" ? [256, 192, 128] : [1200, 900, 700];
    const limit = kind === "logo" ? 140000 : 550000;
    let out = "";
    for (const max of sizes) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      if (kind === "cover") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      if (kind === "cover") out = canvas.toDataURL("image/jpeg", 0.8);
      else {
        out = canvas.toDataURL("image/webp", 0.9); // keeps see-through backgrounds
        if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/png");
      }
      if (out.length <= limit) return out;
    }
    throw new Error("too big");
  } finally {
    URL.revokeObjectURL(src);
  }
}

export default function EventPageSettings({
  eventId, title, api, onSaved,
}: {
  eventId: string;
  title: string;
  api: Api;
  onSaved: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [accessCode, setAccessCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostAbout, setHostAbout] = useState("");
  const [hostWa, setHostWa] = useState("");
  const [hostIg, setHostIg] = useState("");
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [logo, setLogo] = useState("");
  const [cover, setCover] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    api<{ event: any }>("get", `/api/events/${eventId}`)
      .then((d) => {
        const e = d.event;
        if (!live || !e) return;
        setVisibility(e.visibility === "private" ? "private" : "public");
        setAccessCode(e.access_code || "");
        setHostName(e.host_name || "");
        setHostAbout(e.host_about || "");
        setHostWa(e.host_whatsapp || "");
        setHostIg(e.host_instagram || "");
        setBrand(e.brand_color || DEFAULT_BRAND);
        setLogo(e.logo_url || "");
        setCover(e.cover_url || "");
        setLoaded(true);
      })
      .catch(() => live && setMsg({ ok: false, text: "Could not load this event page. Refresh and try again." }));
    return () => { live = false; };
  }, [api, eventId]);

  const pick = async (f: File | null, kind: "logo" | "cover") => {
    if (!f) return;
    setMsg(null);
    if (!f.type.startsWith("image/")) return setMsg({ ok: false, text: "Choose an image file." });
    try {
      const url = await shrink(f, kind);
      if (kind === "logo") setLogo(url);
      else setCover(url);
    } catch {
      setMsg({ ok: false, text: "Could not use that picture. Try a smaller or simpler one." });
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api("patch", `/api/events/${eventId}`, {
        visibility, access_code: accessCode, host_name: hostName, host_about: hostAbout,
        host_whatsapp: hostWa, host_instagram: hostIg, brand_color: brand, logo_url: logo, cover_url: cover,
      });
      setMsg({ ok: true, text: "Saved. Your event page is updated." });
      onSaved();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.error ?? "Could not save. Try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm og-muted">{msg ? msg.text : "Loading..."}</p>;

  const initial = (hostName || title || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-3 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Who can see this event?</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              ["public", "Public", "Anyone who scans can see all the details and register.", Globe],
              ["private", "Private (invite only)", "Guests need your invite code. The venue and details stay hidden until they enter it.", Lock],
            ] as const).map(([id, label, hint, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={visibility === id}
                onClick={() => setVisibility(id)}
                className="og-card og-focus text-left p-4 flex flex-col gap-1.5"
                style={{ boxShadow: "none", ...(visibility === id ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" } : {}) }}
              >
                <span className="flex items-center gap-2 font-semibold og-text"><Icon size={15} />{label}</span>
                <span className="text-xs og-muted">{hint}</span>
              </button>
            ))}
          </div>
          {visibility === "private" && (
            <div className="mt-3">
              <Label note="(leave empty and we make one)">Invite code</Label>
              <input className="og-input sm:max-w-xs font-mono" placeholder="e.g: TUNDE-ADA" value={accessCode} maxLength={20} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} />
              <p className="text-xs og-faint mt-1.5">The QR for a private event already has the code inside, so invited guests who scan it go straight in. Choose a code that is hard to guess.</p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label note="(square works best)">Logo</Label>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] ?? null, "logo"); e.target.value = ""; }} />
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl border og-divider bg-white overflow-hidden flex items-center justify-center shrink-0">
                {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain" /> : <ImagePlus size={20} className="og-faint" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="og-ghost" onClick={() => logoRef.current?.click()}>{logo ? "Change" : "Upload logo"}</button>
                {logo && <button type="button" className="og-ghost" aria-label="Remove logo" onClick={() => setLogo("")} style={{ padding: ".5rem" }}><Trash2 size={14} /></button>}
              </div>
            </div>
          </div>
          <div>
            <Label note="(wide photo)">Cover banner</Label>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] ?? null, "cover"); e.target.value = ""; }} />
            <div className="flex items-center gap-3">
              <div className="w-28 h-16 rounded-xl border og-divider bg-white overflow-hidden flex items-center justify-center shrink-0">
                {cover ? <img src={cover} alt="Cover" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="og-faint" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="og-ghost" onClick={() => coverRef.current?.click()}>{cover ? "Change" : "Upload cover"}</button>
                {cover && <button type="button" className="og-ghost" aria-label="Remove cover" onClick={() => setCover("")} style={{ padding: ".5rem" }}><Trash2 size={14} /></button>}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label>Page colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={brand === c} onClick={() => setBrand(c)} className="og-focus w-9 h-9 rounded-full border-2" style={{ background: c, borderColor: brand === c ? "var(--accent)" : "var(--border)", boxShadow: brand === c ? "0 0 0 3px var(--ring)" : "none" }} />
            ))}
            <input type="color" aria-label="Pick any colour" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-9 h-9 rounded-full border og-divider bg-transparent cursor-pointer p-0" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Host or organiser name</Label>
            <input className="og-input" placeholder="e.g: The Okafor family, Zuri Events" maxLength={80} value={hostName} onChange={(e) => setHostName(e.target.value)} />
          </div>
          <div>
            <Label note="(optional)">Instagram</Label>
            <input className="og-input" placeholder="@yourname" maxLength={60} value={hostIg} onChange={(e) => setHostIg(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label note="(optional)">About the people behind this event</Label>
            <textarea className="og-input resize-none" rows={3} maxLength={500} placeholder="A short note so guests know who is hosting and what to expect." value={hostAbout} onChange={(e) => setHostAbout(e.target.value)} />
          </div>
          <div>
            <Label note="(optional)">WhatsApp number for guests</Label>
            <input className="og-input" type="tel" inputMode="tel" placeholder="e.g: 0803 123 4567" maxLength={20} value={hostWa} onChange={(e) => setHostWa(e.target.value)} />
          </div>
        </div>

        {msg && (
          <div role="alert" className="rounded-2xl p-4 text-sm border" style={msg.ok ? { background: "rgba(16,185,129,.08)", borderColor: "rgba(16,185,129,.3)", color: "#10b981" } : { background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>
            {msg.text}
          </div>
        )}

        <button className="og-btn" onClick={save} disabled={saving}>
          {saving ? (<><span className="og-spin" />Saving...</>) : "Save event page"}
        </button>
      </section>

      {/* live preview of what guests will see */}
      <section className="xl:col-span-2 min-w-0">
        <p className="text-sm font-semibold og-text mb-3">What guests see</p>
        <div className="rounded-3xl overflow-hidden border og-divider bg-white shadow-lg" style={{ color: "#111827", colorScheme: "light" }}>
          <div className="relative">
            {cover ? <img src={cover} alt="" className="w-full h-32 object-cover block" /> : <div className="w-full h-24" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}99)` }} />}
            <div className="absolute left-5 -bottom-8 w-16 h-16 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
              {logo ? <img src={logo} alt="" className="w-full h-full object-contain" /> : <span className="text-xl font-bold" style={{ color: brand }}>{initial}</span>}
            </div>
          </div>
          <div className="px-5 pt-11 pb-5 flex flex-col gap-3">
            <div>
              <p className="text-lg font-bold leading-tight">{title}</p>
              {hostName && <p className="text-sm text-gray-500 mt-0.5">Hosted by {hostName}</p>}
            </div>
            {visibility === "private" ? (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 flex gap-2"><Lock size={14} className="shrink-0 mt-0.5" />Private event. Guests enter the invite code to see the details.</div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">Date, time and venue show here.</div>
            )}
            <div className="rounded-xl py-2.5 text-center text-sm font-bold" style={{ background: brand, color: readableOn(brand) }}>{visibility === "private" ? "Continue" : "Register"}</div>
            {(hostName || hostAbout || hostWa || hostIg) && (
              <div className="rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">The people behind this event</p>
                {hostName && <p className="text-sm font-semibold">{hostName}</p>}
                {hostAbout && <p className="text-xs text-gray-600 whitespace-pre-line">{hostAbout}</p>}
                <div className="flex flex-wrap gap-2">
                  {hostWa && <span className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5"><MessageCircle size={12} />WhatsApp</span>}
                  {hostIg && <span className="inline-flex items-center text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5">@{hostIg.replace(/^@/, "")}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div> 
  );
}
