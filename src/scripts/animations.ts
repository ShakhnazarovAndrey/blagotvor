import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let ctx: gsap.Context | null = null;
let mm: gsap.MatchMedia | null = null;
const tickerFn = (time: number) => lenis?.raf(time * 1000);

export const getLenis = () => lenis;
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Разбивает текст на слова в масках (сохраняет вложенные элементы как одно «слово»). */
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return el.querySelectorAll<HTMLElement>('.split-word');
  const frag = document.createDocumentFragment();
  const wrap = (node: Node) => {
    const line = document.createElement('span');
    line.className = 'split-line';
    line.style.display = 'inline-block';
    const word = document.createElement('span');
    word.className = 'split-word';
    word.appendChild(node);
    line.appendChild(word);
    return line;
  };
  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split(/([ \t\n\r]+)/);
      parts.forEach((p) => {
        if (!p) return;
        if (/^[ \t\n\r]+$/.test(p)) frag.appendChild(document.createTextNode(' '));
        else frag.appendChild(wrap(document.createTextNode(p)));
      });
    } else if ((node as HTMLElement).tagName === 'BR') {
      frag.appendChild(node.cloneNode());
    } else {
      frag.appendChild(wrap(node.cloneNode(true)));
    }
  });
  el.innerHTML = '';
  el.appendChild(frag);
  el.dataset.splitDone = '1';
  return el.querySelectorAll<HTMLElement>('.split-word');
}

function initLenis() {
  if (reduced()) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);
}

export function destroyAnimations() {
  ctx?.revert();
  mm?.revert();
  ctx = null;
  mm = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
  if (lenis) {
    gsap.ticker.remove(tickerFn);
    lenis.destroy();
    lenis = null;
  }
}

function preloader(): Promise<void> {
  const root = document.documentElement;
  const pre = document.querySelector<HTMLElement>('.preloader');
  if (!root.classList.contains('is-loading') || !pre) return Promise.resolve();
  try {
    sessionStorage.setItem('lv-loaded', '1');
  } catch {}
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        root.classList.remove('is-loading');
        pre.removeAttribute('style');
        resolve();
      },
    });
    tl.from('.preloader__mark', { scale: 0, rotate: -120, duration: 0.9, ease: 'back.out(1.7)' })
      .from('.preloader__word span', { yPercent: 110, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, '-=0.4')
      .to('.preloader__mark', { rotate: 360, duration: 0.8, ease: 'power2.inOut' }, '+=0.15')
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut' }, '-=0.2');
    // контент начинаем показывать во время ухода занавеса
    tl.call(() => resolve(), [], '-=0.55');
  });
}

