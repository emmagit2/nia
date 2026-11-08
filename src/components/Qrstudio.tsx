import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import QrOnDesign from "./QrOnDesign";
import { Label, waLink } from "./toolUtils";

/* Standalone "QR on Design" tool: pick any QR you own (leads, event, booking), a WhatsApp chat, or any link. */

type Mode = "mine" | "whatsapp" | "link";
interface Item { key: string; label: string; url: string; caption: string }

export default function QrStudio({ lastDesign = null }: { lastDesign?: string | null }) {
  const { getToken } = useAuth();
  const tokenFn = useRef(getToken);
  tokenFn.current = getToken;

  const [mode, setMode] = useState<Mode>("mine");
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [itemKey, setItemKey] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [waText, setWaText] = useState("Hello, I saw your flyer and I am interested.");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    (async () => {
      const token = await tokenFn.current();
      const get = (url: string) => axios.get(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);
      const origin = window.location.origin;
      const [c, e, b] = await Promise.allSettled([get("/api/lead-campaigns"), get("/api/events"), get("/api/bookings")]);
      const list: Item[] = [];
      if (c.status === "fulfilled" && Array.isArray(c.value?.campaigns))
        c.value.campaigns.forEach((x: any) => list.push({ key: `c:${x.id}`, label: `Leads: ${x.business_name}`, url: `${origin}/c/${x.slug}`, caption: "Scan to get a quote" }));
      if (e.status === "fulfilled" && Array.isArray(e.value?.events))
        e.value.events.forEach((x: any) => list.push({ key: `e:${x.id}`, label: `Event: ${x.title}`, url: `${origin}/e/${x.slug}`, caption: "Scan to register" }));
      if (b.status === "fulfilled" && Array.isArray(b.value?.pages))
        b.value.pages.forEach((x: any) => list.push({ key: `b:${x.id}`, label: `Booking: ${x.business_name}`, url: `${origin}/b/${x.slug}`, caption: "Scan to book" }));
      setItems(list);
      setItemKey((k) => k || list[0]?.key || "");
      setLoaded(true);
    })();
  }, []);

  const { link, caption } = useMemo(() => {
    if (mode === "mine") {
      const it = items.find((i) => i.key === itemKey);
      return { link: it?.url ?? "", caption: it?.caption ?? "Scan me" };
    }
    if (mode === "whatsapp") {
      return { link: waNumber.replace(/\D/g, "").length >= 7 ? waLink(waNumber, waText.trim()) : "", caption: "Chat with us on WhatsApp" };
    }
    const raw = custom.trim();
    if (!raw) return { link: "", caption: "Scan me" };
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(withScheme);
      return { link: u.hostname.includes(".") ? withScheme : "", caption: "Scan me" };
    } catch {
      return { link: "", caption: "Scan me" };
    }
  }, [mode, items, itemKey, waNumber, waText, custom]);

  const MODES: { id: Mode; label: string }[] = [
    { id: "mine", label: "My forms" },
    { id: "whatsapp", label: "WhatsApp chat" },
    { id: "link", label: "Any link" },
  ];

  return (
    <div className="flex flex-col gap-6 og-in">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="What should the QR open?">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} data-active={mode === m.id} onClick={() => setMode(m.id)} className="og-chip og-focus !py-2 !px-4 !text-sm">
              {m.label}
            </button>
          ))}
        </div>

        {mode === "mine" && (
          <div className="max-w-xl">
            <Label>What should the QR open?</Label>
            {items.length > 0 ? (
              <select className="og-input" value={itemKey} onChange={(e) => setItemKey(e.target.value)}>
                {items.map((i) => (
                  <option key={i.key} value={i.key}>{i.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm og-muted">
                {loaded ? "You have no forms yet. Create a Client Leads QR, an Event or a Booking page first, or use WhatsApp chat or Any link." : "Loading your forms..."}
              </p>
            )}
          </div>
        )}

        {mode === "whatsapp" && (
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
            <div>
              <Label>WhatsApp number *</Label>
              <input className="og-input" type="tel" inputMode="tel" placeholder="e.g: 0803 123 4567" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
            </div>
            <div>
              <Label note="(optional)">Message already typed for them</Label>
              <input className="og-input" maxLength={140} value={waText} onChange={(e) => setWaText(e.target.value)} />
            </div>
          </div>
        )}

        {mode === "link" && (
          <div className="max-w-xl">
            <Label>Link *</Label>
            <input className="og-input" placeholder="e.g: instagram.com/yourbusiness or your website" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <p className="text-xs og-faint mt-1.5">Works for Instagram, Google Maps, a Google review page, your website, anything.</p>
          </div>
        )}
      </div>

      <QrOnDesign link={link} defaultCaption={caption} lastDesign={lastDesign} />
    </div>
  );
}