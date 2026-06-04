import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

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

const stamp = Date.now().toString(36);
for (const dir of ['admin', 'portal']) {
  const path = `${rootDir}/dist/${dir}/sw.js`;
  let content = readFileSync(path, 'utf8');
  content = content.replace("'net4sats-v1'", `'net4sats-${stamp}'`);
  writeFileSync(path, content);
}
console.log(`Service worker cache version: net4sats-${stamp}`);

console.log('\nDone: dist/admin/ and dist/portal/');
