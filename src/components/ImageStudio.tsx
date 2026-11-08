import { useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Download, Copy, Check, Sparkles, Plus, Trash2, RotateCcw } from "lucide-react";
import ImagePicker, { detectColors, fitUpload, loadImg, useObjectUrl, type RecentImage, type Swatch } from "./ImagePicker";
import type { DesignTypeName } from "./AIDesigner";

/* -------------------------------------------------------------------------- */
/*  src/components/ImageStudio.tsx                                             */
/*  Five image tools for the dashboard: Describe, Upscale, Sharpen,            */
/*  Edit text and To SVG. Uses the same og-* classes as the dashboard.         */
/* -------------------------------------------------------------------------- */

export type StudioToolId = "describe" | "upscale" | "sharpen" | "layerize" | "vectorize";
export const STUDIO_IDS: StudioToolId[] = ["describe", "upscale", "sharpen", "layerize", "vectorize"];

export const STUDIO_LABELS: Record<StudioToolId, string> = {
  describe: "Describe",
  upscale: "Upscale",
  sharpen: "Sharpen",
  layerize: "Edit text",
  vectorize: "To SVG",
};

// Keep these in step with what you want to charge.
export const STUDIO_COSTS: Record<StudioToolId, number> = { describe: 1, upscale: 2, sharpen: 2, layerize: 2, vectorize: 2 };

export interface StudioCtx {
  creditsLeft: number;
  /** Takes credits (opens the buy modal and returns false if there are not enough). */
  charge: (cost: number) => Promise<boolean>;
  refund: (amount: number) => Promise<void>;
  /** Sends a brief to the AI Designer tool. */
  onUseBrief: (b: { type: DesignTypeName; description: string }) => void;
  /** Designs from this session, so any tool can pick one instead of uploading. */
  recent: RecentImage[];
  /** Saves a result to that list. */
  addRecent: (url: string, label: string) => void;
}

/* ------------------------------ shared helpers ----------------------------- */

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useApi() {
  const { getToken } = useAuth();
  const headers = async () => ({ Authorization: `Bearer ${await getToken()}` });

  const post = async <T,>(action: string, file: File, extra: Record<string, string | number> = {}): Promise<T> => {
    const form = new FormData();
    form.append("action", action);
    form.append("file", await fitUpload(file));
    Object.entries(extra).forEach(([k, v]) => form.append(k, String(v)));
    const res = await axios.post<T>("/api/image-tools", form, { headers: await headers(), timeout: 60000 });
    return res.data;
  };

  const get = async <T,>(query: string): Promise<T> =>
    (await axios.get<T>(`/api/image-tools?${query}`, { headers: await headers(), timeout: 30000 })).data;

  /** Loads an Ideogram image through our server so it can be edited on a canvas or saved. */
  const proxyBlobUrl = async (url: string) => {
    const res = await axios.get(`/api/image-tools?proxy=${encodeURIComponent(url)}`, {
      headers: await headers(),
      responseType: "blob",
      timeout: 30000,
    });
    return URL.createObjectURL(res.data as Blob);
  };

  return { post, get, proxyBlobUrl };
}

const errText = (e: unknown, fallback: string) =>
  axios.isAxiosError(e) ? (e.response?.data as { error?: string } | undefined)?.error ?? fallback : fallback;

/* ------------------------------ small UI bits ------------------------------ */

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}

