'use strict';
(() => {
  // Native scrolling stays in control. Only settle close to a section after a gesture.
  const root = document.documentElement;
  const main = document.querySelector('main');
  if (!main || document.querySelector('.join-area, .service-wrap, .legal, .challenge-workspace, .growth-form-section')) return;

  const freeScroll = 'form, input, textarea, select, [contenteditable], [role="slider"], .main-nav, dialog, .prepared, [data-scroll-free]';
  let armed = false;
  let origin = 0;
  let restingY = window.scrollY;
  let wheelTravel = 0;
  let input = '';
  let correcting = false;
  let touching = false;
  let timer;

  const release = () => {
    armed = false;
    restingY = window.scrollY;
    clearTimeout(timer);
    if (correcting) {
      correcting = false;
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    }
  };
  const begin = event => {
    if (event.target instanceof Element && event.target.closest(freeScroll)) {
      release();
      return;
    }
    if (correcting) release();
    // Passive wheel listeners may run after the compositor has already moved the page.
    if (!armed) { origin = restingY; wheelTravel = 0; }
    input = event.type;
    if (input === 'wheel') wheelTravel += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    armed = true;
  };
  const settle = () => {
    clearTimeout(timer);
    restingY = window.scrollY;
    if (correcting) { correcting = false; return; }
    if (!armed || touching) return;
    armed = false;
    if (document.hidden || document.querySelector('dialog[open], .main-nav.is-open') ||
        document.activeElement?.closest(freeScroll) || !window.getSelection()?.isCollapsed) return;
    const viewport = window.visualViewport;
    if (viewport && (Math.abs(viewport.scale - 1) > .01 || viewport.height < window.innerHeight * .8)) return;

    const y = window.scrollY;
    const radius = Math.min(42, Math.max(20, (viewport?.height || window.innerHeight) * .045));
    // Small adjustments and gestures leaving a landing point must never get pulled back.
    const minimumTravel = Math.max(72, radius * 2);
    if (Math.abs(y - origin) < minimumTravel || (input === 'wheel' && wheelTravel < minimumTravel)) return;
    const max = Math.max(0, root.scrollHeight - root.clientHeight);
    const inset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const sections = [...main.children].slice(1).filter(el => el.matches('section') && el.offsetHeight > 0);
    const footer = document.querySelector('.site-footer');
    if (footer) sections.push(footer);
    const points = [0, max, ...sections.map(el => Math.min(max, Math.max(0, el.getBoundingClientRect().top + y - inset)))];
    const target = points.reduce((nearest, point) => Math.abs(point - y) < Math.abs(nearest - y) ? point : nearest, points[0]);
    const distance = Math.abs(target - y);
    if (distance < 2 || distance > radius || Math.abs(target - origin) <= radius) return;
    correcting = true;
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) { release(); return; }
    begin(event);
  }, { passive: true });
  window.addEventListener('touchstart', event => {
    touching = true;
    if (event.touches.length === 1) begin(event); else release();
  }, { passive: true });
  window.addEventListener('touchend', event => { touching = event.touches.length > 0; }, { passive: true });
  window.addEventListener('touchcancel', () => { touching = false; release(); }, { passive: true });
  window.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch') release(); }, { passive: true });
  // Links, keyboard navigation and browser history always keep their own exact targets.
  ['click', 'keydown', 'focusin'].forEach(name => document.addEventListener(name, release, { capture: true }));
  ['hashchange', 'popstate', 'pageshow', 'pagehide', 'resize'].forEach(name => window.addEventListener(name, release));
  document.addEventListener('visibilitychange', release);
  window.visualViewport?.addEventListener('resize', release);
  if ('onscrollend' in document) {
    document.addEventListener('scrollend', settle);
  } else {
    // Older browsers: one passive debounce, without measuring during the gesture.
    document.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 180);
    }, { passive: true });
    window.addEventListener('touchend', () => {
      if (armed && !touching) { clearTimeout(timer); timer = setTimeout(settle, 180); }
    }, { passive: true });
  }
})();
