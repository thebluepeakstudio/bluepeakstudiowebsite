const fieldClass =
  "w-full rounded-xl border border-admin-border/80 bg-white px-3 py-2.5 text-sm shadow-sm shadow-slate-200/20 transition-all focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100/80 disabled:cursor-not-allowed disabled:bg-admin-muted disabled:text-admin-textMuted";

export function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function stripRequiredFromLabel(label) {
  if (typeof label !== "string") return label;
  return label.replace(/\s*\*$/, "");
}

function FieldWrapper({ label, hint, error, required, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-admin-text">
          {stripRequiredFromLabel(label)}
          {required && <RequiredMark />}
        </label>
      )}
      {hint && !error && <p className="mb-1.5 text-xs text-admin-textMuted">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ label, hint, error, required, className = "", type, step, ...props }) {
  // HTML number inputs default to step=1 (integers only). Allow decimals unless overridden.
  const resolvedStep = type === "number" ? (step ?? "any") : step;
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <input className={fieldClass} required={required} type={type} step={resolvedStep} {...props} />
    </FieldWrapper>
  );
}

export function Textarea({ label, hint, error, required, className = "", rows = 3, ...props }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <textarea className={`${fieldClass} min-h-[5rem] resize-y`} rows={rows} required={required} {...props} />
    </FieldWrapper>
  );
}

export function Select({ label, hint, options = [], error, required, className = "", ...props }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <select className={fieldClass} required={required} {...props}>
        {(options || []).map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
