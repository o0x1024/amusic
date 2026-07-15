import assert from 'node:assert/strict'
import test from 'node:test'
import { hitLabOutputTokenBudget } from '../src/main/hit-generation-budget.ts'

test('raises the hit lab budget with candidate count', () => {
  assert.equal(hitLabOutputTokenBudget(3600, 4, '30秒短单曲'), 8800)
  assert.equal(hitLabOutputTokenBudget(3600, 8, '30秒短单曲'), 16800)
})

test('allocates more output for full songs', () => {
  assert.equal(hitLabOutputTokenBudget(3600, 1, '90秒微型歌曲'), 4000)
  assert.equal(hitLabOutputTokenBudget(3600, 4, '完整化'), 16800)
})

test('preserves a larger configured budget and caps unsupported extremes', () => {
  assert.equal(hitLabOutputTokenBudget(12000, 2, 'Hook探索'), 12000)
  assert.equal(hitLabOutputTokenBudget(200000, 8, '完整化'), 32768)
})
