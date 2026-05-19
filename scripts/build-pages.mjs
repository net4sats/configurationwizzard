import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

console.log('Building admin demo...');
execFileSync('npx', ['vite', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_APP: 'admin',
    VITE_MOCK: 'true',
    VITE_BASE_PATH: '/configurationwizzard/',
  },
});

const mockupSourceDir = path.join(rootDir, 'mockup');
const mockupTargetDir = path.join(distDir, 'mockups');

mkdirSync(mockupTargetDir, { recursive: true });
cpSync(mockupSourceDir, mockupTargetDir, { recursive: true });

writeFileSync(
  path.join(mockupTargetDir, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>net4sats mockups</title>
  </head>
  <body>
    <main>
      <h1>net4sats design references</h1>
      <div class="grid">
        <a class="card" href="./portal/">
          <span class="title">Portal landing</span>
        </a>
        <a class="card" href="./app-time.html">
          <span class="title">Captive portal &middot; time pricing</span>
        </a>
        <a class="card" href="./app-data.html">
          <span class="title">Captive portal &middot; data pricing</span>
        </a>
        <a class="card" href="./setup.html">
          <span class="title">Router setup flow</span>
        </a>
        <a class="card" href="./pwa.html">
          <span class="title">PWA install prompt</span>
        </a>
      </div>
      <a class="backlink" href="../">Open the admin demo &rarr;</a>
    </main>
  </body>
</html>
`,
);

console.log('Done: dist/ with demo + mockups');
