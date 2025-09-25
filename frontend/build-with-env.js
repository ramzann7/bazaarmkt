#!/usr/bin/env node

// Set environment variables for production build
process.env.VITE_API_URL = 'https://www.bazaarmkt.ca/api';
process.env.VITE_BASE_URL = 'https://www.bazaarmkt.ca';
process.env.VITE_UPLOADS_URL = 'https://www.bazaarmkt.ca/api/upload';
process.env.VITE_NODE_ENV = 'production';

console.log('🔧 Setting environment variables for production build:');
console.log('VITE_API_URL:', process.env.VITE_API_URL);
console.log('VITE_BASE_URL:', process.env.VITE_BASE_URL);
console.log('VITE_UPLOADS_URL:', process.env.VITE_UPLOADS_URL);
console.log('VITE_NODE_ENV:', process.env.VITE_NODE_ENV);
console.log('🚀 Build timestamp:', new Date().toISOString());

// Use child_process to run vite build
import { spawn } from 'child_process';

console.log('🚀 Starting Vite build...');

const viteProcess = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true
});

viteProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully!');
  } else {
    console.error('❌ Build failed with code:', code);
    process.exit(code);
  }
});
