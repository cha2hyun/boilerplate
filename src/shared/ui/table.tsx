import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export interface TableColumnLayout {
  pin: 'left' | 'right' | false
  offset: number
  edge: boolean
}
const PinningContext = React.createContext(true)

type TableProps = React.ComponentProps<'table'> & {
  containerProps?: Omit<React.ComponentProps<'div'>, 'children' | 'dangerouslySetInnerHTML' | 'ref'>
  columnWidths?: number[]
  density?: 'compact' | 'default' | 'comfortable'
  pinnedWidth?: number
}

function Table({
  className,
  containerProps,
  columnWidths,
  density,
  pinnedWidth = 0,
  children,
  ...props
}: TableProps) {
  const { className: containerClassName, ...scrollProps } = containerProps ?? {}
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = React.useState(Number.POSITIVE_INFINITY)
  const hasColumnWidths = columnWidths !== undefined
  React.useEffect(() => {
    const element = containerRef.current
    if (!element || !hasColumnWidths) return
    if (typeof ResizeObserver === 'undefined') {
      const measure = () => {
        setContainerWidth(element.clientWidth)
      }
      const frame = requestAnimationFrame(measure)
      window.addEventListener('resize', measure)
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('resize', measure)
      }
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [hasColumnWidths])
  // Keep at least 64px of the scrolling middle pane on narrow/zoomed viewports.
  const pinningEnabled = pinnedWidth <= containerWidth - 64
  return (
    <PinningContext value={pinningEnabled}>
      <div
        {...scrollProps}
        ref={containerRef}
        data-slot="table-container"
        className={cn(
          'relative w-full touch-auto overflow-x-auto overscroll-x-contain',
          containerClassName,
        )}
      >
        <table
          data-slot="table"
          data-density={density}
          data-pinning={pinningEnabled ? 'enabled' : 'suspended'}
          className={cn(
            'w-full caption-bottom text-sm',
            columnWidths && 'table-fixed',
            density === 'compact' && '[&_tbody>tr]:h-14 [&_tbody>tr>td]:py-1.5',
            density === 'comfortable' && '[&_tbody>tr]:h-22 [&_tbody>tr>td]:py-5',
            className,
          )}
          {...props}
          style={
            columnWidths
              ? { width: columnWidths.reduce((sum, width) => sum + width, 0) }
              : undefined
          }
        >
          {columnWidths && (
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
          )}
          {children}
        </table>
      </div>
    </PinningContext>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  layout,
  ...props
}: React.ComponentProps<'th'> & { layout?: TableColumnLayout }) {
  const enabled = React.useContext(PinningContext)
  const pin = enabled && layout?.pin
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        layout && 'relative md:pr-4',
        pin && 'sticky z-10 bg-muted',
        pin && layout.edge && (pin === 'left' ? 'border-r' : 'border-l'),
        className,
      )}
      {...props}
      style={
        pin
          ? {
              left: pin === 'left' ? layout.offset : undefined,
              right: pin === 'right' ? layout.offset : undefined,
            }
          : undefined
      }
    />
  )
}

function TableCell({
  className,
  layout,
  ...props
}: React.ComponentProps<'td'> & { layout?: TableColumnLayout }) {
  const enabled = React.useContext(PinningContext)
  const pin = enabled && layout?.pin
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        pin &&
          'sticky z-10 bg-card in-[[data-slot=table-row]:hover]:bg-muted in-[[data-state=selected]]:bg-muted',
        pin && layout.edge && (pin === 'left' ? 'border-r' : 'border-l'),
        className,
      )}
      {...props}
      style={
        pin
          ? {
              left: pin === 'left' ? layout.offset : undefined,
              right: pin === 'right' ? layout.offset : undefined,
            }
          : undefined
      }
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
