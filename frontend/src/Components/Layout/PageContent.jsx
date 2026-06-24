/**
 * Shared horizontal layout — 90% width, max 1200px, centered.
 */
export default function PageContent({ children, className = "" }) {
  return (
    <div className={`mx-auto w-[90%] max-w-[1200px] ${className}`}>{children}</div>
  );
}
