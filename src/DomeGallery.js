/**
 * DomeGallery.js
 * 3D Sphere / Dome of Cookie Crew Comments with Interactive Pop-up Expand.
 */

import './DomeGallery.css';

// ── Crew comments data ───────────────────────────────────────────────────────
const CREW_COMMENTS = [
  {
    id: 'lokesh',
    initial: 'L',
    name: 'Lokesh',
    role: 'Research & Development',
    quote: '“The flavour scientist on a secret mission.”',
    desc: 'Constantly experimenting—one day he’ll crack the unbeatable flavour.',
    tags: ['R&D', 'Flavour Scientist']
  },
  {
    id: 'sowmya',
    initial: 'S',
    name: 'Sowmya',
    role: 'Packing Head',
    quote: '“Master of neatness, the queen of clean corners.”',
    desc: 'Every pack looks perfect—you’ll swear precision is her superpower.',
    tags: ['Packing Head', 'Quality First']
  },
  {
    id: 'shree',
    initial: 'S',
    name: 'Shree Raksha',
    role: 'Finance Head (CA)',
    quote: '“Keeps the numbers clean and the business steady.”',
    desc: 'From compliance to clarity, she ensures MingMorsels grows the right way.',
    tags: ['Finance Head', 'Chartered Accountant']
  },
  {
    id: 'arun',
    initial: 'A',
    name: 'Arun Narayanan K',
    role: 'Founder & Creative Head',
    quote: '“Chief Cookie Dreamer.”',
    desc: 'Believes every cookie should tell a story. From the first batch to the thousandth box, he’s still obsessed with getting every bite right.',
    tags: ['Founder', 'Creative Head', 'Baker at Heart'],
    accent: true
  },
  {
    id: 'dharshini',
    initial: 'D',
    name: 'Dharshini K',
    role: 'Operations Excellence Lead',
    quote: '“Runs the show so smoothly, even chaos listens to her.”',
    desc: 'If something’s on track, it’s probably because she double-checked it... twice.',
    tags: ['Operations', 'Excellence Lead']
  },
  {
    id: 'bishu',
    initial: 'B',
    name: 'Bishu Mehra',
    role: 'Sales & Operations Supervisor',
    quote: '“Sells cookies like they’re happiness in a box.”',
    desc: 'Can talk to anyone, anywhere—might even convince a cookie to sell itself.',
    tags: ['Sales & Ops', 'Customer Joy']
  },
  {
    id: 'nafees',
    initial: 'N',
    name: 'Nafees Khan',
    role: 'Business Development & Institutional Sales Head',
    quote: '“Turns handshakes into long-term partnerships.”',
    desc: 'Calm, strategic, and the reason MingMorsels enters premium spaces.',
    tags: ['Business Dev', 'Institutional Partnerships']
  },
  {
    id: 'daniel',
    initial: 'D',
    name: 'Daniel',
    role: 'Chef · Production',
    quote: '“Kitchen wizard with a whisk and wild ideas.”',
    desc: 'If your cookie tastes amazing... he’s definitely the reason.',
    tags: ['Chef', 'Production', 'Master Baker'],
    accent: true
  }
];

// ── Pure helpers ─────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const wrapAngleSigned = deg => { const a = (((deg + 180) % 360) + 360) % 360; return a - 180; };

