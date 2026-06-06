export default function FilterSelect({ label, value, onChange, options, className = "" }) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const hasEmptyOption = normalized.some((o) => o.value === "");

  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-admin-textMuted">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm transition-colors focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {!hasEmptyOption && <option value="">All</option>}
        {normalized.map((opt) => (
          <option key={opt.value ?? opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
