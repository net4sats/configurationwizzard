import { execFileSync } from 'node:child_process';
import { copyFileSync, renameSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const rootDir = process.cwd();

function build(app) {
  console.log(`\nBuilding ${app}...`);
  execFileSync('npx', ['vite', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, VITE_APP: app },
  });
}

build('admin');
build('portal');
build('balance');

// Ensure portal has index.html (uhttpd expects it, Vite outputs splash.html)
const portalSplash = `${rootDir}/dist/portal/splash.html`;
const portalIndex = `${rootDir}/dist/portal/index.html`;
if (existsSync(portalSplash) && !existsSync(portalIndex)) {
  copyFileSync(portalSplash, portalIndex);
  console.log('Copied portal/splash.html → portal/index.html');
}

// Ensure balance has index.html (uhttpd expects it, Vite outputs balance.html)
const balanceHtml = `${rootDir}/dist/balance/balance.html`;
const balanceIndex = `${rootDir}/dist/balance/index.html`;
if (existsSync(balanceHtml) && !existsSync(balanceIndex)) {
  copyFileSync(balanceHtml, balanceIndex);
  console.log('Copied balance/balance.html → balance/index.html');
}

// Version-bust service worker CACHE_NAME at build time
const stamp = Date.now().toString(36);
for (const dir of ['admin', 'portal']) {
  const path = `${rootDir}/dist/${dir}/sw.js`;
  let content = readFileSync(path, 'utf8');
  content = content.replace("'net4sats-v1'", `'net4sats-${stamp}'`);
  writeFileSync(path, content);
}
console.log(`Service worker cache version: net4sats-${stamp}`);

console.log('\nDone: dist/admin/, dist/portal/, and dist/balance/');