import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    // Resolve .js imports to .ts source files (TypeScript ESM style)
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
});
