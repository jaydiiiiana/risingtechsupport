import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the chunk size limit to 1000kb (1MB) to handle the feature-rich App.tsx
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunking to move large libraries into separate files
        // This improves initial load speed and satisfies Vercel build warnings
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react'],
          database: ['@supabase/supabase-js']
        }
      }
    }
  }
});
