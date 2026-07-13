import assert from 'node:assert/strict'
import test from 'node:test'
import { providerSupportsThinking } from '../src/shared/model-providers.ts'

test('only Doubao exposes provider-level deep thinking', () => {
  assert.equal(providerSupportsThinking('doubao'), true)
  assert.equal(providerSupportsThinking('deepseek'), false)
  assert.equal(providerSupportsThinking('custom_example'), false)
})
