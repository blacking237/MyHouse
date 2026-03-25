const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'android/**',
      'desktop-shell/**',
      'backend/**',
      'amber-city-manager-v3/**',
      '.expo/**',
      '.gradle-home/**',
      '.gradle-home-release/**',
      '.android-home/**',
      '.android-release/**',
      '*.log',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
  },
];
