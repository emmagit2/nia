import type { ReactNode } from "react";

/** Small helpers shared by the QR tools. */

export const waLink = (phone: string, text?: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1); // Nigerian local format
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(",");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: head.match(/:(.*?);/)?.[1] ?? "image/png" });
}

export const prettyDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <label className="block text-sm font-semibold og-text mb-2">
      {children}
      {note && <span className="og-faint font-normal"> {note}</span>}
    </label>
  );
}