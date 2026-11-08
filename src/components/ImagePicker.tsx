import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { UploadCloud, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  src/components/ImagePicker.tsx                                             */
/*  One image chooser used by AI Designer and every Image Studio tool.         */
/*  The user can upload a new image or pick one of their designs from this     */
/*  session. Also holds a few helpers shared by those components.              */
/* -------------------------------------------------------------------------- */

export interface RecentImage {
  id: string;
  url: string;
  label: string;
}

export interface Swatch {
  hex: string;
  pct: number;
  name: string;
}

export const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("load"));
    i.src = src;
  });

export function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

/** The server accepts about 5 MB. Bigger photos are shrunk in the browser first. */
export async function fitUpload(file: File): Promise<File> {
  if (file.size <= 4.5 * 1024 * 1024) return file;
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImg(src);
    const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(src);
  }
}

/* ------------------------------ colour detection ---------------------------- */

const NAMED: [string, string][] = [
  ["Black", "#111111"], ["White", "#FFFFFF"], ["Grey", "#808080"], ["Red", "#E53935"], ["Orange", "#FB8C00"], ["Gold", "#FFC107"],
  ["Yellow", "#FFEB3B"], ["Green", "#2E7D32"], ["Light green", "#9CCC65"], ["Teal", "#00897B"], ["Sky blue", "#4FC3F7"], ["Blue", "#1E88E5"],
  ["Navy", "#0D2C6C"], ["Purple", "#7B1FA2"], ["Pink", "#EC407A"], ["Brown", "#6D4C41"], ["Cream", "#F5EFE0"], ["Maroon", "#7B1E1E"],
];

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

export const colorName = (hex: string) => {
  const rgb = toRgb(hex);
  return NAMED.reduce((best, n) => (dist(rgb, toRgb(n[1])) < dist(rgb, toRgb(best[1])) ? n : best))[0];
};

/** Finds the main colours by counting pixels on a small copy of the image. Runs in the browser, so it is free. */
export async function detectColors(src: string, count = 6): Promise<Swatch[]> {
  const img = await loadImg(src);
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, S, S);
  const px = g.getImageData(0, 0, S, S).data;

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const b = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    b.r += px[i];
    b.g += px[i + 1];
    b.b += px[i + 2];
    b.n++;
    buckets.set(key, b);
    total++;
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], n: b.n }));
  const picked: { rgb: number[]; n: number }[] = [];
  for (const s of sorted) {
    const near = picked.find((p) => dist(p.rgb, s.rgb) < 48);
    if (near) near.n += s.n;
    else if (picked.length < count) picked.push({ ...s });
  }
  return picked
    .sort((a, b) => b.n - a.n)
    .map((p) => {
      const hex = toHex(p.rgb);
      return { hex, pct: Math.round((p.n / Math.max(1, total)) * 100), name: colorName(hex) };
    });
}

/* --------------------------------- picker ---------------------------------- */

export default function ImagePicker({
  file,
  onFile,
  recent = [],
  disabled,
  hint = "PNG, JPG or WEBP",
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  recent?: RecentImage[];
  disabled?: boolean;
  hint?: string;
}) {
  const { getToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "mine">("upload");
  const [picking, setPicking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const preview = useObjectUrl(file);

  const take = (f?: File | null) => {
    if (f && f.type.startsWith("image/")) {
      setErr(null);
      onFile(f);
    }
  };

  /** Turns one of the user's earlier designs into a File so the tools can use it. */
  const pick = async (img: RecentImage) => {
    setPicking(img.id);
    setErr(null);
    try {
      let blob: Blob;
      try {
        const r = await fetch(img.url);
        if (!r.ok) throw new Error("fetch");
        blob = await r.blob();
      } catch {
        // some image hosts block the browser, so ask our own server to fetch it
        const token = await getToken();
        const r = await axios.get(`/api/image-tools?proxy=${encodeURIComponent(img.url)}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          timeout: 30000,
        });
        blob = r.data as Blob;
      }
      const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
      const base = img.label.replace(/[^\w-]+/g, "_").slice(0, 30) || "design";
      onFile(new File([blob], `${base}.${ext}`, { type: blob.type || "image/png" }));
    } catch {
      setErr("Could not open that image. Upload it from your device instead.");
    } finally {
      setPicking(null);
    }
  };

  if (file) {
    return (
      <div className="og-card flex items-center gap-3 p-3" style={{ boxShadow: "none" }}>
        {preview && <img src={preview} alt="" className="w-14 h-14 rounded-xl object-cover og-checker" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold og-text truncate">{file.name}</p>
          <p className="text-xs og-faint">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <button onClick={() => onFile(null)} disabled={disabled} aria-label="Remove image" className="og-ghost" style={{ padding: ".45rem" }}>
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="tablist" aria-label="Where is the image">
        <button type="button" role="tab" aria-selected={mode === "upload"} data-active={mode === "upload"} className="og-chip og-focus" onClick={() => setMode("upload")}>
          Upload new
        </button>
        <button type="button" role="tab" aria-selected={mode === "mine"} data-active={mode === "mine"} className="og-chip og-focus" onClick={() => setMode("mine")}>
          My designs{recent.length ? ` (${recent.length})` : ""}
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
            style={{ borderColor: over ? "var(--accent)" : "var(--border)", background: over ? "var(--soft)" : "var(--input)" }}
            className="og-focus w-full rounded-2xl border-2 border-dashed py-9 px-4 flex flex-col items-center gap-2"
          >
            <div className="og-tile w-12 h-12 rounded-2xl">
              <UploadCloud size={22} />
            </div>
            <span className="text-sm font-semibold og-text">Upload an image or drop it here</span>
            <span className="text-xs og-faint">{hint}</span>
          </button>
        </div>
      ) : recent.length === 0 ? (
        <div className="og-card p-5 text-center" style={{ boxShadow: "none" }}>
          <p className="text-sm og-muted">No designs yet.</p>
          <p className="text-xs og-faint mt-1">Designs you make in this session show here, so you can pick them without uploading again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {recent.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={disabled || picking !== null}
              onClick={() => pick(r)}
              title={r.label}
              className="og-card og-focus overflow-hidden text-left relative"
              style={{ boxShadow: "none" }}
            >
              <img src={r.url} alt={r.label} className="w-full aspect-square object-cover og-checker block" />
              {picking === r.id && (
                <span className="absolute inset-0 grid place-items-center" style={{ background: "rgba(0,0,0,.45)" }}>
                  <span className="og-spin" style={{ color: "#fff" }} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>}
    </div>
  );
}