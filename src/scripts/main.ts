import { initAnimations, destroyAnimations, getLenis } from './animations';
import { initForms } from './form';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

declare global {
  interface Window {
    __lvReady?: boolean;
  }
}

let controller: AbortController | null = null;
const root = document.documentElement;

function lockScroll(lock: boolean) {
  const l = getLenis();
  if (lock) l?.stop();
  else l?.start();
  document.body.style.overflow = lock ? 'hidden' : '';
}

function header(signal: AbortSignal) {
  const h = document.querySelector<HTMLElement>('[data-header]');
  const fab = document.querySelector<HTMLElement>('[data-fab]');
  if (!h) return;
  let last = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    h.classList.toggle('is-scrolled', y > 20);
    const menuOpen = root.classList.contains('menu-open');
    h.classList.toggle('is-hidden', !menuOpen && y > 400 && y > last + 2);
    if (y < last - 2) h.classList.remove('is-hidden');
    fab?.classList.toggle('is-visible', y > 600);
    last = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true, signal });
}

function menu(signal: AbortSignal) {
  const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
  const mm = document.querySelector<HTMLElement>('[data-mmenu]');
  if (!burger || !mm) return;
  const set = (open: boolean) => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mm.setAttribute('aria-hidden', String(!open));
    lockScroll(open);
  };
  burger.addEventListener('click', () => set(!root.classList.contains('menu-open')), { signal });
  mm.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false), { signal }));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false), { signal });
}

function modal(signal: AbortSignal) {
  const m = document.querySelector<HTMLElement>('[data-modal="request"]');
  if (!m) return;
  let lastFocus: HTMLElement | null = null;
  const open = () => {
    lastFocus = document.activeElement as HTMLElement;
    root.classList.remove('menu-open');
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => m.querySelector<HTMLInputElement>('input:not([type=hidden])')?.focus(), 300);
  };
  const close = () => {
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    lastFocus?.focus();
  };
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as HTMLElement).closest('a[href="#request"]');
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        open();
      }
    },
    { signal, capture: true },
  );
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close, { signal }));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && m.classList.contains('is-open') && close(), { signal });
}

