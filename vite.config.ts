import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite builds the app. Vitest runs Person A's health-logic tests in plain Node (no browser needed).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
