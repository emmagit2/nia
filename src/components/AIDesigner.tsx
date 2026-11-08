import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Sparkles, Plus, X, Paperclip, Wand2 } from "lucide-react";
import ImagePicker, { colorName, detectColors, fitUpload, useObjectUrl, type RecentImage, type Swatch } from "./ImagePicker";

/* -------------------------------------------------------------------------- */
/*  src/components/AIDesigner.tsx                                              */
/*  The form for AI Designer: prompt, text on the design, reference image,     */
/*  colours and layout. The dashboard sends the finished prompt to the server. */
/* -------------------------------------------------------------------------- */

export type DesignTypeName = "Logo" | "Flyer" | "Social Post" | "Business Card";
const TYPES: DesignTypeName[] = ["Logo", "Flyer", "Social Post", "Business Card"];

export interface DesignPayload {
  businessName: string;
  type: DesignTypeName;
  /** The full prompt: your idea + layout + colours + text, ready for the AI. */
  prompt: string;
  layout: string;
  colors: string[];
  designText: string;
}

export interface DesignValues {
  businessName: string;
  type: DesignTypeName;
  description: string;
}

const PLACEHOLDERS: Record<DesignTypeName, string> = {
  Logo: "e.g: Modern minimalist logo for my tech startup, clean geometric symbol, friendly feel",
  Flyer: "e.g: Grand opening promo for my barbershop, Lagos style, a barber cutting hair in the middle",
  "Social Post": "e.g: Instagram promo post for my restaurant special offer, Friday night vibes, plate of jollof rice",
  "Business Card": "e.g: Professional business card for a civil engineer, corporate style, simple line pattern",
};

/* ---------------------------------- layouts --------------------------------- */

type Tone = "t" | "i" | "s"; // t = headline text, i = picture or symbol, s = small text
interface LayoutDef {
  id: string;
  label: string;
  prompt: string;
  boxes: [number, number, number, number, Tone][];
}

const SHAPE: Record<DesignTypeName, { w: number; h: number }> = {
  Logo: { w: 100, h: 100 },
  Flyer: { w: 100, h: 130 },
  "Social Post": { w: 100, h: 100 },
  "Business Card": { w: 100, h: 60 },
};

