/**
 * DomeGallery.js
 * High-performance 3D Dome Gallery for Cookie Crew Comments.
 * Features crisp vector card rendering, momentum drag inertia,
 * and smooth click-to-expand card view with zero broken tiles.
 */

import './DomeGallery.css';

// ── 8 Crew Members & Comments ────────────────────────────────────────────────
const CREW_MEMBERS = [
  {
    initial: 'L',
    name: 'Lokesh',
    role: 'Research & Development',
    quote: '“The flavour scientist on a secret mission.”',
    desc: 'Constantly experimenting—one day he’ll crack the unbeatable flavour.',
    accent: false
  },
  {
    initial: 'S',
    name: 'Sowmya',
    role: 'Packing Head',
    quote: '“Master of neatness, the queen of clean corners.”',
    desc: 'Every pack looks perfect—you’ll swear precision is her superpower.',
    accent: false
  },
  {
    initial: 'S',
    name: 'Shree Raksha',
    role: 'Finance Head (CA)',
    quote: '“Keeps the numbers clean and the business steady.”',
    desc: 'From compliance to clarity, she ensures MingMorsels grows the right way.',
    accent: false
  },
  {
    initial: 'A',
    name: 'Arun Narayanan K',
    role: 'Founder & Creative Head',
    quote: '“Chief Cookie Dreamer.”',
    desc: 'Believes every cookie should tell a story. From first batch to thousandth box, obsessed with getting every bite right.',
    accent: true
  },
  {
    initial: 'D',
    name: 'Dharshini K',
    role: 'Operations Excellence Lead',
    quote: '“Runs the show so smoothly, even chaos listens to her.”',
    desc: 'If something’s on track, it’s probably because she double-checked it… twice.',
    accent: false
  },
  {
    initial: 'B',
    name: 'Bishu Mehra',
    role: 'Sales & Operations Supervisor',
    quote: '“Sells cookies like they’re happiness in a box.”',
    desc: 'Can talk to anyone, anywhere—might even convince a cookie to sell itself.',
    accent: false
  },
  {
    initial: 'N',
    name: 'Nafees Khan',
    role: 'Business Development & Institutional Sales',
    quote: '“Turns handshakes into long-term partnerships.”',
    desc: 'Calm, strategic, and the reason MingMorsels enters premium spaces.',
    accent: false
  },
  {
    initial: 'D',
    name: 'Daniel',
    role: 'Chef · Production',
    quote: '“Kitchen wizard with a whisk and wild ideas.”',
    desc: 'If your cookie tastes amazing… he’s definitely the reason.',
    accent: true
  }
];

