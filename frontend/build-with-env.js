#!/usr/bin/env node

// Set environment variables for production build
process.env.VITE_API_URL = 'https://www.bazaarmkt.ca/api';
process.env.VITE_BASE_URL = 'https://www.bazaarmkt.ca';
process.env.VITE_UPLOADS_URL = 'https://www.bazaarmkt.ca/uploads';
process.env.VITE_NODE_ENV = 'production';

console.log('🔧 Setting environment variables for production build:');
console.log('VITE_API_URL:', process.env.VITE_API_URL);
console.log('VITE_BASE_URL:', process.env.VITE_BASE_URL);
console.log('VITE_UPLOADS_URL:', process.env.VITE_UPLOADS_URL);
console.log('VITE_NODE_ENV:', process.env.VITE_NODE_ENV);

// Import and run the Vite build
import { build } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const config = defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      'react-router-dom': 'react-router-dom'
    }
  }
});

console.log('🚀 Starting Vite build...');
await build(config);
console.log('✅ Build completed successfully!');
