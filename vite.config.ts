import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import { applicationEnvPlugin } from './scripts/application-env.ts'
import { routeMetadataPlugin } from './scripts/route-metadata.ts'
export default defineConfig({
  plugins: [
    applicationEnvPlugin(),
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    routeMetadataPlugin(),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/coverage/**'] },
  },
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules\/(react|react-dom|scheduler)\//,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})
