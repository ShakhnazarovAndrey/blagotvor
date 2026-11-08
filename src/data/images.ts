import type { ImageMetadata } from 'astro';

// Все картинки из src/assets/site доступны по имени файла
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/site/*.{jpg,jpeg,png,svg,webp}', { eager: true });

export const img = (name: string): ImageMetadata => {
  const key = Object.keys(files).find((k) => k.endsWith('/' + name));
  if (!key) throw new Error(`Нет картинки: ${name}`);
  return files[key].default;
};
