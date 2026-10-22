import { configApp } from '@adonisjs/eslint-config'

// The schema file is written by Lucid when the migrations run, in a style that
// is not the style of the linter. The linter leaves it alone: the migrations
// are the source of truth, not the formatting of the file they generate.
export default [{ ignores: ['database/schema.ts'] }, ...configApp()]
