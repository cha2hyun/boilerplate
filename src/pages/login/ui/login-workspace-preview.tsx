import { useId } from 'react'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// This public illustration stays independent of workspace records and currency conversion.
const previewOrders = [
  { id: 'ORD-1042', status: 'Processing', totalUsd: 123, dot: 'bg-muted-foreground' },
  { id: 'ORD-1041', status: 'Shipped', totalUsd: 80, dot: 'bg-brand/70' },
  { id: 'ORD-1040', status: 'Delivered', totalUsd: 149, dot: 'bg-primary/70' },
] as const

export function LoginWorkspacePreview() {
  const { t } = useTranslation('demoLogin')
  const { t: admin } = useTranslation('admin')
  const { formatNumber } = useFormatters()
  const previewId = useId()

  return (
    <VStack
      asChild
      justify="center"
      align="stretch"
      className="hidden min-w-0 gap-4 self-stretch rounded-2xl border bg-login-preview [background-size:1.65rem_1.65rem,1.65rem_1.65rem,100%_100%] p-[clamp(2rem,4.5vw,4.7rem)] xl:flex xl:bg-muted/50"
    >
      <aside aria-labelledby={previewId}>
        <HStack asChild className="gap-2.5 text-sm font-medium text-muted-foreground">
          <p id={previewId}>
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-current" />
            {t('previewLabel')}
          </p>
        </HStack>
        <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
          <HStack asChild justify="between" className="gap-3 px-6 py-4">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle asChild>
                <h2 id={`${previewId}-orders`}>{admin('orders.title')}</h2>
              </CardTitle>
              <CardDescription id={`${previewId}-sample`} className="text-xs">
                {admin('common.sample')}
              </CardDescription>
            </CardHeader>
          </HStack>
          <Table aria-labelledby={`${previewId}-orders ${previewId}-sample`}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="pl-6 text-xs text-muted-foreground">
                  {t('previewOrderNumber')}
                </TableHead>
                <TableHead scope="col" className="text-xs text-muted-foreground">
                  {admin('common.status')}
                </TableHead>
                <TableHead scope="col" className="pr-6 text-right text-xs text-muted-foreground">
                  {admin('orders.currencyTotal', { currency: 'USD' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-transparent">
                  <TableCell className="py-3.5 pl-6 font-medium tabular-nums">{order.id}</TableCell>
                  <TableCell className="py-3.5">
                    <Badge
                      variant="ghost"
                      className="gap-1.5 px-0 font-normal text-muted-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 shrink-0 rounded-full ${order.dot}`}
                      />
                      {admin(`orders.status.${order.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 pr-6 text-right tabular-nums">
                    {formatNumber(order.totalUsd, { style: 'currency', currency: 'USD' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </aside>
    </VStack>
  )
}
