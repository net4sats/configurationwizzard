import { execFileSync } from 'node:child_process';
import { copyFileSync, renameSync, existsSync } from 'node:fs';

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

console.log('\nDone: dist/admin/, dist/portal/, and dist/balance/');
