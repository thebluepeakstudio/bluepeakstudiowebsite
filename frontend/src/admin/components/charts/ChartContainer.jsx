export default function ChartContainer({ children, className = "" }) {
  return (
    <div className={`h-[220px] w-full min-w-0 sm:h-[280px] ${className}`}>{children}</div>
  );
}
