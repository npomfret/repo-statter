#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔄 Rebuilding...');

// Run npm run build
const build = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit', 
  cwd: path.join(__dirname, '..'),
  shell: true 
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build complete, generating dev report...');
    
    // Run tsx src/cli.ts . --output-file dev-report
    const analyze = spawn('npx', ['tsx', 'src/cli.ts', '.', '--output-file', 'dev-report'], { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..'),
      shell: true 
    });
    
    analyze.on('close', (analyzeCode) => {
      if (analyzeCode === 0) {
        console.log('🎉 Dev report updated: dist/dev-report.html');
      } else {
        console.error('❌ Failed to generate dev report');
      }
    });
  } else {
    console.error('❌ Build failed');
  }
});