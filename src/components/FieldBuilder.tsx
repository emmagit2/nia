import { Plus, Trash2 } from "lucide-react";

/* Lets the owner add their own questions to a form. Styled with the dashboard (og-*) classes. */

export type FieldType = "text" | "phone" | "number" | "email" | "textarea" | "select";
export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
}

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  phone: "Phone number",
  number: "Number",
  email: "Email",
  textarea: "Long text",
  select: "Dropdown",
};

const PRESETS: Omit<CustomField, "id">[] = [
  { label: "Email", type: "email", required: false, options: [] },
  { label: "Alternative phone number", type: "phone", required: false, options: [] },
  { label: "Address", type: "text", required: false, options: [] },
  { label: "How did you hear about us?", type: "select", required: false, options: ["Instagram", "WhatsApp", "Friend", "Flyer"] },
  { label: "Allergies or special needs", type: "textarea", required: false, options: [] },
];

const newId = () => "f" + Math.random().toString(36).slice(2, 8);

export default function FieldBuilder({
  value,
  onChange,
  max = 8,
}: {
  value: CustomField[];
  onChange: (f: CustomField[]) => void;
  max?: number;
}) {
  const full = value.length >= max;
  const update = (id: string, patch: Partial<CustomField>) => onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && <p className="text-xs og-faint">Name and phone number are always asked. Add more questions below if you need them.</p>}

      {value.map((f) => (
        <div key={f.id} className="og-card p-3 flex flex-col gap-2" style={{ boxShadow: "none" }}>
          <div className="flex gap-2">
            <input className="og-input" placeholder="Question, e.g. Your address" value={f.label} maxLength={60} onChange={(e) => update(f.id, { label: e.target.value })} />
            <button type="button" className="og-ghost shrink-0" aria-label="Remove question" onClick={() => onChange(value.filter((x) => x.id !== f.id))} style={{ padding: ".5rem" }}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="og-input sm:max-w-[180px]"
              value={f.type}
              aria-label="Answer type"
              onChange={(e) => update(f.id, { type: e.target.value as FieldType, options: e.target.value === "select" && f.options.length < 2 ? ["Option 1", "Option 2"] : f.options })}
            >
              {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm og-muted">
              <input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} style={{ accentColor: "var(--accent)" }} />
              Required
            </label>
          </div>
          {f.type === "select" && (
            <input
              className="og-input"
              placeholder="Choices, separated by commas"
              defaultValue={f.options.join(", ")}
              onBlur={(e) => update(f.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 12) })}
            />
          )}
        </div>
      ))}

      {!full && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="og-ghost" onClick={() => onChange([...value, { id: newId(), label: "", type: "text", required: false, options: [] }])}>
            <Plus size={14} />
            Add a question
          </button>
          {PRESETS.filter((p) => !value.some((v) => v.label === p.label)).map((p) => (
            <button key={p.label} type="button" className="og-chip og-focus" onClick={() => onChange([...value, { ...p, id: newId() }])}>
              + {p.label}
            </button>
          ))}
        </div>
      )}
      {full && <p className="text-xs og-faint">You can add up to {max} questions.</p>}
    </div>
  );
}