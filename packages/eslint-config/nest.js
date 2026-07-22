import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

export const nestConfig = tseslint.config(
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS relies on parameter decorators and metadata reflection.
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Incompatible with dependency injection: a constructor parameter looks
      // type-only to the linter, but `emitDecoratorMetadata` needs the runtime
      // import to resolve the provider. Autofixing it silently breaks DI at
      // startup, so the rule is off for the API. Type-only imports are still
      // written with `import type` by hand where they are genuinely types.
      '@typescript-eslint/consistent-type-imports': 'off',

      // Services must not swallow rejected promises.
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    // Seeds and one-off scripts print progress on purpose.
    files: ['prisma/**', 'scripts/**', 'test/**', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);

export default nestConfig;
