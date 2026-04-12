'use strict';

const { existsSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

const rootDir = join(__dirname, '..');
const checks = [
  {
    label: 'backend',
    install: 'npm install --prefix backend',
    marker: join(rootDir, 'backend', 'node_modules', 'mqtt', 'package.json'),
  },
  {
    label: 'frontend',
    install: 'npm install --prefix frontend',
    marker: join(rootDir, 'frontend', 'node_modules', 'next', 'package.json'),
  },
];

for (const item of checks) {
  if (!existsSync(item.marker)) {
    console.log(`[bootstrap] Installing ${item.label} dependencies...`);
    execSync(item.install, { stdio: 'inherit', cwd: rootDir, shell: true });
  }
}