const LAYOUTS: Record<DesignTypeName, LayoutDef[]> = {
  Logo: [
    { id: "stack", label: "Symbol on top", prompt: "Layout: symbol on top, business name centred below it, small tagline under the name.", boxes: [[35, 12, 30, 30, "i"], [18, 52, 64, 10, "t"], [32, 68, 36, 5, "s"]] },
    { id: "side", label: "Symbol on left", prompt: "Layout: symbol on the left and business name on the right, in one horizontal line.", boxes: [[8, 34, 30, 30, "i"], [46, 40, 46, 9, "t"], [46, 54, 34, 5, "s"]] },
    { id: "wordmark", label: "Text only", prompt: "Layout: text-only logo (wordmark), the business name styled as the logo, no symbol.", boxes: [[10, 42, 80, 16, "t"], [30, 64, 40, 5, "s"]] },
    { id: "badge", label: "Round badge", prompt: "Layout: round badge or emblem with a symbol in the centre and the business name around or inside it.", boxes: [[18, 14, 64, 64, "i"], [30, 40, 40, 10, "t"], [34, 84, 32, 5, "s"]] },
  ],
  Flyer: [
    { id: "headline", label: "Big headline", prompt: "Layout: very large headline at the top, a main picture in the middle, details and a call to action button at the bottom.", boxes: [[8, 8, 84, 18, "t"], [8, 32, 84, 56, "i"], [8, 94, 84, 8, "s"], [8, 108, 40, 12, "s"]] },
    { id: "split", label: "Split", prompt: "Layout: split design, picture on the left half and text on the right half, call to action at the bottom right.", boxes: [[0, 0, 48, 130, "i"], [54, 20, 40, 14, "t"], [54, 40, 40, 6, "s"], [54, 50, 40, 6, "s"], [54, 106, 36, 12, "s"]] },
    { id: "centered", label: "Centred", prompt: "Layout: everything centred, small line at the top, big headline in the middle, picture below it, contact details at the bottom.", boxes: [[20, 10, 60, 8, "s"], [10, 26, 80, 22, "t"], [22, 54, 56, 44, "i"], [24, 106, 52, 8, "s"]] },
    { id: "fullimage", label: "Full picture", prompt: "Layout: full background picture with a dark overlay, headline and details placed in the bottom third.", boxes: [[0, 0, 100, 130, "i"], [8, 84, 84, 18, "t"], [8, 108, 56, 8, "s"]] },
  ],
  "Social Post": [
    { id: "centered", label: "Picture and text", prompt: "Layout: square post with the main picture on top and a bold headline with a small line below it.", boxes: [[10, 10, 80, 50, "i"], [14, 66, 72, 12, "t"], [30, 83, 40, 7, "s"]] },
    { id: "textleft", label: "Text left", prompt: "Layout: text on the left side (headline, short line, button) and the main picture on the right side.", boxes: [[8, 26, 50, 16, "t"], [8, 48, 44, 6, "s"], [8, 72, 30, 10, "s"], [62, 14, 30, 72, "i"]] },
    { id: "fullimage", label: "Full picture", prompt: "Layout: full-bleed picture filling the whole post with a short bold caption near the bottom.", boxes: [[0, 0, 100, 100, "i"], [8, 70, 84, 14, "t"]] },
    { id: "bold", label: "Bold text", prompt: "Layout: mostly big bold text in the middle with simple shapes around it, small line at the bottom.", boxes: [[10, 24, 80, 46, "t"], [30, 82, 40, 6, "s"]] },
  ],
  "Business Card": [
    { id: "horizontal", label: "Logo left", prompt: "Layout: horizontal card with the logo on the left, name and job title on the right, contact details below.", boxes: [[8, 16, 24, 24, "i"], [40, 14, 50, 8, "t"], [40, 26, 36, 5, "s"], [40, 42, 48, 4, "s"]] },
    { id: "centered", label: "Centred", prompt: "Layout: centred card with the logo on top, name and job title in the middle, contact details at the bottom.", boxes: [[38, 5, 24, 16, "i"], [24, 27, 52, 8, "t"], [32, 38, 36, 5, "s"], [26, 48, 48, 4, "s"]] },
    { id: "bar", label: "Colour bar", prompt: "Layout: a wide colour bar on the left side, name and job title on the right, contact details below.", boxes: [[0, 0, 16, 60, "i"], [24, 14, 60, 8, "t"], [24, 26, 40, 5, "s"], [24, 44, 56, 4, "s"]] },
    { id: "logo", label: "Logo only", prompt: "Layout: simple back side of a business card with only the large logo in the centre.", boxes: [[30, 10, 40, 40, "i"]] },
  ],
};

function LayoutThumb({ shape, boxes }: { shape: { w: number; h: number }; boxes: LayoutDef["boxes"] }) {
  const fill: Record<Tone, string> = { t: "var(--accent)", i: "var(--faint)", s: "var(--muted)" };
  const opacity: Record<Tone, number> = { t: 0.95, i: 0.35, s: 0.5 };
  return (
    <svg viewBox={`0 0 ${shape.w} ${shape.h}`} className="w-full block" aria-hidden="true">
      <rect width={shape.w} height={shape.h} rx="3" style={{ fill: "var(--input)", stroke: "var(--border)" }} />
      {boxes.map(([x, y, w, h, tone], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="2" style={{ fill: fill[tone], opacity: opacity[tone] }} />
      ))}
    </svg>
  );
}

/* ---------------------------------- colours --------------------------------- */

const PRESETS: { name: string; colors: string[] }[] = [
  { name: "Gold and black", colors: ["#FFD21F", "#0B0B0C"] },
  { name: "Navy and gold", colors: ["#0F1B3D", "#FFC83D"] },
  { name: "Green and white", colors: ["#2E9B5F", "#FFFFFF"] },
  { name: "Red and white", colors: ["#F0442E", "#FFFFFF"] },
  { name: "Purple neon", colors: ["#1A0B3B", "#B06CFF"] },
  { name: "Rose and ivory", colors: ["#C9785D", "#FBEFEA"] },
];

const MAX_COLORS = 5;

/* ---------------------------------- helpers --------------------------------- */

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}

/* ---------------------------------- the form -------------------------------- */

