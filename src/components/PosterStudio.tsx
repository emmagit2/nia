import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Sparkles, SlidersHorizontal, Wand2, ArrowLeft, Plus, Copy, Trash2, ImagePlus } from "lucide-react";

/* src/components/PosterStudio.tsx
   Simple mode: one box + tappable questions. Advanced mode: full control.
   Claude returns the layout as boxes; the editor lets the user change every box.
   Credits are always calculated here in code, never by Claude. */

const LAYOUT_COST = 1; // credits for one Claude layout (change here)
const CRED = { low: 1, medium: 2, high: 3 } as const; // credits per generated image
type Quality = keyof typeof CRED;

const SIZES: Record<string, [number, number]> = {
  Poster: [1080, 1350], Flyer: [1080, 1440], "Social post": [1080, 1080], Story: [1080, 1920], Banner: [1500, 500],
};
const STYLES = ["Clean", "Bold", "Fun", "Luxury"];
const REF_MODES = ["Use reference", "Create my own", "Mix"] as const;
const KEEP: [string, string][] = [
  ["headline", "Headline style"], ["cards", "Info cards"], ["photo", "Photo position"], ["footer", "Footer"], ["colors", "Colours"],
];

export interface El {
  id: string;
  type: "text" | "shape" | "pill" | "box" | "imageSlot";
  x: number; y: number; w: number; h: number;
  text?: string; size?: number; weight?: number; color?: string; fill?: string;
  radius?: string; opacity?: number; hint?: string; gen?: boolean; quality?: Quality; img?: string;
}
export interface PosterLayout { summary: string; canvas: { w: number; h: number }; colors: { main: string; accent: string }; elements: El[] }
interface Plan { understood: Record<string, string>; questions: { field: string; label: string; options: string[] }[] }

interface Props {
  charge: (cost: number) => Promise<boolean>;
  refund: (amount: number) => Promise<void>;
  /** Optional: your Ideogram call. Return an image URL or data URL, or null on failure. */
  generateImage?: (hint: string, quality: Quality, aspect: number) => Promise<string | null>;
}

async function shrink(file: File) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return { media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.8).split(",")[1] };
}

/** Keep every box inside the canvas and give each one an id. */
function tidy(l: PosterLayout): PosterLayout {
  const { w, h } = l.canvas;
  return {
    ...l,
    elements: l.elements.map((e, i) => {
      const ew = Math.min(Math.max(30, Number(e.w) || 100), w * 1.2);
      const eh = Math.min(Math.max(20, Number(e.h) || 50), h * 1.2);
      return { ...e, id: e.id || `e${i}`, w: ew, h: eh, x: Math.round(Math.min(Math.max(Number(e.x) || 0, -ew / 2), w - ew / 2)), y: Math.round(Math.min(Math.max(Number(e.y) || 0, -eh / 2), h - eh / 2)) };
    }),
  };
}

function Chips({ value, options, onPick }: { value: string; options: readonly string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" data-active={value === o} onClick={() => onPick(o)} className="og-chip og-focus">{o}</button>
      ))}
    </div>
  );
}
const Lab = ({ children }: { children: React.ReactNode }) => <label className="block text-sm font-semibold og-text mb-2">{children}</label>;

