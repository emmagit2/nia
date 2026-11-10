import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Sparkles, Plus, X, Paperclip, Wand2, ImagePlus, LayoutGrid } from "lucide-react";
import { colorName, detectColors, fitUpload, type RecentImage, type Swatch } from "./ImagePicker";

/* -------------------------------------------------------------------------- */
/*  src/components/AIDesigner.tsx                                              */
/*  Prompt composer (up to 4 attached templates / own designs), design types   */
/*  in groups, Custom format, text on the design, colours and layout.          */
/* -------------------------------------------------------------------------- */

export type DesignTypeName =
  | "Logo" | "Business Card"
  | "Flyer" | "Poster" | "Invitation" | "Menu" | "Banner"
  | "Social Post" | "Story" | "Facebook Cover" | "YouTube Thumbnail"
  | "Custom";

 // Ideogram can take more, but 3 keeps "image 1, 2, 3" simple
export const MAX_REFERENCES = 3;

export type Role = "style" | "background" | "logo";
export type Spot = "tl" | "tc" | "tr" | "ml" | "c" | "mr" | "bl" | "bc" | "br";
export type LogoSize = "s" | "m" | "l";

export const SPOTS: { id: Spot; label: string; words: string }[] = [
  { id: "tl", label: "Top left", words: "top-left corner" },
  { id: "tc", label: "Top centre", words: "top centre" },
  { id: "tr", label: "Top right", words: "top-right corner" },
  { id: "ml", label: "Middle left", words: "middle of the left side" },
  { id: "c", label: "Centre", words: "centre" },
  { id: "mr", label: "Middle right", words: "middle of the right side" },
  { id: "bl", label: "Bottom left", words: "bottom-left corner" },
  { id: "bc", label: "Bottom centre", words: "bottom centre" },
  { id: "br", label: "Bottom right", words: "bottom-right corner" },
];

export interface LogoPlacement {
  file: File;
  spot: Spot;
  size: LogoSize;
  pad: boolean; // draw a light pad behind the logo
}


export interface Reference {
  id: string;
  file: File;
  preview: string;
  source: "template" | "upload";
  label: string;
  templateId?: string;
}

 export interface DesignPayload {
  businessName: string;
  type: DesignTypeName;
  formatLabel: string;
  aspectRatio: string;
  aspect: number;
  prompt: string;              // everything except the text rule
  textRule: string;            // added after any AI rewrite, never changed
  layout: string;
  colors: string[];
  designText: string;
  guideFiles: File[];          // style and background images, in order (never the logo)
  logo: LogoPlacement | null;  // pasted on after the design is made
}

export interface DesignValues {
  businessName: string;
  type: DesignTypeName;
  description: string;
}

export interface TemplateLite {
  id: string;
  title: string;
  type: string;
}

/* ---------------------------------- layouts --------------------------------- */

type Tone = "t" | "i" | "s";
type Box = [number, number, number, number, Tone];
interface LayoutDef {
  id: string;
  label: string;
  prompt: string;
  boxes: Box[]; // fractions of the shape (0 to 1)
}

const L = (w: number, h: number, defs: LayoutDef[]): LayoutDef[] =>
  defs.map((d) => ({ ...d, boxes: d.boxes.map(([x, y, bw, bh, t]) => [x / w, y / h, bw / w, bh / h, t] as Box) }));

const LOGO = L(100, 100, [
  { id: "stack", label: "Symbol on top", prompt: "Layout: symbol on top, business name centred below it, small tagline under the name.", boxes: [[35, 12, 30, 30, "i"], [18, 52, 64, 10, "t"], [32, 68, 36, 5, "s"]] },
  { id: "side", label: "Symbol on left", prompt: "Layout: symbol on the left and business name on the right, in one horizontal line.", boxes: [[8, 34, 30, 30, "i"], [46, 40, 46, 9, "t"], [46, 54, 34, 5, "s"]] },
  { id: "wordmark", label: "Text only", prompt: "Layout: text-only logo (wordmark), the business name styled as the logo, no symbol.", boxes: [[10, 42, 80, 16, "t"], [30, 64, 40, 5, "s"]] },
  { id: "badge", label: "Round badge", prompt: "Layout: round badge or emblem with a symbol in the centre and the business name around or inside it.", boxes: [[18, 14, 64, 64, "i"], [30, 40, 40, 10, "t"], [34, 84, 32, 5, "s"]] },
]);

const CARD = L(100, 60, [
  { id: "horizontal", label: "Logo left", prompt: "Layout: horizontal card with the logo on the left, name and job title on the right, contact details below.", boxes: [[8, 16, 24, 24, "i"], [40, 14, 50, 8, "t"], [40, 26, 36, 5, "s"], [40, 42, 48, 4, "s"]] },
  { id: "centered", label: "Centred", prompt: "Layout: centred card with the logo on top, name and job title in the middle, contact details at the bottom.", boxes: [[38, 5, 24, 16, "i"], [24, 27, 52, 8, "t"], [32, 38, 36, 5, "s"], [26, 48, 48, 4, "s"]] },
  { id: "bar", label: "Colour bar", prompt: "Layout: a wide colour bar on the left side, name and job title on the right, contact details below.", boxes: [[0, 0, 16, 60, "i"], [24, 14, 60, 8, "t"], [24, 26, 40, 5, "s"], [24, 44, 56, 4, "s"]] },
  { id: "logo", label: "Logo only", prompt: "Layout: simple back side of a business card with only the large logo in the centre.", boxes: [[30, 10, 40, 40, "i"]] },
]);

