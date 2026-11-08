 
import { verifyToken } from "@clerk/backend";

/**
 * netlify/functions/image-tools.ts
 * Reached at /api/image-tools
 *
 * POST multipart:
 *   action = describe | upscale | layerize | vectorize
 *   file   = image file
 *
 * GET:
 *   ?generation=ID  polls an SVG conversion
 *   ?proxy=URL      streams an Ideogram image through this server
 *
 * Environment variables:
 *   IDEOGRAM_API_KEY
 *   CLERK_SECRET_KEY
 *   CLERK_JWT_KEY (optional)
 */

const IDEOGRAM = "https://api.ideogram.ai";
const NET_TIMEOUT_MS = 25000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Returns the signed-in Clerk user ID from the Bearer token.
 * Returns null if verification fails.
 */
async function getUserId(req: Request): Promise<string | null> {
  try {
    const token = (req.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );

    if (!token) return null;

    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not configured.");
      return null;
    }

    const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");

    const payload: any = await withTimeout(
      verifyToken(token, {
        secretKey,
        ...(jwtKey ? { jwtKey } : {}),
      }),
      8000,
      "Clerk verifyToken",
    );

    if (payload?.errors?.length) return null;

    const userId = payload?.data?.sub ?? payload?.sub;

    return typeof userId === "string" ? userId : null;
  } catch (error: any) {
    console.log("CLERK VERIFY THREW:", error?.message || error);
    return null;
  }
}

/**
 * Calls Ideogram using the secret API key and a hard timeout.
 */
