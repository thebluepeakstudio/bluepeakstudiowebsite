const fieldClass =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm transition-colors focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-admin-muted disabled:text-admin-textMuted";

function FieldWrapper({ label, hint, error, className = "", children }) {
  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-admin-text">{label}</label>}
      {hint && !error && <p className="mb-1.5 text-xs text-admin-textMuted">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ label, hint, error, className = "", ...props }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} className={className}>
      <input className={fieldClass} {...props} />
    </FieldWrapper>
  );
}

export function Textarea({ label, hint, error, className = "", rows = 3, ...props }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} className={className}>
      <textarea className={`${fieldClass} min-h-[5rem] resize-y`} rows={rows} {...props} />
    </FieldWrapper>
  );
}

export function Select({ label, hint, options = [], error, className = "", ...props }) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} className={className}>
      <select className={fieldClass} {...props}>
        {(options || []).map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