const FLYER = L(100, 130, [
  { id: "headline", label: "Big headline", prompt: "Layout: very large headline at the top, a main picture in the middle, details and a call to action button at the bottom.", boxes: [[8, 8, 84, 18, "t"], [8, 32, 84, 56, "i"], [8, 94, 84, 8, "s"], [8, 108, 40, 12, "s"]] },
  { id: "split", label: "Split", prompt: "Layout: split design, picture on the left half and text on the right half, call to action at the bottom right.", boxes: [[0, 0, 48, 130, "i"], [54, 20, 40, 14, "t"], [54, 40, 40, 6, "s"], [54, 50, 40, 6, "s"], [54, 106, 36, 12, "s"]] },
  { id: "centered", label: "Centred", prompt: "Layout: everything centred, small line at the top, big headline in the middle, picture below it, contact details at the bottom.", boxes: [[20, 10, 60, 8, "s"], [10, 26, 80, 22, "t"], [22, 54, 56, 44, "i"], [24, 106, 52, 8, "s"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: full background picture with a dark overlay, headline and details placed in the bottom third.", boxes: [[0, 0, 100, 130, "i"], [8, 84, 84, 18, "t"], [8, 108, 56, 8, "s"]] },
]);

const SOCIAL = L(100, 100, [
  { id: "centered", label: "Picture and text", prompt: "Layout: main picture on top and a bold headline with a small line below it.", boxes: [[10, 10, 80, 50, "i"], [14, 66, 72, 12, "t"], [30, 83, 40, 7, "s"]] },
  { id: "textleft", label: "Text left", prompt: "Layout: text on the left side (headline, short line, button) and the main picture on the right side.", boxes: [[8, 26, 50, 16, "t"], [8, 48, 44, 6, "s"], [8, 72, 30, 10, "s"], [62, 14, 30, 72, "i"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: full-bleed picture filling the whole design with a short bold caption near the bottom.", boxes: [[0, 0, 100, 100, "i"], [8, 70, 84, 14, "t"]] },
  { id: "bold", label: "Bold text", prompt: "Layout: mostly big bold text in the middle with simple shapes around it, small line at the bottom.", boxes: [[10, 24, 80, 46, "t"], [30, 82, 40, 6, "s"]] },
]);

const POSTER = L(1, 1, [
  { id: "bigimage", label: "Big picture", prompt: "Layout: large main picture filling the top two thirds, bold headline below it, small details at the bottom.", boxes: [[0.06, 0.05, 0.88, 0.6, "i"], [0.06, 0.7, 0.88, 0.12, "t"], [0.06, 0.85, 0.6, 0.05, "s"], [0.06, 0.92, 0.4, 0.05, "s"]] },
  { id: "headline", label: "Headline top", prompt: "Layout: huge headline at the top, picture in the middle, details in a strip at the bottom.", boxes: [[0.06, 0.05, 0.88, 0.2, "t"], [0.1, 0.3, 0.8, 0.5, "i"], [0.06, 0.88, 0.88, 0.06, "s"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: full-bleed picture with a dark overlay, headline in the lower third and details under it.", boxes: [[0, 0, 1, 1, "i"], [0.06, 0.72, 0.88, 0.14, "t"], [0.06, 0.9, 0.5, 0.05, "s"]] },
  { id: "type", label: "Typographic", prompt: "Layout: typographic poster, huge bold words fill most of the space, small details underneath, no photo.", boxes: [[0.08, 0.1, 0.84, 0.55, "t"], [0.08, 0.72, 0.5, 0.05, "s"], [0.08, 0.8, 0.7, 0.05, "s"]] },
]);

const INVITE = L(1, 1, [
  { id: "classic", label: "Centred classic", prompt: "Layout: elegant centred invitation: small line on top, names or title in large script, a decorative symbol, then date, time and venue lines.", boxes: [[0.2, 0.06, 0.6, 0.06, "s"], [0.1, 0.16, 0.8, 0.16, "t"], [0.3, 0.38, 0.4, 0.2, "i"], [0.2, 0.64, 0.6, 0.05, "s"], [0.2, 0.72, 0.6, 0.05, "s"], [0.25, 0.86, 0.5, 0.06, "s"]] },
  { id: "frame", label: "Border frame", prompt: "Layout: ornate border frame around the whole invitation, title in the middle and event details below it.", boxes: [[0.05, 0.04, 0.9, 0.92, "i"], [0.2, 0.2, 0.6, 0.14, "t"], [0.28, 0.45, 0.44, 0.05, "s"], [0.28, 0.55, 0.44, 0.05, "s"]] },
  { id: "picturetop", label: "Picture top", prompt: "Layout: picture across the top, title below it, then date, time and venue.", boxes: [[0, 0, 1, 0.45, "i"], [0.1, 0.52, 0.8, 0.12, "t"], [0.2, 0.7, 0.6, 0.05, "s"], [0.2, 0.78, 0.6, 0.05, "s"]] },
  { id: "minimal", label: "Minimal", prompt: "Layout: minimal invitation with lots of white space, title in the middle and two small lines below.", boxes: [[0.12, 0.3, 0.76, 0.18, "t"], [0.3, 0.56, 0.4, 0.05, "s"], [0.3, 0.66, 0.4, 0.05, "s"]] },
]);

const MENU = L(1, 1, [
  { id: "columns", label: "Two columns", prompt: "Layout: restaurant name header at the top and the menu items in two clean columns with prices.", boxes: [[0.1, 0.04, 0.8, 0.1, "t"], [0.08, 0.2, 0.4, 0.7, "s"], [0.52, 0.2, 0.4, 0.7, "s"]] },
  { id: "phototop", label: "Photo top", prompt: "Layout: food photo across the top, restaurant name under it, menu items listed below with prices.", boxes: [[0, 0, 1, 0.3, "i"], [0.1, 0.34, 0.8, 0.08, "t"], [0.1, 0.48, 0.8, 0.4, "s"]] },
  { id: "single", label: "Single column", prompt: "Layout: single centred column, name at the top, then the menu items with prices.", boxes: [[0.2, 0.05, 0.6, 0.1, "t"], [0.15, 0.2, 0.7, 0.7, "s"]] },
  { id: "side", label: "Side photo", prompt: "Layout: tall food photo on the left, name and menu items on the right.", boxes: [[0, 0, 0.35, 1, "i"], [0.42, 0.06, 0.5, 0.1, "t"], [0.42, 0.22, 0.5, 0.7, "s"]] },
]);

const WIDE = L(1, 1, [
  { id: "textleft", label: "Text left", prompt: "Layout: wide banner, headline and call to action on the left, main picture on the right.", boxes: [[0.04, 0.2, 0.5, 0.3, "t"], [0.04, 0.58, 0.4, 0.12, "s"], [0.04, 0.78, 0.2, 0.14, "s"], [0.62, 0.08, 0.34, 0.84, "i"]] },
  { id: "centered", label: "Centred", prompt: "Layout: wide banner with everything centred: headline, one short line, call to action.", boxes: [[0.2, 0.2, 0.6, 0.34, "t"], [0.3, 0.62, 0.4, 0.12, "s"], [0.4, 0.8, 0.2, 0.14, "s"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: wide full-bleed picture with a short headline on the left.", boxes: [[0, 0, 1, 1, "i"], [0.06, 0.25, 0.55, 0.35, "t"]] },
  { id: "split", label: "Split", prompt: "Layout: wide banner split in two, picture on the left, headline and details on the right.", boxes: [[0, 0, 0.45, 1, "i"], [0.52, 0.2, 0.42, 0.3, "t"], [0.52, 0.6, 0.3, 0.14, "s"]] },
]);

const TALL = L(1, 1, [
  { id: "picturecaption", label: "Picture and caption", prompt: "Layout: tall vertical design with a small label on top, a big picture in the middle, a bold caption under it and a small call to action at the bottom. Keep the top and bottom edges clear of key text.", boxes: [[0.06, 0.04, 0.88, 0.06, "s"], [0.06, 0.12, 0.88, 0.55, "i"], [0.08, 0.72, 0.84, 0.1, "t"], [0.25, 0.88, 0.5, 0.06, "s"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: full-bleed vertical picture with a bold caption in the lower middle. Keep the top and bottom edges clear of key text.", boxes: [[0, 0, 1, 1, "i"], [0.08, 0.64, 0.84, 0.12, "t"], [0.3, 0.86, 0.4, 0.05, "s"]] },
  { id: "bigtext", label: "Big text", prompt: "Layout: vertical design with a very large bold message in the middle and simple shapes around it.", boxes: [[0.08, 0.2, 0.84, 0.4, "t"], [0.15, 0.68, 0.7, 0.05, "s"], [0.3, 0.86, 0.4, 0.06, "s"]] },
  { id: "headlinetop", label: "Headline top", prompt: "Layout: vertical design with a headline at the top, a picture in the middle and a button at the bottom.", boxes: [[0.08, 0.06, 0.84, 0.14, "t"], [0.1, 0.26, 0.8, 0.5, "i"], [0.25, 0.84, 0.5, 0.07, "s"]] },
]);

const THUMB = L(1, 1, [
  { id: "facetext", label: "Picture and text", prompt: "Layout: big expressive picture on the right, huge short text on the left, high contrast.", boxes: [[0.5, 0.05, 0.47, 0.9, "i"], [0.04, 0.15, 0.46, 0.5, "t"], [0.04, 0.72, 0.3, 0.14, "s"]] },
  { id: "bigtext", label: "Big text", prompt: "Layout: very large bold text across the middle with a strong background and a small line under it.", boxes: [[0.05, 0.15, 0.9, 0.5, "t"], [0.05, 0.72, 0.5, 0.12, "s"]] },
  { id: "fullimage", label: "Full picture", prompt: "Layout: full-bleed picture with big bold text in the lower left.", boxes: [[0, 0, 1, 1, "i"], [0.05, 0.55, 0.6, 0.35, "t"]] },
  { id: "versus", label: "Versus", prompt: "Layout: two pictures side by side with a bold word or symbol between them.", boxes: [[0, 0, 0.48, 1, "i"], [0.52, 0, 0.48, 1, "i"], [0.38, 0.38, 0.24, 0.24, "t"]] },
]);

/* --------------------------------- design types ------------------------------ */

interface TypeDef {
  label: string;
  promptName: string;
  ratio: [number, number];
  placeholder: string;
  layouts: LayoutDef[];
}

const TYPE_DEFS: Record<Exclude<DesignTypeName, "Custom">, TypeDef> = {
  Logo: { label: "Logo", promptName: "Logo", ratio: [1, 1], layouts: LOGO, placeholder: "e.g: Modern minimalist logo for my tech startup, clean geometric symbol, friendly feel" },
  "Business Card": { label: "Business Card", promptName: "Business card", ratio: [7, 4], layouts: CARD, placeholder: "e.g: Professional business card for a civil engineer, corporate style, simple line pattern" },
  Flyer: { label: "Flyer", promptName: "Flyer", ratio: [3, 4], layouts: FLYER, placeholder: "e.g: Grand opening promo for my barbershop, Lagos style, a barber cutting hair in the middle" },
  Poster: { label: "Poster", promptName: "Poster", ratio: [2, 3], layouts: POSTER, placeholder: "e.g: Concert poster for a gospel night, bold gold lettering, stage lights" },
  Invitation: { label: "Invitation", promptName: "Invitation card", ratio: [2, 3], layouts: INVITE, placeholder: "e.g: Wedding invitation, ivory and gold, floral border, elegant script names" },
  Menu: { label: "Menu", promptName: "Menu", ratio: [2, 3], layouts: MENU, placeholder: "e.g: Menu for a Nigerian restaurant, jollof, suya and pepper soup, warm earthy colours" },
  Banner: { label: "Banner", promptName: "Wide banner", ratio: [3, 1], layouts: WIDE, placeholder: "e.g: Roll-up banner for my phone shop, new arrivals, blue and white" },
  "Social Post": { label: "Social Post", promptName: "Square social media post", ratio: [1, 1], layouts: SOCIAL, placeholder: "e.g: Instagram promo post for my restaurant special offer, Friday night vibes, plate of jollof rice" },
  Story: { label: "Story / Status", promptName: "Vertical story (Instagram, WhatsApp or Facebook story)", ratio: [9, 16], layouts: TALL, placeholder: "e.g: Instagram story announcing a weekend sale, bold text, big discount badge" },
  "Facebook Cover": { label: "Facebook Cover", promptName: "Facebook page cover", ratio: [8, 3], layouts: WIDE, placeholder: "e.g: Facebook cover for a catering business, food spread, warm colours, phone number" },
  "YouTube Thumbnail": { label: "YouTube Thumbnail", promptName: "YouTube thumbnail", ratio: [16, 9], layouts: THUMB, placeholder: "e.g: Thumbnail for a cooking video, shocked face, big text 'SECRET RECIPE'" },
};

const GROUPS: { id: string; label: string; types: DesignTypeName[] }[] = [
  { id: "brand", label: "Branding", types: ["Logo", "Business Card"] },
  { id: "print", label: "Print", types: ["Flyer", "Poster", "Invitation", "Menu", "Banner"] },
  { id: "social", label: "Social media", types: ["Social Post", "Story", "Facebook Cover", "YouTube Thumbnail"] },
  { id: "custom", label: "Custom", types: ["Custom"] },
];

const CUSTOM_FORMATS: { id: string; label: string; hint: string; r: [number, number] }[] = [
  { id: "ig-post", label: "Instagram post", hint: "1:1", r: [1, 1] },
  { id: "ig-portrait", label: "Instagram portrait", hint: "4:5", r: [4, 5] },
  { id: "ig-story", label: "Instagram story / reel", hint: "9:16", r: [9, 16] },
  { id: "wa-status", label: "WhatsApp status", hint: "9:16", r: [9, 16] },
  { id: "tiktok", label: "TikTok cover", hint: "9:16", r: [9, 16] },
  { id: "x-header", label: "X / Twitter header", hint: "3:1", r: [3, 1] },
  { id: "linkedin", label: "LinkedIn banner", hint: "4:1", r: [4, 1] },
  { id: "a4p", label: "A4 portrait", hint: "210 × 297", r: [210, 297] },
  { id: "a4l", label: "A4 landscape", hint: "297 × 210", r: [297, 210] },
  { id: "own", label: "Own size", hint: "type it", r: [1, 1] },
];

const customLayouts = (aspect: number): LayoutDef[] =>
  aspect >= 1.8 ? WIDE : aspect <= 0.62 ? TALL : aspect < 0.95 ? POSTER : aspect > 1.3 ? THUMB : SOCIAL;

 function LayoutThumb({ shape, boxes }: { shape: { w: number; h: number }; boxes: Box[] }) {
  const fill: Record<Tone, string> = {
    t: "var(--accent, #F0B400)",
    i: "var(--muted, #888)",
    s: "var(--faint, #aaa)",
  };
  const opacity: Record<Tone, number> = { t: 1, i: 0.55, s: 0.9 };
  return (
    <svg viewBox={`0 0 ${shape.w} ${shape.h}`} className="w-full block" style={{ maxHeight: 120 }} aria-hidden="true">
      <rect width={shape.w} height={shape.h} rx="3" style={{ fill: "var(--surface-2, #eee)", stroke: "var(--border, #ccc)", strokeWidth: 1 }} />
      {boxes.map(([x, y, w, h, tone], i) => (
        <rect key={i} x={x * shape.w} y={y * shape.h} width={w * shape.w} height={h * shape.h} rx="2" style={{ fill: fill[tone], opacity: opacity[tone] }} />
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
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

const FONTS: { id: string; label: string; css: CSSProperties; prompt: string }[] = [
  { id: "bold", label: "Bold modern", css: { fontFamily: "system-ui, sans-serif", fontWeight: 800 }, prompt: "heavy bold modern sans-serif lettering, clean and highly readable" },
  { id: "elegant", label: "Elegant script", css: { fontFamily: "'Brush Script MT', cursive" }, prompt: "elegant flowing script lettering for the headline with a simple serif for the small details" },
  { id: "serif", label: "Classic serif", css: { fontFamily: "Georgia, serif" }, prompt: "classic high-contrast serif typography, refined and professional" },
  { id: "playful", label: "Playful hand", css: { fontFamily: "'Comic Sans MS', cursive" }, prompt: "playful hand-drawn lettering, friendly and fun" },
  { id: "condensed", label: "Tall condensed", css: { fontFamily: "Impact, sans-serif" }, prompt: "tall condensed uppercase lettering, strong and attention-grabbing" },
  { id: "minimal", label: "Minimal clean", css: { fontFamily: "system-ui, sans-serif", fontWeight: 300 }, prompt: "light, minimal, clean sans-serif typography with generous spacing" },
  { id: "luxury", label: "Luxury", css: { fontFamily: "Georgia, serif", letterSpacing: "0.15em" }, prompt: "luxury display typography, thin elegant serif capitals with wide letter spacing" },
  { id: "retro", label: "Retro", css: { fontFamily: "'Arial Black', sans-serif" }, prompt: "retro vintage lettering with chunky rounded shapes" },
];

function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}

 function SpotPicker({
  value,
  onChange,
  disabled,
  blocked,
  blockedLabel = "Used",
}: {
  value: Spot | null;
  onChange: (s: Spot | null) => void;
  disabled?: boolean;
  blocked?: Spot | null;
  blockedLabel?: string;
}) {
  const current = SPOTS.find((s) => s.id === value);
  return (
    <div>
      <div
        className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl max-w-[220px]"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        {SPOTS.map((s) => {
          const isBlocked = blocked === s.id;
          const on = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              title={isBlocked ? `${blockedLabel} by the other item` : s.label}
              aria-label={s.label}
              aria-pressed={on}
              disabled={disabled || isBlocked}
              onClick={() => onChange(on ? null : s.id)}
              className="og-focus h-11 rounded-xl text-[10px] font-bold flex items-center justify-center"
              style={{
                background: on ? "var(--accent)" : isBlocked ? "transparent" : "var(--input)",
                color: on ? "#1B1500" : "var(--muted)",
                border: on
                  ? "2px solid var(--accent)"
                  : isBlocked
                    ? "2px dashed var(--border)"
                    : "1px solid var(--border)",
                opacity: isBlocked ? 0.6 : 1,
                cursor: isBlocked ? "not-allowed" : "pointer",
              }}
            >
              {on ? "✓" : isBlocked ? blockedLabel : ""}
            </button>
          );
        })}
      </div>
      <p className="text-xs mt-1.5" style={{ color: current ? "var(--accent-text)" : "var(--faint)" }}>
        {current ? `Selected: ${current.label}` : "Nothing selected (the AI decides)"}
      </p>
    </div>
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
  references,
  onUpload,
  onRemove,
  onClear,
  onPickTemplate,
  templates,
  renderArt,
}: {
  values: DesignValues;
  onValues: (p: Partial<DesignValues>) => void;
  loading: boolean;
  creditsLeft: number;
  charge: (cost: number) => Promise<boolean>;
  refund: (amount: number) => Promise<void>;
  recent: RecentImage[];
  onGenerate: (p: DesignPayload) => void;
  /** Templates and own designs attached to the prompt box (state lives in the dashboard). Up to MAX_REFERENCES. */
  references: Reference[];
  onUpload: (file: File, label?: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Toggles a template: attaches it, or removes it if it is already attached. */
  onPickTemplate: (id: string) => void;
  templates: TemplateLite[];
  renderArt: (id: string) => ReactNode;
}) {
  const { getToken } = useAuth();
  const { businessName, type, description } = values;

  // custom format
  const [fmtId, setFmtId] = useState("ig-post");
  const [ownW, setOwnW] = useState("1080");
  const [ownH, setOwnH] = useState("1350");
  const [note, setNote] = useState("");
  const fmt = CUSTOM_FORMATS.find((f) => f.id === fmtId) ?? CUSTOM_FORMATS[0];

  const isCustom = type === "Custom";
  const def = isCustom ? null : TYPE_DEFS[type];
  const [rw, rh] = isCustom ? (fmt.id === "own" ? [Math.max(1, Number(ownW) || 1), Math.max(1, Number(ownH) || 1)] : fmt.r) : def!.ratio;
  const aspect = Math.min(3, Math.max(1 / 3, rw / rh));
  const divisor = gcd(Math.round(rw), Math.round(rh)) || 1;
  const aspectRatio = `${Math.round(rw) / divisor}:${Math.round(rh) / divisor}`;
  const formatLabel = isCustom ? (fmt.id === "own" ? `Custom ${Math.round(rw)} x ${Math.round(rh)}` : fmt.label) : def!.label;
  const shape = { w: 100, h: Math.min(178, Math.max(33, 100 / aspect)) };

  // attached images and their roles
  const hasRefs = references.length > 0;
  const full = references.length >= MAX_REFERENCES;
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const roleOf = (r: Reference): Role => roles[r.id] ?? "style";
  const setRole = (id: string, role: Role) =>
    setRoles((m) => {
      const next = { ...m, [id]: role };
      if (role === "logo") {
        for (const k of Object.keys(next)) if (k !== id && next[k] === "logo") next[k] = "style"; // only one logo
      }
      return next;
    });
  const logoRef = references.find((r) => roleOf(r) === "logo") ?? null;
  const guideRefs = references.filter((r) => roleOf(r) !== "logo");
  const hasGuides = guideRefs.length > 0;

  // name and logo positions
  const [showName, setShowName] = useState(true);
  const [nameSpot, setNameSpot] = useState<Spot | null>(null);
  const [logoSpot, setLogoSpot] = useState<Spot>("tl");
  const [logoSize, setLogoSize] = useState<LogoSize>("m");
  const [logoPad, setLogoPad] = useState(false);
  const effNameSpot = logoRef && nameSpot === logoSpot ? null : nameSpot; // never the same spot as the logo

  // layout
  const layouts = isCustom ? customLayouts(aspect) : def!.layouts;
  const [layoutByKey, setLayoutByKey] = useState<Record<string, string>>({});
  const layoutKey = isCustom ? `Custom-${layouts[0].id}-${layouts.length}` : type;
  const layout = layouts.find((l) => l.id === layoutByKey[layoutKey]) ?? layouts[0];
  const layoutPicked = layoutByKey[layoutKey] !== undefined;
  const useLayout = !hasGuides || layoutPicked; // with style/background images, only use a layout the user chose

  // colours, text, typography
  const [colors, setColors] = useState<string[]>([]);
  const [designText, setDesignText] = useState("");
  const [fontId, setFontId] = useState<string | null>(null);
  const font = FONTS.find((f) => f.id === fontId) ?? null;

  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [describing, setDescribing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // composer
  const [tray, setTray] = useState(false);
  const [drag, setDrag] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const txtInput = useRef<HTMLInputElement>(null);

  const firstUpload = references.find((r) => r.source === "upload" && roleOf(r) !== "logo");
  const group = GROUPS.find((g) => g.types.includes(type)) ?? GROUPS[0];
  const sortedTemplates = [...templates].sort((a, b) => Number(b.type === type) - Number(a.type === type));

  // free colour detection across all attached designs
  const refKey = references.map((r) => r.id).join("|");
  useEffect(() => {
    if (!references.length) {
      setSwatches([]);
      return;
    }
    let live = true;
    Promise.all(references.map((r) => detectColors(r.preview, 5).catch(() => [] as Swatch[]))).then((all) => {
      if (!live) return;
      const seen = new Set<string>();
      const merged: Swatch[] = [];
      for (const s of all.flat()) {
        const k = s.hex.toUpperCase();
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(s);
        }
      }
      setSwatches(merged.slice(0, 8));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  // clear the "limit reached" error once a slot is free
  useEffect(() => {
    if (references.length < MAX_REFERENCES) {
      setErr((e) => (e?.startsWith("You can attach up to") ? null : e));
    }
  }, [references.length]);

  const addColor = (hex: string) =>
    setColors((cs) => (cs.includes(hex.toUpperCase()) || cs.length >= MAX_COLORS ? cs : [...cs, hex.toUpperCase()]));
  const setColorAt = (i: number, hex: string) => setColors((cs) => cs.map((c, j) => (j === i ? hex.toUpperCase() : c)));
  const removeColorAt = (i: number) => setColors((cs) => cs.filter((_, j) => j !== i));

  /** Takes one or more image files (picker, drop or paste) up to the free slots. */
  const takeImages = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return setErr("Attach PNG, JPG or WEBP images.");
    const room = MAX_REFERENCES - references.length;
    if (room <= 0) return setErr(`You can attach up to ${MAX_REFERENCES} designs. Remove one first.`);
    setErr(images.length > room ? `Only ${MAX_REFERENCES} images can be attached. The extra files were skipped.` : null);
    images.slice(0, room).forEach((f) => onUpload(f));
  };

  const pickRecent = async (r: RecentImage) => {
    if (full) return setErr(`You can attach up to ${MAX_REFERENCES} designs. Remove one first.`);
    try {
      const blob = await (await fetch(r.url)).blob();
      setErr(null);
      onUpload(new File([blob], `${r.label || "design"}.png`, { type: blob.type || "image/png" }), r.label || "Recent design");
    } catch {
      setErr("Could not attach that design. Download it and upload it instead.");
    }
  };

  const attachText = async (f?: File | null) => {
    if (!f) return;
    if (!(f.type.startsWith("text/") || f.name.toLowerCase().endsWith(".txt"))) {
      setErr("Attach a .txt file, or type the text yourself.");
      return;
    }
    setErr(null);
    setDesignText((await f.text()).trim().slice(0, 500));
  };

  /** Asks the AI to write a prompt from the first design the user uploaded. 1 credit, refunded on failure. */
  const writePromptFromImage = async () => {
    if (!firstUpload) return;
    setErr(null);
    if (!(await charge(1))) return;
    setDescribing(true);
    try {
      const form = new FormData();
      form.append("action", "describe");
      form.append("file", await fitUpload(firstUpload.file));
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

  const handleRemove = (id: string) => {
    setErr(null);
    onRemove(id);
  };
  const handleClear = () => {
    setErr(null);
    onClear();
  };

  /** Adds "image N" to the prompt box so the user does not have to type it. */
  const insertRef = (n: number) => {
    const sep = description && !/\s$/.test(description) ? " " : "";
    onValues({ description: (description + sep + `image ${n}`).slice(0, 600) });
  };

  /** The exact text rule. Sent separately so no AI rewrite can change the user's words. */
  const buildTextRule = () => {
    const lines = [
      ...(showName && businessName.trim() ? [businessName.trim()] : []),
      ...designText.split("\n").map((s) => s.trim()).filter(Boolean),
    ];
    if (!lines.length) return "The design contains no text at all. Do not add any words, letters or numbers.";
    return `The design must contain ONLY this text, written exactly as given, spelled correctly, each on its own line, in this order: ${lines
      .map((l, i) => `line ${i + 1}: "${l}"`)
      .join("; ")}. Do not add, change, translate or invent any other words, numbers, phone numbers, addresses or placeholder text. Make the text large, sharp and easy to read.`;
  };

  const buildPrompt = () => {
    const name = businessName.trim();
    const kind = isCustom ? `${formatLabel}${note.trim() ? ` (${note.trim()})` : ""}` : def!.promptName;
    const palette = colors.map((c) => `${colorName(c).toLowerCase()} (${c})`).join(", ");
    const words = (s: Spot) => SPOTS.find((x) => x.id === s)!.words;
    const sizeWord = { s: "small", m: "medium", l: "large" }[logoSize];

    let refBlock = "";
    if (hasGuides) {
      const list = guideRefs
        .map((r, i) => {
          const what = roleOf(r) === "background" ? "the background to use" : r.source === "template" ? "a template" : "the user's own design";
          return `Image ${i + 1} is ${what}`;
        })
        .join(". ");
      const hasBg = guideRefs.some((r) => roleOf(r) === "background");
      const hasTpl = guideRefs.some((r) => roleOf(r) === "style" && r.source === "template");
      const hasOwn = guideRefs.some((r) => roleOf(r) === "style" && r.source === "upload");
      refBlock = [
        `The user attached ${guideRefs.length} numbered reference image${guideRefs.length > 1 ? "s" : ""}. ${list}.`,
        hasBg ? "Use the background image as the background scene of the design, keeping its look, and place the content on top of it." : "",
        hasTpl ? (layoutPicked ? "Take only the style, colours and mood from the template(s)." : "Borrow layout and style ideas from the template(s).") : "",
        hasOwn
          ? layoutPicked
            ? "Keep the colours and style of the user's own design(s), but use the layout described below."
            : font
              ? "Keep the look and colours of the user's own design(s), but use the typography described below."
              : "Stay close to the look of the user's own design(s)."
          : "",
        guideRefs.length > 1 ? "Create ONE new design, not a collage." : "Create a new original design, do not copy exactly.",
      ]
        .filter(Boolean)
        .join(" ");
    }

    return [
      `A professional ${kind} for "${name}", ${aspectRatio} aspect ratio.`,
      description.trim() || (hasGuides ? "Polished, modern and clean." : ""),
      refBlock,
      useLayout ? `${layout.prompt} Follow this arrangement of the elements.` : "",
      showName && name && effNameSpot ? `Place the business name "${name}" in the ${words(effNameSpot)}.` : "",
      logoRef
        ? `Keep the ${words(logoSpot)} completely empty and plain, a clean ${sizeWord}-sized area with no text, for the company logo that will be added later. Do not draw any logo, emblem or symbol anywhere.`
        : "",
      font ? `Typography: ${font.prompt}. Use this lettering style for all the text on the design.` : "",
      colors.length ? `Colour palette: ${palette}. Use mainly these colours with strong contrast so the text is easy to read.` : "",
      "High quality, sharp details, balanced composition, no watermark.",
    ]
      .filter(Boolean)
      .join(" ");
  };

const canGo = !!businessName.trim() && (!!description.trim() || hasGuides) && !describing;
  const generate = () =>
    onGenerate({
      businessName: businessName.trim(),
      type,
      formatLabel,
      aspectRatio,
      aspect,
      prompt: buildPrompt(),
      textRule: buildTextRule(),
      layout: useLayout ? layout.label : `Attached: ${guideRefs.map((r) => r.label).join(", ")}`,
      colors,
      designText: designText.trim(),
      guideFiles: guideRefs.map((r) => r.file),
      logo: logoRef ? { file: logoRef.file, spot: logoSpot, size: logoSize, pad: logoPad } : null,
    });

  const placeholder = hasGuides
    ? "e.g: Use the colours of image 1 and the layout of image 2, with my business name"
    : isCustom
      ? "e.g: Instagram highlight cover for my bakery, cupcake icon, pink and white"
      : def!.placeholder;

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

      {/* Design type: groups, then types */}
      <div>
        <Label>What do you want to design?</Label>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={loading}
              data-active={group.id === g.id}
              onClick={() => onValues({ type: g.types.includes(type) ? type : g.types[0] })}
              className="og-chip og-focus shrink-0 !py-2 !px-4 !text-sm !font-semibold"
            >
              {g.label}
            </button>
          ))}
        </div>
        {group.id !== "custom" && (
          <div className="grid grid-cols-2 gap-2">
            {group.types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onValues({ type: t })}
                disabled={loading}
                data-active={type === t}
                className="og-chip og-focus !rounded-xl !py-2.5 !text-sm !font-semibold"
              >
                {TYPE_DEFS[t as Exclude<DesignTypeName, "Custom">].label}
              </button>
            ))}
          </div>
        )}

        {isCustom && (
          <div className="og-card p-3.5 flex flex-col gap-3 og-in" style={{ boxShadow: "none", borderRadius: 18 }}>
            <p className="text-xs og-faint">Where will you use it? Pick a size, or type your own.</p>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_FORMATS.map((f) => (
                <button key={f.id} type="button" disabled={loading} data-active={fmtId === f.id} onClick={() => setFmtId(f.id)} className="og-chip og-focus">
                  {f.label}
                  <span className="opacity-70"> · {f.hint}</span>
                </button>
              ))}
            </div>
            {fmt.id === "own" && (
              <div className="flex items-center gap-2">
                <input type="number" min={1} className="og-input" value={ownW} onChange={(e) => setOwnW(e.target.value)} aria-label="Width" placeholder="Width" disabled={loading} />
                <span className="og-faint">×</span>
                <input type="number" min={1} className="og-input" value={ownH} onChange={(e) => setOwnH(e.target.value)} aria-label="Height" placeholder="Height" disabled={loading} />
              </div>
            )}
            <input
              className="og-input"
              placeholder="What is it for? e.g: Instagram highlight cover, church programme cover"
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs og-faint">Shape: {formatLabel} ({aspectRatio}). The AI draws it in the nearest supported shape.</p>
          </div>
        )}
      </div>

      {/* Prompt composer */}
      <div>
        <Label>Your prompt *</Label>
        <input
          ref={imgInput}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            takeImages(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <div
          className="og-composer"
          data-drag={drag}
          onDragOver={(e) => { e.preventDefault(); if (!loading) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (!loading) takeImages(Array.from(e.dataTransfer.files ?? [])); }}
        >
          {hasRefs && (
            <>
              <div className="flex flex-wrap items-start gap-2.5 p-3 pb-0 og-in">
                {references.map((r) => {
                  const role = roleOf(r);
                  const n = guideRefs.findIndex((g) => g.id === r.id) + 1;
                  return (
                    <div key={r.id} className="flex flex-col gap-1">
                    <div
  className={`og-attach ${role === "logo" ? "og-checker" : ""}`}
  title={role === "logo" ? "Logo" : `Image ${n}: ${r.label}`}
>
  <img
    src={r.preview}
    alt={r.label}
    className={`w-full h-full ${role === "logo" ? "object-contain p-1" : "object-cover"}`}
  />
  <button type="button" onClick={() => handleRemove(r.id)} disabled={loading} aria-label={`Remove ${r.label}`} className="og-attach-x og-focus">
    <X size={12} />
  </button>
  <span className="absolute inset-x-0 bottom-0 text-[9px] font-semibold text-center text-white py-0.5" style={{ background: "rgba(0,0,0,.6)" }}>
    {role === "logo" ? "Logo" : `Image ${n}`}
  </span>
</div>
                     <select
  className="og-input !py-1 !px-1.5 !text-[11px]"
  style={{ colorScheme: "dark light", background: "var(--input)", color: "var(--text)" }}
  value={role}
  disabled={loading}
  onChange={(e) => setRole(r.id, e.target.value as Role)}
  aria-label="What is this image?"
>
  <option value="style" style={{ background: "var(--surface)", color: "var(--text)" }}>Style</option>
  <option value="background" style={{ background: "var(--surface)", color: "var(--text)" }}>Background</option>
  <option value="logo" style={{ background: "var(--surface)", color: "var(--text)" }}>Logo</option>
</select>
                    </div>
                  );
                })}
                <div className="flex flex-col items-start gap-1 ml-1">
                  <span className="text-xs og-faint">{references.length}/{MAX_REFERENCES} attached</span>
                  <button type="button" onClick={handleClear} disabled={loading} className="text-xs og-muted hover:underline">
                    Remove all
                  </button>
                </div>
              </div>
              {hasGuides && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
                  <span className="text-xs og-faint">Tap to mention:</span>
                  {guideRefs.map((_, i) => (
                    <button key={i} type="button" className="og-ghost" onClick={() => insertRef(i + 1)} disabled={loading}>
                      image {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <textarea
            rows={4}
            maxLength={600}
            value={description}
            disabled={loading}
            placeholder={placeholder}
            onChange={(e) => onValues({ description: e.target.value })}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files).filter((x) => x.type.startsWith("image/"));
              if (files.length) { e.preventDefault(); takeImages(files); }
            }}
          />

          <div className="flex items-center justify-between gap-2 p-2.5 pt-1">
            <div className="flex items-center gap-1">
              <button type="button" className="og-tool-btn og-focus" disabled={loading || full} onClick={() => imgInput.current?.click()} title={full ? "Limit reached" : "Upload an image or your logo"}>
                <ImagePlus size={17} />
                <span className="hidden sm:inline">Upload image</span>
              </button>
              <button type="button" className="og-tool-btn og-focus" data-on={tray} disabled={loading} onClick={() => setTray((v) => !v)} title="Choose templates">
                <LayoutGrid size={17} />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>
            <span className="text-xs og-faint pr-1">{description.length}/600</span>
          </div>

          {tray && (
            <div className="border-t og-divider p-3 flex flex-col gap-3 og-in">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs og-faint">Pick up to {MAX_REFERENCES}. Tap again to remove. ({references.length}/{MAX_REFERENCES})</p>
                  <button type="button" className="og-ghost" onClick={() => setTray(false)}>Done</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {sortedTemplates.map((t) => {
                    const picked = references.some((r) => r.templateId === t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="og-thumb og-focus"
                        aria-pressed={picked}
                        disabled={full && !picked}
                        style={full && !picked ? { opacity: 0.4 } : undefined}
                        onClick={() => onPickTemplate(t.id)}
                      >
                        <div className="og-thumb-img">{renderArt(t.id)}</div>
                        <p className="text-[11px] og-muted mt-1.5 truncate">{picked ? "✓ " : ""}{t.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {recent.length > 0 && (
                <div>
                  <p className="text-xs og-faint mb-2">Or use your recent designs</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {recent.map((r) => (
                      <button key={r.id} type="button" className="og-thumb og-focus" disabled={full} style={full ? { opacity: 0.4 } : undefined} onClick={() => pickRecent(r)}>
                        <div className="og-thumb-img">
                          <img src={r.url} alt={r.label} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[11px] og-muted mt-1.5 truncate">{r.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs og-faint mt-2">
          Attach up to {MAX_REFERENCES} images. Set each one to Style, Background or Logo, then mention them as image 1, image 2 and so on. You can also drop or paste images into the box.
        </p>

        {firstUpload && (
          <button type="button" className="og-ghost justify-center w-full mt-3" onClick={writePromptFromImage} disabled={loading || describing}>
            {describing ? <span className="og-spin" /> : <Wand2 size={14} />}
            {describing ? "Reading your image..." : "Write a prompt from my design · 1 credit"}
          </button>
        )}
        {hasRefs && swatches.length > 0 && (
          <div className="mt-3">
            <p className="text-xs og-faint mb-1.5">Colours in your attached images (free). Tap to use them.</p>
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

      {/* Text on the design */}
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
        <label className="flex items-center gap-2 mt-2 text-xs og-muted cursor-pointer">
          <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} disabled={loading} />
          Also show my business name on the design
        </label>
        {designText.length > 150 && (
          <p className="text-xs mt-1.5" style={{ color: "#f59e0b" }}>
            Long text is often misspelled by the AI. Keep it to a headline, a date and a phone number for the best result.
          </p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs og-faint">The AI writes exactly this, one line at a time, and nothing else.</p>
          <input ref={txtInput} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => { attachText(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="og-ghost" onClick={() => txtInput.current?.click()} disabled={loading}>
            <Paperclip size={13} />
            Attach .txt
          </button>
        </div>
      </div>

      {/* Colours */}
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

      {/* Typography */}
      <div>
        <Label note="(optional)">Typography</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={loading}
              aria-pressed={fontId === f.id}
              onClick={() => setFontId((cur) => (cur === f.id ? null : f.id))}
              className="og-card og-focus p-2.5 text-left flex flex-col gap-1"
              style={{ boxShadow: "none", borderRadius: 16, borderColor: fontId === f.id ? "var(--accent)" : undefined, outline: fontId === f.id ? "3px solid var(--ring)" : "none" }}
            >
              <span className="text-2xl og-text leading-none" style={f.css}>Aa</span>
              <span className="text-xs font-semibold og-text leading-tight">{f.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs og-faint mt-1.5">
          {font ? "The AI uses this lettering style. Tap it again to let the AI choose." : "Leave empty and the AI chooses lettering that fits your design."}
        </p>
      </div>

      {/* Name and logo position */}
      <div>
        <Label note="(optional)">Where do the name and logo go?</Label>

        <p className="text-xs og-faint mb-2">
          Business name position {effNameSpot ? "(tap again to let the AI decide)" : "(the AI decides)"}
        </p>
<SpotPicker value={effNameSpot} onChange={setNameSpot} disabled={loading || !showName} blocked={logoRef ? logoSpot : null} blockedLabel="Logo" />
        {!showName && <p className="text-xs og-faint mt-1.5">Tick “Also show my business name” above to place it.</p>}

        {logoRef ? (
          <div className="mt-4">
            <p className="text-xs og-faint mb-2">Logo position. Your real logo is pasted here after the design is made.</p>
<SpotPicker value={logoSpot} onChange={(s) => setLogoSpot(s ?? logoSpot)} disabled={loading} blocked={effNameSpot} blockedLabel="Name" /> 
  <div className="flex gap-2 mt-3">
              {(["s", "m", "l"] as LogoSize[]).map((z) => (
                <button key={z} type="button" disabled={loading} data-active={logoSize === z} onClick={() => setLogoSize(z)} className="og-chip og-focus">
                  {{ s: "Small", m: "Medium", l: "Large" }[z]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 mt-3 text-xs og-muted cursor-pointer">
              <input type="checkbox" checked={logoPad} onChange={(e) => setLogoPad(e.target.checked)} disabled={loading} />
              Put a light pad behind the logo (helps if the logo is hard to see)
            </label>
          </div>
        ) : (
          <p className="text-xs og-faint mt-3">To place your logo exactly, attach it and set it to “Logo”.</p>
        )}
      </div>

      {/* Layout */}
      <div>
        <Label>Layout</Label>
        {hasGuides && (
          <p className="text-xs og-faint -mt-1 mb-2">
            {layoutPicked
              ? "Your chosen layout is used. Tap it again to let your attached images set the layout instead."
              : "Your attached images set the layout. Pick one below to use your own layout instead."}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {layouts.map((l) => {
            const active = useLayout && l.id === layout.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                disabled={loading}
                onClick={() =>
                  setLayoutByKey((m) => {
                    // with images attached, tapping the chosen layout again clears it
                    if (hasGuides && m[layoutKey] === l.id) {
                      const next = { ...m };
                      delete next[layoutKey];
                      return next;
                    }
                    return { ...m, [layoutKey]: l.id };
                  })
                }
                className="og-card og-focus p-2 text-left flex flex-col gap-1.5"
style={{
  boxShadow: "none",
  borderRadius: 16,
  background: active ? "var(--soft)" : undefined,
  borderColor: active ? "var(--accent)" : undefined,
  outline: active ? "3px solid var(--ring)" : "none",
}}              >
                <LayoutThumb shape={shape} boxes={l.boxes} />
<span className="text-xs font-semibold og-text leading-tight">{active ? "✓ " : ""}{l.label}</span>              </button>
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