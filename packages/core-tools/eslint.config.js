import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules']),
  {
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
