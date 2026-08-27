/**
 * DomeGallery.js
 * Vanilla JS + CSS port of the DomeGallery React component.
 * Renders a draggable 3D sphere of image tiles with click-to-enlarge.
 */

import './DomeGallery.css';

// ── Images shown in the sphere ────────────────────────────────────────────────
const DOME_IMAGES = [
  { src: '/almond/1.jpg',              alt: 'Almond Rich Cookie'    },
  { src: '/rose-petal/1.jpg',          alt: 'Rose Petal Cookie'     },
  { src: '/oats-nuts/1.jpg',           alt: 'Oats & Nuts Cookie'    },
  { src: '/orange-peel/1.jpg',         alt: 'Orange Peel Cookie'    },
  { src: '/img-strawberry.jpg',        alt: 'Strawberry Muffin'     },
  { src: '/img-pinacolada.jpg',        alt: 'Pinacolada Muffin'     },
  { src: '/img-butterscotch.jpg',      alt: 'Butterscotch Muffin'   },
  { src: '/img-chocochip.jpg',         alt: 'Chocochip Muffin'      },
  { src: '/img-blackcurrant.jpg',      alt: 'Blackcurrant Muffin'   },
  { src: '/sugarfree_walnut_cookie.png', alt: 'Walnut Cookie'       },
];

