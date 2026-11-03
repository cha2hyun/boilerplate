import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 2,
    // Vitest 5 inline projects inherit the alias, plugins and shared test options.
    // Each test file belongs to one category; selecting a category never repeats another.
    projects: [
      {
        test: {
          name: 'foundations',
          include: ['src/shared/{api,config,lib}/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'data',
          include: ['src/{entities,features}/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'ui',
          include: [
            'src/{app,pages,widgets}/**/*.test.{ts,tsx}',
            'src/shared/{ui,hooks}/**/*.test.{ts,tsx}',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/entities/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/shared/api/**/*.ts',
      ],
      exclude: ['**/index.ts', '**/*.test.*'],
    },
  },
})
