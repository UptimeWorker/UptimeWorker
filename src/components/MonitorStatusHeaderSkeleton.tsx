export default function MonitorStatusHeaderSkeleton() {
  return (
    <div className="mb-8 sm:mb-12">
      <div className="rounded-lg border-2 border-border bg-muted/30 p-6 sm:p-8 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              {/* Status dot skeleton */}
              <div className="w-2 h-2 rounded-full bg-muted" />
              {/* Title skeleton */}
              <div className="h-6 sm:h-7 bg-muted rounded w-48 sm:w-64" />
            </div>
            {/* Timestamp skeleton */}
            <div className="h-3 sm:h-4 bg-muted/60 rounded w-32 sm:w-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
