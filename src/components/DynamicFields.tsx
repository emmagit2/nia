import type { CustomField } from "./FieldBuilder";

/** Shows the owner's extra questions on a public page (light styling, same as the other public forms). */
export default function DynamicFields({
  fields,
  values,
  onChange,
  inputClass,
}: {
  fields: CustomField[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  inputClass: string;
}) {
  return (
    <>
      {fields.map((f) => {
        const hint = f.label + (f.required ? " *" : " (optional)");
        const v = values[f.id] ?? "";
        if (f.type === "textarea")
          return <textarea key={f.id} aria-label={f.label} className={`${inputClass} resize-none`} rows={2} placeholder={hint} value={v} maxLength={300} onChange={(e) => onChange(f.id, e.target.value)} />;
        if (f.type === "select")
          return (
            <select key={f.id} aria-label={f.label} className={inputClass} value={v} onChange={(e) => onChange(f.id, e.target.value)}>
              <option value="">{hint}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          );
        return (
          <input
            key={f.id}
            aria-label={f.label}
            className={inputClass}
            placeholder={hint}
            value={v}
            maxLength={120}
            type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
            inputMode={f.type === "phone" ? "tel" : f.type === "number" ? "decimal" : undefined}
            onChange={(e) => onChange(f.id, e.target.value)}
          />
        );
      })}
    </>
  );
}