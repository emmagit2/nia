import { GoogleGenAI } from "@google/genai";
import { getStore } from "@netlify/blobs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const RATIOS = ["1x3", "3x1", "1x2", "2x1", "9x16", "16x9", "10x16", "16x10", "2x3", "3x2", "3x4", "4x3", "4x5", "5x4", "1x1"];
const ratioValue = (r: string) => {
  const [w, h] = r.split("x").map(Number);
  return w / h;
};
const nearestRatio = (a: number) =>
  RATIOS.reduce((best, r) => (Math.abs(ratioValue(r) - a) < Math.abs(ratioValue(best) - a) ? r : best));

const SYSTEM = `You are an art director who writes prompts for the Ideogram image generator.
You receive (1) what the user typed, which may be short, casual, misspelled, in Nigerian Pidgin or in another language, and (2) a technical brief with the settings the user chose.

Your job: write ONE prompt in clear English.
Rules:
- Understand the user's idea even if it is badly written, and express it clearly. Add tasteful visual detail that fits it (mood, lighting, decoration, style) only where the user left gaps. Never contradict what the user asked for.
- Keep every setting from the brief: design type, aspect ratio, layout arrangement, colour names and hex codes, typography, and every sentence about where the business name goes or which area must stay empty. Do not drop or weaken them.
- If images are attached, they are numbered in order. Replace every "image 1", "image 2" or "image 3" with a concrete visual description of that image (colours, layout, fonts, shapes, mood, background scene). Never write "image 1/2/3" in the output.
- Do NOT write any words that should appear on the design and do NOT quote any text. The exact text is added separately by the app.
- Do not invent business names, phone numbers, addresses, prices or slogans.
- Output only the final prompt: one paragraph, under 180 words, no preface, no quotation marks around it.
- The only quoted text you may keep is the business name inside a sentence about where it is placed. Keep that sentence as given.
`;

async function rewritePrompt(userWords: string, brief: string, refs: File[]): Promise<string> {
  const parts: any[] = [];
  for (let i = 0; i < refs.length; i++) {
    const buf = Buffer.from(await refs[i].arrayBuffer());
    parts.push({ text: `Image ${i + 1}:` });
    parts.push({ inlineData: { mimeType: refs[i].type || "image/png", data: buf.toString("base64") } });
  }
  parts.push({
    text: `WHAT THE USER TYPED:\n${userWords || "(nothing, use the brief only)"}\n\nTECHNICAL BRIEF:\n${brief}`,
  });

  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: [{ role: "user", parts }],
    config: { systemInstruction: SYSTEM, temperature: 0.6 },
  });
  return (res.text ?? "").trim();
}

export default async (req: Request) => {
  let jobId = "";
  try {
    ({ jobId } = await req.json());
  } catch {
    return;
  }
  if (!/^[0-9a-f-]{36}$/.test(jobId)) return;

  const store = getStore("designs");
  const job: any = await store.get(`job-${jobId}`, { type: "json" });
  const input: any = await store.get(`input-${jobId}`, { type: "json" });
  if (!job || !input) return;

  const fail = (msg: string) => store.setJSON(`job-${jobId}`, { ...job, status: "error", error: msg });

  try {
    const { prompt, userWords, textRule, aspect } = input;
    const refs: File[] = (input.refs ?? []).map(
      (r: any) => new File([Buffer.from(r.data, "base64")], r.name, { type: r.type })
    );

    // 1. Gemini rewrite (more time now, but still not allowed to block the job)
    let finalPrompt: string = prompt;
    try {
      const rewritten = await Promise.race([
        rewritePrompt(userWords, prompt, refs),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error("rewrite timeout")), 20000)),
      ]);
      if (rewritten && rewritten.length > 40 && rewritten.length < 2000 && !/\bimage [123]\b/i.test(rewritten)) {
        finalPrompt = rewritten;
      }
    } catch (e) {
      console.error("Gemini rewrite failed, using original prompt:", e);
    }

    // 2. Exact text rule goes last, so no AI can change the user's words
    finalPrompt = `${finalPrompt} ${textRule}`.trim();

    // 3. Ideogram
    const out = new FormData();
    out.append("prompt", finalPrompt);
    out.append("aspect_ratio", nearestRatio(aspect));
    out.append("rendering_speed", process.env.IDEOGRAM_SPEED || "DEFAULT"); // TURBO | DEFAULT | QUALITY
    out.append("magic_prompt", "OFF");
    refs.forEach((f) => out.append("style_reference_images", f, f.name));

    const r = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
      method: "POST",
      headers: { "Api-Key": process.env.IDEOGRAM_API_KEY! },
      body: out,
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Ideogram error:", r.status, data);
      return await fail("The design could not be made. Please try again.");
    }
    const url = data?.data?.[0]?.url;
    if (!url) return await fail("No image came back. Please try again.");

    // 4. Download the picture and save it
    const img = await fetch(url);
    if (!img.ok) return await fail("Could not load the design. Please try again.");
    const buf = Buffer.from(await img.arrayBuffer());
    const mime = img.headers.get("content-type") || "image/png";
    await store.set(`img-${jobId}`, `data:${mime};base64,${buf.toString("base64")}`);
    await store.setJSON(`job-${jobId}`, { ...job, status: "done", prompt: finalPrompt });
  } catch (e) {
    console.error(e);
    await fail("The design could not be made. Please try again.");
  } finally {
    await store.delete(`input-${jobId}`).catch(() => {});
  }
};