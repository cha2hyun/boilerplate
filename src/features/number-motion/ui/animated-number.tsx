import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'

export const NUMBER_MOTION_DURATION = 240
const motionQuery = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window.matchMedia !== 'function' || window.matchMedia(motionQuery).matches
}

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  className?: string
}

/** Remount for a new value; formatting/parent renders must not restart the timeline. */
export function AnimatedNumber(props: AnimatedNumberProps) {
  return <NumberTransition key={props.value} {...props} />
}

function NumberTransition({ value, format, className }: AnimatedNumberProps) {
  const [progress, setProgress] = useState(() =>
    prefersReducedMotion() || document.hidden ? 1 : 0,
  )

  useEffect(() => {
    if (prefersReducedMotion() || document.hidden) return
    const media = window.matchMedia(motionQuery)

    const startedAt = performance.now()
    let frame = 0
    let deadline = 0
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(frame)
      window.clearTimeout(deadline)
      setProgress(1)
    }
    const tick = (now: number) => {
      if (finished) return
      const elapsed = Math.min(1, Math.max(0, (now - startedAt) / NUMBER_MOTION_DURATION))
      if (elapsed === 1) {
        finish()
      } else {
        setProgress(1 - (1 - elapsed) ** 3)
        frame = requestAnimationFrame(tick)
      }
    }
    const onVisibilityChange = () => {
      if (document.hidden) finish()
    }
    const onMotionChange = () => {
      if (media.matches) finish()
    }

    frame = requestAnimationFrame(tick)
    // The duration is elapsed time, never a frame count; slow frames cannot extend it.
    deadline = window.setTimeout(finish, NUMBER_MOTION_DURATION)
    document.addEventListener('visibilitychange', onVisibilityChange)
    media.addEventListener('change', onMotionChange)
    return () => {
      finished = true
      cancelAnimationFrame(frame)
      window.clearTimeout(deadline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      media.removeEventListener('change', onMotionChange)
    }
  }, [])

  const complete = progress === 1
  const finalText = format(value)
  const currentValue = Number.isInteger(value) ? Math.round(value * progress) : value * progress
  return (
    <span
      className={cn('relative inline-grid tabular-nums', className)}
      data-number-state={complete ? 'idle' : 'running'}
    >
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden="true">
        {finalText}
      </span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap" aria-hidden="true">
        {complete ? finalText : format(currentValue)}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  )
}