export default function PosterStudio({ charge, refund, generateImage }: Props) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [shape, setShape] = useState("Poster");
  const [sentence, setSentence] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // advanced
  const [biz, setBiz] = useState("");
  const [style, setStyle] = useState("Clean");
  const [brand, setBrand] = useState("");
  const [refMode, setRefMode] = useState<(typeof REF_MODES)[number]>("Create my own");
  const [keep, setKeep] = useState<string[]>([]);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [headline, setHeadline] = useState("");
  const [sub, setSub] = useState("");
  const [details, setDetails] = useState("");
  const [brief, setBrief] = useState("");
  // result
  const [layout, setLayout] = useState<PosterLayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const post = async (body: Record<string, unknown>) =>
    (await axios.post("/api/poster-layout", body, { headers: { Authorization: `Bearer ${await getToken()}` }, timeout: 60000 })).data;

  const [cw, ch] = SIZES[shape];

  const build = async (body: Record<string, unknown>) => {
    setErr(null);
    if (!(await charge(LAYOUT_COST))) return;
    setBusy(true);
    try {
      const r = await post({ action: "layout", canvas: { w: cw, h: ch }, ...body });
      if (!r.data?.elements?.length) throw new Error("empty");
      setLayout(tidy({ ...r.data, canvas: { w: cw, h: ch } }));
    } catch {
      await refund(LAYOUT_COST);
      setErr("Could not design that. Your credit was returned. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const understand = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await post({ action: "plan", sentence });
      setPlan(r.data); setAnswers({});
    } catch { setErr("Could not read that. Try again."); }
    finally { setBusy(false); }
  };

  const buildAdvanced = async () =>
    build({
      mode: "advanced", business: biz, type: shape, style, brand: brand || undefined, refMode, keep, brief,
      text: { headline, sub, details },
      reference: refMode !== "Create my own" && refFile ? await shrink(refFile) : undefined,
    });

  if (layout) return <Editor layout={layout} setLayout={setLayout as (f: (l: PosterLayout) => PosterLayout) => void} onBack={() => setLayout(null)} charge={charge} refund={refund} generateImage={generateImage} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button type="button" className="og-chip og-focus flex items-center gap-1.5" data-active={mode === "simple"} onClick={() => setMode("simple")}><Wand2 size={14} />Simple</button>
        <button type="button" className="og-chip og-focus flex items-center gap-1.5" data-active={mode === "advanced"} onClick={() => setMode("advanced")}><SlidersHorizontal size={14} />Advanced</button>
      </div>

      <div><Lab>Shape</Lab><Chips value={shape} options={Object.keys(SIZES)} onPick={setShape} /></div>

      {mode === "simple" ? (
        <>
          <div>
            <Lab>What do you want to design?</Lab>
            <textarea className="og-input resize-none" rows={3} maxLength={400} value={sentence} disabled={busy}
              placeholder="e.g: a one-day sales flyer for my phone shop in Ikeja" onChange={(e) => { setSentence(e.target.value); setPlan(null); }} />
          </div>

          {plan && (
            <div className="og-card p-3.5 flex flex-col gap-3 og-in" style={{ boxShadow: "none", borderRadius: 18 }}>
              <p className="text-xs og-faint">I understood: {Object.values(plan.understood).filter(Boolean).join(" · ") || "your idea"}</p>
              {plan.questions.slice(0, 3).map((q) => (
                <div key={q.field}><p className="text-xs og-muted mb-1.5">{q.label}</p>
                  <Chips value={answers[q.field] ?? ""} options={q.options} onPick={(v) => setAnswers((a) => ({ ...a, [q.field]: v }))} /></div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!plan ? (
              <button className="og-btn" disabled={busy || sentence.trim().length < 5} onClick={understand}>{busy ? <span className="og-spin" /> : <Sparkles size={16} />} Next</button>
            ) : (
              <button className="og-btn" disabled={busy} onClick={() => build({ mode: "simple", sentence, answers, understood: plan.understood })}>
                {busy ? <span className="og-spin" /> : <Sparkles size={16} />} Create poster · {LAYOUT_COST} credit
              </button>
            )}
            <button className="og-ghost" disabled={busy || sentence.trim().length < 5} onClick={() => build({ mode: "simple", sentence, answers: {} })}>Just design it for me</button>
          </div>
        </>
      ) : (
        <>
          <div><Lab>Business name *</Lab><input className="og-input" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="e.g: Lagos Fresh Kitchen" disabled={busy} /></div>
          <div><Lab>Style</Lab><Chips value={style} options={STYLES} onPick={setStyle} /></div>
          <div className="flex items-center gap-3">
            <Lab>Brand colour</Lab>
            <input type="color" value={brand || "#2563eb"} onChange={(e) => setBrand(e.target.value)} className="w-10 h-8 rounded-lg border og-divider bg-transparent" />
            {brand && <button type="button" className="og-ghost" onClick={() => setBrand("")}>Let Claude choose</button>}
          </div>
          <div><Lab>Layout</Lab><Chips value={refMode} options={REF_MODES} onPick={(v) => setRefMode(v as (typeof REF_MODES)[number])} /></div>
          {refMode !== "Create my own" && (
            <div className="og-card p-3.5 flex flex-col gap-3 og-in" style={{ boxShadow: "none", borderRadius: 18 }}>
              <label className="og-ghost og-focus w-fit cursor-pointer">
                <ImagePlus size={14} /> {refFile ? refFile.name : "Upload a reference poster"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setRefFile(e.target.files?.[0] ?? null)} />
              </label>
              <p className="text-xs og-faint">Only the layout is copied. Names, logos, photos and wording are replaced with yours.</p>
              {refMode === "Mix" && (
                <div><p className="text-xs og-muted mb-1.5">Keep from the reference:</p>
                  <div className="flex flex-wrap gap-2">
                    {KEEP.map(([k, label]) => (
                      <button key={k} type="button" className="og-chip og-focus" data-active={keep.includes(k)}
                        onClick={() => setKeep((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}>{label}</button>
                    ))}
                  </div></div>
              )}
            </div>
          )}
          <div><Lab>Headline</Lab><input className="og-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g: BIG SALE" disabled={busy} /></div>
          <div><Lab>Short line</Lab><input className="og-input" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g: Up to 30% off all phones" disabled={busy} /></div>
          <div><Lab>Details (date, address, phone)</Lab>
            <textarea className="og-input resize-none" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={"Saturday 10am, Allen Avenue, Ikeja\n0801 234 5678"} disabled={busy} /></div>
          <div><Lab>Anything else for Claude?</Lab><input className="og-input" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g: photo of a phone on the right" disabled={busy} /></div>
          <button className="og-btn" disabled={busy || !biz.trim() || (refMode !== "Create my own" && !refFile)} onClick={buildAdvanced}>
            {busy ? <span className="og-spin" /> : <Sparkles size={16} />} Create poster · {LAYOUT_COST} credit
          </button>
        </>
      )}

      {err && <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>{err}</div>}
    </div>
  );
}

/* ------------------------------- the editor -------------------------------- */

function Editor({ layout, setLayout, onBack, charge, refund, generateImage }: {
  layout: PosterLayout; setLayout: (f: (l: PosterLayout) => PosterLayout) => void; onBack: () => void;
} & Pick<Props, "charge" | "refund" | "generateImage">) {
  const { w: CW, h: CH } = layout.canvas;
  const [sel, setSel] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; rz: boolean; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null);

  const upd = (id: string, p: Partial<El>) => setLayout((l) => ({ ...l, elements: l.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  const el = layout.elements.find((e) => e.id === sel) ?? null;
  const slots = layout.elements.filter((e) => e.type === "imageSlot" && e.gen && !e.img);
  const credits = slots.reduce((n, e) => n + CRED[e.quality ?? "medium"], 0);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (wrap.current?.clientWidth || CW) / CW));
    fit();
    window.addEventListener("resize", fit);
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dx = (ev.clientX - d.sx) / scale, dy = (ev.clientY - d.sy) / scale;
      if (d.rz) upd(d.id, { w: Math.max(40, Math.round(d.w + dx)), h: Math.max(30, Math.round(d.h + dy)) });
      else upd(d.id, { x: Math.round(d.x + dx), y: Math.round(d.y + dy) });
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CW, scale]);

  const add = (e: Omit<El, "id">) => { const id = `n${Date.now()}`; setLayout((l) => ({ ...l, elements: [...l.elements, { ...e, id }] })); setSel(id); };
  const upload = (id: string, f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => upd(id, { img: String(r.result) }); r.readAsDataURL(f); };

  const runImages = async () => {
    if (!generateImage) { setMsg("Connect your image function through the generateImage prop to run this."); setConfirm(false); return; }
    setConfirm(false); setMsg(null);
    for (const s of slots) {
      const cost = CRED[s.quality ?? "medium"];
      if (!(await charge(cost))) break;
      try {
        const url = await generateImage(s.hint ?? "", s.quality ?? "medium", s.w / s.h);
        if (!url) throw new Error("none");
        upd(s.id, { img: url });
      } catch { await refund(cost); setMsg("One image failed. Its credits were returned."); }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="og-ghost" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span className="text-sm og-muted flex-1">{layout.summary}</span>
        {!confirm ? (
          <button type="button" className="og-btn !py-2" disabled={!slots.length} onClick={() => setConfirm(true)}>Generate images · {credits} credits</button>
        ) : (
          <span className="flex items-center gap-2 text-sm">This will use {credits} credits.
            <button type="button" className="og-btn !py-2" onClick={runImages}>Confirm</button>
            <button type="button" className="og-ghost" onClick={() => setConfirm(false)}>Cancel</button></span>
        )}
      </div>
      {msg && <p className="text-xs og-faint">{msg}</p>}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div ref={wrap} className="flex-1 min-w-0 w-full">
          <div style={{ position: "relative", width: CW * scale, height: CH * scale, margin: "0 auto", background: "#fff", borderRadius: 8, overflow: "hidden", touchAction: "none", boxShadow: "0 6px 24px rgba(0,0,0,.18)" }}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: CW, height: CH, transform: `scale(${scale})`, transformOrigin: "0 0" }} onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
              {layout.elements.map((e) => {
                const isSlot = e.type === "imageSlot";
                const filled = e.type === "pill" || e.type === "box";
                return (
                  <div key={e.id}
                    onPointerDown={(ev) => { if ((ev.target as HTMLElement).closest("label,button")) return; ev.preventDefault(); setSel(e.id); drag.current = { id: e.id, rz: (ev.target as HTMLElement).dataset.rz === "1", sx: ev.clientX, sy: ev.clientY, x: e.x, y: e.y, w: e.w, h: e.h }; }}
                    style={{
                      position: "absolute", left: e.x, top: e.y, width: e.w, height: e.h, cursor: "move", userSelect: "none", overflow: isSlot ? "hidden" : "visible",
                      fontSize: e.size ?? 32, fontWeight: e.weight ?? 500, color: e.color ?? "#1B1B1B", lineHeight: 1.05, opacity: e.opacity ?? 1, whiteSpace: "pre-wrap",
                      background: isSlot ? (e.img ? "none" : "rgba(37,99,235,.08)") : e.fill,
                      borderRadius: e.radius ?? (e.type === "pill" ? 999 : filled ? 14 : 0),
                      border: isSlot && !e.img ? "4px dashed #2563EB" : undefined,
                      display: filled || isSlot ? "flex" : "block", alignItems: "center", justifyContent: "center", flexDirection: isSlot ? "column" : "row", textAlign: filled || isSlot ? "center" : "left",
                      outline: sel === e.id ? "3px solid #2563EB" : "none", outlineOffset: 2, zIndex: sel === e.id ? 50 : 1,
                    }}>
                    {isSlot ? (e.img ? <img src={e.img} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: e.w < 200 ? 16 : 26, fontWeight: 700, color: "#1E40AF", padding: 12 }}>{e.hint || "Add image here"}</span>) : e.text}
                    {sel === e.id && <div data-rz="1" style={{ position: "absolute", right: -14, bottom: -14, width: 28, height: 28, borderRadius: "50%", background: "#2563EB", border: "3px solid #fff", cursor: "nwse-resize" }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="og-card p-3.5 flex flex-col gap-3 w-full lg:w-72 shrink-0" style={{ boxShadow: "none", borderRadius: 18 }}>
          {el ? (
            <>
              {el.type === "imageSlot" ? (
                <>
                  <p className="text-xs og-muted">{el.hint}</p>
                  <label className="og-ghost og-focus w-fit cursor-pointer"><ImagePlus size={14} /> Upload image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(el.id, e.target.files?.[0])} /></label>
                  <label className="flex items-center gap-2 text-xs og-muted"><input type="checkbox" checked={!!el.gen} onChange={(e) => upd(el.id, { gen: e.target.checked })} /> Generate with AI</label>
                  {el.gen && <Chips value={el.quality ?? "medium"} options={["low", "medium", "high"]} onPick={(v) => upd(el.id, { quality: v as Quality })} />}
                  {el.img && <button type="button" className="og-ghost w-fit" onClick={() => upd(el.id, { img: undefined })}>Remove image</button>}
                </>
              ) : (
                <>
                  {el.type !== "shape" && <textarea className="og-input resize-none" rows={3} value={el.text ?? ""} onChange={(e) => upd(el.id, { text: e.target.value })} />}
                  {el.type !== "shape" && <div className="flex items-center gap-2"><span className="text-xs og-faint">Size</span>
                    <input type="number" className="og-input !py-1" value={el.size ?? 32} min={8} max={400} onChange={(e) => upd(el.id, { size: Number(e.target.value) })} />
                    <input type="color" aria-label="Text colour" value={/^#[0-9a-f]{6}$/i.test(el.color ?? "") ? el.color : "#1b1b1b"} onChange={(e) => upd(el.id, { color: e.target.value })} className="w-9 h-8 bg-transparent border-0" /></div>}
                  {el.type !== "text" && <div className="flex items-center gap-2"><span className="text-xs og-faint">Box colour</span>
                    <input type="color" aria-label="Box colour" value={/^#[0-9a-f]{6}$/i.test(el.fill ?? "") ? el.fill : "#2563eb"} onChange={(e) => upd(el.id, { fill: e.target.value })} className="w-9 h-8 bg-transparent border-0" /></div>}
                </>
              )}
              <div className="flex gap-2">
                <button type="button" className="og-ghost" onClick={() => { const { id: _i, ...rest } = el; add({ ...rest, x: el.x + 30, y: el.y + 30 }); }}><Copy size={14} /> Duplicate</button>
                <button type="button" className="og-ghost" onClick={() => { setLayout((l) => ({ ...l, elements: l.elements.filter((x) => x.id !== el.id) })); setSel(null); }}><Trash2 size={14} /> Delete</button>
              </div>
            </>
          ) : <p className="text-xs og-faint">Tap any box to edit it. Drag to move, use the corner dot to resize.</p>}
          <div className="flex flex-wrap gap-2 pt-2 border-t og-divider">
            <button type="button" className="og-ghost" onClick={() => add({ type: "text", text: "New text", x: 80, y: 80, w: 400, h: 70, size: 44, weight: 700 })}><Plus size={14} /> Text</button>
            <button type="button" className="og-ghost" onClick={() => add({ type: "shape", x: 80, y: 80, w: 240, h: 140, fill: layout.colors.accent, radius: "20px" })}><Plus size={14} /> Shape</button>
            <button type="button" className="og-ghost" onClick={() => add({ type: "imageSlot", x: 80, y: 80, w: 360, h: 300, hint: "Add image here", gen: true, quality: "medium" })}><Plus size={14} /> Image</button>
          </div>
        </aside>
      </div>
    </div>
  );
}