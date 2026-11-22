// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // AGENTS.md rule 7: no cross-feature imports except through src/shared.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../features/*', '@/features/*'],
              message: 'Features must not import each other. Move shared code to src/shared.',
            },
          ],
        },
      ],
    },
  },
]);
