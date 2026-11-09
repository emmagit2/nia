import type { Config } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";
import { verifyToken } from "@clerk/backend";

export const config: Config = { path: "/api/ai-designer" };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MAX_REFS = 3;

const RATIOS = ["1x3", "3x1", "1x2", "2x1", "9x16", "16x9", "10x16", "16x10", "2x3", "3x2", "3x4", "4x3", "4x5", "5x4", "1x1"];
const ratioValue = (r: string) => {
  const [w, h] = r.split("x").map(Number);
  return w / h;
};
const nearestRatio = (a: number) =>
  RATIOS.reduce((best, r) => (Math.abs(ratioValue(r) - a) < Math.abs(ratioValue(best) - a) ? r : best));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Gemini sees the images in order and turns "image 1 / image 2" into real descriptions. */
async function rewritePrompt(prompt: string, refs: File[]): Promise<string> {
  const parts: any[] = [];
  for (let i = 0; i < refs.length; i++) {
    const buf = Buffer.from(await refs[i].arrayBuffer());
    parts.push({ text: `Image ${i + 1}:` });
    parts.push({ inlineData: { mimeType: refs[i].type || "image/png", data: buf.toString("base64") } });
  }
  parts.push({
    text: `Write ONE prompt for an image generator (Ideogram) from the request below.
Rules:
- Wherever the request mentions "image 1", "image 2" or "image 3", replace it with a concrete visual description taken from that image (colours, layout, fonts, shapes, mood, decoration, background scene).
- If the request mentions no image number, use the overall style of the images.
- Keep the business name, the aspect ratio and every instruction about positions (empty areas, where things go) exactly as given.
- Never write "image 1", "image 2" or "image 3" in the output, because the generator cannot see numbers.
- Output only the final prompt, one paragraph, under 170 words. No preface, no quotes around it.

Request:
${prompt}`,
  });

  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });
  return (res.text ?? "").trim();
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Check the Clerk token
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Please sign in." }, 401);
    await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
  } catch {
    return json({ error: "Please sign in again." }, 401);
  }

  // 2. Read the form
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const prompt = String(form.get("prompt") ?? "").trim();
  const textRule = String(form.get("textRule") ?? "").trim();
  const aspect = Number(form.get("aspect")) || 1;
  const refs = (form.getAll("refs") as unknown[])
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_REFS);

  if (!prompt) return json({ error: "Write a prompt first." }, 400);

  // 3. Gemini rewrite. If it fails, we still generate from the plain prompt.
  let finalPrompt = prompt;
  if (refs.length) {
    try {
      finalPrompt = (await rewritePrompt(prompt, refs)) || prompt;
    } catch (e) {
      console.error("Gemini rewrite failed, using original prompt:", e);
    }
  }

  // 4. Add the exact text rule AFTER the rewrite, so no AI can change the user's words
  finalPrompt = `${finalPrompt} ${textRule}`.trim();

  // 5. Ideogram
  const out = new FormData();
  out.append("prompt", finalPrompt);
  out.append("aspect_ratio", nearestRatio(aspect));
  out.append("rendering_speed", "DEFAULT");
  out.append("magic_prompt", "OFF"); // keep our wording; remove this line if Ideogram rejects it
  refs.forEach((f) => out.append("style_reference_images", f, f.name)); // delete this line for text-only

  try {
    const r = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
      method: "POST",
      headers: { "Api-Key": process.env.IDEOGRAM_API_KEY! },
      body: out,
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Ideogram error:", r.status, data);
      return json({ error: "The design could not be made. Please try again." }, 502);
    }
    const url = data?.data?.[0]?.url;
    if (!url) return json({ error: "No image came back. Please try again." }, 502);

    // 6. Return the picture itself (not the link) so the browser can paste the logo onto it
    const img = await fetch(url);
    if (!img.ok) return json({ error: "Could not load the design. Please try again." }, 502);
    const buf = Buffer.from(await img.arrayBuffer());
    const mime = img.headers.get("content-type") || "image/png";
    return json({ image: `data:${mime};base64,${buf.toString("base64")}`, prompt: finalPrompt });
  } catch (e) {
    console.error(e);
    return json({ error: "The design could not be made. Please try again." }, 502);
  }
};