// ── Pure helpers (unchanged from React source) ────────────────────────────────
const clamp        = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => { const a = (((deg + 180) % 360) + 360) % 360; return a - 180; };
const getDataNumber = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool, seg) {
  const xCols   = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs  = [-4, -2, 0, 2, 4];
  const oddYs   = [-3, -1, 1, 3, 5];
  const coords  = xCols.flatMap((x, c) => (c % 2 === 0 ? evenYs : oddYs).map(y => ({ x, y, sizeX: 2, sizeY: 2 })));
  const totalSlots = coords.length;
  if (!pool.length) return coords.map(c => ({ ...c, src: '', alt: '' }));
  const norm = pool.map(img => typeof img === 'string' ? { src: img, alt: '' } : { src: img.src || '', alt: img.alt || '' });
  const used = Array.from({ length: totalSlots }, (_, i) => norm[i % norm.length]);
  // de-dupe adjacent
  for (let i = 1; i < used.length; i++) {
    if (used[i].src === used[i - 1].src) {
      for (let j = i + 1; j < used.length; j++) {
        if (used[j].src !== used[i].src) { const tmp = used[i]; used[i] = used[j]; used[j] = tmp; break; }
      }
    }
  }
  return coords.map((c, i) => ({ ...c, src: used[i].src, alt: used[i].alt }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  return {
    rotateY: unit * (offsetX + (sizeX - 1) / 2),
    rotateX: unit * (offsetY - (sizeY - 1) / 2),
  };
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initDomeGallery(containerEl, opts = {}) {
  const {
    images              = DOME_IMAGES,
    fit                 = 0.5,
    fitBasis            = 'auto',
    minRadius           = 600,
    maxRadius           = Infinity,
    padFactor           = 0.25,
    overlayBlurColor    = '#FAF6F0',
    maxVerticalRotation = 5,
    dragSensitivity     = 20,
    enlargeTransitionMs = 300,
    segments            = 35,
    dragDampening       = 2,
    openedImageWidth    = '250px',
    openedImageHeight   = '350px',
    imageBorderRadius   = '12px',
    openedImageBRadius  = '20px',
    grayscale           = false,
  } = opts;

  // ── Build DOM ─────────────────────────────────────────────────────────────
  containerEl.innerHTML = `
    <div class="sphere-root"
      style="
        --segments-x:${segments};
        --segments-y:${segments};
        --overlay-blur-color:${overlayBlurColor};
        --tile-radius:${imageBorderRadius};
        --enlarge-radius:${openedImageBRadius};
        --image-filter:${grayscale ? 'grayscale(1)' : 'none'};
      ">
      <main class="sphere-main">
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

  // ── State (mirrors React refs) ────────────────────────────────────────────
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
  // velocity tracking
  let lastPTime = 0;
  let lastPPos  = { x: 0, y: 0 };
  let vel       = { x: 0, y: 0 };

  // ── Scroll lock ───────────────────────────────────────────────────────────
  const lockScroll   = () => { if (scrollLocked) return; scrollLocked = true;  document.body.classList.add('dg-scroll-lock'); };
  const unlockScroll = () => {
    if (!scrollLocked || root.getAttribute('data-enlarging') === 'true') return;
    scrollLocked = false; document.body.classList.remove('dg-scroll-lock');
  };

  // ── Transform ─────────────────────────────────────────────────────────────
  const applyTransform = (x, y) => {
    sphereEl.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${x}deg) rotateY(${y}deg)`;
  };
  applyTransform(0, 0);

  // ── Build tiles ───────────────────────────────────────────────────────────
  buildItems(images, segments).forEach(it => {
    const item = document.createElement('div');
    item.className = 'item';
    Object.assign(item.dataset, { src: it.src, offsetX: it.x, offsetY: it.y, sizeX: it.sizeX, sizeY: it.sizeY });
    item.style.cssText = `--offset-x:${it.x};--offset-y:${it.y};--item-size-x:${it.sizeX};--item-size-y:${it.sizeY};`;
    const imgWrap = document.createElement('div');
    imgWrap.className = 'item__image';
    imgWrap.setAttribute('role', 'button');
    imgWrap.setAttribute('tabindex', '0');
    imgWrap.setAttribute('aria-label', it.alt || 'Open image');
    const img = document.createElement('img');
    img.src = it.src; img.draggable = false; img.alt = it.alt;
    imgWrap.appendChild(img);
    item.appendChild(imgWrap);
    sphereEl.appendChild(item);
  });

  // ── ResizeObserver ────────────────────────────────────────────────────────
  const ro = new ResizeObserver(([{ contentRect: cr }]) => {
    const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
    const minDim = Math.min(w, h), maxDim = Math.max(w, h), aspect = w / h;
    const basis = fitBasis === 'min' ? minDim : fitBasis === 'max' ? maxDim :
                  fitBasis === 'width' ? w : fitBasis === 'height' ? h :
                  (aspect >= 1.3 ? w : minDim);
    const radius = clamp(Math.min(basis * fit, h * 1.35), minRadius, maxRadius);
    const pad    = Math.max(8, Math.round(minDim * padFactor));
    root.style.setProperty('--radius',      `${Math.round(radius)}px`);
    root.style.setProperty('--viewer-pad',  `${pad}px`);
    applyTransform(rot.x, rot.y);
  });
  ro.observe(root);

  // ── Inertia ───────────────────────────────────────────────────────────────
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

  // ── Pointer drag ──────────────────────────────────────────────────────────
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

  // ── Open / enlarge ────────────────────────────────────────────────────────
  const openTile = el => {
    if (opening) return;
    opening = true; openStartAt = performance.now(); lockScroll();
    const parent = el.parentElement;
    focusedEl = el;
    const offX  = getDataNumber(parent, 'offsetX', 0), offY = getDataNumber(parent, 'offsetY', 0);
    const szX   = getDataNumber(parent, 'sizeX', 2),   szY  = getDataNumber(parent, 'sizeY', 2);
    const pr    = computeItemBaseRotation(offX, offY, szX, szY, segments);
    let rotY    = -(normalizeAngle(pr.rotateY) + normalizeAngle(rot.y)) % 360;
    if (rotY < -180) rotY += 360;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${-pr.rotateX - rot.x}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.cssText = `opacity:0;transform:rotateX(${-pr.rotateX}deg) rotateY(${-pr.rotateY}deg);`;
    parent.appendChild(refDiv);
    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = mainEl.getBoundingClientRect();
    const frameR = frameEl.getBoundingClientRect();
    if (!mainR || !frameR || tileR.width <= 0) {
      opening = false; focusedEl = null; parent.removeChild(refDiv); unlockScroll(); return;
    }
    origTilePos = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden'; el.style.zIndex = 0;

    const ov = document.createElement('div');
    ov.className = 'enlarge';
    ov.style.cssText = `position:absolute;left:${frameR.left - mainR.left}px;top:${frameR.top - mainR.top}px;width:${frameR.width}px;height:${frameR.height}px;opacity:0;z-index:30;will-change:transform,opacity;transform-origin:top left;transition:transform ${enlargeTransitionMs}ms ease,opacity ${enlargeTransitionMs}ms ease;`;
    const ovImg = document.createElement('img');
    ovImg.src = parent.dataset.src || el.querySelector('img')?.src || '';
    ov.appendChild(ovImg);
    viewerEl.appendChild(ov);

    const tx0 = tileR.left - frameR.left, ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width || 1, sy0 = tileR.height / frameR.height || 1;
    ov.style.transform = `translate(${tx0}px,${ty0}px) scale(${sx0},${sy0})`;
    setTimeout(() => {
      if (!ov.parentElement) return;
      ov.style.opacity = '1'; ov.style.transform = 'translate(0,0) scale(1,1)';
      root.setAttribute('data-enlarging', 'true');
    }, 16);

    if (openedImageWidth || openedImageHeight) {
      const onEnd = ev => {
        if (ev.propertyName !== 'transform') return;
        ov.removeEventListener('transitionend', onEnd);
        const prevT = ov.style.transition;
        ov.style.transition = 'none';
        const tw = openedImageWidth  || `${frameR.width}px`;
        const th = openedImageHeight || `${frameR.height}px`;
        ov.style.width = tw; ov.style.height = th;
        const nr = ov.getBoundingClientRect();
        ov.style.width = `${frameR.width}px`; ov.style.height = `${frameR.height}px`;
        void ov.offsetWidth;
        ov.style.transition = `left ${enlargeTransitionMs}ms ease,top ${enlargeTransitionMs}ms ease,width ${enlargeTransitionMs}ms ease,height ${enlargeTransitionMs}ms ease`;
        const cl = frameR.left - mainR.left + (frameR.width - nr.width) / 2;
        const ct = frameR.top  - mainR.top  + (frameR.height - nr.height) / 2;
        requestAnimationFrame(() => { ov.style.left = `${cl}px`; ov.style.top = `${ct}px`; ov.style.width = tw; ov.style.height = th; });
        ov.addEventListener('transitionend', () => { ov.style.transition = prevT; }, { once: true });
      };
      ov.addEventListener('transitionend', onEnd);
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

  // ── Scrim close ───────────────────────────────────────────────────────────
  const closeTile = () => {
    if (performance.now() - openStartAt < 250 || !focusedEl) return;
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
    animOv.style.cssText = `position:absolute;left:${cur.left - rootR.left}px;top:${cur.top - rootR.top}px;width:${cur.width}px;height:${cur.height}px;z-index:9999;border-radius:var(--enlarge-radius,32px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
    const origImg = ov.querySelector('img');
    if (origImg) { const ci = origImg.cloneNode(); ci.style.cssText = 'width:100%;height:100%;object-fit:cover;'; animOv.appendChild(ci); }
    ov.remove(); root.appendChild(animOv);
    void animOv.getBoundingClientRect();
    requestAnimationFrame(() => {
      animOv.style.left = `${op.left - rootR.left}px`; animOv.style.top = `${op.top - rootR.top}px`;
      animOv.style.width = `${op.width}px`; animOv.style.height = `${op.height}px`; animOv.style.opacity = '0';
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
