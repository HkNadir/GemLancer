'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'gemlancer-sidebar-collapsed'

export interface UseSidebarReturn {
  collapsed: boolean
  toggle: () => void
  collapse: () => void
  expand: () => void
  /** False during SSR / hydration — use to avoid flash */
  mounted: boolean
}

export function useSidebar(): UseSidebarReturn {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) setCollapsed(JSON.parse(saved) as boolean)
    } catch {
      // localStorage unavailable — proceed with default
    }
  }, [])

  const persist = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      persist(!prev)
      return !prev
    })
  }, [persist])

  const collapse = useCallback(() => {
    setCollapsed(true)
    persist(true)
  }, [persist])

  const expand = useCallback(() => {
    setCollapsed(false)
    persist(false)
  }, [persist])

  return { collapsed, toggle, collapse, expand, mounted }
}
