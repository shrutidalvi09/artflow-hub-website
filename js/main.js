/* =========================================================
   Art Flow Hub — interactions (vanilla JS, no dependencies)
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — edit these
     --------------------------------------------------------- */

  // Service carousel. Replace the image paths with your real samples
  // (any jpg/png/webp/svg). images[0] → big box, images[1] → small box.
  const SERVICES = [
    { title: 'Logo Design',            images: ['assets/services/logo-1.svg', 'assets/services/logo-2.svg'] },
    { title: 'Branding',               images: ['assets/services/branding-1.svg', 'assets/services/branding-2.svg'] },
    { title: 'Illustration',           images: ['assets/services/illustration-1.svg', 'assets/services/illustration-2.svg'] },
    { title: 'UI/UX Design',           images: ['assets/services/uiux-1.svg', 'assets/services/uiux-2.svg'] },
    { title: 'Social Media Creatives', images: ['assets/services/social-1.svg', 'assets/services/social-2.svg'] },
    { title: 'Packaging Design',       images: ['assets/services/packaging-1.svg', 'assets/services/packaging-2.svg'] },
  ];
  const AUTOPLAY_MS = 5000;

  // Where the contact form posts. Leave empty to only show the success
  // message (nothing is sent). For example a Formspree endpoint:
  // 'https://formspree.io/f/yourFormId'
  const FORM_ENDPOINT = '';

  /* --------------------------------------------------------- */

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = matchMedia('(max-width: 767.98px)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  let reduce = mqReduce.matches;

  const onMQ = (mq, fn) => (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn));

  /* =========================================================
     HERO INTRO — split "DESIGNS" into letters, then start
     ========================================================= */
  const designs = $('.designs');
  if (designs) {
    const word = designs.textContent.trim();
    designs.dataset.text = word;
    designs.textContent = '';
    Array.from(word).forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      designs.appendChild(s);
    });
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = word;
    designs.appendChild(sr);
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    requestAnimationFrame(() => {
      root.classList.add('is-loaded');
      moveIndicator();
    });
  });

  // SMIL ribbon animations: paused for reduced motion, and whenever their
  // section is off-screen (they morph big paths every frame otherwise).
  const smilSvgs = $$('svg.has-smil');
  const syncSmil = () => smilSvgs.forEach((s) => {
    if (typeof s.pauseAnimations !== 'function') return;
    const sec = s.closest('.section');
    const off = sec && sec.classList.contains('is-offscreen');
    reduce || off ? s.pauseAnimations() : s.unpauseAnimations();
  });
  syncSmil();

  // CSS animations are paused by `.is-offscreen` (see style.css)
  const pauseIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    syncSmil();
  }, { rootMargin: '120px 0px' });
  $$('.section').forEach((s) => pauseIO.observe(s));

  $$('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* =========================================================
     NAVBAR — scroll-spy, sliding underline, scrolled state
     ========================================================= */
  const nav = $('#nav');
  const navMenu = $('#nav-menu');
  const links = $$('.nav-links a');
  const indicator = $('.nav-indicator');
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  let activeId = 'home';

  function moveIndicator() {
    const a = links.find((l) => l.hash === '#' + activeId);
    if (!a || !indicator) return;
    indicator.style.setProperty('--x', a.offsetLeft + 'px');
    indicator.style.setProperty('--w', a.offsetWidth + 'px');
  }

  function setActive(id) {
    if (!id) return;
    activeId = id;
    links.forEach((l) => {
      const on = l.hash === '#' + id;
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
    moveIndicator();
  }

  // a thin "reading line" just above the middle of the viewport
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-42% 0px -57% 0px' });
  sections.forEach((s) => spy.observe(s));

  // mobile menu
  const toggle = $('.nav-toggle');
  const backdrop = $('.nav-backdrop');
  function setMenu(open) {
    nav.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('no-scroll', open);
    navMenu.inert = mqMobile.matches && !open;
    if (open) setTimeout(() => links[0] && links[0].focus({ preventScroll: true }), 150);
  }
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
  backdrop.addEventListener('click', () => setMenu(false));
  links.forEach((l) => l.addEventListener('click', () => {
    if (nav.classList.contains('menu-open')) setMenu(false);
  }));
  navMenu.inert = mqMobile.matches;
  onMQ(mqMobile, () => {
    setMenu(false);
    moveIndicator();
    applyParallax();
  });

  /* =========================================================
     SCROLL — progress bar, nav state, back-to-top, parallax
     ========================================================= */
  const hero = $('#home');
  const progress = $('.progress');
  const toTop = $('.to-top');
  let mx = 0, my = 0, ticking = false;

  function parallaxEnabled() { return !reduce && !mqMobile.matches; }

  function applyParallax() {
    if (!parallaxEnabled()) {
      ['--wave-x', '--wave-y'].forEach((p) => hero.style.removeProperty(p));
      return;
    }
    const y = Math.min(window.scrollY, hero.offsetHeight);
    hero.style.setProperty('--wave-x', (-mx * 6).toFixed(2) + 'px');
    hero.style.setProperty('--wave-y', (y * 0.12 - my * 4).toFixed(2) + 'px');
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

    const heroH = hero.offsetHeight;
    nav.classList.toggle('is-scrolled', y > Math.max(8, heroH - nav.offsetHeight - 8));
    toTop.classList.toggle('is-visible', y > heroH * 0.8);

    // the last section can be too short to reach the spy line
    if (max > 0 && y >= max - 4) setActive(sections[sections.length - 1].id);
    else if (y < 40) setActive('home');

    if (y < heroH + 50) applyParallax();
  }
  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { requestUpdate(); moveIndicator(); });
  update();

  hero.addEventListener('pointermove', (e) => {
    if (!mqFine.matches || !parallaxEnabled()) return;
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
    requestUpdate();
  });
  hero.addEventListener('pointerleave', () => { mx = 0; my = 0; requestUpdate(); });

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    $('.nav-logo').focus({ preventScroll: true });
  });

  /* =========================================================
     SCROLL REVEAL (fade + 30px slide, staggered per section)
     ========================================================= */
  $$('.section').forEach((sec) => {
    $$('[data-reveal]', sec).forEach((el, i) => {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i * 0.12).toFixed(2) + 's');
    });
  });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  // ribbons that draw themselves. Animated through the stroke-dashoffset
  // *attribute* each frame: CSS transitions on strokes inside an SVG <mask>
  // are not repainted reliably in Chromium.
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  function drawStroke(path, duration) {
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      path.setAttribute('stroke-dashoffset', (1 - easeInOut(p)).toFixed(4));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  const drawTargets = [
    { trigger: $('.about-art'), path: $('.hammock-draw'), duration: 2000 },
    { trigger: $('.contact'), path: $('.contact-ribbon-path'), duration: 2200 },
  ].filter((d) => d.trigger && d.path);
  if (!reduce) drawTargets.forEach((d) => d.path.setAttribute('stroke-dashoffset', '1'));

  const drawIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-drawn');
      const d = drawTargets.find((x) => x.trigger === e.target);
      if (d && !reduce) drawStroke(d.path, d.duration);
      else if (d) d.path.setAttribute('stroke-dashoffset', '0');
      drawIO.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  drawTargets.forEach((d) => drawIO.observe(d.trigger));

  /* =========================================================
     SERVICE CAROUSEL
     ========================================================= */
  const card = $('#service-card');
  const titleEl = $('.card-title');
  const boxes = $$('.box', card);
  const dotsWrap = $('.dots');
  const playBtn = $('.play', card);
  const lightbox = $('#lightbox');
  let index = 0;
  let timer = null;
  let hovering = false;
  let focused = false;
  let cardInView = false;
  let swiped = false;

  // preload every sample (once the browser is idle) so cross-fades never flash
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(() => {
    SERVICES.forEach((s) => s.images.forEach((src) => { const im = new Image(); im.src = src; }));
  });
  dotsWrap.style.setProperty('--autoplay', AUTOPLAY_MS + 'ms');

  const dots = SERVICES.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Show ${s.title}`);
    b.addEventListener('click', () => { go(i); startAutoplay(); });
    dotsWrap.appendChild(b);
    return b;
  });

  function render(i, animate) {
    const s = SERVICES[i];
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === i);
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });

    boxes.forEach((box, k) => {
      const src = s.images[k] || s.images[0];
      box.dataset.src = src;
      box.dataset.caption = `${s.title} — sample ${k + 1}`;
      box.setAttribute('aria-label', `View ${s.title} sample ${k + 1}`);
      const imgs = $$('img', box);
      const cur = imgs.find((im) => im.classList.contains('is-active')) || imgs[0];
      const next = cur === imgs[0] ? imgs[1] : imgs[0];
      if (!animate) {
        cur.src = src;
        return;
      }
      next.src = src;
      const swap = () => {
        next.classList.add('is-active');
        cur.classList.remove('is-active');
      };
      if (next.decode) next.decode().then(swap, swap);
      else swap();
    });

    if (!animate || reduce || !titleEl.animate) {
      titleEl.textContent = s.title;
      return;
    }
    titleEl.getAnimations().forEach((a) => a.cancel());
    titleEl.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-14px)' }],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    ).finished.then(() => {
      titleEl.textContent = s.title;
      titleEl.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
      );
    }).catch(() => { /* superseded by a newer slide */ });
  }

  function go(i) {
    index = (i + SERVICES.length) % SERVICES.length;
    render(index, true);
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function stopAutoplay() {
    clearInterval(timer); timer = null;
    dotsWrap.classList.remove('is-playing');
  }
  function startAutoplay() {
    stopAutoplay();
    if (reduce || hovering || focused || !cardInView || document.hidden || lightbox.open) return;
    timer = setInterval(next, AUTOPLAY_MS);
    // restart the active dot's fill so it stays in step with the timer
    void dotsWrap.offsetWidth;
    dotsWrap.classList.add('is-playing');
  }

  // gentle 3D tilt + spotlight that follow the pointer (mouse/trackpad only)
  card.addEventListener('pointermove', (e) => {
    if (!mqFine.matches || reduce) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((px - 0.5) * 5).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
    card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  });
  card.addEventListener('pointerleave', () => {
    ['--rx', '--ry'].forEach((p) => card.style.removeProperty(p));
  });

  playBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); startAutoplay(); });

  card.addEventListener('mouseenter', () => { hovering = true; stopAutoplay(); });
  card.addEventListener('mouseleave', () => { hovering = false; startAutoplay(); });
  card.addEventListener('focusin', () => { focused = true; stopAutoplay(); });
  card.addEventListener('focusout', (e) => {
    if (!card.contains(e.relatedTarget)) { focused = false; startAutoplay(); }
  });
  document.addEventListener('visibilitychange', startAutoplay);
  new IntersectionObserver(([e]) => {
    cardInView = e.isIntersecting;
    startAutoplay();
  }, { threshold: 0.35 }).observe(card);

  // swipe (touch / pen)
  let sx = null, sy = 0;
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    sx = e.clientX; sy = e.clientY; swiped = false;
  });
  card.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped = true;
      if (dx < 0) next(); else prev();
      startAutoplay();
    }
  });
  card.addEventListener('pointercancel', () => { sx = null; });

  // arrow keys: when the card has focus, or the service section is on screen
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (lightbox.open || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!card.contains(document.activeElement) && !cardInView) return;
    e.preventDefault();
    if (e.key === 'ArrowRight') next(); else prev();
    startAutoplay();
  });

  render(0, false);

  /* =========================================================
     LIGHTBOX
     ========================================================= */
  const lbImg = $('.lightbox-img', lightbox);
  const lbCap = $('.lightbox-caption', lightbox);

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption;
    lbCap.textContent = caption;
    stopAutoplay();
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
    document.body.classList.add('no-scroll');
  }
  function closeLightbox() {
    if (typeof lightbox.close === 'function') lightbox.close();
    else { lightbox.removeAttribute('open'); onLightboxClose(); }
  }
  function onLightboxClose() {
    document.body.classList.remove('no-scroll');
    startAutoplay();
  }
  boxes.forEach((box) => box.addEventListener('click', () => {
    if (swiped) { swiped = false; return; }
    openLightbox(box.dataset.src, box.dataset.caption);
  }));
  $('.lightbox-close', lightbox).addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  lightbox.addEventListener('close', onLightboxClose);

  /* =========================================================
     CONTACT FORM — friendly inline validation
     ========================================================= */
  const form = $('#contact-form');
  const success = $('#form-success');
  const sendBtn = $('.btn-send', form);
  const sendLabel = $('.btn-label', sendBtn);

  const rules = {
    name: (v) => v.trim().length >= 2 || 'Please tell us your name.',
    email: (v) => {
      if (!v.trim()) return 'We need your email so we can reply.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'That email doesn’t look quite right. Could you check it?';
    },
    phone: (v) => !v.trim() || /^\+?[\d\s()-]{7,20}$/.test(v.trim()) || 'Phone numbers can use digits, spaces, +, ( ) and - only.',
    service: (v) => !!v || 'Pick the service you’re interested in.',
    message: (v) => {
      if (!v.trim()) return 'Tell us a little about your project.';
      return v.trim().length >= 10 || 'Just a bit more detail, please (10+ characters).';
    },
  };

  function validateField(el) {
    const rule = rules[el.name];
    if (!rule) return true;
    const res = rule(el.value);
    const ok = res === true;
    const field = el.closest('.field');
    field.classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    $('.field-error', field).textContent = ok ? '' : res;
    return ok;
  }

  let attempted = false;
  const fields = $$('input, select, textarea', form).filter((el) => rules[el.name]);

  const select = $('#f-service');
  select.addEventListener('change', () => select.closest('.field').classList.toggle('has-value', !!select.value));

  form.addEventListener('input', (e) => {
    if (!rules[e.target.name]) return;
    if (attempted || e.target.closest('.field').classList.contains('is-invalid')) validateField(e.target);
  });
  form.addEventListener('change', (e) => { if (attempted && rules[e.target.name]) validateField(e.target); });
  form.addEventListener('focusout', (e) => {
    if (rules[e.target.name] && e.target.value.trim()) validateField(e.target);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    attempted = true;
    const results = fields.map(validateField);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) {
      firstBad.focus();
      if (!reduce) {
        const f = firstBad.closest('.field');
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      }
      return;
    }

    sendBtn.disabled = true;
    sendBtn.classList.add('is-sending');
    sendLabel.textContent = 'Sending…';
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
      form.hidden = true;
      success.hidden = false;
      requestAnimationFrame(() => success.classList.add('is-shown'));
      success.focus();
    } catch (err) {
      const msg = $('#e-message');
      msg.textContent = 'Sorry, something went wrong sending your message. Please try again or email us directly.';
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      sendBtn.classList.remove('is-sending');
      sendLabel.textContent = 'Send Message';
    }
  });

  $('#send-another').addEventListener('click', () => {
    form.reset();
    attempted = false;
    fields.forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.closest('.field').classList.remove('is-invalid', 'has-value');
      $('.field-error', el.closest('.field')).textContent = '';
    });
    success.classList.remove('is-shown');
    success.hidden = true;
    form.hidden = false;
    $('#f-name').focus();
  });

  /* =========================================================
     GLOBAL KEYS + motion preference changes
     ========================================================= */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  onMQ(mqReduce, () => {
    reduce = mqReduce.matches;
    syncSmil();
    startAutoplay();
    applyParallax();
  });
})();
