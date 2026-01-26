'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface LazySectionProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
}

/**
 * Defers rendering of children until the element is visible in the viewport.
 * Useful for below-the-fold content like dashboard charts.
 */
export function LazySection({
  children,
  fallback = <div className="h-64 animate-pulse bg-muted rounded" />,
  rootMargin = '100px' // Start loading slightly before visible
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Use IntersectionObserver to detect when element enters viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Once visible, no need to observe anymore
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  )
}
