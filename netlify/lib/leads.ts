import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import crypto from "node:crypto";

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";

export const makeSlug = () =>
  crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

export const hashIp = (ip: string) =>
  crypto.createHash("sha256").update(`${process.env.CLERK_SECRET_KEY}:${ip}`).digest("hex").slice(0, 32);

/** Last piece of the URL path, e.g. /api/leads/abc123 -> abc123 */
export const lastSegment = (req: Request) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "");
};

/** Reads a small JSON body. Returns null if it is too big or not JSON. */
export async function readBody(req: Request, max = 20000): Promise<Record<string, any> | null> {
  try {
    const text = await req.text();
    if (text.length > max) return null;
    const data = JSON.parse(text || "{}");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/** Returns the signed-in Clerk user id from the Bearer token, or null. Never trust an id sent in the body. */
export async function getUserId(req: Request): Promise<string | null> {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const r: any = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    if (r?.errors?.length) return null; // newer Clerk versions return { data, errors }
    const payload = r?.data ?? r;
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function myCampaignIds(clerkId: string): Promise<string[]> {
  const { data } = await supabase.from("lead_campaigns").select("id").eq("owner_clerk_id", clerkId);
  return (data || []).map((c) => c.id);
}