// Generates base64-encoded SVG card image data URLs (100% cross-browser compatible)
function createCommentCardSVG(member) {
  const isAccent = member.accent;
  const bgFill = isAccent ? '#FFFDF4' : '#FFFFFF';
  const strokeColor = isAccent ? '#D9A31E' : '#E2D6C5';

  // Format description lines cleanly
  const words = member.desc.split(' ');
  let line1 = '', line2 = '', line3 = '';
  words.forEach(w => {
    if ((line1 + ' ' + w).length < 38) {
      line1 = (line1 + ' ' + w).trim();
    } else if ((line2 + ' ' + w).length < 38) {
      line2 = (line2 + ' ' + w).trim();
    } else {
      line3 = (line3 + ' ' + w).trim();
    }
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 380" width="540" height="380">
  <defs>
    <linearGradient id="avatarGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FCEFD8"/>
      <stop offset="100%" stop-color="#F7DEB8"/>
    </linearGradient>
  </defs>
  <!-- Card Base -->
  <rect width="534" height="374" x="3" y="3" rx="28" fill="${bgFill}" stroke="${strokeColor}" stroke-width="3" />
  
  <!-- Header: Avatar Circle -->
  <circle cx="62" cy="64" r="32" fill="url(#avatarGrad)" stroke="#C6960C" stroke-width="2.5" />
  <text x="62" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#7C4A1E" text-anchor="middle">${member.initial}</text>
  
  <!-- Header: Name & Role -->
  <text x="110" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="23" font-weight="800" fill="#3D2000">${member.name}</text>
  <text x="110" y="82" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#A07020">${member.role}</text>
  
  <!-- Divider -->
  <line x1="32" y1="112" x2="508" y2="112" stroke="#EFE7DC" stroke-width="2"/>
  
  <!-- Quote Highlight Banner -->
  <rect x="32" y="130" width="476" height="74" rx="14" fill="rgba(198,150,12,0.09)" />
  <rect x="32" y="130" width="6" height="74" rx="3" fill="#C6960C" />
  <text x="50" y="174" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" fill="#3D2000">${member.quote}</text>
  
  <!-- Description Text -->
  <text x="36" y="238" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#5A4030">${line1}</text>
  ${line2 ? `<text x="36" y="266" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#5A4030">${line2}</text>` : ''}
  ${line3 ? `<text x="36" y="294" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#5A4030">${line3}</text>` : ''}
  
  <!-- Footer -->
  <line x1="32" y1="316" x2="508" y2="316" stroke="#EFE7DC" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="36" y="352" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#7C4A1E">🍪 MING MORSELS COOKIE CREW</text>
  <text x="504" y="352" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="700" fill="#C6960C" text-anchor="end">🔍 Tap to expand</text>
</svg>
`.trim();

  // UTF-8 to Base64 data URL
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const CREW_IMAGES = CREW_MEMBERS.map(m => ({
  src: createCommentCardSVG(m),
  alt: `${m.name} - ${m.quote}`
}));

// ── Math & Rotation Helpers ──────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

// Generates larger, less congested card placements across the dome
function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -19 + i * 2.4);
  const evenYs = [-2.2, 0, 2.2];
  const oddYs  = [-1.1, 1.1];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x: Number(x.toFixed(2)), y, sizeX: 2.8, sizeY: 2.1 }));
  });

  const totalSlots = coords.length;
  // Repeat existing 8 crew comments seamlessly across all slots
  const usedImages = Array.from({ length: totalSlots }, (_, i) => pool[i % pool.length]);

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

// ── Public Initializer Function ──────────────────────────────────────────────
export function initDomeGallery(containerEl, userProps = {}) {
  const props = {
    images: CREW_IMAGES,
    fit: 0.52,
    fitBasis: 'auto',
    minRadius: 580,
    maxRadius: Infinity,
    padFactor: 0.2,
    overlayBlurColor: '#FAF6F0',
    maxVerticalRotationDeg: 6,
    dragSensitivity: 18,
    enlargeTransitionMs: 320,
    segments: 16, // Clean, spacious, larger tiles
    dragDampening: 2,
    openedImageWidth: '480px',
    openedImageHeight: '340px',
    imageBorderRadius: '20px',
    openedImageBorderRadius: '28px',
    grayscale: false,
    ...userProps
  };

  const items = buildItems(props.images, props.segments);

  containerEl.innerHTML = `
    <div class="sphere-root"
      style="
        --segments-x: ${props.segments};
        --segments-y: ${props.segments};
        --overlay-blur-color: ${props.overlayBlurColor};
        --tile-radius: ${props.imageBorderRadius};
        --enlarge-radius: ${props.openedImageBorderRadius};
        --image-filter: ${props.grayscale ? 'grayscale(1)' : 'none'};
      ">
      <main class="sphere-main" title="Drag to spin the dome • Click any card to expand">
        <div class="stage">
          <div class="sphere">
            ${items.map((it, i) => `
              <div
                class="item"
                data-src="${it.src}"
                data-offset-x="${it.x}"
                data-offset-y="${it.y}"
                data-size-x="${it.sizeX}"
                data-size-y="${it.sizeY}"
                style="
                  --offset-x: ${it.x};
                  --offset-y: ${it.y};
                  --item-size-x: ${it.sizeX};
                  --item-size-y: ${it.sizeY};
                "
              >
                <div
                  class="item__image"
                  role="button"
                  tabindex="0"
                  aria-label="${it.alt || 'Open comment'}"
                >
                  <img src="${it.src}" draggable="false" alt="${it.alt}" />
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="overlay"></div>
        <div class="overlay overlay--blur"></div>
        <div class="edge-fade edge-fade--top"></div>
        <div class="edge-fade edge-fade--bottom"></div>

        <div class="viewer">
          <div class="scrim"></div>
          <div class="frame"></div>
        </div>
      </main>
    </div>
  `;

  const rootRef = containerEl.querySelector('.sphere-root');
  const mainRef = containerEl.querySelector('.sphere-main');
  const sphereRef = containerEl.querySelector('.sphere');
  const frameRef = containerEl.querySelector('.frame');
  const viewerRef = containerEl.querySelector('.viewer');
  const scrimRef = containerEl.querySelector('.scrim');

  let focusedEl = null;
  let originalTilePosition = null;
  const rotation = { x: 0, y: 0 };
  const startRot = { x: 0, y: 0 };
  let startPos = null;
  let dragging = false;
  let hasMovedFar = false;
  let inertiaRAF = null;
  let opening = false;
  let openStartedAt = 0;
  let lastDragEndAt = 0;
  let scrollLocked = false;

  let lastMovePos = { x: 0, y: 0 };
  let lastMoveTime = 0;
  let velocity = { x: 0, y: 0 };

  const lockScroll = () => {
    if (scrollLocked) return;
    scrollLocked = true;
    document.body.classList.add('dg-scroll-lock');
  };

  const unlockScroll = () => {
    if (!scrollLocked) return;
    if (rootRef?.getAttribute('data-enlarging') === 'true') return;
    scrollLocked = false;
    document.body.classList.remove('dg-scroll-lock');
  };

  const applyTransform = (xDeg, yDeg) => {
    if (sphereRef) {
      sphereRef.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  };

  applyTransform(rotation.x, rotation.y);

  // ResizeObserver for responsive radius
  const ro = new ResizeObserver(entries => {
    const cr = entries[0].contentRect;
    const w = Math.max(1, cr.width),
      h = Math.max(1, cr.height);
    const minDim = Math.min(w, h),
      maxDim = Math.max(w, h),
      aspect = w / h;
    let basis;
    switch (props.fitBasis) {
      case 'min':
        basis = minDim;
        break;
      case 'max':
        basis = maxDim;
        break;
      case 'width':
        basis = w;
        break;
      case 'height':
        basis = h;
        break;
      default:
        basis = aspect >= 1.3 ? w : minDim;
    }
    let radius = basis * props.fit;
    const heightGuard = h * 1.35;
    radius = Math.min(radius, heightGuard);
    radius = clamp(radius, props.minRadius, props.maxRadius);
    const lockedRadius = Math.round(radius);

    const viewerPad = Math.max(8, Math.round(minDim * props.padFactor));
    rootRef.style.setProperty('--radius', `${lockedRadius}px`);
    rootRef.style.setProperty('--viewer-pad', `${viewerPad}px`);
    applyTransform(rotation.x, rotation.y);
  });
  ro.observe(rootRef);

  // Inertia
  const stopInertia = () => {
    if (inertiaRAF) {
      cancelAnimationFrame(inertiaRAF);
      inertiaRAF = null;
    }
  };

  const startInertia = (vx, vy) => {
    const MAX_V = 1.4;
    let vX = clamp(vx, -MAX_V, MAX_V) * 80;
    let vY = clamp(vy, -MAX_V, MAX_V) * 80;
    let frames = 0;
    const d = clamp(props.dragDampening ?? 0.6, 0, 1);
    const frictionMul = 0.94 + 0.055 * d;
    const stopThreshold = 0.015 - 0.01 * d;
    const maxFrames = Math.round(90 + 270 * d);

    const step = () => {
      vX *= frictionMul;
      vY *= frictionMul;
      if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
        inertiaRAF = null;
        return;
      }
      if (++frames > maxFrames) {
        inertiaRAF = null;
        return;
      }
      const nextX = clamp(rotation.x - vY / 200, -props.maxVerticalRotationDeg, props.maxVerticalRotationDeg);
      const nextY = wrapAngleSigned(rotation.y + vX / 200);
      rotation.x = nextX;
      rotation.y = nextY;
      applyTransform(nextX, nextY);
      inertiaRAF = requestAnimationFrame(step);
    };
    stopInertia();
    inertiaRAF = requestAnimationFrame(step);
  };

  // Pointer drag gestures
  mainRef.addEventListener('pointerdown', e => {
    if (focusedEl) return;
    stopInertia();
    dragging = true;
    hasMovedFar = false;
    startRot.x = rotation.x;
    startRot.y = rotation.y;
    startPos = { x: e.clientX, y: e.clientY };
    lastMovePos = { ...startPos };
    lastMoveTime = performance.now();
    velocity = { x: 0, y: 0 };
  }, { passive: true });

  window.addEventListener('pointermove', e => {
    if (focusedEl || !dragging || !startPos) return;
    const dxTotal = e.clientX - startPos.x;
    const dyTotal = e.clientY - startPos.y;
    if (!hasMovedFar) {
      const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
      if (dist2 > 25) hasMovedFar = true;
    }
    const nextX = clamp(
      startRot.x - dyTotal / props.dragSensitivity,
      -props.maxVerticalRotationDeg,
      props.maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(startRot.y + dxTotal / props.dragSensitivity);
    if (rotation.x !== nextX || rotation.y !== nextY) {
      rotation.x = nextX;
      rotation.y = nextY;
      applyTransform(nextX, nextY);
    }

    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
      velocity.x = (e.clientX - lastMovePos.x) / dt;
      velocity.y = (e.clientY - lastMovePos.y) / dt;
    }
    lastMovePos = { x: e.clientX, y: e.clientY };
    lastMoveTime = now;
  }, { passive: true });

  const onPointerEnd = e => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(velocity.x) > 0.005 || Math.abs(velocity.y) > 0.005) {
      startInertia(velocity.x, velocity.y);
    }
    if (hasMovedFar) {
      lastDragEndAt = performance.now();
    }
  };

  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });

  // Open / Expand Item
  const openItemFromElement = el => {
    if (opening) return;
    opening = true;
    openStartedAt = performance.now();
    lockScroll();

    const parent = el.parentElement;
    focusedEl = el;
    el.setAttribute('data-focused', 'true');
    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2.8);
    const sizeY = getDataNumber(parent, 'sizeY', 2.1);
    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, props.segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(rotation.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - rotation.x;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.opacity = '0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = mainRef?.getBoundingClientRect();
    const frameR = frameRef?.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
      opening = false;
      focusedEl = null;
      parent.removeChild(refDiv);
      unlockScroll();
      return;
    }

    originalTilePosition = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden';
    el.style.zIndex = 0;

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.position = 'absolute';
    overlay.style.left = frameR.left - mainR.left + 'px';
    overlay.style.top = frameR.top - mainR.top + 'px';
    overlay.style.width = frameR.width + 'px';
    overlay.style.height = frameR.height + 'px';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
    overlay.style.transition = `transform ${props.enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${props.enlargeTransitionMs}ms ease`;

    const rawSrc = parent.dataset.src || el.querySelector('img')?.src || '';
    const img = document.createElement('img');
    img.src = rawSrc;
    overlay.appendChild(img);
    viewerRef.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;

    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      rootRef?.setAttribute('data-enlarging', 'true');
    }, 16);

    const wantsResize = props.openedImageWidth || props.openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = ev => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);
        const prevTransition = overlay.style.transition;
        overlay.style.transition = 'none';
        const tempWidth = props.openedImageWidth || `${frameR.width}px`;
        const tempHeight = props.openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        void overlay.offsetWidth;
        overlay.style.transition = `left ${props.enlargeTransitionMs}ms ease, top ${props.enlargeTransitionMs}ms ease, width ${props.enlargeTransitionMs}ms ease, height ${props.enlargeTransitionMs}ms ease`;
        const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });
        const cleanupSecond = () => {
          overlay.removeEventListener('transitionend', cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener('transitionend', cleanupSecond, { once: true });
      };
      overlay.addEventListener('transitionend', onFirstEnd);
    }
  };

  // Close Dialog
  const close = () => {
    if (performance.now() - openStartedAt < 200) return;
    const el = focusedEl;
    if (!el) return;
    const parent = el.parentElement;
    const overlay = viewerRef?.querySelector('.enlarge');
    if (!overlay) return;
    const refDiv = parent.querySelector('.item__image--reference');
    const originalPos = originalTilePosition;
    if (!originalPos) {
      overlay.remove();
      if (refDiv) refDiv.remove();
      parent.style.setProperty('--rot-y-delta', '0deg');
      parent.style.setProperty('--rot-x-delta', '0deg');
      el.style.visibility = '';
      el.style.zIndex = 0;
      focusedEl = null;
      rootRef?.removeAttribute('data-enlarging');
      opening = false;
      unlockScroll();
      return;
    }
    const currentRect = overlay.getBoundingClientRect();
    const rootRect = rootRef.getBoundingClientRect();
    const originalPosRelativeToRoot = {
      left: originalPos.left - rootRect.left,
      top: originalPos.top - rootRect.top,
      width: originalPos.width,
      height: originalPos.height
    };
    const overlayRelativeToRoot = {
      left: currentRect.left - rootRect.left,
      top: currentRect.top - rootRect.top,
      width: currentRect.width,
      height: currentRect.height
    };
    const animatingOverlay = document.createElement('div');
    animatingOverlay.className = 'enlarge-closing';
    animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius: var(--enlarge-radius, 28px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${props.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
    const originalImg = overlay.querySelector('img');
    if (originalImg) {
      const img = originalImg.cloneNode();
      img.style.cssText = 'width:100%;height:100%;object-fit:fill;';
      animatingOverlay.appendChild(img);
    }
    overlay.remove();
    rootRef.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
      animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
      animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
      animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
      animatingOverlay.style.opacity = '0';
    });
    const cleanup = () => {
      animatingOverlay.remove();
      originalTilePosition = null;
      if (refDiv) refDiv.remove();
      parent.style.transition = 'none';
      el.style.transition = 'none';
      parent.style.setProperty('--rot-y-delta', '0deg');
      parent.style.setProperty('--rot-x-delta', '0deg');
      requestAnimationFrame(() => {
        el.style.visibility = '';
        el.style.opacity = '0';
        el.style.zIndex = 0;
        focusedEl = null;
        rootRef?.removeAttribute('data-enlarging');
        requestAnimationFrame(() => {
          parent.style.transition = '';
          el.style.transition = 'opacity 300ms ease-out';
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            setTimeout(() => {
              el.style.transition = '';
              el.style.opacity = '';
              opening = false;
              if (!dragging && rootRef?.getAttribute('data-enlarging') !== 'true')
                document.body.classList.remove('dg-scroll-lock');
            }, 300);
          });
        });
      });
    };
    animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
  };

  scrimRef.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  // Direct Click on tile with drag tolerance
  sphereRef.querySelectorAll('.item__image').forEach(tile => {
    tile.addEventListener('click', e => {
      e.stopPropagation();
      if (hasMovedFar || opening) return;
      if (performance.now() - lastDragEndAt < 100) return;
      openItemFromElement(tile);
    });
  });

  return () => {
    ro.disconnect();
    stopInertia();
    document.body.classList.remove('dg-scroll-lock');
  };
}
