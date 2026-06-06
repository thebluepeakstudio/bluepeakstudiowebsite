import { Search } from "lucide-react";

export default function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-textMuted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-admin-border bg-admin-surface pl-10 pr-4 text-sm transition-colors focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
