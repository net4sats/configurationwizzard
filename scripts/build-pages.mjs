import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import './build-app.mjs';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
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
    <style>
      :root {
        color-scheme: dark;
        --bg: #050505;
        --card: rgba(255, 255, 255, 0.06);
        --border: rgba(255, 255, 255, 0.12);
        --text: #f6f6f6;
        --muted: rgba(255, 255, 255, 0.7);
        --accent: #ff6600;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        background: radial-gradient(circle at top, rgba(255, 102, 0, 0.16), transparent 35%), var(--bg);
        color: var(--text);
      }
      main {
        width: min(860px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 64px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 4vw, 3.4rem);
      }
      p {
        margin: 0;
        line-height: 1.6;
        color: var(--muted);
      }
      .grid {
        display: grid;
        gap: 16px;
        margin-top: 32px;
      }
      .card {
        display: block;
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--card);
        color: inherit;
        text-decoration: none;
      }
      .card:hover {
        border-color: rgba(255, 102, 0, 0.45);
        transform: translateY(-1px);
      }
      .eyebrow {
        display: inline-block;
        margin-bottom: 14px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        font-size: 0.78rem;
      }
      .title {
        display: block;
        margin-bottom: 6px;
        font-size: 1.1rem;
        font-weight: 700;
      }
      .backlink {
        display: inline-flex;
        margin-top: 28px;
        color: var(--accent);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="eyebrow">Published mockups</span>
      <h1>net4sats design references</h1>
      <p>
        These static mockups are published separately from the router admin app so GitHub Pages can host
        both the live demo and the design/reference flows without mixing them into the SPA build.
      </p>
      <div class="grid">
        <a class="card" href="./portal/">
          <span class="title">Portal landing</span>
          <p>Animated portal entry page with the current visual treatment.</p>
        </a>
        <a class="card" href="./app-time.html">
          <span class="title">Captive portal · time pricing</span>
          <p>End-user payment flow mockup for time-based access.</p>
        </a>
        <a class="card" href="./app-data.html">
          <span class="title">Captive portal · data pricing</span>
          <p>End-user payment flow mockup for data-based access.</p>
        </a>
        <a class="card" href="./setup.html">
          <span class="title">Router setup flow</span>
          <p>Static setup wizard concept shown separately from the admin dashboard.</p>
        </a>
        <a class="card" href="./pwa.html">
          <span class="title">PWA install prompt</span>
          <p>Reference prompt for installing the experience to the home screen.</p>
        </a>
      </div>
      <a class="backlink" href="../">Open the admin demo →</a>
    </main>
  </body>
</html>
`,
);
