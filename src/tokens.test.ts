import { describe, expect, it } from 'vitest'
import tokens from '../styles/tokens.css?raw'

/** The custom properties declared in the first block that `opener` starts. */
function declarations(opener: string): Map<string, string> {
  const start = tokens.indexOf(opener)
  expect(start).toBeGreaterThanOrEqual(0)
  const body = tokens.slice(start + opener.length, tokens.indexOf('}', start))
  const out = new Map<string, string>()
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1] ?? '', (m[2] ?? '').replace(/\s+/g, ' ').trim())
  }
  return out
}

describe('tokens.css', () => {
  const light = declarations(':root {')
  const dark = declarations(':root[data-theme="dark"] {')
  const systemDark = declarations(':root:not([data-theme]) {')

  it('keeps the two dark blocks identical', () => {
    expect(dark.size).toBeGreaterThan(0)
    expect([...systemDark]).toEqual([...dark])
  })

  it('only overrides properties the light set defines', () => {
    for (const name of dark.keys()) expect(light.has(name)).toBe(true)
  })
})
