'use client'

import { useMemo, useRef, useState } from 'react'
import type { MilestoneWithTasks } from '@/types/database'

const DAY_PX = 28
const ROW_H = 36
const HEADER_H = 48
const LABEL_W = 200

const STATUS_FILL: Record<string, string> = {
  pending:   '#9ca3af',
  submitted: '#fbbf24',
  approved:  '#22c55e',
  rejected:  '#f87171',
}

const TASK_STATUS_FILL: Record<string, string> = {
  backlog:     '#d1d5db',
  todo:        '#93c5fd',
  in_progress: '#fcd34d',
  in_review:   '#c4b5fd',
  done:        '#4ade80',
}

interface Row {
  type: 'milestone' | 'task'
  id: string
  label: string
  status: string
  start: Date | null
  end: Date | null
  indent: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

interface Props {
  milestones: MilestoneWithTasks[]
  projectStart: string | null
  projectEnd: string | null
}

export function GanttChart({ milestones, projectStart, projectEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = []
    for (const m of milestones) {
      result.push({
        type: 'milestone',
        id: m.id,
        label: m.name,
        status: m.status,
        start: m.due_date ? new Date(m.due_date) : null,
        end:   m.due_date ? new Date(m.due_date) : null,
        indent: 0,
      })
      if (!collapsed.has(m.id)) {
        for (const t of m.tasks) {
          result.push({
            type: 'task',
            id: t.id,
            label: t.title,
            status: t.status,
            start: t.due_date ? new Date(new Date(t.due_date).getTime() - 86400000) : null,
            end:   t.due_date ? new Date(t.due_date) : null,
            indent: 1,
          })
        }
      }
    }
    return result
  }, [milestones, collapsed])

  // Determine date range
  const allDates = rows.flatMap((r) => [r.start, r.end]).filter(Boolean) as Date[]
  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date()
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date(Date.now() + 30 * 86400000)

  // Add padding
  minDate.setDate(minDate.getDate() - 3)
  maxDate.setDate(maxDate.getDate() + 3)

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000)
  const chartWidth = totalDays * DAY_PX

  const dayOffset = (date: Date) =>
    Math.floor((date.getTime() - minDate.getTime()) / 86400000) * DAY_PX

  // Generate day headers
  const days: { label: string; x: number; isWeekend: boolean }[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate.getTime() + i * 86400000)
    days.push({
      label: d.getDate() === 1 || i === 0
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : String(d.getDate()),
      x: i * DAY_PX,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }

  const totalHeight = HEADER_H + rows.length * ROW_H

  return (
    <div className="flex overflow-hidden border rounded-xl bg-card">
      {/* Label column */}
      <div className="shrink-0 border-r" style={{ width: LABEL_W }}>
        <div className="h-12 border-b flex items-end px-3 pb-2">
          <span className="text-xs font-semibold text-muted-foreground">Milestone / Task</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-1.5 border-b last:border-0 hover:bg-muted/30 transition-colors"
            style={{ height: ROW_H, paddingLeft: 12 + row.indent * 16 }}
          >
            {row.type === 'milestone' && (
              <button
                onClick={() => setCollapsed((prev) => {
                  const next = new Set(prev)
                  if (next.has(row.id)) next.delete(row.id)
                  else next.add(row.id)
                  return next
                })}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                {collapsed.has(row.id) ? '▶' : '▼'}
              </button>
            )}
            <span className={`text-xs truncate ${row.type === 'milestone' ? 'font-semibold' : 'text-muted-foreground'}`}
              style={{ maxWidth: LABEL_W - 40 - row.indent * 16 }}>
              {row.label}
            </span>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div ref={containerRef} className="flex-1 overflow-x-auto">
        <svg
          width={chartWidth}
          height={totalHeight}
          className="select-none"
        >
          {/* Weekend shading */}
          {days.map((d, i) => d.isWeekend && (
            <rect key={i} x={d.x} y={0} width={DAY_PX} height={totalHeight}
              fill="currentColor" className="text-muted" opacity={0.15} />
          ))}

          {/* Today line */}
          {(() => {
            const todayX = dayOffset(new Date())
            if (todayX >= 0 && todayX <= chartWidth) {
              return <line x1={todayX} y1={0} x2={todayX} y2={totalHeight}
                stroke="#f87171" strokeWidth={1.5} strokeDasharray="4,3" />
            }
          })()}

          {/* Header */}
          {days.map((d, i) => (
            <g key={i}>
              {(d.label.length > 2 || i === 0) && (
                <text x={d.x + 2} y={HEADER_H - 8} fontSize={10}
                  fill="currentColor" className="text-muted-foreground">{d.label}</text>
              )}
              <line x1={d.x} y1={0} x2={d.x} y2={HEADER_H}
                stroke="currentColor" className="text-border" strokeWidth={0.5} />
            </g>
          ))}
          <line x1={0} y1={HEADER_H} x2={chartWidth} y2={HEADER_H} stroke="currentColor" className="text-border" strokeWidth={1} />

          {/* Bars */}
          {rows.map((row, i) => {
            const y = HEADER_H + i * ROW_H
            const mid = y + ROW_H / 2

            if (!row.start || !row.end) return (
              <g key={row.id}>
                <line x1={0} y1={y + ROW_H} x2={chartWidth} y2={y + ROW_H}
                  stroke="currentColor" className="text-border" strokeWidth={0.5} />
              </g>
            )

            const x1 = dayOffset(row.start)
            const x2 = dayOffset(row.end) + DAY_PX
            const barW = Math.max(x2 - x1, DAY_PX)
            const fill = row.type === 'milestone'
              ? (STATUS_FILL[row.status] ?? '#9ca3af')
              : (TASK_STATUS_FILL[row.status] ?? '#d1d5db')

            return (
              <g key={row.id}>
                {row.type === 'milestone' ? (
                  // Diamond for milestone
                  <polygon
                    points={`${x1 + DAY_PX / 2},${mid - 8} ${x1 + DAY_PX},${mid} ${x1 + DAY_PX / 2},${mid + 8} ${x1},${mid}`}
                    fill={fill}
                    opacity={0.9}
                  />
                ) : (
                  <rect x={x1} y={mid - 8} width={barW} height={16} rx={4}
                    fill={fill}
                    opacity={0.85}
                  />
                )}
                <line x1={0} y1={y + ROW_H} x2={chartWidth} y2={y + ROW_H}
                  stroke="currentColor" className="text-border" strokeWidth={0.5} />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
