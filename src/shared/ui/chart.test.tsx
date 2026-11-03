import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ChartContainer, ChartTooltipContent } from './chart'

it('passes the full tooltip payload to a custom formatter', () => {
  const payload = [
    {
      graphicalItemId: 'revenue',
      name: 'revenue',
      dataKey: 'revenue',
      value: 100,
      payload: { fill: 'var(--chart-1)' },
    },
  ]
  const formatter = vi.fn(() => 'Formatted revenue')
  render(
    <ChartContainer config={{ revenue: { label: 'Revenue', color: 'var(--chart-1)' } }}>
      <ChartTooltipContent active payload={payload} formatter={formatter} />
    </ChartContainer>,
  )

  expect(screen.getByText('Formatted revenue')).toBeInTheDocument()
  expect(formatter).toHaveBeenCalledWith(100, 'revenue', payload[0], 0, payload)
})
