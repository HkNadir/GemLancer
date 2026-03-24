interface StorageQuotaProps {
  usedBytes: number
  limitGb: number
}

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function StorageQuota({ usedBytes, limitGb }: StorageQuotaProps) {
  const limitBytes = limitGb * 1024 * 1024 * 1024
  const pct = Math.min(100, (usedBytes / limitBytes) * 100)
  const isWarning = pct >= 80
  const isCritical = pct >= 95

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex-1 max-w-[160px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Storage</span>
          <span className="text-xs text-muted-foreground">{fmtBytes(usedBytes)} / {limitGb} GB</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
