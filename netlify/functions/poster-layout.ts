// netlify/functions/poster-layout.ts
import type { Handler } from "@netlify/functions";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5"; // switch to claude-sonnet-5-5 here or in Netlify env

const planTool = {
  name: "return_plan",
  description: "What you understood from the sentence, and the few questions still needed.",
  input_schema: {
    type: "object",
    properties: {
      understood: { type: "object", properties: { businessType: { type: "string" }, designType: { type: "string" }, location: { type: "string" }, offer: { type: "string" } } },
      questions: {
        type: "array", maxItems: 3,
        items: { type: "object", properties: { field: { type: "string" }, label: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } }, required: ["field", "label", "options"] },
      },
    },
    required: ["understood", "questions"],
  },
};

const layoutTool = {
  name: "return_layout",
  description: "The poster as a list of boxes.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      colors: { type: "object", properties: { main: { type: "string" }, accent: { type: "string" } }, required: ["main", "accent"] },
      elements: {
        type: "array", maxItems: 20,
        items: {
          type: "object",
          properties: {
            id: { type: "string" }, type: { type: "string", enum: ["text", "shape", "pill", "box", "imageSlot"] },
            text: { type: "string" }, x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" },
            size: { type: "number" }, weight: { type: "number" }, color: { type: "string" }, fill: { type: "string" },
            radius: { type: "string" }, opacity: { type: "number" }, hint: { type: "string" },
            gen: { type: "boolean" }, quality: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["id", "type", "x", "y", "w", "h"],
        },
      },
    },
    required: ["summary", "colors", "elements"],
  },
};

const PLAN_SYSTEM =
  "You help a small-business owner in Nigeria design a poster. Read their sentence. Fill what you understood. " +
  "Ask at most 3 short questions, only about what is missing (style, offer, colours, text). Never ask what they already said. Options must be 2 to 4 short words.";

const LAYOUT_SYSTEM =
  "You design posters as editable boxes. Rules: every box must fit inside the canvas (pixels, origin top-left). " +
  "Use readable sizes and strong contrast, and avoid overlapping text. Use at most 20 boxes. " +
  "Use ONLY the text the user gave. Where they gave none, use short placeholders such as YOUR OFFER, DATE HERE or 0800 000 0000, and never invent real names, prices or phone numbers. " +
  "Photos are imageSlot boxes with a hint describing the photo (plain background, empty space for text, no text in the photo); set gen true for photos and false for logos. " +
  "If a reference image is attached, copy only its structure (where things sit and how big they are), never its names, logos, photos or wording. " +
  "In mix mode keep only the parts listed in keep and redesign the rest. Colours are hex values.";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  // TODO: verify the Clerk token here, the same way your other functions do.
  try {
    const b = JSON.parse(event.body || "{}");
    const isPlan = b.action === "plan";
    const content: unknown[] = [];
    if (!isPlan && b.reference?.data) {
      content.push({ type: "image", source: { type: "base64", media_type: b.reference.media_type, data: b.reference.data } });
    }
    const { reference: _r, action: _a, ...brief } = b;
    content.push({ type: "text", text: isPlan ? `Sentence: ${String(b.sentence || "").slice(0, 400)}` : JSON.stringify(brief) });

    const tool = isPlan ? planTool : layoutTool;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: isPlan ? 600 : 3000,
        system: isPlan ? PLAN_SYSTEM : LAYOUT_SYSTEM,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content }],
      }),
    });
    const d = await res.json();
    const out = (d.content || []).find((c: { type: string }) => c.type === "tool_use");
    if (!res.ok || !out) return { statusCode: 502, body: JSON.stringify({ error: "model_failed" }) };
    return { statusCode: 200, body: JSON.stringify({ data: out.input, usage: d.usage }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};