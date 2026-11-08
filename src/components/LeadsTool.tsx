import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Check, Copy, Download, FileSpreadsheet, ImageDown, MapPin, MessageCircle, Phone, QrCode, RefreshCw, Search, Trash2, Users } from "lucide-react";
import FieldBuilder, { type CustomField } from "./FieldBuilder";
import QrOnDesign from "./QrOnDesign";
import { Label, dataUrlToBlob, saveBlob, waLink } from "./toolUtils";

/* Client leads tool for DashboardPage. Uses the og-* styles that DashboardPage already defines. */

interface Campaign {
  id: string; slug: string; business_name: string; headline: string; services?: string[];
  custom_fields?: CustomField[]; lead_count?: number;
}
interface Lead {
  id: string; campaign_id: string; name: string; phone: string; location_text?: string | null;
  lat?: number | null; lng?: number | null; interest?: string | null; message?: string | null;
  answers?: Record<string, string>; created_at: string;
}
type Tab = "setup" | "place" | "leads";

const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const mapLink = (l: Lead) =>
  l.lat != null && l.lng != null
    ? `https://www.google.com/maps?q=${l.lat},${l.lng}`
    : l.location_text
      ? `https://www.google.com/maps/search/${encodeURIComponent(l.location_text)}`
      : null;

// Stops spreadsheet formulas typed by a stranger from running when you open the export
const safeCell = (v: unknown) => {
  const s = String(v ?? "");
  return !/^\+?[\d\s()-]+$/.test(s) && /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
};
const csvCell = (v: unknown) => `"${safeCell(v).replace(/"/g, '""')}"`;

