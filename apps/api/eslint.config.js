import { configApp } from '@adonisjs/eslint-config'

export default [
  { ignores: ['database/schema.ts'] },
  ...configApp({
    files: ['**/*.ts'],
    rules: {
      /**
       * The configuration of AdonisJS does not report the unused variables,
       * so they are declared here to catch them in the API too.
       */
      '@typescript-eslint/no-unused-vars': 'error',
    },
  }),
]