function Go({ onClick, disabled, loading, loadingText, small, children }: { onClick: () => void; disabled?: boolean; loading?: boolean; loadingText?: string; small?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`og-btn ${small ? "og-btn-sm" : ""}`}>
      {loading ? (
        <>
          <span className="og-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function ErrorBox({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>
      {text}
    </div>
  );
}

function Empty({ icon, title, sub, spin }: { icon: ReactNode; title: string; sub: string; spin?: boolean }) {
  return (
    <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
      {spin ? <span className="og-spin og-spin-lg" /> : <div className="og-tile w-16 h-16 rounded-2xl">{icon}</div>}
      <p className="og-muted text-sm text-center font-medium">{title}</p>
      <p className="og-faint text-xs text-center">{sub}</p>
    </div>
  );
}

function Toggle({ on, set, disabled, children }: { on: boolean; set: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="og-chip og-focus !rounded-xl !py-2.5 !text-sm !font-semibold text-left" data-active={on} aria-pressed={on} onClick={() => set(!on)} disabled={disabled}>
      {on ? "✓ " : ""}
      {children}
    </button>
  );
}

function Pick({ label, value, options, set }: { label: string; value: string; options: string[]; set: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs og-faint mb-1">{label}</p>
      <select className="og-input" value={value} onChange={(e) => set(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/** Runs a paid action: takes credits first, refunds if it fails. */
function usePaid(ctx: StudioCtx, cost: number) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    job: () => Promise<void>,
    fallback = "Something went wrong. Try again."
  ) => {
    setError(null);
    setBusy(true);

    let charged = false;

    try {
      if (cost > 0) {
        const success = await ctx.charge(cost);
        if (!success) return;
        charged = true;
      }

      await job();
    } catch (e) {
      setError(errText(e, fallback));

      if (charged) {
        try {
          await ctx.refund(cost);
        } catch {
          setError("The operation failed and your credit refund could not be confirmed. Please contact support.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, run };
}

/* ------------------------ design type, category, style ---------------------- */

const TYPE_WORDS: Record<DesignTypeName, string[]> = {
  Logo: ["logo", "emblem", "icon", "monogram", "wordmark", "brand mark", "symbol", "badge"],
  Flyer: ["flyer", "poster", "promo", "sale", "grand opening", "event", "invitation", "brochure", "banner", "discount", "offer"],
  "Social Post": ["instagram", "social media", "post", "story", "feed", "square", "carousel", "tiktok"],
  "Business Card": ["business card", "contact details", "name card", "visiting card", "business-card"],
};

const CATEGORY_WORDS: Record<string, string[]> = {
  "Barbershop and salon": ["barber", "haircut", "salon", "hair", "beard", "clipper"],
  "Restaurant and food": ["restaurant", "food", "kitchen", "meal", "pizza", "burger", "chef", "menu", "cafe", "bakery", "jollof", "drink"],
  "Fashion and retail": ["fashion", "clothing", "boutique", "store", "outfit", "shoe", "sneaker", "dress", "tailor"],
  "Beauty and makeup": ["makeup", "beauty", "cosmetic", "skincare", "nail", "lash", "glow"],
  "Tech and software": ["tech", "software", "app", "digital", "startup", "ai ", "computer", "code", "cyber", "data"],
  "Church and events": ["church", "worship", "prayer", "conference", "wedding", "party", "concert", "ceremony", "birthday"],
  "Real estate": ["real estate", "property", "house", "apartment", "land", "estate", "rent"],
  Education: ["school", "student", "university", "class", "course", "training", "graduation", "academy", "campus"],
  "Nightlife and music": ["club", "night", "dj", "music", "lounge", "neon", "party", "festival"],
  "Health and fitness": ["health", "fitness", "gym", "clinic", "pharmacy", "medical", "doctor", "wellness"],
  "Business and corporate": ["corporate", "consulting", "finance", "bank", "engineer", "law", "accounting", "logistics", "construction"],
};

const STYLE_WORDS: Record<string, string[]> = {
  Minimal: ["minimal", "clean", "simple", "whitespace", "flat"],
  Bold: ["bold", "strong", "heavy", "thick", "high contrast", "vibrant"],
  Elegant: ["elegant", "luxury", "luxurious", "gold", "sophisticated", "refined", "serif", "premium"],
  Playful: ["playful", "fun", "cartoon", "cheerful", "colorful", "colourful", "whimsical", "bright"],
  Corporate: ["corporate", "professional", "formal", "business", "navy"],
  Retro: ["retro", "vintage", "70s", "80s", "classic", "grunge", "distressed"],
  "Neon and dark": ["neon", "dark", "glow", "cyberpunk", "night", "black background"],
  Modern: ["modern", "geometric", "contemporary", "gradient", "sleek", "futuristic"],
};

function pickBest(text: string, table: Record<string, string[]>, fallback: string) {
  const t = text.toLowerCase();
  let best = fallback;
  let top = 0;
  for (const [key, words] of Object.entries(table)) {
    const s = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (s > top) {
      top = s;
      best = key;
    }
  }
  return best;
}

const DESIGN_TYPES = Object.keys(TYPE_WORDS) as DesignTypeName[];
const CATEGORIES = Object.keys(CATEGORY_WORDS);
const STYLES = Object.keys(STYLE_WORDS);

/* --------------------------------- Describe -------------------------------- */

function DescribeTool({ ctx }: { ctx: StudioCtx }) {
  const api = useApi();
  const { busy, error, setError, run } = usePaid(ctx, STUDIO_COSTS.describe);
  const [file, setFile] = useState<File | null>(null);
  const preview = useObjectUrl(file);

  const [wantColors, setWantColors] = useState(true);
  const [wantDetails, setWantDetails] = useState(true); // description + design type + category + style
  const [form, setForm] = useState<"brief" | "plain">("brief");

  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [plain, setPlain] = useState("");
  const [type, setType] = useState<DesignTypeName>("Flyer");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const brief = () => {
    const cols = swatches.slice(0, 3).map((s) => s.name.toLowerCase()).join(", ");
    return `${type} for ${category.toLowerCase()}, ${style.toLowerCase()} style${cols ? `, main colours: ${cols}` : ""}. ${plain}`.trim();
  };
  const output = form === "brief" ? brief() : plain;

  const describe = async () => {
    if (!file || !preview) return;
    setDone(false);
    setSwatches([]);
    setPlain("");

    const colors = wantColors ? detectColors(preview).catch(() => [] as Swatch[]) : Promise.resolve([] as Swatch[]);

    if (!wantDetails) {
      setSwatches(await colors);
      setDone(true);
      return;
    }

    await run(async () => {
      const d = await api.post<{ descriptions: string[] }>("describe", file);
      const text = (d.descriptions?.[0] ?? "").trim();
      if (!text) throw new Error("empty");
      setPlain(text);
      setType(pickBest(text, TYPE_WORDS, "Flyer") as DesignTypeName);
      setCategory(pickBest(text, CATEGORY_WORDS, CATEGORIES[CATEGORIES.length - 1]));
      setStyle(pickBest(text, STYLE_WORDS, "Modern"));
      setSwatches(await colors);
      setDone(true);
    }, "Could not describe this image. Try another one.");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Image *</Label>
          <ImagePicker file={file} onFile={(f) => { setFile(f); setDone(false); setError(null); }} recent={ctx.recent} disabled={busy} />
        </div>

        <div>
          <Label>What do you want to find out?</Label>
          <div className="grid grid-cols-1 gap-2">
            <Toggle on={wantDetails} set={setWantDetails} disabled={busy}>Description, design type, category and style</Toggle>
            <Toggle on={wantColors} set={setWantColors} disabled={busy}>Colours (free, done on your device)</Toggle>
          </div>
        </div>

        {wantDetails && (
          <div>
            <Label>Give me the answer as</Label>
            <div className="grid grid-cols-2 gap-2">
              {([["brief", "Design brief"], ["plain", "Plain description"]] as const).map(([id, label]) => (
                <button key={id} className="og-chip og-focus !rounded-xl !py-2.5 !text-sm !font-semibold" data-active={form === id} onClick={() => setForm(id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs og-faint mt-1.5">A design brief is ready to paste into the AI Designer.</p>
          </div>
        )}

        <Go onClick={describe} loading={busy} loadingText="Looking at your image..." disabled={!file || (!wantColors && !wantDetails)}>
          {wantDetails ? `Describe image · ${STUDIO_COSTS.describe} credit` : "Find colours · Free"}
        </Go>
        <ErrorBox text={error} />
      </section>

      <section className="xl:col-span-3 min-w-0">
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider">
            <p className="text-sm font-semibold og-text">What we found</p>
          </div>
          {busy ? (
            <Empty icon={null} title="AI dey look your image..." sub="This takes a few seconds" spin />
          ) : done ? (
            <div className="p-4 flex flex-col gap-5 og-in">
              {preview && <img src={preview} alt="Your image" className="w-full max-h-72 object-contain rounded-xl og-checker" />}

              {swatches.length > 0 && (
                <div>
                  <p className="text-sm font-semibold og-text mb-2">Colours</p>
                  <div className="flex flex-wrap gap-2">
                    {swatches.map((s) => (
                      <button key={s.hex} onClick={() => copy(s.hex, s.hex)} className="og-ghost og-focus" aria-label={`Copy ${s.hex}`}>
                        <span className="w-5 h-5 rounded-md border og-divider" style={{ background: s.hex }} />
                        {copied === s.hex ? "Copied" : `${s.name} ${s.hex}`}
                        <span className="og-faint">{s.pct}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wantDetails && plain && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Pick label="Design type" value={type} options={DESIGN_TYPES} set={(v) => setType(v as DesignTypeName)} />
                    <Pick label="Category" value={category} options={CATEGORIES} set={setCategory} />
                    <Pick label="Style" value={style} options={STYLES} set={setStyle} />
                  </div>
                  <p className="text-xs og-faint -mt-2">Not right? Change any of these and the brief updates.</p>

                  <div>
                    <p className="text-sm font-semibold og-text mb-2">{form === "brief" ? "Design brief" : "Description"}</p>
                    <textarea className="og-input resize-y" rows={6} value={output} readOnly={form === "brief"} onChange={(e) => setPlain(e.target.value)} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="og-ghost" onClick={() => copy(output, "out")}>
                      {copied === "out" ? <Check size={14} /> : <Copy size={14} />}
                      {copied === "out" ? "Copied" : "Copy"}
                    </button>
                    <Go small onClick={() => ctx.onUseBrief({ type, description: brief() })}>
                      <span className="og-btn-icon"><Sparkles size={13} /></span>
                      Use in AI Designer
                    </Go>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Empty icon={<Sparkles size={28} />} title="Your results will appear here" sub="Pick an image and choose what you want to learn" />
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Upscale / Sharpen --------------------------- */

interface Mode {
  id: string;
  label: string;
  hint: string;
  resemblance: number;
  detail: number;
}

const MODES: Record<"upscale" | "sharpen", Mode[]> = {
  upscale: [
    { id: "faithful", label: "Faithful", hint: "Keeps your image exactly as it is. Best for logos, text and flyers.", resemblance: 90, detail: 30 },
    { id: "balanced", label: "Balanced", hint: "A good mix for most images.", resemblance: 60, detail: 50 },
    { id: "detailed", label: "Extra detail", hint: "Adds texture and sharpness. Best for photos.", resemblance: 40, detail: 80 },
    { id: "creative", label: "Creative", hint: "Lets the AI redraw more. Best for tiny or very blurry images.", resemblance: 15, detail: 70 },
    { id: "custom", label: "Custom", hint: "Set the two sliders yourself.", resemblance: 50, detail: 50 },
  ],
  sharpen: [
    { id: "light", label: "Light", hint: "Gently crisps edges and keeps everything the same.", resemblance: 90, detail: 35 },
    { id: "medium", label: "Medium", hint: "Clearer edges and text. Good for most soft images.", resemblance: 80, detail: 55 },
    { id: "strong", label: "Strong", hint: "Rebuilds fine detail. Use it for very soft or blurry images.", resemblance: 65, detail: 80 },
  ],
};

function EnhanceTool({ ctx, kind }: { ctx: StudioCtx; kind: "upscale" | "sharpen" }) {
  const api = useApi();
  const cost = STUDIO_COSTS[kind];
  const { busy, error, setError, run } = usePaid(ctx, cost);
  const [file, setFile] = useState<File | null>(null);
  const preview = useObjectUrl(file);
  const modes = MODES[kind];
  const [modeId, setModeId] = useState(kind === "upscale" ? "balanced" : "medium");
  const [resemblance, setResemblance] = useState(50);
  const [detail, setDetail] = useState(50);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(false);

  const mode = modes.find((m) => m.id === modeId) ?? modes[0];
  const params = mode.id === "custom" ? { resemblance, detail } : { resemblance: mode.resemblance, detail: mode.detail };
  const verb = kind === "upscale" ? "Upscale" : "Sharpen";

  const go = () =>
    file &&
    run(async () => {
      setResult(null);
      setShowBefore(false);
      const d = await api.post<{ url: string }>("upscale", file, { ...params, prompt });
      if (!d.url) throw new Error("empty");
      setResult(d.url);
      ctx.addRecent(d.url, kind === "upscale" ? "Upscaled image" : "Sharpened image");
    }, `Could not ${kind} this image. Try another one.`);

  const download = async () => {
    if (!result) return;
    const name = `twomindesign_${kind}_${Date.now()}.png`;
    try {
      saveBlob(await (await fetch(result)).blob(), name);
    } catch {
      try {
        saveBlob(await (await fetch(await api.proxyBlobUrl(result))).blob(), name);
      } catch {
        window.open(result, "_blank");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Image *</Label>
          <ImagePicker file={file} onFile={(f) => { setFile(f); setResult(null); setError(null); }} recent={ctx.recent} disabled={busy} hint={kind === "upscale" ? "Best for small or blurry images" : "Best for soft or slightly blurry images"} />
        </div>

        <div>
          <Label>{kind === "upscale" ? "How should we upscale it?" : "How strong?"}</Label>
          <div className={`grid gap-2 ${kind === "upscale" ? "grid-cols-2" : "grid-cols-3"}`}>
            {modes.map((m) => {
              const active = m.id === mode.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => setModeId(m.id)}
                  className="og-card og-focus p-3 text-left"
                  style={{ boxShadow: "none", borderRadius: 16, borderColor: active ? "var(--accent)" : undefined, outline: active ? "3px solid var(--ring)" : "none" }}
                >
                  <span className="text-sm font-semibold og-text">{m.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs og-faint mt-2">{mode.hint}</p>
        </div>

        {mode.id === "custom" && (
          <>
            <div>
              <Label>Stay close to the original</Label>
              <input type="range" min={1} max={100} value={resemblance} onChange={(e) => setResemblance(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--accent)" }} aria-label="Resemblance" />
              <p className="text-xs og-faint mt-1">Higher keeps your image the same. Lower lets the AI change more.</p>
            </div>
            <div>
              <Label>Add detail</Label>
              <input type="range" min={1} max={100} value={detail} onChange={(e) => setDetail(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--accent)" }} aria-label="Detail" />
              <p className="text-xs og-faint mt-1">Higher adds more sharpness and texture.</p>
            </div>
          </>
        )}

        <div>
          <Label note="(optional)">What is in the image?</Label>
          <input className="og-input" maxLength={200} placeholder="e.g: A barbershop flyer with gold text" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} />
        </div>

        <Go onClick={go} loading={busy} loadingText={kind === "upscale" ? "Oga, AI dey upscale am..." : "Oga, AI dey sharpen am..."} disabled={!file}>
          {verb} image · {cost} credits
        </Go>
        <ErrorBox text={error} />
      </section>

      <section className="xl:col-span-3 min-w-0">
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">Result</p>
            {result && preview && (
              <div className="flex gap-2">
                <button className="og-chip og-focus" data-active={!showBefore} onClick={() => setShowBefore(false)}>After</button>
                <button className="og-chip og-focus" data-active={showBefore} onClick={() => setShowBefore(true)}>Before</button>
              </div>
            )}
          </div>
          {busy ? (
            <Empty icon={null} title="AI dey work for you..." sub="This can take up to 30 seconds" spin />
          ) : result ? (
            <>
              <div className="og-checker">
                <img src={showBefore && preview ? preview : result} alt={showBefore ? "Original image" : `${verb}d image`} className="w-full block og-in" />
              </div>
              <div className="p-4 flex gap-3 border-t og-divider">
                <div className="flex-1">
                  <Go onClick={download}>
                    <span className="og-btn-icon"><Download size={16} /></span>
                    Download
                  </Go>
                </div>
                <button onClick={() => setResult(null)} aria-label="Start over" className="og-ghost" style={{ padding: "0 1rem", borderRadius: 16 }}>
                  <RotateCcw size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="og-checker">
              {preview ? (
                <img src={preview} alt="Your image" className="w-full max-h-[420px] object-contain block" />
              ) : (
                <Empty icon={<Sparkles size={28} />} title={`Your ${kind === "upscale" ? "upscaled" : "sharpened"} image will appear here`} sub="Pick an image to start" />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------- Edit text -------------------------------- */

const FONTS = {
  sans: { label: "Clean", css: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  serif: { label: "Classic", css: 'Georgia, "Times New Roman", serif' },
  display: { label: "Bold display", css: 'Impact, "Arial Black", sans-serif' },
  mono: { label: "Typewriter", css: 'ui-monospace, Menlo, Consolas, monospace' },
} as const;
type FontKey = keyof typeof FONTS;

interface TextLayer {
  id: number;
  text: string;
  x: number; // left edge, share of image width
  y: number; // top edge, share of image height
  size: number; // font size, share of image width
  color: string;
  font: FontKey;
  bold: boolean;
}

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

/** Turns whatever the server sends back into editable text layers. Written to cope with different field names. */
function toLayers(blocks: any[], W: number, H: number): TextLayer[] {
  let id = 1;
  const out: TextLayer[] = [];
  for (const b of blocks) {
    const box = b?.bounding_box ?? b?.bbox ?? b?.box ?? b;
    const text = String(b?.text ?? b?.content ?? b?.value ?? "").trim();
    const x = num(box?.x ?? box?.left);
    const y = num(box?.y ?? box?.top);
    if (!text || x === null || y === null) continue;
    const bw = num(box?.width ?? box?.w) ?? 0;
    const bh = num(box?.height ?? box?.h) ?? 0;
    const isFraction = Math.max(x, y, bw, bh) <= 1;
    const fx = isFraction ? x : x / W;
    const fy = isFraction ? y : y / H;
    const px = num(b?.font_size ?? b?.fontSize ?? b?.size);
    const lines = text.split("\n").length;
    const sizePx = px ?? (bh ? (isFraction ? bh * H : bh) / lines / 1.1 : W * 0.04);
    const color = String(b?.color ?? b?.font_color ?? b?.fill ?? "#111111");
    out.push({
      id: id++,
      text,
      x: fx,
      y: fy,
      size: Math.min(0.3, Math.max(0.01, px && isFraction ? px : sizePx / W)),
      color: /^#|^rgb/.test(color) ? color : "#111111",
      font: "sans",
      bold: true,
    });
  }
  return out;
}

function LayerizeTool({ ctx }: { ctx: StudioCtx }) {
  const api = useApi();
  const { busy, error, setError, run } = usePaid(ctx, STUDIO_COSTS.layerize);
  const [file, setFile] = useState<File | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const start = () =>
    file &&
    run(async () => {
      setBase(null);
      setLayers([]);
      setNote(null);
      const d = await api.post<{ base_image_url: string; text_blocks: any[] }>("layerize", file);
      const blobUrl = await api.proxyBlobUrl(d.base_image_url);
      const img = await loadImg(blobUrl);
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
      setBase(blobUrl);
      const found = toLayers(d.text_blocks || [], img.naturalWidth, img.naturalHeight);
      setLayers(found);
      setSel(found[0]?.id ?? null);
      if (!found.length) setNote("The text was removed from the image, but we could not read its position. Use Add text to type your own.");
    }, "Could not separate the text. Try a clearer image.");

  const patch = (id: number, p: Partial<TextLayer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const addLayer = () => {
    const id = Date.now();
    setLayers((ls) => [...ls, { id, text: "New text", x: 0.1, y: 0.1, size: 0.06, color: "#111111", font: "sans", bold: true }]);
    setSel(id);
  };

  const onDown = (e: RPE<HTMLDivElement>, l: TextLayer) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setSel(l.id);
    drag.current = { id: l.id, dx: (e.clientX - r.left) / r.width - l.x, dy: (e.clientY - r.top) / r.height - l.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPE<HTMLDivElement>) => {
    const r = box.current?.getBoundingClientRect();
    const d = drag.current;
    if (!r || !d) return;
    patch(d.id, {
      x: Math.min(0.98, Math.max(-0.02, (e.clientX - r.left) / r.width - d.dx)),
      y: Math.min(0.98, Math.max(-0.02, (e.clientY - r.top) / r.height - d.dy)),
    });
  };

  const download = async () => {
    if (!base || !dims) return;
    setError(null);
    try {
      const img = await loadImg(base);
      const c = document.createElement("canvas");
      c.width = dims.w;
      c.height = dims.h;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      g.textBaseline = "top";
      for (const l of layers) {
        const fs = l.size * dims.w;
        g.font = `${l.bold ? 700 : 400} ${fs}px ${FONTS[l.font].css}`;
        g.fillStyle = l.color;
        l.text.split("\n").forEach((line, i) => g.fillText(line, l.x * dims.w, l.y * dims.h + i * fs * 1.1));
      }
      c.toBlob((b) => b && saveBlob(b, `twomindesign_edited_${Date.now()}.png`), "image/png");
    } catch {
      setError("Could not build the final image. Try again.");
    }
  };

  const current = layers.find((l) => l.id === sel) ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Design with text *</Label>
          <ImagePicker file={file} onFile={(f) => { setFile(f); setBase(null); setLayers([]); setError(null); }} recent={ctx.recent} disabled={busy} hint="A flyer, poster or post. Up to 5 MB." />
        </div>
        <Go onClick={start} loading={busy} loadingText="Making the text editable..." disabled={!file}>
          Make text editable · {STUDIO_COSTS.layerize} credits
        </Go>
        <p className="text-xs og-faint">We lift the text off your design. Then you can change the words, move them, resize them, and change the colour and font.</p>
        <ErrorBox text={error} />
        {note && <p className="text-sm og-muted">{note}</p>}

        {base && (
          <div className="flex flex-col gap-3 og-in">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold og-text">Text layers ({layers.length})</p>
              <button className="og-ghost" onClick={addLayer}>
                <Plus size={14} />
                Add text
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {layers.map((l, i) => (
                <button key={l.id} className="og-chip og-focus" data-active={l.id === sel} onClick={() => setSel(l.id)}>
                  {i + 1}. {l.text.slice(0, 14) || "Empty"}
                </button>
              ))}
            </div>

            {current && (
              <div className="og-card p-4 flex flex-col gap-3" style={{ boxShadow: "none" }}>
                <textarea className="og-input resize-none" rows={3} value={current.text} onChange={(e) => patch(current.id, { text: e.target.value })} aria-label="Layer text" />
                <div className="flex items-center gap-3">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(current.color) ? current.color : "#111111"} onChange={(e) => patch(current.id, { color: e.target.value })} aria-label="Text colour" className="w-10 h-10 rounded-lg border og-divider bg-transparent" />
                  <input type="range" min={0.015} max={0.2} step={0.001} value={current.size} onChange={(e) => patch(current.id, { size: Number(e.target.value) })} className="flex-1" style={{ accentColor: "var(--accent)" }} aria-label="Text size" />
                  <button className="og-ghost" aria-label="Delete this text" style={{ padding: ".5rem" }} onClick={() => { setLayers((ls) => ls.filter((l) => l.id !== current.id)); setSel(null); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <select className="og-input flex-1" value={current.font} onChange={(e) => patch(current.id, { font: e.target.value as FontKey })} aria-label="Font">
                    {(Object.keys(FONTS) as FontKey[]).map((k) => (
                      <option key={k} value={k}>{FONTS[k].label}</option>
                    ))}
                  </select>
                  <button className="og-chip og-focus !rounded-xl !py-2.5 !px-4 !text-sm !font-bold" data-active={current.bold} aria-pressed={current.bold} onClick={() => patch(current.id, { bold: !current.bold })}>
                    B
                  </button>
                </div>
              </div>
            )}

            <Go onClick={download}>
              <span className="og-btn-icon"><Download size={16} /></span>
              Download edited image
            </Go>
          </div>
        )}
      </section>

      <section className="xl:col-span-3 min-w-0">
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">Editor</p>
            {base && <p className="text-xs og-faint">Drag a text to move it</p>}
          </div>
          {busy ? (
            <Empty icon={null} title="AI dey lift the text..." sub="This takes about 15 to 30 seconds" spin />
          ) : base && dims ? (
            <div className="p-4">
              <div
                ref={box}
                className="relative select-none overflow-hidden rounded-2xl border og-divider mx-auto"
                style={{ aspectRatio: `${dims.w} / ${dims.h}`, containerType: "inline-size", width: `min(100%, calc(75vh * ${dims.w / dims.h}))` } as CSSProperties}
              >
                <img src={base} alt="Design without text" className="absolute inset-0 w-full h-full" draggable={false} />
                {layers.map((l) => (
                  <div
                    key={l.id}
                    onPointerDown={(e) => onDown(e, l)}
                    onPointerMove={onMove}
                    onPointerUp={() => (drag.current = null)}
                    onPointerCancel={() => (drag.current = null)}
                    className="absolute cursor-move"
                    style={{
                      left: `${l.x * 100}%`,
                      top: `${l.y * 100}%`,
                      fontSize: `${l.size * 100}cqw`,
                      color: l.color,
                      fontWeight: l.bold ? 700 : 400,
                      lineHeight: 1.1,
                      whiteSpace: "pre",
                      touchAction: "none",
                      outline: l.id === sel ? "2px dashed var(--accent)" : "none",
                      outlineOffset: 2,
                      fontFamily: FONTS[l.font].css,
                    }}
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty icon={<Sparkles size={28} />} title="Your editable design will appear here" sub="Pick a design and we separate the text from the picture" />
          )}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------- Vectorize -------------------------------- */

function VectorizeTool({ ctx }: { ctx: StudioCtx }) {
  const api = useApi();
  const { busy, error, setError, run } = usePaid(ctx, STUDIO_COSTS.vectorize);
  const [file, setFile] = useState<File | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const go = () =>
    file &&
    run(async () => {
      setSvg(null);
      const { generation_id } = await api.post<{ generation_id: string }>("vectorize", file);
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const g = await api.get<{ status: string; svg?: string; error?: string }>(`generation=${encodeURIComponent(generation_id)}`);
        if (g.status === "completed" && g.svg) return setSvg(g.svg);
        if (g.status === "failed") throw Object.assign(new Error("failed"), { message: g.error });
      }
      throw new Error("timeout");
    }, "Could not convert this image. Try a simpler one.");

  const dataUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Image *</Label>
          <ImagePicker file={file} onFile={(f) => { setFile(f); setSvg(null); setError(null); }} recent={ctx.recent} disabled={busy} hint="Works best on logos and flat graphics" />
        </div>
        <Go onClick={go} loading={busy} loadingText="Converting to SVG..." disabled={!file}>
          Convert to SVG · {STUDIO_COSTS.vectorize} credits
        </Go>
        <p className="text-xs og-faint">An SVG stays sharp at any size, so it suits print and signs. Photos turn into very large files, so use a logo or flat design.</p>
        <ErrorBox text={error} />
      </section>

      <section className="xl:col-span-3 min-w-0">
        <div className="og-card overflow-hidden">
          <div className="p-4 border-b og-divider flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">SVG result</p>
            {svg && (
              <Go small onClick={() => saveBlob(new Blob([svg], { type: "image/svg+xml" }), `twomindesign_${Date.now()}.svg`)}>
                <span className="og-btn-icon"><Download size={13} /></span>
                Download SVG
              </Go>
            )}
          </div>
          {busy ? (
            <Empty icon={null} title="AI dey draw am as vector..." sub="This can take up to a minute" spin />
          ) : dataUrl ? (
            <div className="og-checker">
              <img src={dataUrl} alt="SVG result" className="w-full aspect-square object-contain block og-in" />
            </div>
          ) : (
            <Empty icon={<Sparkles size={28} />} title="Your SVG will appear here" sub="Pick a logo or flat graphic to convert" />
          )}
        </div>
      </section>
    </div>
  );
}

/* --------------------------------- Switch ---------------------------------- */

export default function ImageStudio({ tool, ctx }: { tool: StudioToolId; ctx: StudioCtx }) {
  switch (tool) {
    case "describe":
      return <DescribeTool ctx={ctx} />;
    case "upscale":
      return <EnhanceTool ctx={ctx} kind="upscale" />;
    case "sharpen":
      return <EnhanceTool ctx={ctx} kind="sharpen" />;
    case "layerize":
      return <LayerizeTool ctx={ctx} />;
    case "vectorize":
      return <VectorizeTool ctx={ctx} />;
  }
}