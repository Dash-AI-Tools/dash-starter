import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const src = import.meta.dirname
const storybook = path.resolve(src, '../.storybook')

/**
 * The primitives the core barrel exports, by file name.
 */
async function exportedPrimitives() {
  const barrel = await readFile(path.join(src, 'index.ts'), 'utf8')
  return [...barrel.matchAll(/^export \* from '\.\/([a-z-]+)'$/gm)].map(([, name]) => name)
}

/**
 * Storybook is the catalogue of the kit, so a primitive without a story, or a
 * preview without the stylesheet, fails the normal suite instead of going
 * unnoticed until someone opens Storybook.
 */
describe('the stories of the kit', () => {
  it('exports every primitive from the core barrel', async () => {
    const files = (await readdir(src)).filter(
      (file) => file.endsWith('.tsx') && !/\.(test|stories)\.tsx$/.test(file)
    )

    expect(files.map((file) => file.replace(/\.tsx$/, '')).sort()).toEqual(
      (await exportedPrimitives()).sort()
    )
  })

  it('has a story for every exported primitive', async () => {
    const missing: string[] = []
    for (const name of await exportedPrimitives()) {
      await access(path.join(src, `${name}.stories.tsx`)).catch(() => missing.push(name))
    }

    expect(missing).toEqual([])
  })

  it('renders the stories with the stylesheet of the package', async () => {
    const preview = await readFile(path.join(storybook, 'preview.ts'), 'utf8')

    expect(preview).toContain("import '@dash/ui/styles.css'")
  })

  it('finds the stories of the kit and of the project components', async () => {
    const main = await readFile(path.join(storybook, 'main.ts'), 'utf8')

    expect(main).toContain("'../src/**/*.stories.tsx'")
  })
})
