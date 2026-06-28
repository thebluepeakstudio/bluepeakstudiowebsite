export default function ProgressBar({ value = 0, className = "" }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-admin-muted">
        <div
          className="h-full rounded-full bg-admin-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium text-admin-textMuted">{pct}%</span>
    </div>
  );
}
