import { describe, expect, it } from 'vitest'
import { customerInputSchema, customerSchema, customersSchema } from './schema'
import { sampleCustomers } from '../api/seed'

const input = {
  name: '  Lee Morgan  ',
  email: '  lee@example.test  ',
  status: 'Active',
  city: '  Seoul  ',
  country: '  South Korea  ',
  joined: '2026-11-05',
}

describe('customer edit contract', () => {
  it('rejects repeated identities without rejecting a valid empty or distinct list', () => {
    const customer = customerSchema.parse(sampleCustomers[0])
    expect(
      customersSchema.safeParse([customer, { ...customer, name: 'Different customer' }]).success,
    ).toBe(false)
    expect(customersSchema.parse([])).toEqual([])
    expect(customersSchema.parse([customer, { ...customer, id: 'unique-customer' }])).toHaveLength(
      2,
    )
  })

  it('normalizes contact fields and strips purchase history and server-owned fields', () => {
    expect(
      customerInputSchema.parse({
        ...input,
        id: 'injected',
        initials: 'X',
        orders: 8,
        spent: 999,
        lastOrder: '2026-11-05',
      }),
    ).toEqual({
      name: 'Lee Morgan',
      email: 'lee@example.test',
      status: 'Active',
      city: 'Seoul',
      country: 'South Korea',
      joined: '2026-11-05',
    })
  })

  it.each([
    { name: ' ' },
    { name: 'x' },
    { name: 'x'.repeat(81) },
    { email: 'not-an-email' },
    { email: `${'x'.repeat(250)}@example.test` },
    { city: ' ' },
    { city: 'x'.repeat(101) },
    { country: '' },
    { country: 'x'.repeat(101) },
    { status: 'pending' },
    { joined: '2026-02-30' },
    { joined: '11/05/2026' },
  ])('rejects invalid input %j', (invalid) => {
    expect(customerInputSchema.safeParse({ ...input, ...invalid }).success).toBe(false)
  })

  it('keeps response validation independent of editor text limits', () => {
    expect(
      customerSchema.parse({ ...sampleCustomers[0], name: 'Long profile '.repeat(20) }).name,
    ).toHaveLength(260)
    expect(customerSchema.safeParse({ ...sampleCustomers[0], spent: -1 }).success).toBe(false)
    expect(customerSchema.safeParse({ ...sampleCustomers[0], orders: 1.5 }).success).toBe(false)
  })
})
