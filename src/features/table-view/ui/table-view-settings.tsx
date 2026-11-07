import { useId, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { HStack, VStack } from '@/shared/ui/stack'
import type { TableView } from '../model/use-table-view'
import type { TableViewColumn } from '../model/view-state'

function WidthInput({ view, column }: { view: TableView; column: TableViewColumn }) {
  const { t } = useTranslation('common')
  const width = view.getWidth(column.id)
  const [draft, setDraft] = useState({ base: width, text: String(width) })
  const text = draft.base === width ? draft.text : String(width)
  const commit = () => {
    if (text.trim()) view.setWidth(column.id, Number(text))
    setDraft({ base: width, text: String(width) })
  }
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={column.minWidth ?? 96}
      max={column.maxWidth ?? 640}
      step={16}
      className="h-9 w-24 tabular-nums"
      value={text}
      data-table-width-dirty={text !== String(width)}
      aria-label={t('tableView.widthOf', { column: column.label })}
      onChange={(event) => {
        setDraft({ base: width, text: event.target.value })
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
        if (event.key === 'Escape') {
          event.stopPropagation()
          setDraft({ base: width, text: String(width) })
        }
      }}
    />
  )
}

export function TableViewSettings({ view }: { view: TableView }) {
  const { t } = useTranslation('common')
  const id = useId()
  const movedButtonRef = useRef<HTMLButtonElement | null>(null)
  useLayoutEffect(() => {
    const button = movedButtonRef.current
    movedButtonRef.current = null
    if (!button?.isConnected) return
    const target = button.disabled
      ? button
          .closest('[data-column-settings]')
          ?.querySelector<HTMLButtonElement>('button[data-column-move]:not(:disabled)')
      : button
    target?.focus()
  })
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto min-h-9 max-w-full whitespace-normal">
          <SlidersHorizontal aria-hidden="true" /> {t('tableView.title')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.dataset.tableWidthDirty === 'true'
          )
            event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('tableView.title')}</DialogTitle>
          <DialogDescription>{t('tableView.description')}</DialogDescription>
        </DialogHeader>
        <VStack align="stretch" className="min-h-0 gap-5 overflow-y-auto pr-1">
          <VStack align="stretch" className="gap-2">
            <Label htmlFor={`${id}-density`}>{t('tableView.density')}</Label>
            <Select
              value={view.density}
              onValueChange={(value) => {
                if (value === 'compact' || value === 'default' || value === 'comfortable')
                  view.setDensity(value)
              }}
            >
              <SelectTrigger
                id={`${id}-density`}
                className="w-full"
                aria-label={t('tableView.density')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{t('tableView.compact')}</SelectItem>
                <SelectItem value="default">{t('tableView.default')}</SelectItem>
                <SelectItem value="comfortable">{t('tableView.comfortable')}</SelectItem>
              </SelectContent>
            </Select>
          </VStack>
          <VStack align="stretch" className="gap-3">
            <p className="text-sm font-medium">{t('tableView.columns')}</p>
            {view.columns
              .filter((column) => !column.locked)
              .map((column) => (
                <VStack
                  key={column.id}
                  align="stretch"
                  className="gap-3 rounded-md border p-3"
                  data-column-settings={column.id}
                >
                  <HStack justify="between" className="gap-2">
                    <HStack className="min-w-0 gap-2">
                      <Checkbox
                        id={`${id}-${column.id}`}
                        checked={view.state.columnVisibility[column.id]}
                        disabled={column.hideable === false}
                        aria-label={t('tableView.show', { column: column.label })}
                        onCheckedChange={(checked) => {
                          view.setVisibility(column.id, checked === true)
                        }}
                      />
                      <Label htmlFor={`${id}-${column.id}`} className="min-w-0 wrap-anywhere">
                        {column.label}
                      </Label>
                    </HStack>
                    <HStack className="shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!view.canMove(column.id, -1)}
                        aria-label={t('tableView.earlier', { column: column.label })}
                        data-column-move
                        onClick={(event) => {
                          movedButtonRef.current = event.currentTarget
                          view.move(column.id, -1)
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!view.canMove(column.id, 1)}
                        aria-label={t('tableView.later', { column: column.label })}
                        data-column-move
                        onClick={(event) => {
                          movedButtonRef.current = event.currentTarget
                          view.move(column.id, 1)
                        }}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </HStack>
                  </HStack>
                  <HStack wrap className="gap-3">
                    <VStack align="stretch" className="min-w-0 flex-1 basis-32 gap-1.5">
                      <Label htmlFor={`${id}-${column.id}-pin`}>{t('tableView.pin')}</Label>
                      <Select
                        value={view.getPin(column.id) || 'none'}
                        onValueChange={(value) => {
                          if (value === 'left' || value === 'right' || value === 'none')
                            view.setPin(column.id, value === 'none' ? false : value)
                        }}
                      >
                        <SelectTrigger
                          id={`${id}-${column.id}-pin`}
                          aria-label={t('tableView.pinColumn', { column: column.label })}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('tableView.none')}</SelectItem>
                          <SelectItem value="left">{t('tableView.left')}</SelectItem>
                          <SelectItem value="right">{t('tableView.right')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </VStack>
                    <VStack align="stretch" className="gap-1.5">
                      <span className="text-sm font-medium">{t('tableView.width')}</span>
                      <WidthInput view={view} column={column} />
                    </VStack>
                  </HStack>
                </VStack>
              ))}
            <p className="text-xs text-muted-foreground">{t('tableView.hint')}</p>
          </VStack>
        </VStack>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="h-auto min-h-9 whitespace-normal"
            onClick={view.reset}
          >
            <RotateCcw aria-hidden="true" />
            {t('tableView.reset')}
          </Button>
          <DialogClose asChild>
            <Button>{t('tableView.done')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
