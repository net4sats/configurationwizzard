import { execFileSync } from 'node:child_process';

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

console.log('\nDone: dist/admin/ and dist/portal/');
