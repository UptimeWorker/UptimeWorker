export default function MonitorCardSkeleton() {
  return (
    <div className="border-b border-border last:border-0 animate-pulse">
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 h-4 w-24 rounded-md bg-muted sm:w-32" />
            <div className="h-3 w-20 rounded-md bg-muted/60 sm:w-24" />
          </div>

          <div className="flex flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:gap-5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="h-4 w-16 rounded-md bg-muted sm:w-20" />
            </div>
            <div className="h-3 w-10 rounded-md bg-muted/60 sm:h-4 sm:w-12" />
          </div>
        </div>

        <div className="mt-4 w-full">
          <div className="mb-2 flex gap-0.5">
            {Array.from({ length: 60 }, (_, i) => (
              <div key={i} className="h-5 flex-1 rounded-sm bg-muted" />
            ))}
          </div>

          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-8 rounded-md bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