function lightbox(signal: AbortSignal) {
  const lb = document.querySelector<HTMLElement>('[data-lightbox-root]');
  if (!lb) return;
  const stage = lb.querySelector<HTMLElement>('[data-lb-stage]')!;
  const count = lb.querySelector<HTMLElement>('[data-lb-count]')!;
  let items: HTMLAnchorElement[] = [];
  let idx = 0;

  const show = () => {
    const a = items[idx];
    const href = a.getAttribute('href')!;
    stage.innerHTML = '';
    if (a.dataset.type === 'video' || /\.mp4($|\?)/.test(href)) {
      const v = document.createElement('video');
      v.src = href;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      stage.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = href;
      img.alt = a.dataset.caption || a.querySelector('img')?.alt || '';
      stage.appendChild(img);
    }
    count.textContent = `${idx + 1} / ${items.length}`;
    lb.classList.toggle('is-single', items.length < 2);
  };
  const open = (a: HTMLAnchorElement) => {
    const group = a.dataset.lightbox;
    items = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[data-lightbox="${group}"]`));
    idx = Math.max(0, items.indexOf(a));
    show();
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  };
  const close = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '';
    lockScroll(false);
  };
  const step = (d: number) => {
    idx = (idx + d + items.length) % items.length;
    show();
  };

  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-lightbox]');
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        open(a);
      }
    },
    { signal, capture: true },
  );
  lb.querySelector('[data-lb-close]')!.addEventListener('click', close, { signal });
  lb.querySelector('[data-lb-prev]')!.addEventListener('click', () => step(-1), { signal });
  lb.querySelector('[data-lb-next]')!.addEventListener('click', () => step(1), { signal });
  lb.addEventListener('click', (e) => e.target === lb || e.target === stage ? close() : null, { signal });
  document.addEventListener(
    'keydown',
    (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    },
    { signal },
  );
  // свайпы
  let sx = 0;
  lb.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true, signal });
  lb.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    },
    { signal },
  );
}

function cookie(signal: AbortSignal) {
  const c = document.querySelector<HTMLElement>('[data-cookie]');
  if (!c) return;
  let accepted = false;
  try {
    accepted = localStorage.getItem('lv-cookie') === '1';
  } catch {}
  if (accepted) return;
  c.hidden = false;
  c.querySelector('[data-cookie-ok]')?.addEventListener(
    'click',
    () => {
      try {
        localStorage.setItem('lv-cookie', '1');
      } catch {}
      c.hidden = true;
    },
    { signal },
  );
}

function copyButtons(signal: AbortSignal) {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) =>
    b.addEventListener(
      'click',
      async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy ?? '');
          b.classList.add('is-copied');
          setTimeout(() => b.classList.remove('is-copied'), 1600);
        } catch {}
      },
      { signal },
    ),
  );
}

function tabs(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((wrap) => {
    const btns = wrap.querySelectorAll<HTMLButtonElement>('[data-tab]');
    const panels = wrap.querySelectorAll<HTMLElement>('[data-panel]');
    const pill = wrap.querySelector<HTMLElement>('[data-tab-pill]');
    const activate = (id: string) => {
      btns.forEach((b) => {
        const on = b.dataset.tab === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
        if (on && pill) {
          pill.style.width = b.offsetWidth + 'px';
          pill.style.transform = `translateX(${b.offsetLeft}px)`;
        }
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === id;
        p.hidden = !on;
        if (on) {
          p.classList.remove('tab-in');
          void p.offsetWidth;
          p.classList.add('tab-in');
        }
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => activate(b.dataset.tab!), { signal }));
    const initial = location.hash && wrap.querySelector(`[data-tab="${location.hash.slice(1)}"]`) ? location.hash.slice(1) : btns[0]?.dataset.tab;
    if (initial) activate(initial);
    window.addEventListener('resize', () => {
      const a = wrap.querySelector<HTMLButtonElement>('[data-tab].is-active');
      if (a && pill) {
        pill.style.width = a.offsetWidth + 'px';
        pill.style.transform = `translateX(${a.offsetLeft}px)`;
      }
    }, { signal });
  });
}

function accordions(signal: AbortSignal) {
  document.querySelectorAll<HTMLDetailsElement>('details[data-acc]').forEach((d) => {
    const summary = d.querySelector('summary')!;
    const body = d.querySelector<HTMLElement>('.acc__body')!;
    summary.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        if (d.open) {
          const h = body.scrollHeight;
          body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 350, easing: 'ease' }).onfinish = () =>
            (d.open = false);
        } else {
          d.open = true;
          const h = body.scrollHeight;
          body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      },
      { signal },
    );
  });
}

function newsFilter(signal: AbortSignal) {
  const wrap = document.querySelector<HTMLElement>('[data-news-filter]');
  if (!wrap) return;
  const input = wrap.querySelector<HTMLInputElement>('input[type=search]');
  const years = wrap.querySelectorAll<HTMLButtonElement>('[data-year]');
  const cards = document.querySelectorAll<HTMLElement>('[data-news-card]');
  const empty = document.querySelector<HTMLElement>('[data-news-empty]');
  const more = document.querySelector<HTMLButtonElement>('[data-news-more]');
  const PAGE = 12;
  let year = 'all';
  let shown = PAGE;

  const apply = () => {
    const q = (input?.value ?? '').trim().toLowerCase();
    let visible = 0;
    let matched = 0;
    cards.forEach((c) => {
      const ok = (year === 'all' || c.dataset.year === year) && (!q || (c.dataset.search ?? '').includes(q));
      if (ok) matched++;
      const show = ok && matched <= shown;
      c.hidden = !show;
      if (show) visible++;
    });
    if (empty) empty.hidden = matched > 0;
    if (more) more.hidden = matched <= shown;
    return visible;
  };
  input?.addEventListener('input', () => {
    shown = PAGE;
    apply();
  }, { signal });
  years.forEach((b) =>
    b.addEventListener(
      'click',
      () => {
        years.forEach((x) => x.classList.toggle('is-active', x === b));
        year = b.dataset.year!;
        shown = PAGE;
        apply();
      },
      { signal },
    ),
  );
  more?.addEventListener('click', () => {
    shown += PAGE;
    apply();
    ScrollTrigger.refresh();
  }, { signal });
  apply();
}

async function boot() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  root.classList.remove('menu-open');
  document.body.style.overflow = '';
  header(signal);
  menu(signal);
  modal(signal);
  lightbox(signal);
  cookie(signal);
  copyButtons(signal);
  tabs(signal);
  accordions(signal);
  newsFilter(signal);
  initForms(signal);
  window.__lvReady = true;
  await initAnimations();
}

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  destroyAnimations();
});
// после замены страницы снова включаем классы до первой отрисовки
document.addEventListener('astro:after-swap', () => {
  root.classList.add('js');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('js-anim');
});
