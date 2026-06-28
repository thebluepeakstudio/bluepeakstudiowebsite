export default function ServicesPillList({ services = [], servicesCount = 0, max = 3 }) {
  if (!services?.length && !servicesCount) {
    return <span className="text-admin-textMuted">—</span>;
  }

  const shown = services.slice(0, max);
  const extra = (servicesCount || services.length) - shown.length;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((title) => (
        <span
          key={title}
          className="inline-flex rounded-full bg-admin-muted px-2 py-0.5 text-xs font-medium text-admin-text"
        >
          {title}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-admin-primary">
          +{extra} More
        </span>
      )}
    </div>
  );
}
