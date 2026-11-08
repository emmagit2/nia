import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { CalendarClock, Check, Copy, Download, ImageDown, Lock, MessageCircle, Phone, QrCode, RefreshCw, Search, Unlock, Users } from "lucide-react";
import FieldBuilder, { type CustomField } from "./FieldBuilder";
import QrOnDesign from "./QrOnDesign";
import { Label, dataUrlToBlob, prettyDate, saveBlob, waLink } from "./toolUtils";

/* Booking and appointments tool for DashboardPage. Uses the og-* styles that DashboardPage already defines. */

interface PageRow {
  id: string; slug: string; business_name: string; headline: string; services: string[]; days: number[];
  open_time: string; close_time: string; slot_minutes: number; max_per_slot: number; advance_days: number;
  custom_fields: CustomField[]; is_active: boolean; upcoming: number;
}
interface Appt {
  id: string; name: string; phone: string; service: string; date: string; time: string; message: string;
  answers: Record<string, string>; status: "confirmed" | "done" | "cancelled"; code: string; created_at: string;
}
type Tab = "setup" | "place" | "appointments";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_LENGTHS = [15, 20, 30, 45, 60, 90, 120, 180];
const prettyTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
};

export default function BookingTool({ lastDesign = null }: { lastDesign?: string | null }) {
  const { getToken } = useAuth();
  const tokenFn = useRef(getToken);
  tokenFn.current = getToken;

  const [tab, setTab] = useState<Tab>("setup");
  const [pages, setPages] = useState<PageRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // new booking page
  const [bName, setBName] = useState("");
  const [headline, setHeadline] = useState("Pick a day and time that works for you.");
  const [servicesText, setServicesText] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [openT, setOpenT] = useState("09:00");
  const [closeT, setCloseT] = useState("18:00");
  const [slotMin, setSlotMin] = useState("60");
  const [maxPer, setMaxPer] = useState("1");
  const [advance, setAdvance] = useState("30");
  const [fields, setFields] = useState<CustomField[]>([]);

  // appointments
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");

  const active = pages.find((p) => p.id === activeId) ?? null;
  const link = active ? `${window.location.origin}/b/${active.slug}` : "";

  const api = useCallback(async <T,>(method: "get" | "post" | "patch", url: string, data?: unknown, blob?: boolean): Promise<T> => {
    const token = await tokenFn.current();
    const res = await axios.request<T>({ method, url, data, headers: { Authorization: `Bearer ${token}` }, responseType: blob ? "blob" : "json" });
    return res.data;
  }, []);

  const loadPages = useCallback(async () => {
    const d = await api<{ pages?: PageRow[] }>("get", "/api/bookings");
    if (!Array.isArray(d?.pages)) throw new Error("bad response");
    setPages(d.pages);
    return d.pages;
  }, [api]);

  useEffect(() => {
    loadPages()
      .then((l) => setActiveId((id) => id ?? l[0]?.id ?? null))
      .catch(() => setErr("Could not reach the server. Run the app with netlify dev (not npm run dev), then refresh."));
  }, [loadPages]);

  useEffect(() => {
    if (!link) return setQrUrl(null);
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(link, { width: 720, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0A2E1E", light: "#FFFFFF" } }).then((u) => live && setQrUrl(u)),
    );
    return () => { live = false; };
  }, [link]);

  const loadAppts = useCallback(async () => {
    if (!activeId) return setAppts([]);
    setLoadingAppts(true);
    try {
      const d = await api<{ appointments: Appt[] }>("get", `/api/bookings/${activeId}/appointments`);
      setAppts(Array.isArray(d?.appointments) ? d.appointments : []);
    } catch {
      setErr("Could not load appointments. Try again.");
    } finally {
      setLoadingAppts(false);
    }
  }, [api, activeId]);

  useEffect(() => { if (tab === "appointments") loadAppts(); }, [tab, loadAppts]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ page: PageRow }>("post", "/api/bookings", {
        business_name: bName, headline,
        services: servicesText.split(",").map((s) => s.trim()).filter(Boolean),
        days, open_time: openT, close_time: closeT, slot_minutes: Number(slotMin),
        max_per_slot: Number(maxPer), advance_days: Number(advance), custom_fields: fields,
      });
      setPages((l) => [d.page, ...l]);
      setActiveId(d.page.id);
      setBName("");
      setServicesText("");
      setFields([]);
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not create the booking page." : "Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!active) return;
    try {
      await api("patch", `/api/bookings/${active.id}`, { is_active: !active.is_active });
      await loadPages();
    } catch {
      setErr("Could not update the booking page.");
    }
  };

  const setStatus = async (aid: string, status: Appt["status"]) => {
    if (!active) return;
    try {
      await api("patch", `/api/bookings/${active.id}/appointments/${aid}`, { status });
      await Promise.all([loadAppts(), loadPages()]);
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not update." : "Check your connection.");
    }
  };

  const exportCsv = async () => {
    if (!active) return;
    try {
      const blob = await api<Blob>("get", `/api/bookings/${active.id}/export.csv`, undefined, true);
      saveBlob(new Blob(["\uFEFF", blob], { type: "text/csv;charset=utf-8" }), `twomindesign_${active.slug}_appointments.csv`);
    } catch {
      setErr("Could not export. Try again.");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const today = new Date().toLocaleDateString("en-CA");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return appts
      .filter((a) => (filter === "all" ? true : a.status === "confirmed" && a.date >= today))
      .filter((a) => !t || [a.name, a.phone, a.code, a.service].some((v) => (v ?? "").toLowerCase().includes(t)))
      // upcoming reads best soonest first; "all" newest first
      .sort((a, b) => (filter === "upcoming" ? (a.date + a.time).localeCompare(b.date + b.time) : (b.date + b.time).localeCompare(a.date + a.time)));
  }, [appts, q, filter, today]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "setup", label: "Set up" },
    { id: "place", label: "Put QR on a design" },
    { id: "appointments", label: "Appointments" },
  ];

  const needPage = (
    <div className="og-card p-8 text-center">
      <div className="og-tile w-14 h-14 rounded-2xl mx-auto mb-4"><QrCode size={26} /></div>
      <p className="font-semibold og-text mb-1">Create a booking page first</p>
      <p className="text-sm og-muted mb-5">Customers scan the QR, pick a day and time, and you see the appointment here.</p>
      <button className="og-ghost" onClick={() => setTab("setup")}>Go to Set up</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 og-in">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Booking and appointments">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} data-active={tab === t.id} onClick={() => setTab(t.id)} className="og-chip og-focus !py-2 !px-4 !text-sm">
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>{err}</div>
      )}

      {tab === "setup" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-2 flex flex-col gap-4 min-w-0">
            <div>
              <Label>Business name *</Label>
              <input className="og-input" placeholder="e.g: Emeka's Barbershop" value={bName} onChange={(e) => setBName(e.target.value)} maxLength={80} disabled={busy} />
            </div>
            <div>
              <Label>What customers see</Label>
              <input className="og-input" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={140} disabled={busy} />
            </div>
            <div>
              <Label note="(optional)">Services they can pick</Label>
              <input className="og-input" placeholder="Haircut, Beard trim, Home service" value={servicesText} onChange={(e) => setServicesText(e.target.value)} disabled={busy} />
              <p className="text-xs og-faint mt-1.5">Separate with commas.</p>
            </div>
            <div>
              <Label>Open days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" className="og-chip og-focus" data-active={days.includes(i)} aria-pressed={days.includes(i)} onClick={() => setDays((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]))}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Opens</Label>
                <input className="og-input" type="time" value={openT} onChange={(e) => setOpenT(e.target.value)} disabled={busy} />
              </div>
              <div>
                <Label>Closes</Label>
                <input className="og-input" type="time" value={closeT} onChange={(e) => setCloseT(e.target.value)} disabled={busy} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Each appointment</Label>
                <select className="og-input" value={slotMin} onChange={(e) => setSlotMin(e.target.value)} disabled={busy}>
                  {SLOT_LENGTHS.map((m) => (<option key={m} value={m}>{m} minutes</option>))}
                </select>
              </div>
              <div>
                <Label>People per time</Label>
                <input className="og-input" type="number" min={1} max={20} value={maxPer} onChange={(e) => setMaxPer(e.target.value)} disabled={busy} />
              </div>
              <div>
                <Label>Book ahead</Label>
                <select className="og-input" value={advance} onChange={(e) => setAdvance(e.target.value)} disabled={busy}>
                  {[7, 14, 30, 60, 90].map((d) => (<option key={d} value={d}>{d} days</option>))}
                </select>
              </div>
            </div>
            <div>
              <Label note="(optional)">Extra questions for customers</Label>
              <FieldBuilder value={fields} onChange={setFields} />
            </div>
            <button className="og-btn" onClick={create} disabled={busy || !bName.trim() || !days.length}>
              {busy ? (<><span className="og-spin" />Creating...</>) : (<><span className="og-btn-icon"><CalendarClock size={16} /></span>Create booking page and QR</>)}
            </button>
          </section>

          <section className="xl:col-span-3 min-w-0 flex flex-col gap-4">
            {pages.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {pages.map((p) => (
                  <button key={p.id} className="og-chip og-focus" data-active={p.id === activeId} onClick={() => setActiveId(p.id)}>{p.business_name}</button>
                ))}
              </div>
            )}

            {active ? (
              <div className="og-card p-5 sm:p-6 flex flex-col sm:flex-row gap-6 og-in">
                <div className="shrink-0 mx-auto sm:mx-0">
                  <div className="rounded-2xl bg-white p-3 border og-divider" style={{ width: 220 }}>
                    {qrUrl ? <img src={qrUrl} alt={`QR code for ${active.business_name}`} className="w-full block" /> : <div className="aspect-square flex items-center justify-center"><span className="og-spin og-spin-lg" /></div>}
                  </div>
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-4">
                  <div>
                    <p className="font-display font-bold text-lg og-text">{active.business_name}</p>
                    <p className="text-sm og-muted">
                      {active.days.map((d) => DAYS[d]).join(", ")} &middot; {prettyTime(active.open_time)} to {prettyTime(active.close_time)} &middot; {active.slot_minutes} min each
                    </p>
                    <p className="text-sm og-faint mt-1">{active.upcoming} upcoming &middot; {active.is_active ? "Taking bookings" : "Paused"}</p>
                  </div>
                  <div className="flex items-center gap-2 og-input" style={{ padding: ".5rem .5rem .5rem .9rem" }}>
                    <span className="text-sm og-muted truncate flex-1">{link}</span>
                    <button onClick={copyLink} className="og-ghost shrink-0">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="og-ghost" onClick={() => setTab("place")}><ImageDown size={14} />Put it on a design</button>
                    <button className="og-ghost" disabled={!qrUrl} onClick={() => qrUrl && saveBlob(dataUrlToBlob(qrUrl), `twomindesign_booking_${active.slug}.png`)}><Download size={14} />Download QR</button>
                    <button className="og-ghost" onClick={() => setTab("appointments")}><Users size={14} />See appointments</button>
                    <button className="og-ghost" onClick={toggleActive}>{active.is_active ? <Lock size={14} /> : <Unlock size={14} />}{active.is_active ? "Pause bookings" : "Resume bookings"}</button>
                  </div>
                  <p className="text-xs og-faint">Customers see only the times that are still free. A time that fills up disappears automatically.</p>
                </div>
              </div>
            ) : (
              <div className="og-card overflow-hidden">
                <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><QrCode size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">Your booking QR will appear here</p>
                  <p className="og-faint text-xs text-center">Fill the form and create your booking page</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "place" && (!active ? needPage : <QrOnDesign link={link} defaultCaption="Scan to book" lastDesign={lastDesign} />)}

      {tab === "appointments" &&
        (!active ? (
          needPage
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
                <select className="og-input sm:max-w-[240px]" value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value)} aria-label="Choose booking page">
                  {pages.map((p) => (<option key={p.id} value={p.id}>{p.business_name}</option>))}
                </select>
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 og-faint" />
                  <input className="og-input" style={{ paddingLeft: "2.3rem" }} placeholder="Search name, phone, service or code" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="og-chip og-focus" data-active={filter === "upcoming"} onClick={() => setFilter("upcoming")}>Upcoming</button>
                <button className="og-chip og-focus" data-active={filter === "all"} onClick={() => setFilter("all")}>All</button>
                <button className="og-ghost" onClick={loadAppts} disabled={loadingAppts}><RefreshCw size={14} className={loadingAppts ? "animate-spin" : ""} />Refresh</button>
                <button className="og-ghost" onClick={exportCsv} disabled={!appts.length}><Download size={14} />Export CSV</button>
              </div>
            </div>

            <p className="text-sm og-muted">{loadingAppts ? "Loading..." : `${shown.length} ${shown.length === 1 ? "appointment" : "appointments"}`}</p>

            {!loadingAppts && shown.length === 0 ? (
              <div className="og-card overflow-hidden">
                <div className="aspect-[2/1] flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><CalendarClock size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">{appts.length ? "Nothing matches" : "No appointments yet"}</p>
                  <p className="og-faint text-xs text-center">{appts.length ? "Try All, or a different word" : "Share the link or QR code. New bookings show here."}</p>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {shown.map((a) => (
                  <li key={a.id} className="og-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6" style={{ boxShadow: "none", opacity: a.status === "cancelled" ? 0.55 : 1 }}>
                    <div className="min-w-0 lg:w-52">
                      <p className="font-semibold og-text truncate">{a.name}</p>
                      <p className="text-sm og-muted">{a.phone}</p>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="og-badge" data-paid="true">{prettyDate(a.date)}, {prettyTime(a.time)}</span>
                      {a.service && <span className="og-badge">{a.service}</span>}
                      <span className="og-badge" data-free={a.status === "confirmed" || a.status === "done"}>{a.status}</span>
                      <span className="og-badge font-mono">{a.code}</span>
                      {a.message && <p className="og-faint text-xs w-full line-clamp-2">{a.message}</p>}
                      {(active.custom_fields || []).map((f) =>
                        a.answers?.[f.id] ? <p key={f.id} className="og-faint text-xs w-full"><span className="og-muted">{f.label}:</span> {a.answers[f.id]}</p> : null,
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a className="og-ghost" href={`tel:${a.phone.replace(/\s/g, "")}`} aria-label={`Call ${a.name}`}><Phone size={14} />Call</a>
                      <a className="og-ghost" href={waLink(a.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${a.name}`}><MessageCircle size={14} />WhatsApp</a>
                      {a.status === "confirmed" && <button className="og-ghost" onClick={() => setStatus(a.id, "done")}>Done</button>}
                      {a.status !== "confirmed" && <button className="og-ghost" onClick={() => setStatus(a.id, "confirmed")}>Reopen</button>}
                      {a.status !== "cancelled" && <button className="og-ghost" onClick={() => setStatus(a.id, "cancelled")}>Cancel</button>}
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