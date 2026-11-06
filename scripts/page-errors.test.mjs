import assert from 'node:assert/strict'
import test from 'node:test'
import { createPageErrorTracker } from '../e2e/page-errors.ts'

test('rejects unexpected errors and bounds explicit recovery-test exceptions', () => {
  const tracker = createPageErrorTracker()
  tracker.allow('injected provider failure')
  tracker.allow(/^Failed to fetch module: \/assets\/orders-[\w-]+\.js$/, 2)
  tracker.record(new Error('injected provider failure'))
  tracker.record(new Error('injected provider failure'))
  tracker.record(new Error('Failed to fetch module: /assets/orders-abc.js'))
  tracker.record(new Error('Failed to fetch module: /assets/orders-abc.js'))
  tracker.record(new Error('Failed to fetch module: /assets/orders-abc.js'))
  tracker.record(new Error('another failure'))
  assert.deepEqual(tracker.unexpected, [
    'injected provider failure',
    'Failed to fetch module: /assets/orders-abc.js',
    'another failure',
  ])
  assert.throws(() => tracker.allow('unbounded', Infinity), /positive occurrence/)
})

test('one test tracker cannot grant another test permission to ignore an error', () => {
  createPageErrorTracker().allow('injected')
  const independent = createPageErrorTracker()
  independent.record(new Error('injected'))
  assert.deepEqual(independent.unexpected, ['injected'])
})
