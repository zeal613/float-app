import { useEffect, useRef, useState } from 'react'

export default function AnimatedNumber({ value, duration = 1000, prefix = '', className = '' }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const start = prev.current
    const end = value
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplay(current)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
      else prev.current = end
    }

    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{display.toLocaleString('en-KE')}
    </span>
  )
}
