import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = import.meta.dirname;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * virtual:katakata-content — every *live* pack under content/ms, bundled into
 * the app so it works offline. Draft packs stay in the repo but never ship.
 * Also lists recorded audio clips in public/audio (plan B for phones with no
 * Malay voice).
 */
function contentPlugin(): Plugin {
  const id = 'virtual:katakata-content';
  const resolved = '\0' + id;
  return {
    name: 'katakata-content',
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      if (source !== resolved) return null;
      const files = walk(join(root, 'content', 'ms')).filter((f) => f.endsWith('.json')).sort();
      const packs = [];
      for (const f of files) {
        this.addWatchFile(f);
        const pack = JSON.parse(readFileSync(f, 'utf8'));
        if (pack.status === 'live') packs.push(pack);
      }
      const audio = walk(join(root, 'public', 'audio'))
        .filter((f) => /\.(mp3|m4a|ogg|wav)$/.test(f))
        .map((f) => relative(join(root, 'public'), f).split('\\').join('/'));
      return `export const packs = ${JSON.stringify(packs)};\nexport const audioClips = ${JSON.stringify(audio)};\n`;
    },
  };
}

/** Writes dist/sw.js with a precache list of every built file (offline after first visit). */
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'katakata-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && !f.startsWith('.') && f !== '_headers' && f !== '404.html' && !f.endsWith('.md'))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const urls = files.map((f) => './' + f.replace(/(^|\/)index\.html$/, '$1'));
      const template = readFileSync(join(root, 'src', 'sw-template.js'), 'utf8');
      writeFileSync(
        join(outDir, 'sw.js'),
        template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(urls, null, 0)),
      );
    },
  };
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [contentPlugin(), serviceWorkerPlugin()],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        teacher: resolve(root, 'teacher', 'index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
