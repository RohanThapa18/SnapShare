export default function RowsSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 py-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-surface-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-surface-sunken" />
            <div className="h-2.5 w-48 rounded bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}