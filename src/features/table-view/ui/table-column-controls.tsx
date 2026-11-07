import { useLayoutEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { HStack } from '@/shared/ui/stack'
import type { TableView } from '../model/use-table-view'

interface Gesture {
  kind: 'resize' | 'move'
  startX: number
  width: number
  target?: string
}

export function TableColumnControls({ view, columnId }: { view: TableView; columnId: string }) {
  const { t } = useTranslation('common')
  const gesture = useRef<Gesture | null>(null)
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const movedButtonRef = useRef<HTMLButtonElement | null>(null)
  useLayoutEffect(() => {
    const button = movedButtonRef.current
    movedButtonRef.current = null
    if (button?.isConnected) button.focus()
  })
  const column = view.columns.find((candidate) => candidate.id === columnId)
  if (!column || column.locked) return null
  const cancel = () => {
    gesture.current = null
    setDragTarget(null)
    view.clearPreview()
  }
  return (
    <HStack className="hidden shrink-0 gap-0 md:flex">
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={t('tableView.move', { column: column.label })}
        title={t('tableView.moveHint')}
        onClick={(event) => {
          event.stopPropagation()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancel()
            event.stopPropagation()
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            event.stopPropagation()
            const direction = event.key === 'ArrowLeft' ? -1 : 1
            if (view.canMove(columnId, direction)) {
              movedButtonRef.current = event.currentTarget
              view.move(columnId, direction)
            }
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          gesture.current = { kind: 'move', startX: event.clientX, width: 0 }
        }}
        onPointerMove={(event) => {
          if (gesture.current?.kind !== 'move') return
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('th[data-column-id]')
          const ownTable = event.currentTarget.closest('table')
          const targetId =
            target?.closest('table') === ownTable ? target.dataset.columnId : undefined
          const candidate = view.columns.find((item) => item.id === targetId)
          const valid =
            candidate &&
            !candidate.locked &&
            candidate.id !== columnId &&
            view.getPin(candidate.id) === view.getPin(columnId)
          gesture.current.target = valid ? candidate.id : undefined
          setDragTarget(valid ? candidate.label : null)
        }}
        onPointerUp={(event) => {
          if (gesture.current?.kind === 'move' && gesture.current.target) {
            movedButtonRef.current = event.currentTarget
            view.reorder(columnId, gesture.current.target)
          }
          cancel()
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        <GripVertical aria-hidden="true" className={dragTarget ? 'text-foreground' : undefined} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute inset-y-0 right-0 z-20 h-auto w-3 cursor-col-resize touch-none rounded-none p-0 hover:bg-accent focus-visible:bg-accent"
        aria-label={t('tableView.resize', { column: column.label })}
        title={t('tableView.resizeHint')}
        onClick={(event) => {
          event.stopPropagation()
        }}
        onDoubleClick={() => {
          view.setWidth(columnId, column.width)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancel()
            event.stopPropagation()
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            event.stopPropagation()
            view.setWidth(
              columnId,
              view.getWidth(columnId) + (event.key === 'ArrowRight' ? 16 : -16),
            )
          }
          if (event.key === 'Home') {
            event.preventDefault()
            view.setWidth(columnId, column.width)
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          gesture.current = {
            kind: 'resize',
            startX: event.clientX,
            width: view.getWidth(columnId),
          }
        }}
        onPointerMove={(event) => {
          const active = gesture.current
          if (active?.kind === 'resize')
            view.previewWidth(columnId, active.width + event.clientX - active.startX)
        }}
        onPointerUp={(event) => {
          const active = gesture.current
          if (active?.kind === 'resize')
            view.setWidth(columnId, active.width + event.clientX - active.startX)
          cancel()
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        <span className="h-4 w-px bg-border" aria-hidden="true" />
      </Button>
      <span className="sr-only" role="status">
        {dragTarget ? t('tableView.dropAt', { column: dragTarget }) : ''}
      </span>
    </HStack>
  )
}
