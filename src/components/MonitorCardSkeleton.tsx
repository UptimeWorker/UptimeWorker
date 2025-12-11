export default function MonitorCardSkeleton() {
  return (
    <div className="border-b border-border last:border-0 animate-pulse">
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {/* Desktop layout */}
        <div className="hidden sm:flex items-start gap-3 sm:gap-6">
          {/* Left: Name + Description */}
          <div className="min-w-[120px] sm:min-w-[160px] pt-1">
            <div className="h-4 bg-muted rounded w-24 sm:w-32 mb-1" />
            <div className="h-3 bg-muted/60 rounded w-20 sm:w-24" />
          </div>

          {/* Uptime percentage */}
          <div className="min-w-[55px] text-right pt-1">
            <div className="h-4 bg-muted rounded w-12" />
          </div>

          {/* Timeline + Filters wrapper */}
          <div className="flex-1 min-w-0">
            {/* Timeline bars - 90 bars */}
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: 90 }, (_, i) => (
                <div key={i} className="h-3.5 flex-1 rounded-sm bg-muted" />
              ))}
            </div>

            {/* Period filters skeleton */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 w-10 bg-muted/60 rounded" />
              ))}
            </div>
          </div>

          {/* Right: Status badge */}
          <div className="flex items-center gap-1.5 min-w-[90px] justify-end pt-1">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
        </div>

        {/* Mobile layout */}
        <div className="sm:hidden space-y-3">
          {/* Header: Name + Status */}
          <div className="flex items-start justify-between gap-3">
            {/* Name */}
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-28 mb-1" />
              <div className="h-3 bg-muted/60 rounded w-20" />
            </div>

            {/* Status + Uptime */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
              <div className="h-3 bg-muted/60 rounded w-10" />
            </div>
          </div>

          {/* Timeline */}
          <div className="w-full">
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: 90 }, (_, i) => (
                <div key={i} className="h-3.5 flex-1 rounded-sm bg-muted" />
              ))}
            </div>

            {/* Period filters skeleton */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 w-10 bg-muted/60 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
