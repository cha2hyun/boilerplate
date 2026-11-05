import { useEffect, useMemo, useState } from 'react'
import { formatNumber, type NumberFormatOptions } from '@/shared/lib/format'
import { useLocalePreferences } from '@/shared/lib/i18n/preferences'
import { cn } from '@/shared/lib/utils'

export const NUMBER_MOTION_DURATION = 300
const motionSteps = 20
const motionQuery = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window.matchMedia !== 'function' || window.matchMedia(motionQuery).matches
}

interface NumberDisplayProps {
  value: number | null | undefined
  format?: NumberFormatOptions
  animate?: boolean
  wrap?: boolean
  className?: string
}

/** New values or an explicit motion toggle restart; formatting never restarts the timeline. */
export function NumberDisplay({ animate = false, format, ...props }: NumberDisplayProps) {
  const locale = useLocalePreferences((state) => state.locale)
  const localizedFormat = useMemo(() => ({ locale, ...format }), [locale, format])
  return (
    <NumberTransition
      key={`${String(props.value)}:${String(animate)}`}
      animate={animate}
      format={localizedFormat}
      {...props}
    />
  )
}

function NumberTransition({ value, format, animate, wrap = false, className }: NumberDisplayProps) {
  const canAnimate = !!animate && value != null && Number.isFinite(value) && value !== 0
  const [startsAnimated] = useState(() => canAnimate && !prefersReducedMotion() && !document.hidden)
  const [step, setStep] = useState(startsAnimated ? 0 : motionSteps)
  const finalText = formatNumber(value, format)
  const displayFrames = useMemo(() => {
    if (!startsAnimated || value == null) return []
    return Array.from({ length: motionSteps + 1 }, (_, index) => {
      if (index === motionSteps) return formatNumber(value, format)
      const progress = 1 - (1 - index / motionSteps) ** 3
      const current = Number.isInteger(value) ? Math.round(value * progress) : value * progress
      return formatNumber(current, format)
    })
  }, [startsAnimated, value, format])

  useEffect(() => {
    if (!startsAnimated) return
    let frame = 0
    let deadline = 0
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(frame)
      window.clearTimeout(deadline)
      setStep(motionSteps)
    }
    // Preferences can change between rendering and effect subscription. Finish even then.
    if (prefersReducedMotion() || document.hidden) {
      queueMicrotask(finish)
      return () => {
        finished = true
      }
    }
    const media = window.matchMedia(motionQuery)
    const startedAt = performance.now()
    const tick = (now: number) => {
      if (finished) return
      const elapsed = Math.min(1, Math.max(0, (now - startedAt) / NUMBER_MOTION_DURATION))
      if (elapsed === 1) {
        finish()
      } else {
        setStep(Math.floor(elapsed * motionSteps))
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
  }, [startsAnimated])

  const complete = step === motionSteps
  const textLayout = wrap ? 'wrap-anywhere whitespace-normal' : 'whitespace-nowrap'
  return (
    <span
      className={cn('relative inline-grid tabular-nums', wrap && 'max-w-full min-w-0', className)}
      data-number-state={complete ? 'idle' : 'running'}
    >
      <span className={cn('invisible col-start-1 row-start-1', textLayout)} aria-hidden="true">
        {finalText}
      </span>
      {/* Reserve every possible intermediate too: 875K can be wider than the final 1M. */}
      {[...new Set(displayFrames)]
        .filter((text) => text !== finalText)
        .map((text) => (
          <span
            key={text}
            className={cn('invisible col-start-1 row-start-1', textLayout)}
            aria-hidden="true"
          >
            {text}
          </span>
        ))}
      <span className={cn('absolute inset-0 overflow-hidden', textLayout)} aria-hidden="true">
        {complete ? finalText : displayFrames[step]}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  )
}
