import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      source: z.string().optional(),
      cover: image().optional(),
      gallery: z.array(image()).default([]),
    }),
});

export const collections = { news };
