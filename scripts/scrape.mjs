// Импорт контента со старого сайта благотворитель.рф
// Запуск: npm run scrape
import { parse } from 'node-html-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://xn--b1adeamqk5bj7i.xn--p1ai';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NEWS_DIR = path.join(ROOT, 'src/content/news');
const NEWS_IMG = path.join(ROOT, 'src/assets/news');
const SITE_IMG = path.join(ROOT, 'src/assets/site');
const DOCS = path.join(ROOT, 'public/docs');

const STATIC_PAGES = ['', 'about', 'kak-pomoch', 'proekty', 'sbory', 'otchety', 'meropriyatiya', 'blagodarnost', 'contacts'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, binary = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (site-migration)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      if (i === 2) throw e;
      await sleep(800);
    }
  }
}

const exists = (p) => fs.access(p).then(() => true, () => false);

/** uploads URL → оригинал без суффикса -300x200 */
const original = (u) => u.replace(/-\d+x\d+(\.\w+)$/, '$1');

async function download(url, dir) {
  const name = decodeURIComponent(path.basename(new URL(url).pathname)).toLowerCase();
  const dest = path.join(dir, name);
  if (await exists(dest)) return name;
  try {
    await fs.writeFile(dest, await get(url, true));
  } catch (e) {
    // если оригинала нет — пробуем как есть
    console.warn('  ! не скачалось', url, e.message);
    return null;
  }
  return name;
}

function cleanText(node) {
  // emoji-картинки → символ
  node.querySelectorAll('img.emoji').forEach((img) => img.replaceWith(img.getAttribute('alt') || ''));
  return node;
}