function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];
  const coords = xCols.flatMap((x, c) => (c % 2 === 0 ? evenYs : oddYs).map(y => ({ x, y, sizeX: 2.5, sizeY: 1.8 })));
  const totalSlots = coords.length;
  
  if (!pool.length) return coords.map(c => ({ ...c, member: null }));
  
  const used = Array.from({ length: totalSlots }, (_, i) => pool[i % pool.length]);
  // distribute to avoid consecutive duplicate cards
  for (let i = 1; i < used.length; i++) {
    if (used[i].id === used[i - 1].id) {
      for (let j = i + 1; j < used.length; j++) {
        if (used[j].id !== used[i].id) {
          const tmp = used[i];
          used[i] = used[j];
          used[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    member: used[i]
  }));
}

// ── Public init ──────────────────────────────────────────────────────────────
export function initDomeGallery(containerEl, opts = {}) {
  const {
    crew                = CREW_COMMENTS,
    fit                 = 0.52,
    minRadius           = 540,
    maxRadius           = Infinity,
    overlayBlurColor    = '#FAF6F0',
    maxVerticalRotation = 6,
    dragSensitivity     = 22,
    segments            = 32,
    dragDampening       = 1.8,
  } = opts;

  // ── Build DOM ──────────────────────────────────────────────────────────────
  containerEl.innerHTML = `
    <div class="sphere-root"
      style="
        --segments-x:${segments};
        --segments-y:${segments};
        --overlay-blur-color:${overlayBlurColor};
      ">
      <main class="sphere-main">
        <div class="stage"><div class="sphere"></div></div>
        <div class="overlay"></div>
        <div class="overlay overlay--blur"></div>
        <div class="edge-fade edge-fade--top"></div>
        <div class="edge-fade edge-fade--bottom"></div>
        <div class="viewer">
          <div class="scrim"></div>
          <div id="crew-popup-slot"></div>
        </div>
      </main>
    </div>`;

  const root       = containerEl.querySelector('.sphere-root');
  const mainEl     = containerEl.querySelector('.sphere-main');
  const sphereEl   = containerEl.querySelector('.sphere');
  const scrimEl    = containerEl.querySelector('.scrim');
  const popupSlot  = containerEl.querySelector('#crew-popup-slot');

  // ── State ──────────────────────────────────────────────────────────────────
  const rot        = { x: 0, y: 0 };
  const startRot   = { x: 0, y: 0 };
  let startPos     = null;
  let dragging     = false;
  let moved        = false;
  let inertiaRAF   = null;
  let lastDragEndAt = 0;
  let scrollLocked = false;
  let activePopup  = null;

  // Velocity tracking
  let lastPTime = 0;
  let lastPPos  = { x: 0, y: 0 };
  let vel       = { x: 0, y: 0 };

  const lockScroll   = () => { if (scrollLocked) return; scrollLocked = true;  document.body.classList.add('dg-scroll-lock'); };
  const unlockScroll = () => { if (!scrollLocked) return; scrollLocked = false; document.body.classList.remove('dg-scroll-lock'); };

  // ── Transform ──────────────────────────────────────────────────────────────
  const applyTransform = (x, y) => {
    sphereEl.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${x}deg) rotateY(${y}deg)`;
  };
  applyTransform(0, 0);

  // ── Build comment tiles ────────────────────────────────────────────────────
  const items = buildItems(crew, segments);
  items.forEach((it, idx) => {
    const member = it.member;
    if (!member) return;

    const item = document.createElement('div');
    item.className = 'item';
    item.dataset.index = idx;
    item.style.cssText = `--offset-x:${it.x};--offset-y:${it.y};--item-size-x:${it.sizeX};--item-size-y:${it.sizeY};`;

    const card = document.createElement('div');
    card.className = `item__card${member.accent ? ' item__card--accent' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${member.name} comment: ${member.quote}`);

    card.innerHTML = `
      <div class="item-card-top">
        <div class="item-avatar-mini">${member.initial}</div>
        <div class="item-author-info">
          <span class="item-author-name">${member.name}</span>
          <span class="item-author-role">${member.role}</span>
        </div>
      </div>
      <p class="item-card-quote">${member.quote}</p>
      <div class="item-card-footer">
        <span class="item-tap-hint">Tap to expand ↗</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragging || moved || performance.now() - lastDragEndAt < 90) return;
      openPopup(member);
    });

    item.appendChild(card);
    sphereEl.appendChild(item);
  });

  // ── Resize Observer ────────────────────────────────────────────────────────
  const ro = new ResizeObserver(([{ contentRect: cr }]) => {
    const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
    const minDim = Math.min(w, h);
    const radius = clamp(minDim * fit, minRadius, maxRadius);
    root.style.setProperty('--radius', `${Math.round(radius)}px`);
    applyTransform(rot.x, rot.y);
  });
  ro.observe(root);

  // ── Inertia Physics ────────────────────────────────────────────────────────
  const stopInertia = () => { if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; } };

  const startInertia = (vx, vy) => {
    const d = clamp(dragDampening, 0, 1);
    let vX = clamp(vx, -1.4, 1.4) * 80;
    let vY = clamp(vy, -1.4, 1.4) * 80;
    let frames = 0;
    const fric = 0.94 + 0.055 * d;
    const stop = 0.015 - 0.01 * d;
    const maxF = Math.round(90 + 270 * d);

    const step = () => {
      vX *= fric;
      vY *= fric;
      if ((Math.abs(vX) < stop && Math.abs(vY) < stop) || ++frames > maxF) {
        inertiaRAF = null;
        return;
      }
      rot.x = clamp(rot.x - vY / 200, -maxVerticalRotation, maxVerticalRotation);
      rot.y = wrapAngleSigned(rot.y + vX / 200);
      applyTransform(rot.x, rot.y);
      inertiaRAF = requestAnimationFrame(step);
    };
    stopInertia();
    inertiaRAF = requestAnimationFrame(step);
  };

  // ── Pointer Dragging ───────────────────────────────────────────────────────
  mainEl.addEventListener('pointerdown', e => {
    if (activePopup) return;
    stopInertia();
    dragging = true;
    moved = false;
    startRot.x = rot.x;
    startRot.y = rot.y;
    startPos = { x: e.clientX, y: e.clientY };
    lastPPos = { ...startPos };
    lastPTime = performance.now();
    vel = { x: 0, y: 0 };
    mainEl.setPointerCapture(e.pointerId);
  }, { passive: true });

  mainEl.addEventListener('pointermove', e => {
    if (!dragging || !startPos || activePopup) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    if (!moved && dx * dx + dy * dy > 16) moved = true;

    rot.x = clamp(startRot.x - dy / dragSensitivity, -maxVerticalRotation, maxVerticalRotation);
    rot.y = wrapAngleSigned(startRot.y + dx / dragSensitivity);
    applyTransform(rot.x, rot.y);

    const now = performance.now();
    const dt = now - lastPTime;
    if (dt > 0) {
      vel.x = (e.clientX - lastPPos.x) / dt;
      vel.y = (e.clientY - lastPPos.y) / dt;
    }
    lastPPos = { x: e.clientX, y: e.clientY };
    lastPTime = now;
  }, { passive: true });

  const onPointerEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(vel.x) > 0.005 || Math.abs(vel.y) > 0.005) {
      startInertia(vel.x, vel.y);
    }
    if (moved) lastDragEndAt = performance.now();
    moved = false;
  };
  mainEl.addEventListener('pointerup', onPointerEnd, { passive: true });
  mainEl.addEventListener('pointercancel', onPointerEnd, { passive: true });

  // ── Pop-up Expand / Close ──────────────────────────────────────────────────
  function openPopup(member) {
    if (activePopup) closePopup();

    lockScroll();
    const tagsHTML = (member.tags || []).map(t => `<span class="crew-popup-tag">${t}</span>`).join('');

    const popup = document.createElement('div');
    popup.className = 'crew-popup-card';
    popup.innerHTML = `
      <button class="crew-popup-close" aria-label="Close comment">✕</button>
      <div class="crew-popup-header">
        <div class="crew-popup-avatar">${member.initial}</div>
        <div class="crew-popup-meta">
          <span class="crew-popup-name">${member.name}</span>
          <span class="crew-popup-role">${member.role}</span>
        </div>
      </div>
      <p class="crew-popup-quote">${member.quote}</p>
      <p class="crew-popup-desc">${member.desc}</p>
      ${tagsHTML ? `<div class="crew-popup-tags">${tagsHTML}</div>` : ''}
    `;

    popup.querySelector('.crew-popup-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });

    popupSlot.innerHTML = '';
    popupSlot.appendChild(popup);
    activePopup = popup;

    requestAnimationFrame(() => {
      root.setAttribute('data-enlarging', 'true');
    });
  }

  function closePopup() {
    if (!activePopup) return;
    root.removeAttribute('data-enlarging');
    
    setTimeout(() => {
      popupSlot.innerHTML = '';
      activePopup = null;
      unlockScroll();
    }, 280);
  }

  scrimEl.addEventListener('click', closePopup);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activePopup) closePopup();
  });

  return () => {
    ro.disconnect();
    stopInertia();
    unlockScroll();
  };
}