export default function AIDesigner({
  values,
  onValues,
  loading,
  creditsLeft,
  charge,
  refund,
  recent,
  onGenerate,
}: {
  values: DesignValues;
  onValues: (p: Partial<DesignValues>) => void;
  loading: boolean;
  creditsLeft: number;
  /** Takes credits (opens the buy modal and returns false if there are not enough). */
  charge: (cost: number) => Promise<boolean>;
  refund: (amount: number) => Promise<void>;
  recent: RecentImage[];
  onGenerate: (p: DesignPayload) => void;
}) {
  const { getToken } = useAuth();
  const { businessName, type, description } = values;

  const [layoutByType, setLayoutByType] = useState<Record<string, string>>({});
  const layouts = LAYOUTS[type];
  const layout = layouts.find((l) => l.id === layoutByType[type]) ?? layouts[0];

  const [colors, setColors] = useState<string[]>([]);
  const [designText, setDesignText] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const refUrl = useObjectUrl(refFile);
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [describing, setDescribing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const txt = useRef<HTMLInputElement>(null);

  // free colour detection for the reference image
  useEffect(() => {
    if (!refUrl) {
      setSwatches([]);
      return;
    }
    let live = true;
    detectColors(refUrl, 5)
      .then((s) => live && setSwatches(s))
      .catch(() => live && setSwatches([]));
    return () => {
      live = false;
    };
  }, [refUrl]);

  const addColor = (hex: string) =>
    setColors((cs) => (cs.includes(hex.toUpperCase()) || cs.length >= MAX_COLORS ? cs : [...cs, hex.toUpperCase()]));
  const setColorAt = (i: number, hex: string) => setColors((cs) => cs.map((c, j) => (j === i ? hex.toUpperCase() : c)));
  const removeColorAt = (i: number) => setColors((cs) => cs.filter((_, j) => j !== i));

  /** Reads a text file the user attaches and puts it in the text box. */
  const attachText = async (f?: File | null) => {
    if (!f) return;
    if (!(f.type.startsWith("text/") || f.name.toLowerCase().endsWith(".txt"))) {
      setErr("Attach a .txt file, or type the text yourself.");
      return;
    }
    setErr(null);
    setDesignText((await f.text()).trim().slice(0, 500));
  };

  /** Asks the AI to write a prompt from the reference image. Costs 1 credit, refunded if it fails. */
  const writePromptFromImage = async () => {
    if (!refFile) return;
    setErr(null);
    if (!(await charge(1))) return;
    setDescribing(true);
    try {
      const form = new FormData();
      form.append("action", "describe");
      form.append("file", await fitUpload(refFile));
      const res = await axios.post<{ descriptions?: string[] }>("/api/image-tools", form, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        timeout: 60000,
      });
      const text = (res.data?.descriptions?.[0] ?? "").trim();
      if (!text) throw new Error("empty");
      onValues({ description: description.trim() ? `${description.trim()}\n\n${text}` : text });
    } catch (e) {
      setErr(axios.isAxiosError(e) ? ((e.response?.data as { error?: string } | undefined)?.error ?? "Could not read this image. Try another one.") : "Could not read this image. Try another one.");
      await refund(1);
    } finally {
      setDescribing(false);
    }
  };

  const buildPrompt = () => {
    const names = colors.map((c) => `${colorName(c).toLowerCase()} (${c})`).join(", ");
    return [
      `${type} for "${businessName.trim()}".`,
      description.trim(),
      layout.prompt,
      colors.length ? `Main colours: ${names}. Keep the colour scheme tight and use these colours.` : "",
      designText.trim() ? `Text to show on the design, spelled exactly like this: ${designText.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const canGo = !!businessName.trim() && !!description.trim() && creditsLeft >= 1 && !describing;

  const generate = () =>
    onGenerate({
      businessName: businessName.trim(),
      type,
      prompt: buildPrompt(),
      layout: layout.label,
      colors,
      designText: designText.trim(),
    });

  return (
    <>
      <div>
        <Label>Business name *</Label>
        <input
          type="text"
          className="og-input"
          placeholder="e.g: Emeka's Barbershop, Lagos Fresh Kitchen"
          value={businessName}
          onChange={(e) => onValues({ businessName: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <Label>Design type</Label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onValues({ type: t })}
              disabled={loading}
              data-active={type === t}
              className="og-chip og-focus !rounded-xl !py-2.5 !text-sm !font-semibold"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Your prompt *</Label>
        <textarea
          className="og-input resize-y"
          rows={5}
          placeholder={PLACEHOLDERS[type]}
          value={description}
          onChange={(e) => onValues({ description: e.target.value })}
          disabled={loading}
        />
        <p className="text-xs og-faint mt-1.5">Say what you want to see: the picture, the mood, the style. The more detail, the better the result.</p>
      </div>

      <div>
        <Label note="(optional)">Reference image</Label>
        <ImagePicker file={refFile} onFile={setRefFile} recent={recent} disabled={loading || describing} hint="A design you like. We read it and write a prompt for you." />
        {refFile && (
          <div className="mt-3 flex flex-col gap-3">
            <button type="button" className="og-ghost justify-center" onClick={writePromptFromImage} disabled={loading || describing}>
              {describing ? <span className="og-spin" /> : <Wand2 size={14} />}
              {describing ? "Reading your image..." : "Write a prompt from this image · 1 credit"}
            </button>
            {swatches.length > 0 && (
              <div>
                <p className="text-xs og-faint mb-1.5">Colours in this image (free). Tap to use them.</p>
                <div className="flex flex-wrap gap-2">
                  {swatches.map((s) => (
                    <button key={s.hex} type="button" className="og-ghost og-focus" onClick={() => addColor(s.hex)} aria-label={`Use ${s.name} ${s.hex}`}>
                      <span className="w-4 h-4 rounded-md border og-divider" style={{ background: s.hex }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <Label note="(optional)">Text on the design</Label>
        <textarea
          className="og-input resize-none"
          rows={3}
          maxLength={500}
          placeholder={"e.g: GRAND OPENING\nSaturday 10am, 12 Allen Avenue, Ikeja\nCall 0801 234 5678"}
          value={designText}
          onChange={(e) => setDesignText(e.target.value)}
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs og-faint">The AI writes exactly this on the design.</p>
          <input ref={txt} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => { attachText(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="og-ghost" onClick={() => txt.current?.click()} disabled={loading}>
            <Paperclip size={13} />
            Attach .txt
          </button>
        </div>
      </div>

      <div>
        <Label note={`(up to ${MAX_COLORS})`}>Colours</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" className="og-chip og-focus flex items-center gap-1.5" onClick={() => setColors(p.colors)} disabled={loading}>
              <span className="flex">
                {p.colors.map((c) => (
                  <span key={c} className="w-3.5 h-3.5 rounded-full border og-divider -ml-1 first:ml-0" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((c, i) => (
            <div key={i} className="og-card flex items-center gap-2 p-1.5 pr-2" style={{ boxShadow: "none", borderRadius: 14 }}>
              <input type="color" value={c} onChange={(e) => setColorAt(i, e.target.value)} aria-label={`Colour ${i + 1}`} className="w-8 h-8 rounded-lg border og-divider bg-transparent" />
              <span className="text-xs og-muted font-mono">{c}</span>
              <button type="button" onClick={() => removeColorAt(i)} aria-label={`Remove colour ${i + 1}`} className="og-faint">
                <X size={14} />
              </button>
            </div>
          ))}
          {colors.length < MAX_COLORS && (
            <button type="button" className="og-ghost" onClick={() => addColor(["#FFD21F", "#4DA3FF", "#2E9B5F", "#F0442E", "#FFFFFF", "#0B0B0C"].find((c) => !colors.includes(c)) ?? "#FFD21F")} disabled={loading}>
              <Plus size={14} />
              Add colour
            </button>
          )}
        </div>
        <p className="text-xs og-faint mt-1.5">{colors.length ? "The AI uses these as the main colours." : "Leave empty and the AI chooses colours that fit your prompt."}</p>
      </div>

      <div>
        <Label>Layout</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {layouts.map((l) => {
            const active = l.id === layout.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                disabled={loading}
                onClick={() => setLayoutByType((m) => ({ ...m, [type]: l.id }))}
                className="og-card og-focus p-2 text-left flex flex-col gap-1.5"
                style={{ boxShadow: "none", borderRadius: 16, borderColor: active ? "var(--accent)" : undefined, outline: active ? "3px solid var(--ring)" : "none" }}
              >
                <LayoutThumb shape={SHAPE[type]} boxes={l.boxes} />
                <span className="text-xs font-semibold og-text leading-tight">{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {err && (
        <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>
          {err}
        </div>
      )}

      <button onClick={generate} disabled={!canGo || loading} className="og-btn">
        {loading ? (
          <>
            <span className="og-spin" />
            Oga, AI dey cook...
          </>
        ) : (
          <>
            <span className="og-btn-icon">
              <Sparkles size={16} />
            </span>
            Generate design · 1 credit
          </>
        )}
      </button>
    </>
  );
}