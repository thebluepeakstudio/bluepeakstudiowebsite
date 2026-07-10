export default function FilterSelect({ label, value, onChange, options, className = "", compact = false }) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const hasEmptyOption = normalized.some((o) => o.value === "");

  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label
          className={`block font-medium text-admin-textMuted ${
            compact ? "mb-0.5 text-[10px] uppercase tracking-wide" : "mb-1.5 text-xs"
          }`}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-0 border border-admin-border/80 bg-white shadow-sm shadow-slate-200/20 transition-all focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100/80 ${
          compact
            ? "h-8 rounded-lg px-2 text-xs"
            : "h-10 rounded-xl px-3 text-sm"
        }`}
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
