import Button from "./Button";
import { RequiredMark } from "./Input";

const fieldClass =
  "w-full rounded-xl border border-admin-border/80 bg-white px-3 py-2.5 text-sm shadow-sm shadow-slate-200/20 transition-all focus:border-admin-primary focus:outline-none focus:ring-2 focus:ring-blue-100/80 disabled:cursor-not-allowed disabled:bg-admin-muted disabled:text-admin-textMuted";

export function Form({ id, onSubmit, children, className = "" }) {
  return (
    <form id={id} onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
}

export function FormSection({ title, description, children, variant = "default", className = "" }) {
  const isMuted = variant === "muted";

  return (
    <section
      className={`rounded-xl border border-admin-border p-4 sm:p-5 ${
        isMuted ? "bg-admin-muted/40" : "bg-admin-muted/20"
      } ${className}`}
    >
      {(title || description) && (
        <div className="mb-4 border-b border-admin-border pb-3">
          {title && (
            <h3 className="text-base font-bold tracking-tight text-admin-text">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-admin-textMuted">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FormGrid({ cols = 2, children, className = "" }) {
  const layouts = {
    1: "grid grid-cols-1 gap-4",
    2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  };

  return <div className={`${layouts[cols] || layouts[2]} ${className}`}>{children}</div>;
}

export function FormDivider() {
  return <hr className="border-admin-border" />;
}

export function FormFooter({
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading,
  submitForm,
  className = "",
}) {
  return (
    <div
      className={`-mx-4 border-t border-admin-border bg-admin-surface px-4 py-4 sm:-mx-5 sm:px-5 ${className}`}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" form={submitForm || undefined} loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function FormCheckbox({ label, description, checked, onChange, children }) {
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border bg-admin-surface p-3 transition-colors hover:bg-admin-muted/50">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-admin-border text-admin-primary focus:ring-blue-200"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-admin-text">{label}</span>
          {description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-admin-textMuted">{description}</span>
          )}
        </span>
      </label>
      {checked && children ? <div className="pl-1">{children}</div> : null}
    </div>
  );
}

export function FormFileInput({ label, required, accept, onChange, className = "", multiple, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-admin-text">
          {label}
          {required && <RequiredMark />}
        </label>
      )}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-admin-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-admin-text hover:file:bg-admin-border`}
        {...props}
      />
    </div>
  );
}