export default function LeadsTool({ lastDesign = null }: { lastDesign?: string | null }) {
  const { getToken } = useAuth();
  const tokenFn = useRef(getToken);
  tokenFn.current = getToken;

  const [tab, setTab] = useState<Tab>("setup");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // new campaign
  const [bName, setBName] = useState("");
  const [headline, setHeadline] = useState("Interested in our service? Leave your details and we will contact you.");
  const [services, setServices] = useState("");
  const [fields, setFields] = useState<CustomField[]>([]);

  // leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadFilter, setLeadFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  const active = campaigns.find((c) => c.id === activeId) ?? null;
  const link = active ? `${window.location.origin}/c/${active.slug}` : "";

  const api = useCallback(async <T,>(method: "get" | "post" | "delete", url: string, data?: unknown): Promise<T> => {
    const token = await tokenFn.current();
    const res = await axios.request<T>({ method, url, data, headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  }, []);

  useEffect(() => {
    api<{ campaigns?: Campaign[] }>("get", "/api/lead-campaigns")
      .then((d) => {
        if (!Array.isArray(d?.campaigns)) throw new Error("bad response");
        setCampaigns(d.campaigns);
        setActiveId((id) => id ?? d.campaigns![0]?.id ?? null);
      })
      .catch(() => setErr("Could not reach the server. Run the app with netlify dev (not npm run dev), then refresh."));
  }, [api]);

  useEffect(() => {
    if (!link) return setQrUrl(null);
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(link, { width: 720, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0A2E1E", light: "#FFFFFF" } }).then((u) => live && setQrUrl(u)),
    );
    return () => { live = false; };
  }, [link]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const d = await api<{ leads: Lead[] }>("get", `/api/leads${leadFilter !== "all" ? `?campaignId=${leadFilter}` : ""}`);
      setLeads(Array.isArray(d?.leads) ? d.leads : []);
    } catch {
      setErr("Could not load your leads. Try again.");
    } finally {
      setLoadingLeads(false);
    }
  }, [api, leadFilter]);

  useEffect(() => { if (tab === "leads") loadLeads(); }, [tab, loadLeads]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ campaign: Campaign }>("post", "/api/lead-campaigns", {
        businessName: bName.trim(),
        headline: headline.trim(),
        services: services.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
        custom_fields: fields,
      });
      if (!d?.campaign) throw new Error("bad response");
      setCampaigns((c) => [d.campaign, ...c]);
      setActiveId(d.campaign.id);
      setBName("");
      setServices("");
      setFields([]);
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.error ?? "Could not create the campaign." : "Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const removeLead = async (id: string) => {
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    try {
      await api("delete", `/api/leads/${id}`);
      setLeads((ls) => ls.filter((l) => l.id !== id));
    } catch {
      setErr("Could not delete that lead.");
    }
  };

  const campaignOf = (id: string) => campaigns.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return leads.filter((l) => !t || [l.name, l.phone, l.location_text, l.interest].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [leads, search]);

  // one row per lead, with a column for each custom question
  const exportRows = () =>
    filtered.map((l) => {
      const row: Record<string, string | number> = {
        Name: l.name, Phone: l.phone, Location: l.location_text ?? "", Latitude: l.lat ?? "", Longitude: l.lng ?? "",
        Interest: l.interest ?? "", Message: l.message ?? "", Campaign: campaignOf(l.campaign_id)?.business_name ?? "",
        Date: new Date(l.created_at).toLocaleString("en-NG"),
      };
      (campaignOf(l.campaign_id)?.custom_fields ?? []).forEach((f) => { row[f.label || f.id] = l.answers?.[f.id] ?? ""; });
      return row;
    });

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    const rows = exportRows();
    if (!rows.length) return;
    const head = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const body = rows.map((r) => head.map((k) => csvCell(r[k])).join(","));
    saveBlob(new Blob(["\uFEFF" + [head.join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" }), `twomindesign_leads_${stamp()}.csv`);
  };

  const exportXlsx = async () => {
    const rows = exportRows();
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const safe = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? safeCell(v) : v])));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(safe), "Leads");
    XLSX.writeFile(wb, `twomindesign_leads_${stamp()}.xlsx`);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "setup", label: "Create QR" },
    { id: "place", label: "Put QR on a design" },
    { id: "leads", label: "Leads" },
  ];

  const needCampaign = (
    <div className="og-card p-8 text-center">
      <div className="og-tile w-14 h-14 rounded-2xl mx-auto mb-4"><QrCode size={26} /></div>
      <p className="font-semibold og-text mb-1">Create a QR campaign first</p>
      <p className="text-sm og-muted mb-5">Your QR code opens a short form where interested customers leave their details.</p>
      <button className="og-ghost" onClick={() => setTab("setup")}>Go to Create QR</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 og-in">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Client leads">
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
              <Label>What customers see on the form</Label>
              <textarea className="og-input resize-none" rows={3} value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={busy} maxLength={140} />
            </div>
            <div>
              <Label note="(optional)">Services they can pick</Label>
              <input className="og-input" placeholder="Haircut, Beard trim, Home service" value={services} onChange={(e) => setServices(e.target.value)} disabled={busy} />
              <p className="text-xs og-faint mt-1.5">Separate with commas.</p>
            </div>
            <div>
              <Label note="(optional)">Extra questions for customers</Label>
              <FieldBuilder value={fields} onChange={setFields} />
            </div>
            <button className="og-btn" onClick={create} disabled={busy || !bName.trim()}>
              {busy ? (<><span className="og-spin" />Creating...</>) : (<><span className="og-btn-icon"><QrCode size={16} /></span>Create QR campaign</>)}
            </button>
          </section>

          <section className="xl:col-span-3 min-w-0 flex flex-col gap-4">
            {campaigns.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {campaigns.map((c) => (
                  <button key={c.id} className="og-chip og-focus" data-active={c.id === activeId} onClick={() => setActiveId(c.id)}>{c.business_name}</button>
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
                    <p className="text-sm og-muted">{active.headline}</p>
                    <p className="text-sm og-faint mt-1">{active.lead_count ?? 0} {active.lead_count === 1 ? "lead" : "leads"}</p>
                  </div>
                  <div className="flex items-center gap-2 og-input" style={{ padding: ".5rem .5rem .5rem .9rem" }}>
                    <span className="text-sm og-muted truncate flex-1">{link}</span>
                    <button onClick={copyLink} className="og-ghost shrink-0">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="og-ghost" onClick={() => setTab("place")}><ImageDown size={14} />Put it on a design</button>
                    <button className="og-ghost" disabled={!qrUrl} onClick={() => qrUrl && saveBlob(dataUrlToBlob(qrUrl), `twomindesign_qr_${active.slug}.png`)}><Download size={14} />Download QR</button>
                    <button className="og-ghost" onClick={() => { setLeadFilter(active.id); setTab("leads"); }}><Users size={14} />See leads{active.lead_count ? ` (${active.lead_count})` : ""}</button>
                  </div>
                  <p className="text-xs og-faint">Customers scan the code, fill a form that takes about 30 seconds, and you see their name, phone and location under Leads.</p>
                </div>
              </div>
            ) : (
              <div className="og-card overflow-hidden">
                <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><QrCode size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">Your QR code will appear here</p>
                  <p className="og-faint text-xs text-center">Create a campaign to get your link and QR</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "place" && (!active ? needCampaign : <QrOnDesign link={link} defaultCaption="Scan to get a quote" lastDesign={lastDesign} />)}

      {tab === "leads" &&
        (campaigns.length === 0 ? (
          needCampaign
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
                <select className="og-input sm:max-w-[240px]" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} aria-label="Filter by campaign">
                  <option value="all">All campaigns</option>
                  {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.business_name}</option>))}
                </select>
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 og-faint" />
                  <input className="og-input" style={{ paddingLeft: "2.3rem" }} placeholder="Search name, phone or area" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="og-ghost" onClick={loadLeads} disabled={loadingLeads}><RefreshCw size={14} className={loadingLeads ? "animate-spin" : ""} />Refresh</button>
                <button className="og-ghost" onClick={exportCsv} disabled={!filtered.length}><Download size={14} />CSV</button>
                <button className="og-ghost" onClick={exportXlsx} disabled={!filtered.length}><FileSpreadsheet size={14} />Export to Excel</button>
              </div>
            </div>

            <p className="text-sm og-muted">{loadingLeads ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "lead" : "leads"}`}</p>

            {!loadingLeads && filtered.length === 0 ? (
              <div className="og-card overflow-hidden">
                <div className="aspect-[2/1] flex flex-col items-center justify-center gap-3 p-6">
                  <div className="og-tile w-16 h-16 rounded-2xl"><Phone size={28} /></div>
                  <p className="og-muted text-sm text-center font-medium">{leads.length ? "No leads match your search" : "No leads yet"}</p>
                  <p className="og-faint text-xs text-center">{leads.length ? "Try a different word" : "Put your QR on a design and share it. New leads show here."}</p>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((l) => {
                  const map = mapLink(l);
                  return (
                    <li key={l.id} className="og-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6" style={{ boxShadow: "none" }}>
                      <div className="min-w-0 lg:w-56">
                        <p className="font-semibold og-text truncate">{l.name}</p>
                        <p className="text-sm og-muted">{l.phone}</p>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-sm">
                        {(l.location_text || map) && (
                          <p className="flex items-center gap-1.5 og-muted w-full">
                            <MapPin size={14} className="shrink-0 og-accent-text" />
                            {map ? (
                              <a href={map} target="_blank" rel="noreferrer" className="hover:underline truncate">{l.location_text || "Shared location"}{l.lat != null ? " (exact)" : ""}</a>
                            ) : (
                              <span className="truncate">{l.location_text}</span>
                            )}
                          </p>
                        )}
                        {l.interest && <span className="og-badge">{l.interest}</span>}
                        {l.message && <p className="og-faint text-xs w-full line-clamp-2">{l.message}</p>}
                        {(campaignOf(l.campaign_id)?.custom_fields ?? []).map((f) =>
                          l.answers?.[f.id] ? <p key={f.id} className="og-faint text-xs w-full"><span className="og-muted">{f.label}:</span> {l.answers[f.id]}</p> : null,
                        )}
                      </div>
                      <p className="text-xs og-faint lg:w-32 lg:text-right">{fmtDate(l.created_at)}</p>
                      <div className="flex flex-wrap gap-2">
                        <a className="og-ghost" href={`tel:${l.phone.replace(/\s/g, "")}`} aria-label={`Call ${l.name}`}><Phone size={14} />Call</a>
                        <a className="og-ghost" href={waLink(l.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${l.name}`}><MessageCircle size={14} />WhatsApp</a>
                        <button className="og-ghost" onClick={() => removeLead(l.id)} aria-label={`Delete ${l.name}`} style={{ padding: ".5rem" }}><Trash2 size={14} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}