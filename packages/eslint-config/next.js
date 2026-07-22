import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

import { reactConfig } from './react.js';

export const nextConfig = tseslint.config(
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    // Config files and scripts legitimately use the Node console.
    files: ['**/*.config.{ts,js,mjs}', '**/scripts/**'],
    rules: { 'no-console': 'off' },
  },
);

export default nextConfig;
