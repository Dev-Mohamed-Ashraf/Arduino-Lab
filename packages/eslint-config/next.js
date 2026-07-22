import nextPlugin from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

export const nextConfig = tseslint.config(
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // The new JSX transform makes these obsolete.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Components stay small — see CLAUDE.md section 2.
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],

      // Directional utilities break RTL. Use logical properties (ms-/me-/ps-/pe-/start-/end-).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] > Literal[value=/(^|\\s)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-/]',
          message:
            'Use RTL-safe logical utilities (ms-/me-/ps-/pe-/start-/end-/border-s-/border-e-/rounded-s-/rounded-e-) instead of physical ones.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] > Literal[value=/text-(left|right)/]',
          message: 'Use text-start / text-end instead of text-left / text-right.',
        },
      ],
    },
  },
  {
    // Route handlers and config files legitimately use the Node console.
    files: ['**/*.config.{ts,js,mjs}', '**/scripts/**'],
    rules: { 'no-console': 'off' },
  },
);

export default nextConfig;
