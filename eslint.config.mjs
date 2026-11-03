import cds from '@sap/cds/eslint.config.mjs'

// ponytail: only the globals actually used; swap for the `globals` package if the list grows
export default [
    ...cds.recommended,
    { files: ['srv/**/*.js'], languageOptions: { globals: { FormData: 'readonly', Blob: 'readonly' } } },
    { files: ['app/**/*.js'], languageOptions: { globals: { FileReader: 'readonly' } } },
]
