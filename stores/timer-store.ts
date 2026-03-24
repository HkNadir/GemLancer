/**
 * GemLancer — Floating Timer Zustand Store
 *
 * Persisted to localStorage via zustand/middleware/persist.
 * Survives full page navigations (App Router soft nav + hard refresh).
 * Auto-stops after 2 hours of inactivity (checked on each tick/focus).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────

export interface TimerTask {
  id: string
  title: string
  project_id: string
  project_name: string
}

interface TimerState {
  // Runtime state
  isRunning: boolean
  task: TimerTask | null
  startedAt: string | null      // ISO string, set when timer starts
  pausedAt: string | null       // ISO string, set when paused
  accumulatedMs: number         // ms accumulated before current segment
  description: string
  billable: boolean

  // UI state
  isVisible: boolean            // show/hide floating widget
  isExpanded: boolean           // compact vs expanded mode

  // Actions
  start: (task: TimerTask) => void
  stop: () => { startedAt: string; endedAt: string; taskId: string; projectId: string; billable: boolean; description: string } | null
  pause: () => void
  resume: () => void
  discard: () => void
  setDescription: (description: string) => void
  setBillable: (billable: boolean) => void
  setVisible: (visible: boolean) => void
  setExpanded: (expanded: boolean) => void

  // Computed helpers (not persisted — call these directly)
  getElapsedMs: () => number
  isOverdue: () => boolean      // > 2 hours
}

// ── Constants ─────────────────────────────────────────────────

const AUTO_STOP_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

// ── Store ─────────────────────────────────────────────────────

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      task: null,
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
      description: '',
      billable: true,
      isVisible: true,
      isExpanded: false,

      start(task) {
        // If a timer is already running for this same task, do nothing
        const { isRunning, task: current } = get()
        if (isRunning && current?.id === task.id) return

        set({
          isRunning: true,
          task,
          startedAt: new Date().toISOString(),
          pausedAt: null,
          accumulatedMs: 0,
          description: '',
          billable: true,
          isVisible: true,
          isExpanded: true,
        })
      },

      stop() {
        const { isRunning, task, startedAt, accumulatedMs, description, billable } = get()

        if (!task || !startedAt) return null

        const endedAt = new Date().toISOString()

        // Total elapsed must be at least 1 minute to be worth logging
        const totalMs = accumulatedMs + (isRunning ? Date.now() - new Date(startedAt).getTime() : 0)
        if (totalMs < 60_000) {
          // Too short — discard silently
          get().discard()
          return null
        }

        // Reconstruct the true started_at as the wall-clock time minus accumulated
        const trueStartMs = Date.now() - totalMs
        const trueStartedAt = new Date(trueStartMs).toISOString()

        const result = {
          startedAt: trueStartedAt,
          endedAt,
          taskId: task.id,
          projectId: task.project_id,
          billable,
          description,
        }

        get().discard()
        return result
      },

      pause() {
        const { isRunning, startedAt, accumulatedMs } = get()
        if (!isRunning || !startedAt) return

        const elapsed = Date.now() - new Date(startedAt).getTime()
        set({
          isRunning: false,
          pausedAt: new Date().toISOString(),
          accumulatedMs: accumulatedMs + elapsed,
          startedAt: null,
        })
      },

      resume() {
        const { isRunning } = get()
        if (isRunning) return

        set({
          isRunning: true,
          startedAt: new Date().toISOString(),
          pausedAt: null,
        })
      },

      discard() {
        set({
          isRunning: false,
          task: null,
          startedAt: null,
          pausedAt: null,
          accumulatedMs: 0,
          description: '',
          billable: true,
          isExpanded: false,
        })
      },

      setDescription(description) {
        set({ description })
      },

      setBillable(billable) {
        set({ billable })
      },

      setVisible(isVisible) {
        set({ isVisible })
      },

      setExpanded(isExpanded) {
        set({ isExpanded })
      },

      getElapsedMs() {
        const { isRunning, startedAt, accumulatedMs } = get()
        if (isRunning && startedAt) {
          return accumulatedMs + (Date.now() - new Date(startedAt).getTime())
        }
        return accumulatedMs
      },

      isOverdue() {
        return get().getElapsedMs() > AUTO_STOP_THRESHOLD_MS
      },
    }),
    {
      name: 'gemlancer-timer',
      storage: createJSONStorage(() => localStorage),
      // Only persist state, not actions
      partialize: (state) => ({
        isRunning: state.isRunning,
        task: state.task,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        accumulatedMs: state.accumulatedMs,
        description: state.description,
        billable: state.billable,
        isVisible: state.isVisible,
        isExpanded: state.isExpanded,
      }),
      // On rehydration: if the timer was running but we've been away > 2 hours, auto-pause it
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.isRunning && state.startedAt) {
          const elapsed = Date.now() - new Date(state.startedAt).getTime()
          if (elapsed > AUTO_STOP_THRESHOLD_MS) {
            // Auto-pause; floating timer will show the 2h warning
            const totalAccumulated = state.accumulatedMs + elapsed
            state.isRunning = false
            state.pausedAt = new Date().toISOString()
            state.accumulatedMs = totalAccumulated
            state.startedAt = null
          }
        }
      },
    }
  )
)

// ── Selectors (memoization-friendly) ─────────────────────────

export const selectIsRunning = (s: TimerState) => s.isRunning
export const selectTask = (s: TimerState) => s.task
export const selectBillable = (s: TimerState) => s.billable
export const selectDescription = (s: TimerState) => s.description
export const selectIsExpanded = (s: TimerState) => s.isExpanded
export const selectIsVisible = (s: TimerState) => s.isVisible

// ── Formatting helper (used in FloatingTimer component) ───────

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
