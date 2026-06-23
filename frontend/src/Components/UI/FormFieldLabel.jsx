export default function FormFieldLabel({ children, required, as: Tag = "h2", className = "" }) {
  return (
    <Tag className={className}>
      {children}
      {required && (
        <span className="text-red-500" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </Tag>
  );
}
