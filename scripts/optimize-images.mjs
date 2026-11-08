// Ужимает исходные фото в src/assets до 2000px по длинной стороне (один раз после импорта)
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/assets');
const MAX = 2000;
let saved = 0;

async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(jpe?g|png)$/i.test(e.name)) await optimize(p);
  }
}

async function optimize(file) {
  const before = (await fs.stat(file)).size;
  const img = sharp(file, { failOn: 'none' });
  const meta = await img.metadata();
  const isPng = /\.png$/i.test(file);
  let pipeline = img.rotate();
  if (Math.max(meta.width ?? 0, meta.height ?? 0) > MAX) pipeline = pipeline.resize({ width: MAX, height: MAX, fit: 'inside' });
  const buf = isPng ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer() : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  if (buf.length < before * 0.95) {
    await fs.writeFile(file, buf);
    saved += before - buf.length;
  }
}

await walk(ROOT);
console.log(`Сэкономлено: ${(saved / 1024 / 1024).toFixed(1)} МБ`);
