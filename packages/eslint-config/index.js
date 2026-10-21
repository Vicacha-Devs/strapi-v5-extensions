/**
 * Shared ESLint rules for @vicacha-devs/strapi-v5-extensions packages.
 * Enforces strict <500 lines per file and zero-any TypeScript hygiene.
 */
module.exports = {
  rules: {
    'max-lines': [
      'error',
      {
        max: 500,
        skipBlankLines: false,
        skipComments: false,
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
};
