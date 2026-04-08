import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the chunk size limit to 2000kb (2MB) 
    // This is the safest way to resolve the Vercel warning for large files like App.tsx
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // We simplified this to ensure maximum compatibility with the Vercel build engine
        manualChunks: undefined 
      }
    }
  }
});
