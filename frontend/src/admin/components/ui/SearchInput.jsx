import { Search } from "lucide-react";

const inputClass =
  "h-10 w-full rounded-xl border border-admin-border/80 bg-white pl-10 pr-4 text-sm shadow-sm shadow-slate-200/20 transition-all placeholder:text-slate-400 focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100/80";

export default function SearchInput({ value, onChange, placeholder = "Search...", label, className = "" }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-admin-textMuted">{label}</label>
      )}
      <Search
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-textMuted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
