import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Add this import for Vitest config types
import type { UserConfig as VitestUserConfigInterface } from 'vitest/config';

// Vitest configuration
const vitestConfig: VitestUserConfigInterface = {
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom'
    setupFiles: ['./src/react-app/setupTests.ts'], // Optional setup file
    coverage: {
        provider: 'v8', // or 'istanbul'
        reporter: ['text', 'json', 'html'],
        // Consider adding include/exclude patterns if needed
        // include: ['src/react-app/**/*.{ts,tsx}'],
        // exclude: ['src/react-app/**/*.test.{ts,tsx}', 'src/react-app/main.tsx', 'src/react-app/vite-env.d.ts'],
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { // Match the API_BASE_URL in api.ts
        target: 'http://localhost:8787', // Default Wrangler dev port
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Not needed if worker expects /api
      }
    }
  },
  // Add the test configuration using a type assertion
  // This tells Vite to use these settings for Vitest
  test: vitestConfig.test,
});
