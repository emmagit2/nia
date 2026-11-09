import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { CalendarDays, Check, Copy, Download, ImageDown, Lock, MessageCircle, Phone, QrCode, RefreshCw, Search, Unlock, Users } from "lucide-react";
import FieldBuilder, { type CustomField } from "./FieldBuilder";
import QrOnDesign from "./QrOnDesign";
import EventPageSettings from "./EventPageSettings";

/* Event registration tool for DashboardPage. Uses the og-* styles that DashboardPage already defines. */

interface EventRow {
  id: string; slug: string; title: string; host_name: string; date: string; start_time: string;
  venue_name: string; capacity: number | null; registration_open: boolean; headcount: number; registrations: number; custom_fields: CustomField[]; visibility: "public" | "private"; access_code: string;
}
interface Reg {
  id: string; name: string; phone: string; email: string; guests: number; message: string;
  status: "confirmed" | "waitlist" | "cancelled"; code: string; created_at: string; answers: Record<string, string>;
}
type Tab = "create" | "page" | "place" | "guests";

const blank = {
  title: "", host_name: "", date: "", start_time: "", end_time: "", venue_name: "", venue_address: "",
  map_link: "", capacity: "", max_guests_per_registration: "1", deadline: "", description: "",
};

const waLink = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  return `https://wa.me/${d}`;
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const prettyDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}

