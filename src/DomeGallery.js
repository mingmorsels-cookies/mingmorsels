/**
 * DomeGallery.js
 * Immersive 3D Spherical Dome Gallery for Cookie Crew Comments.
 * Renders native DOM card elements with momentum drag physics and
 * smooth click-to-enlarge pop-up modal.
 */

import './DomeGallery.css';

// ── 8 Crew Members & Comments ────────────────────────────────────────────────
const CREW_MEMBERS = [
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
    desc: 'Believes every cookie should tell a story. From first batch to thousandth box, obsessed with getting every bite right.',
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
    role: 'Business Development & Institutional Sales',
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

// Generates spacious spherical grid placements with repeated crew comments
function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -18 + i * 2.5);
  const evenYs = [-2.0, 0, 2.0];
  const oddYs  = [-1.0, 1.0];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x: Number(x.toFixed(2)), y, sizeX: 3.1, sizeY: 2.3 }));
  });

  const totalSlots = coords.length;
  const used = Array.from({ length: totalSlots }, (_, i) => pool[i % pool.length]);

  return coords.map((c, i) => ({
    ...c,
    data: used[i]
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export function initDomeGallery(containerEl, userProps = {}) {
  const props = {
    crew: CREW_MEMBERS,
    fit: 0.52,
    fitBasis: 'auto',
    minRadius: 580,
    maxRadius: Infinity,
    padFactor: 0.2,
    overlayBlurColor: '#0d0c13',
    maxVerticalRotationDeg: 6,
    dragSensitivity: 18,
    enlargeTransitionMs: 320,
    segments: 15,
    dragDampening: 2,
    openedImageWidth: '440px',
    imageBorderRadius: '22px',
    openedImageBorderRadius: '28px',
    ...userProps
  };

  const items = buildItems(props.crew, props.segments);

  containerEl.innerHTML = `
    <div class="sphere-root"
      style="
        --segments-x: ${props.segments};
        --segments-y: ${props.segments};
        --overlay-blur-color: ${props.overlayBlurColor};
        --tile-radius: ${props.imageBorderRadius};
        --enlarge-radius: ${props.openedImageBorderRadius};
      ">
      <main class="sphere-main" title="Drag to spin the dome • Click any card to expand">
        <div class="stage">
          <div class="sphere">
            ${items.map((it, i) => {
              const member = it.data;
              return `
              <div
                class="item"
                data-crew-id="${member.id}"
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
                  aria-label="Read comment by ${member.name}"
                >
                  <div class="crew-dome-card ${member.accent ? 'crew-dome-card--accent' : ''}">
                    <div class="cdc-top">
                      <div class="cdc-avatar">${member.initial}</div>
                      <div class="cdc-meta">
                        <span class="cdc-name">${member.name}</span>
                        <span class="cdc-role">${member.role}</span>
                      </div>
                    </div>
                    <div class="cdc-quote">${member.quote}</div>
                    <p class="cdc-desc">${member.desc}</p>
                    <div class="cdc-footer">
                      <span class="cdc-tag">🍪 Ming Morsels</span>
                      <span class="cdc-expand">Tap to expand ↗</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
            }).join('')}
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
  let hasMoved = false;
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

  // ResizeObserver
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
    hasMoved = false;
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
    if (!hasMoved) {
      const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
      if (dist2 > 20) hasMoved = true;
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

  const onPointerEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(velocity.x) > 0.005 || Math.abs(velocity.y) > 0.005) {
      startInertia(velocity.x, velocity.y);
    }
    if (hasMoved) {
      lastDragEndAt = performance.now();
    }
    hasMoved = false;
  };

  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });

  // Open / Enlarge Pop-up
  const openItemFromElement = el => {
    if (opening) return;
    opening = true;
    openStartedAt = performance.now();
    lockScroll();

    const parent = el.parentElement;
    focusedEl = el;

    const crewId = parent.dataset.crewId;
    const member = props.crew.find(c => c.id === crewId) || props.crew[0];

    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 3.1);
    const sizeY = getDataNumber(parent, 'sizeY', 2.3);
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
    overlay.className = `enlarge ${member.accent ? 'enlarge--accent' : ''}`;
    overlay.style.position = 'absolute';
    overlay.style.left = `${frameR.left - mainR.left}px`;
    overlay.style.top = `${frameR.top - mainR.top}px`;
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
    overlay.style.transition = `transform ${props.enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${props.enlargeTransitionMs}ms ease`;

    overlay.innerHTML = `
      <div class="dome-popup-card">
        <button type="button" class="dome-popup-close-btn" aria-label="Close dialog">✕</button>
        <div class="dome-popup-top">
          <div class="dome-popup-avatar">${member.initial}</div>
          <div class="dome-popup-header-text">
            <div class="dome-popup-name">${member.name}</div>
            <div class="dome-popup-role">${member.role}</div>
          </div>
        </div>
        <div class="dome-popup-quote">${member.quote}</div>
        <p class="dome-popup-desc">${member.desc}</p>
        <div class="dome-popup-footer">
          <span class="dome-popup-badge">🍪 Ming Morsels Cookie Crew</span>
          <span style="font-size:12px;color:#E5B84B;font-weight:700;">#MadeWithPassion</span>
        </div>
      </div>
    `;

    viewerRef.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / (parseFloat(props.openedImageWidth) || frameR.width);
    const sy0 = tileR.height / (frameR.height || 280);

    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      rootRef?.setAttribute('data-enlarging', 'true');
    }, 16);

    const closeBtn = overlay.querySelector('.dome-popup-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        close();
      });
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
    animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius: var(--enlarge-radius, 28px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.55);transition:all ${props.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;background: #1C1A29;`;

    overlay.remove();
    rootRef.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = `${originalPosRelativeToRoot.left}px`;
      animatingOverlay.style.top = `${originalPosRelativeToRoot.top}px`;
      animatingOverlay.style.width = `${originalPosRelativeToRoot.width}px`;
      animatingOverlay.style.height = `${originalPosRelativeToRoot.height}px`;
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

  // Direct click on tile
  sphereRef.querySelectorAll('.item__image').forEach(tile => {
    tile.addEventListener('click', e => {
      e.stopPropagation();
      if (dragging) return;
      if (performance.now() - lastDragEndAt < 100) return;
      if (opening) return;
      openItemFromElement(tile);
    });
  });

  return () => {
    ro.disconnect();
    stopInertia();
    document.body.classList.remove('dg-scroll-lock');
  };
}
