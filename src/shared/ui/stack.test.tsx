import { createRef, type ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'
import { CardFooter } from './card'
import { HStack, VStack } from './stack'

describe('Stack composition', () => {
  it('preserves the shadcn slot and does not add a wrapper with asChild', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <HStack asChild ref={ref} aria-label="Comparison">
        <CardFooter>
          <span>Change</span>
          <span>Previous period</span>
        </CardFooter>
      </HStack>,
    )
    const footer = screen.getByLabelText('Comparison')
    expect(container.children).toHaveLength(1)
    expect(ref.current).toBe(footer)
    expect(footer).toHaveAttribute('data-slot', 'card-footer')
    expect(footer.children).toHaveLength(2)
  })

  it('keeps form semantics, native submit behavior, and the child handler', () => {
    const submit = vi.fn<NonNullable<ComponentProps<'form'>['onSubmit']>>((event) => {
      event.preventDefault()
    })
    render(
      <VStack asChild align="stretch">
        <form aria-label="Preferences" onSubmit={submit}>
          <Button type="submit">Save</Button>
        </form>
      </VStack>,
    )
    expect(screen.getByRole('form', { name: 'Preferences' }).tagName).toBe('FORM')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(submit).toHaveBeenCalledOnce()
  })
})