export async function initAnimations() {
  const anim = document.documentElement.classList.contains('js-anim');
  if (!anim) {
    // без анимаций — просто показываем всё
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => (el.textContent = format(el)));
    document.querySelectorAll<HTMLElement>('[data-progress]').forEach((el) => (el.style.width = el.dataset.progress + '%'));
    return;
  }
  initLenis();
  await preloader();

  ctx = gsap.context(() => {
    // заголовки по словам
    document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      const words = splitWords(el);
      el.style.visibility = 'visible';
      const onLoad = el.dataset.split === 'load';
      gsap.from(words, {
        yPercent: 115,
        rotate: 4,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.06,
        delay: onLoad ? 0.1 : 0,
        scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 88%' },
      });
    });

    // текст «проявляется» по мере прокрутки
    gsap.utils.toArray<HTMLElement>('[data-scrub-text]').forEach((el) => {
      const words = splitWords(el);
      el.querySelectorAll<HTMLElement>('.split-line').forEach((l) => (l.style.overflow = 'visible'));
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } },
      );
    });

    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.1,
        ease: 'power3.out',
        delay: parseFloat(el.dataset.delay ?? '0'),
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
    });

    gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((el) => {
      gsap.to(el.children, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    gsap.utils.toArray<HTMLElement>('[data-clip]').forEach((el) => {
      const media = el.querySelector('img, video');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } });
      tl.to(el, { clipPath: 'inset(0% 0 0 0 round 36px)', duration: 1.3, ease: 'power4.inOut' });
      if (media) tl.from(media, { scale: 1.25, duration: 1.6, ease: 'power3.out' }, 0);
    });

    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const amount = parseFloat(el.dataset.parallax || '0.15');
      gsap.fromTo(
        el,
        { yPercent: -amount * 100 },
        {
          yPercent: amount * 100,
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });

    gsap.utils.toArray<HTMLElement>('[data-hl]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => setTimeout(() => el.style.setProperty('--hl', '1'), 500),
      });
    });

    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count ?? '0');
      const obj = { v: 0 };
      el.textContent = format(el, 0);
      gsap.to(obj, {
        v: end,
        duration: 2.2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => (el.textContent = format(el, obj.v)),
      });
    });

    gsap.utils.toArray<HTMLElement>('[data-progress]').forEach((el) => {
      gsap.fromTo(
        el,
        { width: '0%' },
        { width: el.dataset.progress + '%', duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } },
      );
    });

    gsap.utils.toArray<HTMLElement>('[data-grow]').forEach((el) => {
      gsap.fromTo(
        el,
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top 70%', end: 'bottom 70%', scrub: true } },
      );
    });

    gsap.utils.toArray<SVGPathElement>('[data-draw] path, path[data-draw]').forEach((p) => {
      const len = p.getTotalLength();
      gsap.fromTo(
        p,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: p, start: 'top 90%' } },
      );
    });

    // бегущие строки: скорость зависит от направления скролла
    gsap.utils.toArray<HTMLElement>('[data-marquee]').forEach((track) => {
      const dur = parseFloat(track.dataset.marquee || '30');
      const reverse = track.dataset.reverse !== undefined;
      const tween = gsap.fromTo(
        track,
        { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, duration: dur, ease: 'none', repeat: -1 },
      );
      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          gsap.to(tween, { timeScale: self.direction * (1 + Math.min(Math.abs(self.getVelocity()) / 800, 3)), duration: 0.3, overwrite: true });
          gsap.to(tween, { timeScale: self.direction, duration: 1.2, delay: 0.3 });
        },
      });
    });

    // плавающие декоративные элементы
    gsap.utils.toArray<HTMLElement>('[data-float]').forEach((el, i) => {
      gsap.to(el, {
        y: () => gsap.utils.random(-24, 24),
        x: () => gsap.utils.random(-16, 16),
        rotate: () => gsap.utils.random(-8, 8),
        duration: () => gsap.utils.random(3, 5),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        repeatRefresh: true,
        delay: i * 0.3,
      });
    });
  });

  mm = gsap.matchMedia();
  // горизонтальный скролл (только на широких экранах)
  mm.add('(min-width: 1024px)', () => {
    gsap.utils.toArray<HTMLElement>('[data-hscroll]').forEach((section) => {
      const track = section.querySelector<HTMLElement>('[data-hscroll-track]');
      if (!track) return;
      const dist = () => track.scrollWidth - section.clientWidth + parseFloat(getComputedStyle(section).paddingLeft || '0');
      gsap.to(track, {
        x: () => -Math.max(0, track.scrollWidth - window.innerWidth + 64),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    });
  });

  if (finePointer()) {
    magnetic();
    tilt();
  }

  // пересчёт после загрузки картинок
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  setTimeout(() => ScrollTrigger.refresh(), 600);
}

function format(el: HTMLElement, v?: number) {
  const n = v ?? parseFloat(el.dataset.count ?? '0');
  const s = el.dataset.plain !== undefined ? String(Math.round(n)) : Math.round(n).toLocaleString('ru-RU');
  return s + (el.dataset.suffix ?? '');
}

function magnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

function tilt() {
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 8);
      rx(-py * 8);
      el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
      el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
    });
    el.addEventListener('mouseleave', () => {
      rx(0);
      ry(0);
    });
  });
}
