'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menu = $('.main-nav');
  const toggle = $('.menu-toggle');
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false); toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
  });
  document.addEventListener('focusin', (event) => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
  });
  $$('a', menu || document).forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.matchMedia('(min-width:951px)').addEventListener('change', e => { if(e.matches) setMenu(false); });

  const mobileAction = $('.mobile-action');
  const heroAction = $('[data-viewport-hero]');
  if (mobileAction && heroAction && 'IntersectionObserver' in window) {
    mobileAction.classList.add('is-hidden');
    let observer, previousInset;
    const observeHero = () => {
      const inset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (inset === previousInset) return;
      previousInset = inset;
      observer?.disconnect();
      observer = new IntersectionObserver(entries => mobileAction.classList.toggle('is-hidden', entries[0].isIntersecting), {
        // Edge contact still counts as intersecting; allow one pixel at the landing point.
        threshold:0, rootMargin:`-${inset + 1}px 0px 0px 0px`
      });
      observer.observe(heroAction);
    };
    observeHero();
    if ('ResizeObserver' in window) new ResizeObserver(observeHero).observe($('.site-header'));
  }

  // Highlight the section currently being read; normal anchor navigation stays intact.
  const sectionLinks = $$('.section-jump a[href^="#"]');
  const sections = sectionLinks.map(link => ({link, target:document.getElementById(decodeURIComponent(link.hash.slice(1)))})).filter(item => item.target);
  if (sections.length && 'IntersectionObserver' in window) {
    let sectionObserver;
    const visible = new Set();
    const highlight = target => sections.forEach(item => {
      if (item.target === target) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
    const observeSections = () => {
      sectionObserver?.disconnect(); visible.clear();
      const inset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
        const current = sections.find(item => visible.has(item.target));
        highlight(current?.target);
      }, {rootMargin:`-${inset}px 0px -${Math.round(innerHeight * .45)}px 0px`, threshold:0});
      sections.forEach(item => sectionObserver.observe(item.target));
    };
    observeSections();
    window.addEventListener('resize', observeSections, {passive:true});
  }

  const filterButtons = $$('[data-filter]');
  const teamCards = $$('[data-team-grid] .person-card');
  const setFilter = (value) => {
    if (!filterButtons.some(b => b.dataset.filter === value)) value = 'all';
    let count = 0;
    teamCards.forEach(card => { card.hidden = value !== 'all' && card.dataset.category !== value; if(!card.hidden) count++; });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
    const countElement = $('.result-count');
    if (countElement) countElement.textContent = value === 'all' ? `${count} Menschen im Team` : `${count} ${count === 1 ? 'Profil' : 'Profile'}`;
  };
  filterButtons.forEach(button => button.addEventListener('click', () => {
    setFilter(button.dataset.filter);
    const url = new URL(window.location.href);
    if (button.dataset.filter === 'all') url.searchParams.delete('filter'); else url.searchParams.set('filter', button.dataset.filter);
    history.replaceState(null, '', url);
  }));
  if (filterButtons.length) setFilter(new URLSearchParams(location.search).get('filter') || 'all');

  const photos = $$('[data-photo]');
  const photoDialog = $('.photo-dialog');
  let photoIndex = 0, lastPhotoButton = null;
  const showPhoto = index => {
    photoIndex = (index + photos.length) % photos.length;
    const button = photos[photoIndex];
    const picture = $('.dialog-photo', photoDialog);
    picture.src = button.dataset.photo;
    picture.alt = button.dataset.alt;
    $('.dialog-caption', photoDialog).textContent = `${photoIndex + 1} / ${photos.length} · ${button.dataset.caption}`;
  };
  photos.forEach((button,index) => button.addEventListener('click', () => {
    lastPhotoButton = button; showPhoto(index); photoDialog.showModal(); document.body.classList.add('locked');
    $('[data-photo-close]', photoDialog).focus();
  }));
  $('[data-photo-prev]')?.addEventListener('click', () => showPhoto(photoIndex - 1));
  $('[data-photo-next]')?.addEventListener('click', () => showPhoto(photoIndex + 1));
  $('[data-photo-close]')?.addEventListener('click', () => photoDialog.close());
  photoDialog?.addEventListener('click', event => { if(event.target === photoDialog) { const r=photoDialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) photoDialog.close(); } });
  photoDialog?.addEventListener('close', () => { document.body.classList.remove('locked'); lastPhotoButton?.focus({preventScroll:true}); });
  photoDialog?.addEventListener('keydown', event => {
    if(event.key==='ArrowRight'){ event.preventDefault(); showPhoto(photoIndex+1); }
    if(event.key==='ArrowLeft'){ event.preventDefault(); showPhoto(photoIndex-1); }
  });

  $$('[data-media]').forEach(container => {
    const initial = [...container.childNodes].map(node => node.cloneNode(true));
    const bindLoader = () => $('[data-load-media]',container)?.addEventListener('click', () => {
      const url = new URL(container.dataset.media);
      if(!['www.youtube-nocookie.com','guetelhoefer.immobilien'].includes(url.hostname)) return;
      const frame = document.createElement('iframe');
      frame.src = url.href; frame.title = container.dataset.mediaTitle;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      const controls = document.createElement('div'); controls.className = 'media-controls';
      const deactivate = document.createElement('button'); deactivate.type='button'; deactivate.className='text-link'; deactivate.textContent='Inhalt deaktivieren';
      deactivate.addEventListener('click', () => {
        container.replaceChildren(...initial.map(n => n.cloneNode(true)));
        container.classList.remove('loaded'); bindLoader(); $('[data-load-media]',container).focus();
      });
      controls.append(deactivate);
      container.replaceChildren(frame,controls); container.classList.add('loaded'); deactivate.focus();
    });
    bindLoader();
  });

  const form = $('#contact-form');
  if (form) {
    const params = new URLSearchParams(location.search);
    const incoming = (params.get('thema') || '').slice(0,100);
    const topic = $('#topic');
    if (incoming) {
      const exact = [...topic.options].find(o => o.value === incoming);
      if (exact) topic.value = incoming;
      else {
        topic.value = 'Kontakt zum Team';
        $('#message').value = `Hallo Performance Gym,\n\nich habe eine Frage an ${incoming}:\n\n`;
      }
    }
    const plannedTopics = new Set(['17/7 Run Club','17/7 Cycle Club','Mobility & Stretch','17/7 HIIT','30-Tage-Family-Challenge']);
    const updateContext = () => {
      const context = $('#contact-context');
      if (!context) return;
      context.hidden = !plannedTopics.has(topic.value);
      context.textContent = context.hidden ? '' : 'Dieses Format ist in Planung. Teile uns dein Interesse mit; Starttermine, Teilnahme und Konditionen werden noch festgelegt. Deine Anfrage ist keine Buchung.';
    };
    updateContext(); topic.addEventListener('change', updateContext);
    const invitation = params.get('einladung') || '';
    if (/^[a-f0-9]{16}$/.test(invitation)) $('#message').value = `Hallo Performance Gym,\n\nich möchte einen gemeinsamen Besuch besprechen.\nEinladungsreferenz: ${invitation}\n\n`;
    let preparedText = '';
    form.addEventListener('input', () => {
      // A prepared email must never silently send an earlier version of edited fields.
      if (!$('#prepared').hidden) {
        $('#prepared').hidden = true;
        $('#email-open').href = 'mailto:info@performance-gym.de';
        preparedText = '';
      }
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if(!form.reportValidity()) return;
      const fields = new FormData(form);
      const subject = `Anfrage: ${String(fields.get('thema')).replace(/[\r\n]/g,' ')}`;
      const body = `Hallo Performance Gym,\n\n${String(fields.get('nachricht')).trim()}\n\nViele Grüße\n${String(fields.get('name')).trim()}\n\nE-Mail: ${String(fields.get('email')).trim()}${fields.get('telefon') ? '\nTelefon: '+String(fields.get('telefon')).trim() : ''}`;
      preparedText = `An: info@performance-gym.de\nBetreff: ${subject}\n\n${body}`;
      $('#email-preview').textContent = preparedText;
      $('#email-open').href = `mailto:info@performance-gym.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const panel = $('#prepared'); panel.hidden=false; $('#copy-status').textContent='';
      panel.scrollIntoView({behavior:'smooth',block:'center'});
      $('#email-open').focus({preventScroll:true});
    });
    $('#copy-request').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(preparedText); $('#copy-status').textContent='Text kopiert. Du kannst ihn jetzt in eine E-Mail einfügen.'; }
      catch { const range=document.createRange();range.selectNodeContents($('#email-preview'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('#copy-status').textContent='Bitte kopiere den markierten Text und füge ihn in deine E-Mail ein.'; }
    });
  }
})();
