import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModelJson } from '../src/main/model-json.ts'

test('parses valid model JSON without changing escaped content', () => {
  const result = parseModelJson('{"lyrics":"第一句\\n第二句","quote":"他说：\\\"好\\\""}')

  assert.deepEqual(result, {
    lyrics: '第一句\n第二句',
    quote: '他说："好"'
  })
})

test('escapes literal control characters inside JSON strings', () => {
  const result = parseModelJson(`{
    "lyrics": "[Hook]
第一句
第二句",
    "timeline": "0-1s\t人声冷开场"
  }`)

  assert.deepEqual(result, {
    lyrics: '[Hook]\n第一句\n第二句',
    timeline: '0-1s\t人声冷开场'
  })
})

test('escapes every JSON-forbidden control character without changing structure', () => {
  const result = parseModelJson('{"lyrics":"第一句\r第二句\b退格\f换页","variants":[]}')

  assert.deepEqual(result, {
    lyrics: '第一句\r第二句\b退格\f换页',
    variants: []
  })
})

test('keeps structural whitespace outside strings intact', () => {
  const result = parseModelJson('{\n\t"summary": "测试",\n\t"variants": []\n}')

  assert.deepEqual(result, { summary: '测试', variants: [] })
})

test('rejects non-JSON wrappers instead of extracting a partial object', () => {
  assert.throws(
    () => parseModelJson('生成结果如下：\n{"summary":"测试"}'),
    /模型返回的 JSON 格式无效/
  )
})
