export default function MonitorStatusHeaderSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2.5">
            {/* Status icon skeleton */}
            <div className="h-7 w-7 rounded-md bg-muted" />
            {/* Title skeleton */}
            <div className="h-5 w-40 rounded-md bg-muted sm:w-52" />
          </div>
          {/* Timestamp skeleton */}
          <div className="ml-10 h-4 w-36 rounded-md bg-muted/60" />
        </div>
      </div>
    </div>
  )
}
