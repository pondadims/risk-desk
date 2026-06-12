import { useEffect, useRef, useState } from 'react'

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/**
 * Animates a number from its previous value to the new target.
 * Returns the current display value.
 * Respects prefers-reduced-motion — returns target immediately when set.
 */
export function useCountUp(target, duration = 380) {
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [display, setDisplay] = useState(target)
  const prevRef  = useRef(target)
  const rafRef   = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const from = prevRef.current
    const to   = Number(target) || 0
    prevRef.current = to

    if (reduced || Math.abs(to - from) < 0.005) {
      setDisplay(to)
      return
    }

    cancelAnimationFrame(rafRef.current)
    startRef.current = null

    const tick = (now) => {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(from + (to - from) * easeOut(progress))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, reduced])

  return display
}
