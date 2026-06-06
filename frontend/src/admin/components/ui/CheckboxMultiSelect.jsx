export default function CheckboxMultiSelect({
  label,
  value = [],
  onChange,
  options = [],
  required,
  description,
  columns = 2,
}) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const gridClass = columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-admin-text">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {description && <p className="mb-2 text-xs text-admin-textMuted">{description}</p>}
      <div className={`grid grid-cols-1 gap-2 ${gridClass}`}>
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                checked
                  ? "border-admin-primary bg-blue-50 text-admin-primary"
                  : "border-admin-border bg-admin-surface hover:border-blue-200 hover:bg-admin-muted/30"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                className="h-4 w-4 shrink-0 rounded border-admin-border text-admin-primary focus:ring-blue-200"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
