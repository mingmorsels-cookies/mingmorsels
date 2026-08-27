/**
 * DomeGallery.js
 * 3D Sphere / Dome of Cookie Crew Comments & Testimonials.
 * Renders interactive comment cards across a rotating 3D dome
 * with momentum drag physics and a smooth non-fullscreen popup modal.
 */

import './DomeGallery.css';

// ── 8 Crew Members & Comments ────────────────────────────────────────────────
const CREW_COMMENTS = [
  {
    id: 'lokesh',
    initial: 'L',
    name: 'Lokesh',
    role: 'Research & Development',
    quote: '“The flavour scientist on a secret mission.”',
    desc: 'Constantly experimenting—one day he’ll crack the unbeatable flavour.',
    accent: false
  },
  {
    id: 'sowmya',
    initial: 'S',
    name: 'Sowmya',
    role: 'Packing Head',
    quote: '“Master of neatness, the queen of clean corners.”',
    desc: 'Every pack looks perfect—you’ll swear precision is her superpower.',
    accent: false
  },
  {
    id: 'shree',
    initial: 'S',
    name: 'Shree Raksha',
    role: 'Finance Head (CA)',
    quote: '“Keeps the numbers clean and the business steady.”',
    desc: 'From compliance to clarity, she ensures MingMorsels grows the right way.',
    accent: false
  },
  {
    id: 'arun',
    initial: 'A',
    name: 'Arun Narayanan K',
    role: 'Founder & Creative Head',
    quote: '“Chief Cookie Dreamer.”',
    desc: 'Believes every cookie should tell a story. From the first batch to the thousandth box, he’s still obsessed with getting every bite right.',
    accent: true
  },
  {
    id: 'dharshini',
    initial: 'D',
    name: 'Dharshini K',
    role: 'Operations Excellence Lead',
    quote: '“Runs the show so smoothly, even chaos listens to her.”',
    desc: 'If something’s on track, it’s probably because she double-checked it… twice.',
    accent: false
  },
  {
    id: 'bishu',
    initial: 'B',
    name: 'Bishu Mehra',
    role: 'Sales & Operations Supervisor',
    quote: '“Sells cookies like they’re happiness in a box.”',
    desc: 'Can talk to anyone, anywhere—might even convince a cookie to sell itself.',
    accent: false
  },
  {
    id: 'nafees',
    initial: 'N',
    name: 'Nafees Khan',
    role: 'Business Development & Institutional Sales Head',
    quote: '“Turns handshakes into long-term partnerships.”',
    desc: 'Calm, strategic, and the reason MingMorsels enters premium spaces.',
    accent: false
  },
  {
    id: 'daniel',
    initial: 'D',
    name: 'Daniel',
    role: 'Chef · Production',
    quote: '“Kitchen wizard with a whisk and wild ideas.”',
    desc: 'If your cookie tastes amazing… he’s definitely the reason.',
    accent: true
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp          = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => { const a = (((deg + 180) % 360) + 360) % 360; return a - 180; };
const getDataNumber  = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

// Builds a clean, uncongested spherical distribution of cards
function buildItems(pool, seg) {
  // Distribute items with enough spacing (2 to 3 rows, spaced columns)
  const xCols = Array.from({ length: seg }, (_, i) => -18 + i * 2.6);
  const evenYs = [-1.8, 0, 1.8];
  const oddYs  = [-0.9, 0.9];

  const coords = xCols.flatMap((x, c) => (c % 2 === 0 ? evenYs : oddYs).map(y => ({
    x: Number(x.toFixed(2)),
    y,
    sizeX: 3.1,
    sizeY: 2.3
  })));

  const totalSlots = coords.length;
  if (!pool.length) return coords.map(c => ({ ...c, data: null }));

  const used = Array.from({ length: totalSlots }, (_, i) => pool[i % pool.length]);

  // Shuffle to prevent exact duplicates sitting directly next to each other
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
    data: used[i]
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  return {
    rotateY: unit * (offsetX + (sizeX - 1) / 2),
    rotateX: unit * (offsetY - (sizeY - 1) / 2),
  };
}

// ── Public Init ──────────────────────────────────────────────────────────────
export function initDomeGallery(containerEl, opts = {}) {
  const {
    crew                = CREW_COMMENTS,
    fit                 = 0.52,
    fitBasis            = 'auto',
    minRadius           = 540,
    maxRadius           = 780,
    padFactor           = 0.18,
    overlayBlurColor    = '#FAF6F0',
    maxVerticalRotation = 7,
    dragSensitivity     = 18,
    enlargeTransitionMs = 320,
    segments            = 14,
    dragDampening       = 1.8,
    openedCardWidth     = '400px',
  } = opts;

  // ── Build DOM ─────────────────────────────────────────────────────────────
  containerEl.innerHTML = `
    <div class="sphere-root"
      style="
        --segments-x:${segments};
        --segments-y:${segments};
        --overlay-blur-color:${overlayBlurColor};
        --tile-radius:18px;
        --enlarge-radius:24px;
      ">
      <main class="sphere-main" title="Click and drag to rotate the Cookie Crew dome">
        <div class="stage"><div class="sphere"></div></div>
        <div class="overlay"></div>
        <div class="overlay overlay--blur"></div>
        <div class="edge-fade edge-fade--top"></div>
        <div class="edge-fade edge-fade--bottom"></div>
        <div class="viewer">
          <div class="scrim"></div>
          <div class="frame"></div>
        </div>
      </main>
    </div>`;

  const root     = containerEl.querySelector('.sphere-root');
  const mainEl   = containerEl.querySelector('.sphere-main');
  const sphereEl = containerEl.querySelector('.sphere');
  const viewerEl = containerEl.querySelector('.viewer');
  const scrimEl  = containerEl.querySelector('.scrim');
  const frameEl  = containerEl.querySelector('.frame');

  // ── State ─────────────────────────────────────────────────────────────────
  const rot        = { x: 0, y: 0 };
  const startRot   = { x: 0, y: 0 };
  let startPos     = null;
  let dragging     = false;
  let moved        = false;
  let inertiaRAF   = null;
  let focusedEl    = null;
  let origTilePos  = null;
  let opening      = false;
  let openStartAt  = 0;
  let lastDragEndAt = 0;
  let scrollLocked = false;

  let lastPTime = 0;
  let lastPPos  = { x: 0, y: 0 };
  let vel       = { x: 0, y: 0 };

  const lockScroll   = () => { if (scrollLocked) return; scrollLocked = true;  document.body.classList.add('dg-scroll-lock'); };
  const unlockScroll = () => {
    if (!scrollLocked || root.getAttribute('data-enlarging') === 'true') return;
    scrollLocked = false; document.body.classList.remove('dg-scroll-lock');
  };

  const applyTransform = (x, y) => {
    sphereEl.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${x}deg) rotateY(${y}deg)`;
  };
  applyTransform(0, 0);

  // ── Build Tiles ───────────────────────────────────────────────────────────
  const items = buildItems(crew, segments);

  items.forEach((it, idx) => {
    const member = it.data;
    if (!member) return;

    const item = document.createElement('div');
    item.className = 'item';
    Object.assign(item.dataset, {
      crewId: member.id,
      offsetX: it.x,
      offsetY: it.y,
      sizeX: it.sizeX,
      sizeY: it.sizeY,
      index: idx
    });
    item.style.cssText = `--offset-x:${it.x};--offset-y:${it.y};--item-size-x:${it.sizeX};--item-size-y:${it.sizeY};`;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'item__image';
    cardWrap.setAttribute('role', 'button');
    cardWrap.setAttribute('tabindex', '0');
    cardWrap.setAttribute('aria-label', `Read comments by ${member.name}`);

    cardWrap.innerHTML = `
      <div class="dome-comment-card ${member.accent ? 'dome-comment-card--accent' : ''}">
        <div class="dome-card-top">
          <div class="dome-card-avatar">${member.initial}</div>
          <div class="dome-card-header-text">
            <div class="dome-card-name">${member.name}</div>
            <div class="dome-card-role">${member.role}</div>
          </div>
        </div>
        <div class="dome-card-quote">${member.quote}</div>
        <div class="dome-card-desc">${member.desc}</div>
        <div class="dome-card-tap-hint"><span>🔍 Click to expand</span></div>
      </div>
    `;

    item.appendChild(cardWrap);
    sphereEl.appendChild(item);
  });

  // ── Responsive Radius ─────────────────────────────────────────────────────
  const ro = new ResizeObserver(([{ contentRect: cr }]) => {
    const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
    const minDim = Math.min(w, h), maxDim = Math.max(w, h), aspect = w / h;
    const basis = fitBasis === 'min' ? minDim : fitBasis === 'max' ? maxDim :
                  fitBasis === 'width' ? w : fitBasis === 'height' ? h :
                  (aspect >= 1.3 ? w : minDim);
    const radius = clamp(Math.min(basis * fit, h * 1.4), minRadius, maxRadius);
    const pad    = Math.max(8, Math.round(minDim * padFactor));
    root.style.setProperty('--radius', `${Math.round(radius)}px`);
    root.style.setProperty('--viewer-pad', `${pad}px`);
    applyTransform(rot.x, rot.y);
  });
  ro.observe(root);

  // ── Inertia & Drag ────────────────────────────────────────────────────────
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
      vX *= fric; vY *= fric;
      if ((Math.abs(vX) < stop && Math.abs(vY) < stop) || ++frames > maxF) { inertiaRAF = null; return; }
      rot.x = clamp(rot.x - vY / 200, -maxVerticalRotation, maxVerticalRotation);
      rot.y = wrapAngleSigned(rot.y + vX / 200);
      applyTransform(rot.x, rot.y);
      inertiaRAF = requestAnimationFrame(step);
    };
    stopInertia();
    inertiaRAF = requestAnimationFrame(step);
  };

  mainEl.addEventListener('pointerdown', e => {
    if (focusedEl) return;
    stopInertia();
    dragging = true; moved = false;
    startRot.x = rot.x; startRot.y = rot.y;
    startPos = { x: e.clientX, y: e.clientY };
    lastPPos = { ...startPos }; lastPTime = performance.now(); vel = { x: 0, y: 0 };
    mainEl.setPointerCapture(e.pointerId);
  }, { passive: true });

  mainEl.addEventListener('pointermove', e => {
    if (!dragging || !startPos || focusedEl) return;
    const dx = e.clientX - startPos.x, dy = e.clientY - startPos.y;
    if (!moved && dx * dx + dy * dy > 16) moved = true;
    rot.x = clamp(startRot.x - dy / dragSensitivity, -maxVerticalRotation, maxVerticalRotation);
    rot.y = wrapAngleSigned(startRot.y + dx / dragSensitivity);
    applyTransform(rot.x, rot.y);
    const now = performance.now(), dt = now - lastPTime;
    if (dt > 0) { vel.x = (e.clientX - lastPPos.x) / dt; vel.y = (e.clientY - lastPPos.y) / dt; }
    lastPPos = { x: e.clientX, y: e.clientY }; lastPTime = now;
  }, { passive: true });

  const onPointerEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(vel.x) > 0.005 || Math.abs(vel.y) > 0.005) startInertia(vel.x, vel.y);
    if (moved) lastDragEndAt = performance.now();
    moved = false;
  };
  mainEl.addEventListener('pointerup',     onPointerEnd, { passive: true });
  mainEl.addEventListener('pointercancel', onPointerEnd, { passive: true });

  // ── Open / Expand Comment Modal ───────────────────────────────────────────
  const openTile = el => {
    if (opening) return;
    opening = true; openStartAt = performance.now(); lockScroll();

    const parent = el.parentElement;
    focusedEl = el;

    const crewId = parent.dataset.crewId;
    const member = crew.find(c => c.id === crewId) || crew[0];

    const offX = getDataNumber(parent, 'offsetX', 0);
    const offY = getDataNumber(parent, 'offsetY', 0);
    const szX  = getDataNumber(parent, 'sizeX', 3.1);
    const szY  = getDataNumber(parent, 'sizeY', 2.3);
    const pr   = computeItemBaseRotation(offX, offY, szX, szY, segments);

    let rotY = -(normalizeAngle(pr.rotateY) + normalizeAngle(rot.y)) % 360;
    if (rotY < -180) rotY += 360;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${-pr.rotateX - rot.x}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.cssText = `opacity:0;transform:rotateX(${-pr.rotateX}deg) rotateY(${-pr.rotateY}deg);`;
    parent.appendChild(refDiv);
    void refDiv.offsetHeight;

    const tileR  = refDiv.getBoundingClientRect();
    const mainR  = mainEl.getBoundingClientRect();
    const frameR = frameEl.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0) {
      opening = false; focusedEl = null; parent.removeChild(refDiv); unlockScroll(); return;
    }

    origTilePos = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden'; el.style.zIndex = 0;

    // Pop-up modal overlay
    const ov = document.createElement('div');
    ov.className = `enlarge ${member.accent ? 'enlarge--accent' : ''}`;
    ov.style.cssText = `
      position: absolute;
      left: ${frameR.left - mainR.left}px;
      top: ${frameR.top - mainR.top}px;
      width: ${openedCardWidth};
      max-width: 90vw;
      opacity: 0;
      z-index: 30;
      will-change: transform, opacity;
      transform-origin: top left;
      transition: transform ${enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${enlargeTransitionMs}ms ease;
    `;

    ov.innerHTML = `
      <div class="dome-popup-card">
        <button type="button" class="dome-popup-close-btn" aria-label="Close dialog">✕</button>
        <div>
          <div class="dome-popup-top">
            <div class="dome-popup-avatar">${member.initial}</div>
            <div class="dome-popup-header-text">
              <div class="dome-popup-name">${member.name}</div>
              <div class="dome-popup-role">${member.role}</div>
            </div>
          </div>
          <div class="dome-popup-quote">${member.quote}</div>
          <p class="dome-popup-desc">${member.desc}</p>
        </div>
        <div class="dome-popup-footer">
          <span class="dome-popup-badge">🍪 Ming Morsels Cookie Crew</span>
          <span style="font-size:12px;color:#A07020;font-weight:600;">#MadeWithPassion</span>
        </div>
      </div>
    `;

    viewerEl.appendChild(ov);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = (tileR.width / (parseFloat(openedCardWidth) || frameR.width)) || 1;
    const sy0 = (tileR.height / (frameR.height || 260)) || 1;

    ov.style.transform = `translate(${tx0}px, ${ty0}px) scale(${sx0}, ${sy0})`;

    setTimeout(() => {
      if (!ov.parentElement) return;
      ov.style.opacity = '1';
      ov.style.transform = 'translate(0, 0) scale(1, 1)';
      root.setAttribute('data-enlarging', 'true');
    }, 16);

    // Bind inner close button
    const closeBtn = ov.querySelector('.dome-popup-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeTile();
      });
    }
  };

  // Tile click
  sphereEl.addEventListener('click', e => {
    const tile = e.target.closest('.item__image');
    if (!tile) return;
    if (dragging || moved) return;
    if (performance.now() - lastDragEndAt < 80 || opening) return;
    openTile(tile);
  });

  // ── Scrim / Close Modal ───────────────────────────────────────────────────
  const closeTile = () => {
    if (performance.now() - openStartAt < 200 || !focusedEl) return;
    const el = focusedEl, parent = el.parentElement;
    const ov = viewerEl.querySelector('.enlarge');
    if (!ov) return;

    const refDiv = parent.querySelector('.item__image--reference');
    const op = origTilePos;

    if (!op) {
      ov.remove(); if (refDiv) refDiv.remove();
      parent.style.setProperty('--rot-y-delta', '0deg'); parent.style.setProperty('--rot-x-delta', '0deg');
      el.style.visibility = ''; el.style.zIndex = 0;
      focusedEl = null; root.removeAttribute('data-enlarging'); opening = false; unlockScroll(); return;
    }

    const cur = ov.getBoundingClientRect(), rootR = root.getBoundingClientRect();
    const animOv = document.createElement('div');
    animOv.className = 'enlarge-closing';
    animOv.style.cssText = `
      position: absolute;
      left: ${cur.left - rootR.left}px;
      top: ${cur.top - rootR.top}px;
      width: ${cur.width}px;
      height: ${cur.height}px;
      z-index: 9999;
      border-radius: 24px;
      background: #FFFFFF;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      transition: all ${enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      margin: 0;
      transform: none;
    `;

    ov.remove();
    root.appendChild(animOv);
    void animOv.getBoundingClientRect();

    requestAnimationFrame(() => {
      animOv.style.left    = `${op.left - rootR.left}px`;
      animOv.style.top     = `${op.top - rootR.top}px`;
      animOv.style.width   = `${op.width}px`;
      animOv.style.height  = `${op.height}px`;
      animOv.style.opacity = '0';
    });

    const cleanup = () => {
      animOv.remove(); origTilePos = null; if (refDiv) refDiv.remove();
      parent.style.transition = 'none'; el.style.transition = 'none';
      parent.style.setProperty('--rot-y-delta', '0deg'); parent.style.setProperty('--rot-x-delta', '0deg');
      requestAnimationFrame(() => {
        el.style.visibility = ''; el.style.opacity = '0'; el.style.zIndex = 0;
        focusedEl = null; root.removeAttribute('data-enlarging');
        requestAnimationFrame(() => {
          parent.style.transition = ''; el.style.transition = 'opacity 300ms ease-out';
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            setTimeout(() => {
              el.style.transition = ''; el.style.opacity = ''; opening = false;
              if (!dragging && root.getAttribute('data-enlarging') !== 'true') document.body.classList.remove('dg-scroll-lock');
            }, 300);
          });
        });
      });
    };
    animOv.addEventListener('transitionend', cleanup, { once: true });
  };

  scrimEl.addEventListener('click', closeTile);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeTile(); });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => { ro.disconnect(); stopInertia(); document.body.classList.remove('dg-scroll-lock'); };
}
