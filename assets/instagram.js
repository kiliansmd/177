'use strict';
(() => {
  const section = document.querySelector('[data-instagram-feed]');
  if (!section) return;
  const widget = section.querySelector('[data-elfsight-app-lazy]');
  const status = section.querySelector('[data-feed-status]');
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    // Our viewport observer owns the preload distance. Avoid a second lazy gate.
    widget.removeAttribute('data-elfsight-app-lazy');
    section.dataset.feedState = 'loading';
    const update = () => {
      if (widget.getBoundingClientRect().height < 180) return;
      section.dataset.feedState = 'ready';
      status.hidden = true;
      mutations.disconnect();
      resize?.disconnect();
      clearTimeout(timeout);
    };
    const mutations = new MutationObserver(update);
    const resize = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    mutations.observe(widget, {childList: true, subtree: true});
    resize?.observe(widget);
    const failed = () => {
      status.textContent = 'Der Feed ist gerade nicht erreichbar. Unsere Beiträge findest du direkt auf Instagram.';
      section.dataset.feedState = 'unavailable';
    };
    const timeout = setTimeout(() => {
      if (section.dataset.feedState !== 'ready') failed();
    }, 15000);
    const existing = document.querySelector('script[src="https://elfsightcdn.com/platform.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      script.addEventListener('error', () => {clearTimeout(timeout); failed();}, {once: true});
      document.head.appendChild(script);
    }
    update();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, {rootMargin: '1600px 0px', threshold: 0});
    observer.observe(section);
  } else load();
})();
