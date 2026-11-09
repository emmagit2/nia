import type { LogoPlacement, LogoSize, Spot } from "../components/AIDesigner";

const SIZE: Record<LogoSize, number> = { s: 0.14, m: 0.2, l: 0.3 };
const POS: Record<Spot, [number, number]> = {
  tl: [0, 0], tc: [0.5, 0], tr: [1, 0],
  ml: [0, 0.5], c: [0.5, 0.5], mr: [1, 0.5],
  bl: [0, 1], bc: [0.5, 1], br: [1, 1],
};

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("image failed to load"));
    i.src = src;
  });

/** Draws the user's real logo onto the finished design. Returns a PNG data URL. */
export async function stampLogo(designDataUrl: string, logo: LogoPlacement): Promise<string> {
  const logoUrl = URL.createObjectURL(logo.file);
  try {
    const [bg, lg] = await Promise.all([loadImg(designDataUrl), loadImg(logoUrl)]);
    const c = document.createElement("canvas");
    c.width = bg.naturalWidth;
    c.height = bg.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bg, 0, 0);

    const box = c.width * SIZE[logo.size]; // the logo fits inside this square
    const scale = Math.min(box / lg.naturalWidth, box / lg.naturalHeight);
    const w = lg.naturalWidth * scale;
    const h = lg.naturalHeight * scale;

    const margin = Math.min(c.width, c.height) * 0.04; // keep it off the edge
    const [fx, fy] = POS[logo.spot];
    const x = margin + fx * (c.width - 2 * margin - w);
    const y = margin + fy * (c.height - 2 * margin - h);

    if (logo.pad) {
      const p = margin * 0.6;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(x - p, y - p, w + 2 * p, h + 2 * p, p);
      ctx.fill();
    }

    ctx.drawImage(lg, x, y, w, h);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(logoUrl);
  }
}