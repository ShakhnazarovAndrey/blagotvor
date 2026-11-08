import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Для GitHub Pages: ASTRO_SITE=https://<user>.github.io ASTRO_BASE=/<repo>
// Локально и на собственном домене переменные не нужны.
const SITE = process.env.ASTRO_SITE || 'https://xn--b1adeamqk5bj7i.xn--p1ai';
const BASE = (process.env.ASTRO_BASE || '').replace(/\/$/, '');

/** Когда сайт лежит в подпапке (/repo/), добавляет её ко всем ссылкам вида href="/about/" в готовом HTML. */
function prefixBase() {
  return {
    name: 'prefix-base',
    hooks: {
      'astro:build:done': ({ dir }) => {
        if (!BASE) return;
        const root = fileURLToPath(dir);
        const fix = (u) => (u.startsWith('//') || u === BASE || u.startsWith(BASE + '/') ? u : BASE + u);
        const walk = (d) => {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.html')) {
              const html = fs.readFileSync(p, 'utf8');
              const out = html.replace(/(\b(?:href|src|action|poster)=")(\/[^"]*)"/g, (_, a, u) => `${a}${fix(u)}"`);
              if (out !== html) fs.writeFileSync(p, out);
            }
          }
        };
        walk(root);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  base: BASE || undefined,
  trailingSlash: 'always',
  integrations: [sitemap(), prefixBase()],
  image: { responsiveStyles: true },
  prefetch: { prefetchAll: true },
});
