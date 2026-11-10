import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verifyToken } from "@clerk/backend";

export const config: Config = { path: "/api/design-start" };

const MAX_REFS = 3;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Check the Clerk token and remember who owns the job
  let userId: string;
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Please sign in." }, 401);
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    userId = payload.sub;
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
  const userWords = String(form.get("userWords") ?? "").trim();
  const textRule = String(form.get("textRule") ?? "").trim();
  const aspect = Number(form.get("aspect")) || 1;
  const refs = (form.getAll("refs") as unknown[])
    .filter((f): f is File => typeof f !== "string" && (f as File).size > 0)
    .slice(0, MAX_REFS);

  if (!prompt) return json({ error: "Write a prompt first." }, 400);

  // 3. Save the job
  const jobId = crypto.randomUUID();
  const store = getStore("designs");

  const refData = await Promise.all(
    refs.map(async (f) => ({
      name: f.name || "reference.png",
      type: f.type || "image/png",
      data: Buffer.from(await f.arrayBuffer()).toString("base64"),
    }))
  );

  await store.setJSON(`input-${jobId}`, { prompt, userWords, textRule, aspect, refs: refData });
  await store.setJSON(`job-${jobId}`, { status: "working", userId, createdAt: Date.now() });

  // 4. Trigger the background function (it answers 202 straight away)
  try {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/.netlify/functions/ai-designer-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (r.status !== 202 && !r.ok) throw new Error(`Background returned ${r.status}`);
  } catch (e) {
    console.error("Could not start background job:", e);
    await store.setJSON(`job-${jobId}`, { status: "error", userId, error: "Could not start the design. Please try again." });
    return json({ error: "Could not start the design. Please try again." }, 502);
  }

  return json({ jobId });
};