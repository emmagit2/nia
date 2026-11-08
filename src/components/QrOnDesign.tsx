import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Download, FileCheck2, ImageDown, Move, Sparkles, UploadCloud, X } from "lucide-react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Label, saveBlob } from "./toolUtils";

/*
  ONE shared "put a QR on a design" tool. Give it any link and it works:
  a lead form, an event, a booking page, WhatsApp, anything.
  - drop or upload a design (PNG, JPG or PDF), or use the design you just generated
  - drag the QR anywhere, resize it, jump to a corner, change the text under it and its colour
  - download the finished image
*/

type Corner = "tl" | "tr" | "bl" | "br";
const CAPTION_FRAC = 0.15; // caption strip height, as a share of the QR card width
const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "Forest", hex: "#0A2E1E" },
  { name: "Navy", hex: "#0B1F4D" },
  { name: "Maroon", hex: "#5A0F1F" },
  { name: "Purple", hex: "#3B1A6B" },
];

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) => f.type.startsWith("image/");

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("load"));
    i.src = src;
  });

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function pdfFirstPage(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

export default function QrOnDesign({
  link,
  defaultCaption = "Scan me",
  lastDesign = null,
}: {
  link: string;
  defaultCaption?: string;
  lastDesign?: string | null;
}) {
  const [qrColor, setQrColor] = useState(COLORS[1].hex);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designSrc, setDesignSrc] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [qr, setQr] = useState({ x: 0.7, y: 0.7, size: 0.24 }); // fractions of the design
  const [caption, setCaption] = useState(defaultCaption);
  const [composing, setComposing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => setCaption(defaultCaption), [defaultCaption]);

  // make the QR image whenever the link or colour changes
  useEffect(() => {
    if (!link) {
      setQrUrl(null);
      return;
    }
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(link, { width: 720, margin: 1, errorCorrectionLevel: "H", color: { dark: qrColor, light: "#FFFFFF" } }).then((u) => live && setQrUrl(u)),
    );
    return () => {
      live = false;
    };
  }, [link, qrColor]);

  const openDesign = async (src: string) => {
    setErr(null);
    try {
      let url = src;
      if (/^https?:/.test(src)) url = URL.createObjectURL(await (await fetch(src)).blob());
      const img = await loadImage(url);
      setDesignSrc(url);
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    } catch {
      setErr("Could not open that design. Download it first, then upload the file from your device.");
    }
  };

  const onDesignFile = async (f: File | null) => {
    setDesignFile(f);
    if (!f) {
      setDesignSrc(null);
      setDims(null);
      return;
    }
    try {
      if (isPdf(f)) await openDesign(await pdfFirstPage(f));
      else if (isImage(f)) await openDesign(URL.createObjectURL(f));
      else setErr("Upload a PDF or an image.");
    } catch {
      setErr("Could not read that file.");
    }
  };

  const onDropFile = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onDesignFile(f);
  };

  /* ---- placement ---- */
  const ar = dims ? dims.w / dims.h : 1;
  const capFrac = caption.trim() ? CAPTION_FRAC : 0;
  const cardHFrac = qr.size * (1 + capFrac) * ar; // QR card height as a share of design height
  const shownY = Math.min(qr.y, Math.max(0, 1 - cardHFrac));

  const place = (x: number, y: number, size = qr.size) => {
    const h = size * (1 + capFrac) * ar;
    setQr({ size, x: Math.min(Math.max(0, x), 1 - size), y: Math.min(Math.max(0, y), Math.max(0, 1 - h)) });
  };
  const snap = (c: Corner) => {
    const m = 0.04;
    place(c.includes("l") ? m : 1 - qr.size - m, c.includes("t") ? m : 1 - cardHFrac - m);
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    drag.current = { dx: (e.clientX - box.left) / box.width - qr.x, dy: (e.clientY - box.top) / box.height - shownY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!drag.current || !box) return;
    place((e.clientX - box.left) / box.width - drag.current.dx, (e.clientY - box.top) / box.height - drag.current.dy);
  };
  const onUp = () => {
    drag.current = null;
  };

  const download = async () => {
    if (!designSrc || !dims || !qrUrl) return;
    setComposing(true);
    setErr(null);
    try {
      const [design, qrImg] = await Promise.all([loadImage(designSrc), loadImage(qrUrl)]);
      const { w: W, h: H } = dims;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(design, 0, 0, W, H);

      const cw = qr.size * W;
      const pad = cw * 0.07;
      const side = cw - 2 * pad;
      const capH = capFrac * cw;
      const ch = pad + side + capH + pad;
      const cx = qr.x * W;
      const cy = shownY * H;

      ctx.fillStyle = "#FFFFFF";
      roundRectPath(ctx, cx, cy, cw, ch, cw * 0.06);
      ctx.fill();
      ctx.drawImage(qrImg, cx + pad, cy + pad, side, side);

      const text = caption.trim();
      if (text) {
        let fs = cw * 0.07;
        ctx.font = `700 ${fs}px system-ui, sans-serif`;
        while (ctx.measureText(text).width > cw - 2 * pad && fs > 6) {
          fs -= 1;
          ctx.font = `700 ${fs}px system-ui, sans-serif`;
        }
        ctx.fillStyle = qrColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx + cw / 2, cy + pad + side + capH / 2);
      }
      canvas.toBlob((b) => b && saveBlob(b, `twomindesign_with_qr_${Date.now()}.png`), "image/png");
    } catch {
      setErr("Could not build the final image. Try again.");
    } finally {
      setComposing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-2 flex flex-col gap-5 min-w-0">
        <div>
          <Label>Your design *</Label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              onDesignFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {designFile ? (
            <div className="og-card flex items-center gap-3 p-3.5" style={{ boxShadow: "none" }}>
              <div className="og-tile w-11 h-11 rounded-xl shrink-0"><FileCheck2 size={19} /></div>
              <p className="text-sm font-semibold og-text truncate flex-1">{designFile.name}</p>
              <button onClick={() => onDesignFile(null)} aria-label="Remove file" className="og-ghost" style={{ padding: ".45rem" }}><X size={15} /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDropFile}
              style={{ borderColor: over ? "var(--accent)" : "var(--border)", background: over ? "var(--soft)" : "var(--input)" }}
              className="og-focus w-full rounded-2xl border-2 border-dashed py-9 px-4 flex flex-col items-center gap-2"
            >
              <div className="og-tile w-12 h-12 rounded-2xl"><UploadCloud size={22} /></div>
              <span className="text-sm font-semibold og-text">Upload a design or drop it here</span>
              <span className="text-xs og-faint">PNG, JPG or PDF (first page)</span>
            </button>
          )}
          {lastDesign && !designSrc && (
            <button className="og-ghost mt-3 w-full justify-center" onClick={() => openDesign(lastDesign)}>
              <Sparkles size={14} />
              Use the design I just made
            </button>
          )}
        </div>

        <div>
          <Label note="(optional)">Text under the QR</Label>
          <input className="og-input" maxLength={26} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>

        <div>
          <Label>QR colour</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                aria-label={c.name}
                aria-pressed={qrColor === c.hex}
                onClick={() => setQrColor(c.hex)}
                className="og-focus w-9 h-9 rounded-full border-2"
                style={{ background: c.hex, borderColor: qrColor === c.hex ? "var(--accent)" : "var(--border)", boxShadow: qrColor === c.hex ? "0 0 0 3px var(--ring)" : "none" }}
              />
            ))}
          </div>
          <p className="text-xs og-faint mt-1.5">Dark colours scan best.</p>
        </div>

        <div>
          <Label>QR size</Label>
          <input type="range" min={0.1} max={0.45} step={0.01} value={qr.size} onChange={(e) => place(qr.x, shownY, Number(e.target.value))} className="w-full" style={{ accentColor: "var(--accent)" }} aria-label="QR size" />
          <p className="text-xs og-faint mt-1">Bigger scans easier from far away. Keep it off important text.</p>
        </div>

        <div>
          <Label>Jump to a corner</Label>
          <div className="grid grid-cols-2 gap-2">
            {([["tl", "Top left"], ["tr", "Top right"], ["bl", "Bottom left"], ["br", "Bottom right"]] as [Corner, string][]).map(([c, label]) => (
              <button key={c} className="og-chip og-focus !rounded-xl !py-2.5" onClick={() => snap(c)} disabled={!designSrc}>{label}</button>
            ))}
          </div>
        </div>

        {err && (
          <div role="alert" className="rounded-2xl p-4 text-sm border" style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}>{err}</div>
        )}

        <button className="og-btn" onClick={download} disabled={!designSrc || !qrUrl || composing}>
          {composing ? (<><span className="og-spin" />Building image...</>) : (<><span className="og-btn-icon"><Download size={16} /></span>Download design with QR</>)}
        </button>
      </section>

      <section className="xl:col-span-3 min-w-0">
        <div
          className="og-card overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDropFile}
          style={over ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" } : undefined}
        >
          <div className="p-4 border-b og-divider flex items-center justify-between gap-2">
            <p className="text-sm font-semibold og-text">Preview</p>
            {designSrc && (
              <p className="text-xs og-faint flex items-center gap-1.5"><Move size={13} />Drag the QR to move it</p>
            )}
          </div>
          {designSrc && dims && qrUrl ? (
            <div className="p-4">
              <div
                ref={boxRef}
                className="relative select-none overflow-hidden rounded-2xl border og-divider mx-auto"
                style={{ aspectRatio: `${dims.w} / ${dims.h}`, containerType: "inline-size", width: `min(100%, calc(75vh * ${ar}))` } as CSSProperties}
              >
                <img src={designSrc} alt="Your design" className="absolute inset-0 w-full h-full" draggable={false} />
                <div
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${qr.x * 100}%`,
                    top: `${shownY * 100}%`,
                    width: `${qr.size * 100}cqw`,
                    padding: `${qr.size * 7}cqw`,
                    borderRadius: `${qr.size * 6}cqw`,
                    boxSizing: "border-box",
                    background: "#fff",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,.45)",
                    touchAction: "none",
                  }}
                >
                  <img src={qrUrl} alt="QR code" className="w-full block" draggable={false} />
                  {capFrac > 0 && (
                    <div className="flex items-center justify-center font-bold whitespace-nowrap overflow-hidden" style={{ height: `${qr.size * CAPTION_FRAC * 100}cqw`, fontSize: `${qr.size * 7}cqw`, color: qrColor }}>
                      {caption}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
              <div className="og-tile w-16 h-16 rounded-2xl"><ImageDown size={28} /></div>
              <p className="og-muted text-sm text-center font-medium">{link ? "Your design will appear here" : "Choose what the QR opens first"}</p>
              <p className="og-faint text-xs text-center">{link ? "Drop a design here, then drag the QR where you want it" : "Then add your design"}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}