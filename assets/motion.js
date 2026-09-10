'use strict';
(() => {
  // Progressive enhancement: no hidden content, scroll handlers or frame loops.
  if (!('animate' in Element.prototype) || !('IntersectionObserver' in window)) return;

  const seen = new WeakSet();
  const running = new Map();
  const ease = 'cubic-bezier(.22, 1, .36, 1)';
  let observer;
  let suspended = false;

  const animate = (element, keyframes, options = {}) => {
    if (suspended || document.hidden || element.contains(document.activeElement)) return;
    running.get(element)?.cancel();
    const animation = element.animate(keyframes, { duration: 620, easing: ease, fill: 'backwards', ...options });
    running.set(element, animation);
    const release = () => { if (running.get(element) === animation) running.delete(element); };
    animation.addEventListener('finish', release, { once: true });
    animation.addEventListener('cancel', release, { once: true });
    return animation;
  };
  const reveal = (element, delay = 0, entrance = false) => {
    seen.add(element);
    animate(element, [
      { opacity: entrance ? .4 : .15, transform: `translate3d(0,${entrance ? 12 : 22}px,0)` },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], { delay, duration: entrance ? 660 : 620 });
  };
  const stop = () => {
    observer?.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  };

  const selector = [
    '.intro-grid > div', '.training-card', '.split-photo', '.split-copy',
    '.price-band > div', '.trial-band .wrap > div', '.section-head > *',
    '.person-card', '.faq-layout > div:first-child', '.faq-list details',
    '.feature-photo', '.feature-copy', '.step', '.visit-photo', '.visit-info',
    '.gallery-item', '.offer-panel', '.profile-portrait', '.profile-copy',
    '.profile-bio', '.contact-layout > div', '.contact-form', '.media-placeholder',
    '.footer-grid > div', '.hero-panel', '.section-jump'
  ].join(',');
  // Avoid two animations on nested elements, including cards within a section.
  const candidates = [...document.querySelectorAll(selector)];
  const candidateSet = new Set(candidates);
  const targets = candidates.filter(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (candidateSet.has(parent)) return false;
    }
    return true;
  });
  targets.forEach(element => { element.dataset.reveal = ''; });

  const observe = () => {
    if (suspended) return;
    observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.hidden) return;
        observer.unobserve(entry.target);
        if (!seen.has(entry.target)) {
          // Entries already above the viewport (restored history/hash) stay still.
          if (entry.boundingClientRect.bottom > 0) reveal(entry.target, Math.min(order++, 3) * 55);
          else seen.add(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 32px 0px' });
    targets.forEach(element => { if (!seen.has(element)) observer.observe(element); });
  };

  const navigation = performance.getEntriesByType('navigation')[0];
  if (scrollY < 48 && !location.hash && navigation?.type !== 'back_forward') {
    const intro = document.querySelector('.hero-copy, .page-head-copy');
    if (intro) [...intro.children].forEach((element, index) => reveal(element, Math.min(index, 4) * 65, true));
    const photo = document.querySelector('.hero-photo');
    if (photo) animate(photo, [{ transform: 'scale(1.035)' }, { transform: 'scale(1)' }], { duration: 1050 });
  }
  observe();

  document.querySelector('.filter-bar')?.addEventListener('click', event => {
    if (!event.target.closest('[data-filter]')) return;
    [...document.querySelectorAll('[data-team-grid] .person-card:not([hidden])')].forEach((card, index) => {
      const bounds = card.getBoundingClientRect();
      if (bounds.top < innerHeight && bounds.bottom > 0) {
        observer?.unobserve(card); seen.add(card);
        animate(card, [{ opacity: .35, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 300, delay: Math.min(index, 3) * 35 });
      }
    });
  });
  document.querySelectorAll('.training-card img, .person-photo img, .gallery-item img, .feature-photo img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => {
      const bounds = img.getBoundingClientRect();
      if (bounds.top < innerHeight && bounds.bottom > 0) animate(img, [{ opacity: .4 }, { opacity: 1 }], { duration: 380 });
    }, { once: true });
  });
  document.addEventListener('focusin', event => {
    running.forEach((animation, element) => {
      if (element.contains(event.target) || event.target.contains(element)) animation.cancel();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running.forEach(animation => animation.cancel()); running.clear(); }
  });
  window.addEventListener('pagehide', () => { suspended = true; stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { suspended = false; observe(); } });
  window.addEventListener('beforeprint', stop);
  window.addEventListener('afterprint', observe);
})();
