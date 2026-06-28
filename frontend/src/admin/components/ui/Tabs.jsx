export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-admin-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            active === tab.id
              ? "border border-b-0 border-admin-border bg-admin-surface text-admin-primary"
              : "text-admin-textMuted hover:bg-admin-muted/60 hover:text-admin-text"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