export default function EventsTool({ lastDesign = null }: { lastDesign?: string | null }) {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("create");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [q, setQ] = useState("");

  const active = events.find((e) => e.id === activeId) ?? null;
  // private events: the QR carries the invite code, so invited guests who scan it go straight in
  const link = active ? `${window.location.origin}/e/${active.slug}${active.visibility === "private" && active.access_code ? `?code=${active.access_code}` : ""}` : "";

  // keep the latest getToken in a ref so `api` never changes between renders
  const tokenFn = useRef(getToken);
  tokenFn.current = getToken;
  const api = useCallback(
    async <T,>(method: "get" | "post" | "patch", url: string, data?: unknown, blob?: boolean): Promise<T> => {
      const token = await tokenFn.current();
      const res = await axios.request<T>({ method, url, data, headers: { Authorization: `Bearer ${token}` }, responseType: blob ? "blob" : "json" });
      return res.data;
    },
    [],
  );

  const loadEvents = useCallback(async () => {
    const d = await api<{ events?: EventRow[] }>("get", "/api/events");
    if (!Array.isArray(d?.events)) throw new Error("bad response");
    setEvents(d.events);
    return d.events;
  }, [api]);

  useEffect(() => {
    loadEvents()
      .then((list) => setActiveId((id) => id ?? list[0]?.id ?? null))
      .catch(() => setErr("Could not reach the server. Run the app with netlify dev (not npm run dev), then refresh."));
  }, [loadEvents]);

  // QR image for the active event
  useEffect(() => {
    if (!link) return setQrUrl(null);
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(link, { width: 720, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0A2E1E", light: "#FFFFFF" } }).then((u) => live && setQrUrl(u)),
    );
    return () => { live = false; };
  }, [link]);

  const loadRegs = useCallback(async () => {
    if (!activeId) return setRegs([]);
    setLoadingRegs(true);
    try {
      const d = await api<{ registrations: Reg[] }>("get", `/api/events/${activeId}/registrations`);
      setRegs(Array.isArray(d?.registrations) ? d.registrations : []);
    } catch {
      setErr("Could not load registrations. Try again.");
    } finally {
      setLoadingRegs(false);
    }
  }, [api, activeId]);

  useEffect(() => { if (tab === "guests") loadRegs(); }, [tab, loadRegs]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ event: EventRow }>("post", "/api/events", { ...form, custom_fields: fields });
      setEvents((l) => [d.event, ...l]);
      setActiveId(d.event.id);
      setTab("page"); // next step: set the logo, cover and who can see it
      setForm(blank);
      setFields([]);
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not create the event." : "Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleOpen = async () => {
    if (!active) return;
    try {
      await api("patch", `/api/events/${active.id}`, { registration_open: !active.registration_open });
      await loadEvents();
    } catch {
      setErr("Could not update the event.");
    }
  };

  const setStatus = async (rid: string, status: Reg["status"]) => {
    if (!active) return;
    try {
      await api("patch", `/api/events/${active.id}/registrations/${rid}`, { status });
      await Promise.all([loadRegs(), loadEvents()]);
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not update." : "Check your connection.");
    }
  };

  const exportCsv = async () => {
    if (!active) return;
    try {
      const blob = await api<Blob>("get", `/api/events/${active.id}/export.csv`, undefined, true);
      saveBlob(new Blob(["\uFEFF", blob], { type: "text/csv;charset=utf-8" }), `twomindesign_${active.slug}_guests.csv`);
    } catch {
      setErr("Could not export. Try again.");
    }
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? regs.filter((r) => [r.name, r.phone, r.code].some((v) => v.toLowerCase().includes(t))) : regs;
  }, [regs, q]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "create", label: "Create event" },
    { id: "page", label: "Event page" },
    { id: "place", label: "Put QR on a design" },
    { id: "guests", label: "Guests" },
  ];

  return (
    <div className="flex flex-col gap-6 og-in">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Event registration">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} data-active={tab === t.id} onClick={() => setTab(t.id)} className="og-chip og-focus !py-2 !px-4 !text-sm">
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>
          {err}
        </div>
      )}

      {tab === "create" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-2 flex flex-col gap-4 min-w-0">
            <div>
              <Label>Event name *</Label>
              <input className="og-input" placeholder="e.g: Tunde and Ada's Wedding" value={form.title} onChange={set("title")} maxLength={100} disabled={busy} />
            </div>
            <div>
              <Label note="(optional)">Host</Label>
              <input className="og-input" placeholder="e.g: The Okafor family" value={form.host_name} onChange={set("host_name")} maxLength={80} disabled={busy} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Date *</Label>
                <input className="og-input" type="date" value={form.date} onChange={set("date")} disabled={busy} />
              </div>
              <div>
                <Label>Starts</Label>
                <input className="og-input" type="time" value={form.start_time} onChange={set("start_time")} disabled={busy} />
              </div>
              <div>
                <Label>Ends</Label>
                <input className="og-input" type="time" value={form.end_time} onChange={set("end_time")} disabled={busy} />
              </div>
            </div>
            <div>
              <Label note="(optional)">Venue</Label>
              <input className="og-input mb-2" placeholder="Venue name" value={form.venue_name} onChange={set("venue_name")} maxLength={120} disabled={busy} />
              <input className="og-input mb-2" placeholder="Address, e.g. 12 Allen Avenue, Ikeja" value={form.venue_address} onChange={set("venue_address")} maxLength={200} disabled={busy} />
              <input className="og-input" placeholder="Google Maps link" value={form.map_link} onChange={set("map_link")} maxLength={300} disabled={busy} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label note="(blank = no limit)">Capacity</Label>
                <input className="og-input" type="number" min={1} value={form.capacity} onChange={set("capacity")} disabled={busy} />
              </div>
              <div>
                <Label>Max guests each</Label>
                <input className="og-input" type="number" min={1} max={20} value={form.max_guests_per_registration} onChange={set("max_guests_per_registration")} disabled={busy} />
              </div>
              <div>
                <Label note="(optional)">Close on</Label>
                <input className="og-input" type="date" value={form.deadline} onChange={set("deadline")} disabled={busy} />
              </div>
            </div>
            <div>
              <Label note="(optional)">Details for guests</Label>
              <textarea className="og-input resize-none" rows={3} placeholder="Dress code, program, parking, anything guests should know" value={form.description} onChange={set("description")} maxLength={1000} disabled={busy} />
            </div>
            <div>
              <Label note="(optional)">Extra questions for guests</Label>
              <FieldBuilder value={fields} onChange={setFields} />
            </div>
            <button className="og-btn" onClick={create} disabled={busy || !form.title.trim() || !form.date}>
              {busy ? (
                <>
                  <span className="og-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <span className="og-btn-icon"><CalendarDays size={16} /></span>
                  Create event and QR
                </>
              )}
            </button>
          </section>

          <section className="xl:col-span-3 min-w-0 flex flex-col gap-4">
            {events.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {events.map((e) => (
                  <button key={e.id} className="og-chip og-focus" data-active={e.id === activeId} onClick={() => setActiveId(e.id)}>
                    {e.title}
                  </button>
                ))}
              </div>
            )}

            {active ? (
              <div className="og-card p-5 sm:p-6 flex flex-col sm:flex-row gap-6 og-in">
                <div className="shrink-0 mx-auto sm:mx-0">
                  <div className="rounded-2xl bg-white p-3 border og-divider" style={{ width: 220 }}>
                    {qrUrl ? <img src={qrUrl} alt={`QR code for ${active.title}`} className="w-full block" /> : <div className="aspect-square flex items-center justify-center"><span className="og-spin og-spin-lg" /></div>}
                  </div>
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-4">
                  <div>
                    <p className="font-display font-bold text-lg og-text">{active.title}</p>
                    <p className="text-sm og-muted">
                      {prettyDate(active.date)}{active.venue_name ? `, ${active.venue_name}` : ""}
                    </p>
                    <p className="text-sm og-faint mt-1">
                      {active.headcount}{active.capacity ? ` of ${active.capacity}` : ""} attending &middot; {active.registration_open ? "Registration open" : "Registration closed"} &middot; {active.visibility === "private" ? `Private, code ${active.access_code}` : "Public"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 og-input" style={{ padding: ".5rem .5rem .5rem .9rem" }}>
                    <span className="text-sm og-muted truncate flex-1">{link}</span>
                    <button onClick={copyLink} className="og-ghost shrink-0">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="og-ghost" onClick={() => setTab("place")}>
                      <ImageDown size={14} />
                      Put it on a design
                    </button>
                    <button className="og-ghost" disabled={!qrUrl} onClick={() => qrUrl && saveBlob(dataUrlToBlob(qrUrl), `twomindesign_event_${active.slug}.png`)}>
                      <Download size={14} />
                      Download QR
                    </button>
                    <button className="og-ghost" onClick={() => setTab("guests")}>
                      <Users size={14} />
                      See guests ({active.registrations})
                    </button>
                    <button className="og-ghost" onClick={toggleOpen}>
                      {active.registration_open ? <Lock size={14} /> : <Unlock size={14} />}
                      {active.registration_open ? "Close registration" : "Reopen registration"}
                    </button>
                  </div>
                  <p className="text-xs og-faint">Print the QR on your invitation or flyer. Guests scan it, register in under a minute, and get a confirmation code.</p>
                </div>
              </div>
            ) : (
              <div className="og-card overflow-hidden">
                <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><QrCode size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">Your event QR will appear here</p>
                  <p className="og-faint text-xs text-center">Fill the form and create your event</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "page" &&
        (!active ? (
          <div className="og-card p-8 text-center">
            <div className="og-tile w-14 h-14 rounded-2xl mx-auto mb-4"><QrCode size={26} /></div>
            <p className="font-semibold og-text mb-1">Create an event first</p>
            <p className="text-sm og-muted mb-5">Then you can add your logo, cover and host details.</p>
            <button className="og-ghost" onClick={() => setTab("create")}>Go to Create event</button>
          </div>
        ) : (
          <EventPageSettings key={active.id} eventId={active.id} title={active.title} api={api} onSaved={() => { void loadEvents(); }} />
        ))}

      {tab === "place" &&
        (!active ? (
          <div className="og-card p-8 text-center">
            <div className="og-tile w-14 h-14 rounded-2xl mx-auto mb-4"><QrCode size={26} /></div>
            <p className="font-semibold og-text mb-1">Create an event first</p>
            <p className="text-sm og-muted mb-5">Then you can put its QR on your flyer or invitation.</p>
            <button className="og-ghost" onClick={() => setTab("create")}>Go to Create event</button>
          </div>
        ) : (
          <QrOnDesign link={link} defaultCaption="Scan to register" lastDesign={lastDesign} />
        ))}

      {tab === "guests" &&
        (!active ? (
          <div className="og-card p-8 text-center">
            <div className="og-tile w-14 h-14 rounded-2xl mx-auto mb-4"><CalendarDays size={26} /></div>
            <p className="font-semibold og-text mb-1">Create an event first</p>
            <p className="text-sm og-muted mb-5">Guests who register through your QR will show up here.</p>
            <button className="og-ghost" onClick={() => setTab("create")}>Go to Create event</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
                <select className="og-input sm:max-w-[240px]" value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value)} aria-label="Choose event">
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 og-faint" />
                  <input className="og-input" style={{ paddingLeft: "2.3rem" }} placeholder="Search name, phone or code" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="og-ghost" onClick={loadRegs} disabled={loadingRegs}>
                  <RefreshCw size={14} className={loadingRegs ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button className="og-ghost" onClick={toggleOpen}>
                  {active.registration_open ? <Lock size={14} /> : <Unlock size={14} />}
                  {active.registration_open ? "Close registration" : "Reopen"}
                </button>
                <button className="og-ghost" onClick={exportCsv} disabled={!regs.length}>
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>

            <p className="text-sm og-muted">
              {loadingRegs ? "Loading..." : `${shown.length} ${shown.length === 1 ? "registration" : "registrations"}`} &middot; {active.headcount} people confirmed
              {active.capacity ? ` of ${active.capacity}` : ""}
            </p>

            {!loadingRegs && shown.length === 0 ? (
              <div className="og-card overflow-hidden">
                <div className="aspect-[2/1] flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><Users size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">{regs.length ? "No guests match your search" : "No registrations yet"}</p>
                  <p className="og-faint text-xs text-center">{regs.length ? "Try a different word" : "Share the link or QR code. New guests show here."}</p>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {shown.map((r) => (
                  <li key={r.id} className="og-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6" style={{ boxShadow: "none", opacity: r.status === "cancelled" ? 0.55 : 1 }}>
                    <div className="min-w-0 lg:w-56">
                      <p className="font-semibold og-text truncate">{r.name}</p>
                      <p className="text-sm og-muted">{r.phone}</p>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="og-badge" data-free={r.status === "confirmed"} data-paid={r.status === "waitlist"}>{r.status}</span>
                      <span className="og-badge">{r.guests} {r.guests === 1 ? "person" : "people"}</span>
                      <span className="og-badge font-mono">{r.code}</span>
                      {r.message && <p className="og-faint text-xs w-full line-clamp-2">{r.message}</p>}
                      {(active.custom_fields || []).map((f) =>
                        r.answers?.[f.id] ? (
                          <p key={f.id} className="og-faint text-xs w-full"><span className="og-muted">{f.label}:</span> {r.answers[f.id]}</p>
                        ) : null,
                      )}
                    </div>
                    <p className="text-xs og-faint lg:w-32 lg:text-right">{fmt(r.created_at)}</p>
                    <div className="flex flex-wrap gap-2">
                      <a className="og-ghost" href={`tel:${r.phone.replace(/\s/g, "")}`} aria-label={`Call ${r.name}`}><Phone size={14} />Call</a>
                      <a className="og-ghost" href={waLink(r.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${r.name}`}><MessageCircle size={14} />WhatsApp</a>
                      {r.status !== "confirmed" && <button className="og-ghost" onClick={() => setStatus(r.id, "confirmed")}>Confirm</button>}
                      {r.status !== "cancelled" && <button className="og-ghost" onClick={() => setStatus(r.id, "cancelled")}>Cancel</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}

function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(",");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: head.match(/:(.*?);/)?.[1] ?? "image/png" });
}