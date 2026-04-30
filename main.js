// ============ LIVE CLOCK (visitor's local time) ============
(() => {
  const els = [document.getElementById('clock'), ...document.querySelectorAll('.clock-clone')];
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  const tick = () => {
    const t = fmt.format(new Date());
    els.forEach(el => { if (el) el.textContent = t; });
  };
  tick();
  setInterval(tick, 15_000);
})();

// ============ HERO SCROLL FADE ============
// Exposed on window so the loop's snap can update synchronously before paint.
window.__updateHero = () => {};
(() => {
  const meta = document.querySelector('.hero:not(.hero-clone) .hero-meta');
  const name = document.querySelector('.hero:not(.hero-clone) .hero-name');
  if (!meta || !name) return;

  window.__updateHero = () => {
    const y = window.scrollY;
    const h = window.innerHeight;
    // Hero stays fully visible for the first ~40vh, then fades over the next 1.2 viewports.
    const startFade = h * 0.4;
    const fadeRange = h * 1.2;
    const t = Math.min(Math.max((y - startFade) / fadeRange, 0), 1);
    const eased = t * t * (3 - 2 * t);

    meta.style.opacity = 1 - eased;
    meta.style.transform = `translateY(${-eased * 30}px)`;
    name.style.opacity = 1 - eased;
    name.style.transform = `translateY(${eased * 60}px)`;
  };

  window.__updateHero();
  window.addEventListener('scroll', window.__updateHero, { passive: true });
})();

// ============ ACTIVE NAV DOT ============
(() => {
  const links = document.querySelectorAll('nav.site-nav a');
  if (!links.length) return;

  const sections = ['work', 'resume', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const dots = document.querySelectorAll('.nav-dots .dot');
  const positionDots = () => {
    links.forEach((a, i) => {
      const dot = dots[i];
      if (!dot) return;
      const r = a.getBoundingClientRect();
      dot.style.left = (r.left + r.width / 2) + 'px';
      dot.style.top = (r.bottom + 4) + 'px';
    });
  };
  positionDots();
  window.addEventListener('resize', positionDots);
  window.addEventListener('load', positionDots);

  const setActive = (id) => {
    links.forEach((a, i) => {
      const on = a.dataset.target === id;
      a.classList.toggle('is-active', on);
      if (dots[i]) dots[i].classList.toggle('is-active', on);
    });
  };

  const contentBounds = (s) => {
    const kids = s.children;
    if (!kids.length) return s.getBoundingClientRect();
    let top = Infinity, bottom = -Infinity;
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
    }
    return { top, bottom };
  };

  const pickActive = () => {
    const vh = window.innerHeight;
    let best = null;
    let bestArea = 0;
    sections.forEach(s => {
      const r = contentBounds(s);
      const area = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (area > bestArea) { bestArea = area; best = s; }
    });
    if (best && bestArea > 0) setActive(best.id);
    else {
      links.forEach(a => a.classList.remove('is-active'));
      dots.forEach(d => d.classList.remove('is-active'));
    }
  };

  const obs = new IntersectionObserver(pickActive, {
    threshold: [0, 0.05, 0.15, 0.4, 0.7, 1]
  });

  sections.forEach(s => obs.observe(s));
  window.addEventListener('scroll', pickActive, { passive: true });

  // Clear when at hero
  window.addEventListener('scroll', () => {
    if (window.scrollY < window.innerHeight * 0.4) {
      links.forEach(a => a.classList.remove('is-active'));
      dots.forEach(d => d.classList.remove('is-active'));
    }
  }, { passive: true });

  // Smooth scroll for nav clicks (handled by CSS scroll-behavior; nothing needed)
})();

// ============ CLONE FADE (mirrors hero fade, driven by clone-spacer position) ============
(() => {
  const clone = document.querySelector('.hero-clone');
  const spacer = document.querySelector('.clone-spacer');
  if (!clone || !spacer) return;

  const updateClone = () => {
    const y = window.scrollY;
    // getBoundingClientRect + scrollY gives true document-relative position,
    // unaffected by offsetParent quirks (e.g., main's 160vh top margin).
    const spacerTop = spacer.getBoundingClientRect().top + y;
    const vh = window.innerHeight;

    if (y >= spacerTop) {
      // In spacer zone: held on landing, clone fully visible and fixed
      clone.style.opacity = 1;
      clone.style.transform = 'translateY(0)';
    } else {
      // Past spacer (scrolling up): clone slides down at 2x scroll rate so it
      // clears the viewport in ~50vh. The outro-buffer above the spacer keeps
      // contact below the viewport until after the clone is gone.
      const offset = (spacerTop - y) * 2;
      if (offset >= vh) {
        clone.style.opacity = 0;
        clone.style.transform = `translateY(${vh}px)`;
      } else {
        clone.style.opacity = 1;
        clone.style.transform = `translateY(${offset}px)`;
      }
    }
  };

  window.addEventListener('scroll', updateClone, { passive: true });
  updateClone();
})();

// ============ INFINITE LOOP (both directions) ============
(() => {
  const spacer = document.querySelector('.clone-spacer');
  if (!spacer) return;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  let snappingUntil = 0;

  const snapTo = (y) => {
    snappingUntil = performance.now() + 120;
    const html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    html.scrollTop = y;
    document.body.scrollTop = y;
    html.style.scrollBehavior = '';
    if (window.__updateHero) window.__updateHero();
  };

  const loopForward = () => {
    if (performance.now() < snappingUntil) return;
    if (window.scrollY >= maxScroll() - 2) snapTo(0);
  };

  const loopBackward = () => {
    if (performance.now() < snappingUntil) return;
    if (window.scrollY <= 2) snapTo(maxScroll());
  };

  window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) loopForward();
    if (e.deltaY < 0) loopBackward();
  }, { passive: true });

  let touchY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches[0]) touchY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!e.touches[0]) return;
    const dy = touchY - e.touches[0].clientY;
    if (dy > 0) loopForward();
    if (dy < 0) loopBackward();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) loopBackward();
    if (['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) loopForward();
  });
})();

// ============ INLINE PROJECT EXPAND ============
(() => {
  const grid = document.querySelector('.work-grid');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.work-item')];
  if (!items.length) return;

  let activeIdx = -1;

  const open = (idx) => {
    if (idx === activeIdx) return;
    activeIdx = idx;
    grid.classList.add('has-active');
    grid.classList.remove('is-revealed');
    grid.setAttribute('data-active', String(idx));
    items.forEach((it, i) => {
      it.classList.toggle('is-active', i === idx);
      const detail = it.querySelector('.work-detail');
      if (detail) detail.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
    });
    setTimeout(() => grid.classList.add('is-revealed'), 450);
  };

  const close = () => {
    if (activeIdx === -1) return;
    activeIdx = -1;
    grid.classList.remove('is-revealed');
    setTimeout(() => {
      grid.classList.remove('has-active');
      grid.removeAttribute('data-active');
      items.forEach(it => {
        it.classList.remove('is-active');
        const detail = it.querySelector('.work-detail');
        if (detail) detail.setAttribute('aria-hidden', 'true');
      });
    }, 380);
  };

  items.forEach((item, idx) => {
    const card = item.querySelector('.work-card');
    if (card) card.addEventListener('click', () => open(idx));
  });
  grid.querySelectorAll('.detail-close').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