function slugFromUrl(u) {
  let s = decodeURIComponent(new URL(u).pathname).replace(/^\/news\//, '').replace(/\/$/, '');
  // убираем эмодзи и прочие не-латинские символы из slug
  s = s.normalize('NFKD').replace(/[^\w-]+/g, '').replace(/^-+|-+$/g, '');
  return s;
}

function toMarkdown(textNode) {
  const out = [];
  for (const el of textNode.childNodes) {
    if (el.nodeType !== 1) {
      const t = el.text.trim();
      if (t) out.push(t);
      continue;
    }
    const tag = el.tagName.toLowerCase();
    // убираем картинки из текста (они пойдут в галерею)
    el.querySelectorAll('img').forEach((i) => i.remove());
    el.querySelectorAll('br').forEach((b) => b.replaceWith('\n'));
    let t = el.text.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').trim();
    if (!t) continue;
    if (/^h[1-6]$/.test(tag)) out.push('### ' + t);
    else if (tag === 'ul' || tag === 'ol')
      out.push(el.querySelectorAll('li').map((li) => '- ' + li.text.trim()).join('\n'));
    else if (tag === 'blockquote') out.push('> ' + t);
    else out.push(t.replace(/\n/g, '  \n'));
  }
  return out.join('\n\n');
}

const yamlStr = (s) => JSON.stringify(s);

async function scrapeNews() {
  await fs.mkdir(NEWS_DIR, { recursive: true });
  await fs.mkdir(NEWS_IMG, { recursive: true });

  // 1. список новостей
  const links = [];
  for (let page = 1; page < 50; page++) {
    const html = await get(`${BASE}/news/?page=${page}`);
    const root = parse(html);
    const found = root.querySelectorAll('a.rs-news__link').map((a) => a.getAttribute('href'));
    const fresh = found.filter((l) => !links.includes(l));
    if (!fresh.length) break;
    links.push(...fresh);
    console.log(`страница ${page}: +${fresh.length}`);
  }
  console.log(`Всего новостей: ${links.length}`);

  // 2. каждая новость
  let i = 0;
  for (const url of links) {
    i++;
    const slug = slugFromUrl(url) || `news-${i}`;
    const mdPath = path.join(NEWS_DIR, `${slug}.md`);
    if (await exists(mdPath)) continue;
    try {
      const html = await get(url);
      const root = parse(html);
      const title = root.querySelector('.rs-article__title h1')?.text.trim() ?? '';
      const dateRu = root.querySelector('.rs-article__date')?.text.trim() ?? '';
      const [d, m, y] = dateRu.split('.');
      const date = `${y}-${m}-${d}`;
      const textNode = cleanText(root.querySelector('.rs-article__text'));
      const ogImg = root.querySelector('meta[property="og:image"]')?.getAttribute('content');

      // картинки
      const imgUrls = [];
      textNode.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src');
        if (src && src.includes('/wp-content/uploads/')) imgUrls.push(original(src));
      });
      textNode.querySelectorAll('a[href*="/wp-content/uploads/"]').forEach((a) => {
        const h = a.getAttribute('href');
        if (/\.(jpe?g|png|webp)$/i.test(h)) imgUrls.push(original(h));
      });
      if (ogImg && ogImg.includes('/wp-content/uploads/') && !ogImg.includes('logo-lyudi')) imgUrls.unshift(original(ogImg));
      const unique = [...new Set(imgUrls)];

      const dir = path.join(NEWS_IMG, slug);
      await fs.mkdir(dir, { recursive: true });
      const files = [];
      for (const u of unique) {
        const f = await download(u, dir);
        if (f && !files.includes(f)) files.push(f);
      }

      let body = toMarkdown(textNode);
      // первая строка часто дублирует заголовок
      const firstLine = body.split('\n')[0].replace(/[^\p{L}\p{N} ]/gu, '').trim();
      const titleClean = title.replace(/[^\p{L}\p{N} ]/gu, '').trim();
      if (firstLine && titleClean && firstLine.toLowerCase() === titleClean.toLowerCase())
        body = body.split('\n').slice(1).join('\n').trim();

      const rel = (f) => `../../assets/news/${slug}/${f}`;
      const fm = [
        '---',
        `title: ${yamlStr(title)}`,
        `date: ${date}`,
        `source: ${yamlStr(url)}`,
        files.length ? `cover: ${yamlStr(rel(files[0]))}` : null,
        files.length ? `gallery:\n${files.map((f) => `  - ${yamlStr(rel(f))}`).join('\n')}` : 'gallery: []',
        '---',
      ]
        .filter(Boolean)
        .join('\n');
      await fs.writeFile(mdPath, `${fm}\n\n${body}\n`);
      console.log(`[${i}/${links.length}] ${slug} — ${files.length} фото`);
    } catch (e) {
      console.warn(`[${i}] ошибка ${url}: ${e.message}`);
    }
    await sleep(150);
  }
}

async function scrapeStatic() {
  await fs.mkdir(SITE_IMG, { recursive: true });
  await fs.mkdir(DOCS, { recursive: true });
  const all = new Set();
  for (const p of STATIC_PAGES) {
    const html = await get(`${BASE}/${p ? p + '/' : ''}`);
    const re = /https?:\/\/[^"'\s)]+\/wp-content\/uploads\/[^"'\s)]+\.(?:jpe?g|png|webp|svg|pdf)/gi;
    for (const m of html.match(re) ?? []) {
      if (/cropped-avatar-lyudi-vmeste-(32|180|192)x/.test(m)) continue;
      all.add(/cropped-avatar|logo-lyudi/.test(m) ? m : original(m));
    }
  }
  // логотип + аватар
  all.add(`${BASE}/wp-content/uploads/2026/08/cropped-avatar-lyudi-vmeste-270x270.jpg`);
  for (const u of all) {
    // картинки новостей со страниц-списков не нужны здесь
    if (/\/uploads\/2026\/(09|10|11)\//.test(u) && !/logo|rekomend|bf-lyudi-vmeste-2026/.test(u)) continue;
    const isPdf = u.endsWith('.pdf');
    const f = await download(u, isPdf ? DOCS : SITE_IMG);
    console.log(isPdf ? 'pdf ' : 'img ', f);
  }
}

await scrapeStatic();
await scrapeNews();
console.log('Готово');
