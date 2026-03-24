'use client'

interface BrandColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const PRESETS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#0f172a', // Slate-900
  '#374151', // Gray-700
  '#000000', // Black
]

export function BrandColorPicker({ value, onChange }: BrandColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
              value === color ? 'border-foreground scale-110' : 'border-transparent'
            }`}
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border p-0.5"
          title="Custom color"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          maxLength={7}
          className="rounded-md border bg-background px-2 py-1 text-sm font-mono w-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="h-8 w-8 rounded-full border" style={{ background: value }} />
      </div>
    </div>
  )
}
