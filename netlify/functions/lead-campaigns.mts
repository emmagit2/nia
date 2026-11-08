 import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import crypto from "node:crypto";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */

/** Stops any single request from hanging longer than this. */
const NET_TIMEOUT_MS = 8000;

/** Supabase client. Every request it makes is cut off after NET_TIMEOUT_MS. */
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(NET_TIMEOUT_MS) }),
  },
});

/** Rejects if the promise takes longer than `ms`, so nothing can wait forever. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";

const makeSlug = () =>
  crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

/** Reads a small JSON body. Returns null if it is too big or not JSON. */
async function readBody(req: Request, max = 20000): Promise<Record<string, any> | null> {
  try {
    const text = await req.text();
    if (text.length > max) return null;
    const data = JSON.parse(text || "{}");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/**
 * Signed-in Clerk user id from the Bearer token, or null. Never trust an id sent in the body.
 *
 * If CLERK_JWT_KEY is set (Clerk dashboard > API keys > Show JWT public key), the token is
 * checked locally with no network call. Without it, Clerk downloads its keys from api.clerk.com,
 * which is the call that can hang on a blocked or slow network.
 */
async function getUserId(req: Request): Promise<string | null> {
  try {
    const header = req.headers.get("authorization") || "";
    console.log("AUTH HEADER PRESENT:", header ? "yes" : "NO");
    const token = header.replace(/^Bearer\s+/i, "");
    if (!token) return null;

    const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");
    console.log("CLERK VERIFY START (local key:", jwtKey ? "yes" : "no", ")");

    const r: any = await withTimeout(
      verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
        ...(jwtKey ? { jwtKey } : {}),
      }),
      NET_TIMEOUT_MS,
      "Clerk verifyToken",
    );
    console.log("CLERK VERIFY DONE");

    if (r?.errors?.length) {
      console.log("CLERK VERIFY ERRORS:", JSON.stringify(r.errors));
      return null;
    }
    const payload = r?.data ?? r;
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch (e: any) {
    console.log("CLERK VERIFY THREW:", e?.message || e);
    return null;
  }
}
/* ---- end helpers ---- */

const MAX_CAMPAIGNS = 20;

export default async (req: Request) => {
  try {
    const clerkId = await getUserId(req);
    if (!clerkId) return json({ error: "Sign in first." }, 401);
    console.log("AUTH OK, method:", req.method);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("lead_campaigns")
        .select("id, slug, business_name, headline, services, created_at")
        .eq("owner_clerk_id", clerkId)
        .order("created_at", { ascending: false });
      if (error || !data) {
        console.log("SUPABASE LOAD ERROR:", error?.message);
        return json({ error: "Could not load campaigns." }, 500);
      }
      console.log("CAMPAIGNS LOADED:", data.length);

      const ids = data.map((c) => c.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: rows } = await supabase.from("leads").select("campaign_id").in("campaign_id", ids);
        (rows || []).forEach((r) => (counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1));
      }
      return json({ campaigns: data.map((c) => ({ ...c, lead_count: counts[c.id] || 0 })) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return json({ error: "Invalid request." }, 400);

      const business_name = clean(body.businessName, 80);
      const headline = clean(body.headline, 140);
      const services = Array.isArray(body.services)
        ? body.services.map((s: unknown) => clean(s, 40)).filter(Boolean).slice(0, 8)
        : [];
      if (!business_name) return json({ error: "Business name is required." }, 400);

      const { count } = await supabase
        .from("lead_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("owner_clerk_id", clerkId);
      if ((count || 0) >= MAX_CAMPAIGNS) return json({ error: "Campaign limit reached." }, 400);

      for (let i = 0; i < 4; i++) {
        const { data, error } = await supabase
          .from("lead_campaigns")
          .insert({ owner_clerk_id: clerkId, slug: makeSlug(), business_name, headline, services })
          .select("id, slug, business_name, headline, services")
          .single();
        if (!error) return json({ campaign: { ...data, lead_count: 0 } });
        console.log("SUPABASE INSERT ERROR:", error.code, error.message);
        if (error.code !== "23505") break; // only retry on a slug clash
      }
      return json({ error: "Could not create the campaign." }, 500);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    // Any timeout or crash ends up here, so the browser gets a clear error instead of hanging.
    console.log("LEAD-CAMPAIGNS FAILED:", e?.message || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}; 