const ideogram = (path: string, init: RequestInit = {}) =>
  fetch(`${IDEOGRAM}${path}`, {
    ...init,
    headers: {
      "Api-Key": process.env.IDEOGRAM_API_KEY!,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(NET_TIMEOUT_MS),
  });

/**
 * Handles errors returned by Ideogram.
 */
async function upstreamFail(res: Response, label: string) {
  const body = await res.text().catch(() => "");

  console.log(`${label} FAILED`, res.status, body.slice(0, 400));

  if (res.status === 429) {
    return json(
      {
        error: "The image service is busy. Try again in a minute.",
      },
      429,
    );
  }

  if (res.status === 400 || res.status === 422) {
    return json(
      {
        error: "That image could not be processed. Try another one.",
      },
      400,
    );
  }

  return json(
    {
      error: "The image service had a problem. Try again.",
    },
    502,
  );
}

/**
 * Pulls the first image URL from the response shapes Ideogram may return.
 */
const firstUrl = (response: any): string | null =>
  response?.data?.[0]?.url ??
  response?.url ??
  response?.base_image_url ??
  null;

export default async (req: Request) => {
  try {
    // Authenticate the request.
    const userId = await getUserId(req);

    if (!userId) {
      return json({ error: "Sign in first." }, 401);
    }

    // Ensure the Ideogram API key is configured.
    if (!process.env.IDEOGRAM_API_KEY) {
      return json(
        {
          error: "Image service is not set up.",
        },
        500,
      );
    }

    const url = new URL(req.url);

    /* ---------------------------- GET ---------------------------- */

    if (req.method === "GET") {
      /*
       * Image proxy.
       * Example: /api/image-tools?proxy=https://...
       */
      const proxy = url.searchParams.get("proxy");

      if (proxy) {
        let target: URL;

        try {
          target = new URL(proxy);
        } catch {
          return json({ error: "Bad link." }, 400);
        }

        const allowedHost =
          target.hostname === "ideogram.ai" ||
          target.hostname.endsWith(".ideogram.ai");

        if (target.protocol !== "https:" || !allowedHost) {
          return json({ error: "Link not allowed." }, 400);
        }

        const imageResponse = await fetch(target, {
          signal: AbortSignal.timeout(NET_TIMEOUT_MS),
        });

        if (!imageResponse.ok) {
          return json(
            {
              error: "Could not load the image.",
            },
            502,
          );
        }

        return new Response(await imageResponse.arrayBuffer(), {
          headers: {
            "Content-Type":
              imageResponse.headers.get("content-type") || "image/png",
            "Cache-Control": "private, max-age=300",
          },
        });
      }

      /*
       * SVG vectorization polling.
       * Example: /api/image-tools?generation=GENERATION_ID
       */
      const generationId = url.searchParams.get("generation") || "";

      if (!/^[A-Za-z0-9_-]{8,100}$/.test(generationId)) {
        return json({ error: "Bad request." }, 400);
      }

      const response = await ideogram(`/v2/generations/${generationId}`);

      if (!response.ok) {
        return upstreamFail(response, "POLL");
      }

      const generation: any = await response.json();

      if (generation.status === "pending") {
        return json({ status: "pending" });
      }

      if (generation.status === "failed") {
        return json({
          status: "failed",
          error: "The conversion failed. Try a simpler image.",
        });
      }

      const svgUrl = firstUrl(generation);

      if (!svgUrl) {
        console.log(
          "POLL COMPLETED BUT NO URL, keys:",
          Object.keys(generation),
        );

        return json({
          status: "failed",
          error: "No SVG came back.",
        });
      }

      const svgResponse = await fetch(svgUrl, {
        signal: AbortSignal.timeout(NET_TIMEOUT_MS),
      });

      if (!svgResponse.ok) {
        return json({
          status: "failed",
          error: "Could not download the SVG.",
        });
      }

      return json({
        status: "completed",
        svg: await svgResponse.text(),
      });
    }

    /* ---------------------------- POST --------------------------- */

    if (req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const form = await req.formData();

    const action = String(form.get("action") || "");
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "Upload an image." }, 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return json(
        {
          error: "Image is too big. Use one under 5 MB.",
        },
        413,
      );
    }

    const bytes = new Blob([await file.arrayBuffer()], {
      type: file.type || "image/png",
    });

    const name = file.name || "image.png";

    /* -------------------------- DESCRIBE ------------------------- */

    if (action === "describe") {
      const upload = new FormData();

      upload.append("image_file", bytes, name);
      upload.append("describe_model_version", "V_3");

      const response = await ideogram("/describe", {
        method: "POST",
        body: upload,
      });

      if (!response.ok) {
        return upstreamFail(response, "DESCRIBE");
      }

      const result: any = await response.json();

      const descriptions = (result?.descriptions || [])
        .map((description: any) => description?.text)
        .filter(Boolean);

      return json({ descriptions });
    }

    /* --------------------------- UPSCALE ------------------------- */

    if (action === "upscale") {
      const clamp = (value: unknown, defaultValue: number) =>
        Math.min(
          100,
          Math.max(1, Math.round(Number(value) || defaultValue)),
        );

      const imageRequest: Record<string, unknown> = {
        resemblance: clamp(form.get("resemblance"), 50),
        detail: clamp(form.get("detail"), 50),
      };

      const prompt = String(form.get("prompt") || "")
        .slice(0, 500)
        .trim();

      if (prompt) {
        imageRequest.prompt = prompt;
      }

      const upload = new FormData();

      upload.append("image_file", bytes, name);
      upload.append("image_request", JSON.stringify(imageRequest));

      const response = await ideogram("/upscale", {
        method: "POST",
        body: upload,
      });

      if (!response.ok) {
        return upstreamFail(response, "UPSCALE");
      }

      const result: any = await response.json();
      const imageUrl = firstUrl(result);

      if (!imageUrl) {
        return json(
          {
            error: "No image came back.",
          },
          502,
        );
      }

      return json({ url: imageUrl });
    }

    /* -------------------------- LAYERIZE ------------------------ */

    if (action === "layerize") {
      const upload = new FormData();

      upload.append("image", bytes, name);

      const response = await ideogram(
        "/v1/ideogram-v3/layerize-text",
        {
          method: "POST",
          body: upload,
        },
      );

      if (!response.ok) {
        return upstreamFail(response, "LAYERIZE");
      }

      const result: any = await response.json();

      console.log("LAYERIZE RESPONSE KEYS:", Object.keys(result));

      const baseImageUrl =
        result?.base_image_url ??
        result?.data?.[0]?.base_image_url ??
        null;

      const textBlocks =
        result?.text_blocks ??
        result?.data?.[0]?.text_blocks ??
        result?.layers ??
        [];

      if (!baseImageUrl) {
        return json(
          {
            error: "No image came back.",
          },
          502,
        );
      }

      return json({
        base_image_url: baseImageUrl,
        text_blocks: Array.isArray(textBlocks) ? textBlocks : [],
      });
    }

    /* ------------------------- VECTORIZE ------------------------ */

    if (action === "vectorize") {
      const upload = new FormData();

      upload.append("image", bytes, name);

      const response = await ideogram(
        "/v2/svg/vectorize/ideogram-vector-1",
        {
          method: "POST",
          body: upload,
        },
      );

      if (!response.ok) {
        return upstreamFail(response, "VECTORIZE");
      }

      const result: any = await response.json();

      if (!result?.generation_id) {
        return json(
          {
            error: "Could not start the conversion.",
          },
          502,
        );
      }

      return json({
        generation_id: result.generation_id,
      });
    }

    /* ---------------------- UNKNOWN ACTION ---------------------- */

    return json(
      {
        error: "Unknown action.",
      },
      400,
    );
  } catch (error: any) {
    console.log("IMAGE-TOOLS FAILED:", error?.message || error);

    return json(
      {
        error: "Something went wrong. Please try again.",
      },
      500,
    );
  }
};
