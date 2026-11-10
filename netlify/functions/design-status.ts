import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verifyToken } from "@clerk/backend";

export const config: Config = { path: "/api/design-status" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  let userId: string;
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Please sign in." }, 401);
    userId = (await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })).sub;
  } catch {
    return json({ error: "Please sign in again." }, 401);
  }

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Bad request." }, 400);

  const store = getStore("designs");
  const job: any = await store.get(`job-${id}`, { type: "json" });
  if (!job || job.userId !== userId) return json({ error: "Design not found." }, 404);

  if (job.status === "error") return json({ status: "error", error: job.error });
  if (job.status !== "done") return json({ status: "working" });

  const image = await store.get(`img-${id}`);
  if (!image) return json({ status: "error", error: "The design was lost. Please try again." });
  return json({ status: "done", image, prompt: job.prompt });
};