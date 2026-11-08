# Сайт БФ «Люди Вместе»

Новый сайт благотворительного фонда «Люди Вместе» (благотворитель.рф).
Стек: **Astro 5** (статический сайт) + **GSAP / ScrollTrigger** (анимации) + **Lenis** (плавный скролл).

## Запуск

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # готовый сайт в папке dist/
npm run preview   # посмотреть собранный сайт
```

Папку `dist/` можно загрузить на любой хостинг как обычные файлы (Nginx, Apache, Яндекс Облако, Netlify и т.п.).

## Где что менять

| Что | Где |
| --- | --- |
| Телефон, почта, адрес, соцсети, ссылка СБП | `src/data/site.ts` → `site` |
| Реквизиты | `src/data/site.ts` → `requisites` |
| Проекты, сборы, мероприятия, FAQ, партнёры | `src/data/site.ts` |
| Собранная сумма сбора (прогресс-бар) | `fundraisers[].raised` — укажите число |
| Новости | `src/content/news/*.md` (+ фото в `src/assets/news/<slug>/`) |
| Фото для страниц | `src/assets/site/` |
| PDF-документы | `public/docs/` |
| Цвета, шрифты, отступы | `src/styles/global.css` (`:root`) |

### Добавить новость

Создайте файл `src/content/news/moya-novost.md`:

```md
---
title: "Заголовок новости"
date: 2026-11-10
cover: "../../assets/news/moya-novost/1.jpg"
gallery:
  - "../../assets/news/moya-novost/1.jpg"
  - "../../assets/news/moya-novost/2.jpg"
---

Текст новости. Абзацы разделяются пустой строкой.
```

Фото положите в `src/assets/news/moya-novost/`. Новость сама появится на главной, в разделе «Новости» и получит свою страницу `/news/moya-novost/`.

## Формы

Формы свёрстаны и проверяют поля, но **пока ничего не отправляют** — показывают «Спасибо!».
Чтобы подключить отправку (Telegram-бот, почта, CRM), замените тело функции `submitForm()` в `src/scripts/form.ts`.

## Скрипты

- `npm run scrape` — заново импортировать новости и фото со старого сайта (`scripts/scrape.mjs`; уже скачанное пропускается).
- `node scripts/optimize-images.mjs` — ужать новые исходные фото до 2000px.

## Анимации

Анимации подключаются data-атрибутами (см. `src/scripts/animations.ts`):
`data-reveal`, `data-stagger`, `data-split`, `data-scrub-text`, `data-clip`, `data-parallax`, `data-count`,
`data-marquee`, `data-hscroll`, `data-magnetic`, `data-tilt`, `data-float`, `data-draw`.
При включённой в системе настройке «Уменьшить движение» анимации отключаются автоматически.
