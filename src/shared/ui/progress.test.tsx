import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Progress } from './progress'

it('exposes its current value to assistive technology', () => {
  render(<Progress aria-label="Project completion" value={42} />)
  expect(screen.getByRole('progressbar', { name: 'Project completion' })).toHaveAttribute(
    'aria-valuenow',
    '42',
  )
})
