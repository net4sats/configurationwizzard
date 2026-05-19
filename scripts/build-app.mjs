import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const basePath = ensureTrailingSlash(process.env.VITE_BASE_PATH || '/net4sats/');

execFileSync('npx', ['vite', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

rewriteIfPresent('index.html', (content) => content.replaceAll('/net4sats/', basePath));
rewriteIfPresent('manifest.json', (content) => content.replaceAll('/net4sats/', basePath));
rewriteIfPresent('sw.js', (content) => content.replaceAll('/net4sats/', basePath));

function rewriteIfPresent(relativePath, transform) {
  const filePath = path.join(distDir, relativePath);
  try {
    const original = readFileSync(filePath, 'utf8');
    writeFileSync(filePath, transform(original));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}
