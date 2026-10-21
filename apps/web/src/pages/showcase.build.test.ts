import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from 'vite'

/**
 * The showcase is a development tool, so a production build must not contain
 * it. The check runs a real build and looks at the output, which is the only
 * way to prove the page is really gone from the bundle.
 */
describe('showcase build', () => {
  let outDir: string
  let chunks: string[]
  const nodeEnv = process.env.NODE_ENV

  beforeAll(async () => {
    // Vitest runs with NODE_ENV=test, which Vite reads as a development
    // build. A production build is what has to leave the showcase out.
    process.env.NODE_ENV = 'production'

    outDir = await mkdtemp(path.join(tmpdir(), 'dash-web-build-'))

    await build({
      root: path.resolve(import.meta.dirname, '../..'),
      logLevel: 'error',
      build: { outDir, emptyOutDir: true, write: true },
    })

    chunks = await readdir(path.join(outDir, 'assets'))
  }, 120_000)

  afterAll(async () => {
    process.env.NODE_ENV = nodeEnv
    await rm(outDir, { recursive: true, force: true })
  })

  it('does not ship the showcase page in a production build', () => {
    expect(chunks.filter((chunk) => chunk.includes('ShowcasePage'))).toEqual([])
  })

  it('does not reference the showcase route in a production build', async () => {
    const files = chunks.filter((chunk) => chunk.endsWith('.js'))
    const sources = await Promise.all(
      files.map((file) => readFile(path.join(outDir, 'assets', file), 'utf8'))
    )

    expect(sources.some((source) => source.includes('dev/components'))).toBe(false)
  })
})
