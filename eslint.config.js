import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'tmp-downloads',
    'consoleCapture.cjs',
    'tmpPlaywright.cjs',
    'tmpPlaywright.js',
    'tmpSupplierDnTest.cjs',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: [
      '*.js',
      '*.cjs',
      'server/**/*.js',
      'scripts/**/*.js',
      'scripts/**/*.cjs',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // These existing screens expose broad compatibility props/handlers while
    // the monolith is being split. Keep strict linting for every other/new file.
    files: [
      'src/App.jsx',
      'src/components/BomManager.jsx',
      'src/components/SearchableSelectDropdown.jsx',
      'src/stores/useScheduleStore.js',
      'src/tabs/TabAuditLogs.jsx',
      'src/tabs/TabDashboard.jsx',
      'src/tabs/TabInbound.jsx',
      'src/tabs/TabInventory.jsx',
      'src/tabs/TabKanban.jsx',
      'src/tabs/TabMasterRef.jsx',
      'src/tabs/TabPrl.jsx',
      'src/tabs/TabReportInbound.jsx',
      'src/tabs/TabReports.jsx',
      'src/tabs/TabStockOpname.jsx',
      'src/tabs/TabSubcon.jsx',
      'src/tabs/TabSupplierPortal.jsx',
    ],
    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      // Auto-adding dependencies to these legacy effects can create request
      // and render loops; address them during component extraction instead.
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    files: [
      'server/index.js',
      'server/scripts/repair_actual_receipts_allocation.js',
      'server/scripts/sync_po_from_csv.js',
    ],
    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['*.cjs'],
    languageOptions: {
      parserOptions: {
        sourceType: 'commonjs',
      },
    },
  },
])
