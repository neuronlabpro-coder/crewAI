'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-dim hover:text-ink hover:bg-raised transition-colors text-xs"
    >
      <span className="text-base leading-none">{isDark ? '☀' : '☽'}</span>
      <span className="font-display font-medium">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
    </button>
  )
}
