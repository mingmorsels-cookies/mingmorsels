/**
 * DriftWall.js
 * React Bits DriftWall Component — vanilla JS implementation.
 * Displays a drifting 3D wall of tiles with parallax pointer-follow,
 * alternating column velocities, hover lift, and smooth inertia.
 */

import './DriftWall.css';

// ── Cookie product imagery from the site ───────────────────────────────────
const DEFAULT_ITEMS = [
  { image: '/img-almond.png',        title: 'Almond Classic' },
  { image: '/img-chocochip.jpg',     title: 'Choco Chip Delight' },
  { image: '/img-blackcurrant.jpg',  title: 'Blackcurrant Burst' },
  { image: '/img-butterscotch.jpg',  title: 'Butterscotch Dream' },
  { image: '/img-strawberry.jpg',    title: 'Strawberry Bliss' },
  { image: '/img-pinacolada.jpg',    title: 'Pina Colada Twist' },
  { image: '/img-walnut.png',        title: 'Walnut Crunch' },
  { image: '/img-oats.png',          title: 'Oats & Nuts' },
  { image: '/img-rose.png',          title: 'Rose Petal' },
  { image: '/img-orange.png',        title: 'Zesty Orange' },
  { image: '/unboxing_lush.jpg',     title: 'Premium Unboxing' },
  { image: '/unboxing_gable.jpg',    title: 'Gable Gift Box' },
  { image: '/gift-box-lush.jpg',     title: 'Lush Gift Box' },
  { image: '/box-chocochip-1.jpg',   title: 'Choco Box' },
  { image: '/box-classic.jpg',       title: 'Classic Box' },
  { image: '/box-butterscotch-1.jpg','title': 'Butterscotch Box' },
  { image: '/box-strawberry-1.jpg',  title: 'Strawberry Box' },
  { image: '/box-pinacolada-1.jpg',  title: 'Pina Colada Box' },
  { image: '/unboxing_rose.jpg',     title: 'Rose Unboxing' },
  { image: '/unboxing_oats.png',     title: 'Oats Unboxing' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const columnFactor = (index, variance) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

export function initDriftWall(containerEl, userProps = {}) {
  if (!containerEl) return () => {};

  const props = {
    items: DEFAULT_ITEMS,
    columns: 5,
    tileWidth: 220,
    tileHeight: 148,
    gap: 16,
    radius: 18,
    tilt: 14,
    turn: -12,
    roll: 0,
    perspective: 1200,
    depth: 100,
    speed: 38,
    direction: 'up',
    variance: 0.45,
    parallax: 0.6,
    pauseOnHover: false,
    lift: 72,
    fade: 0.58,
    dim: 0.52,
    grayscale: false,
    overlayColor: '#0d0c13',
    ...userProps
  };

  const reduced = prefersReducedMotion();

  // Build CSS vars string
  const cssVars = [
    `--dw-tile-w: ${props.tileWidth}px`,
    `--dw-tile-h: ${props.tileHeight}px`,
    `--dw-gap: ${props.gap}px`,
    `--dw-radius: ${props.radius}px`,
    `--dw-perspective: ${props.perspective}px`,
    `--dw-lift: ${props.lift}px`,
    `--dw-dim: ${props.dim}`,
    `--dw-gray: ${props.grayscale ? 1 : 0}`,
    `--dw-overlay: ${props.overlayColor}`,
    `--dw-edge: ${Math.max(0, (1 - props.fade) * 100)}%`,
  ].join('; ');

  // Distribute items across columns
  const columnItems = Array.from({ length: props.columns }, () => []);
  props.items.forEach((item, i) => columnItems[i % props.columns].push(item));
  columnItems.forEach((col, i) => {
    if (!col.length) columnItems[i] = props.items.slice(0, 1);
  });

  // Build DOM
  containerEl.innerHTML = `
    <div class="drift-wall ${reduced ? 'drift-wall--reduced' : ''}" style="${cssVars}" role="group" aria-label="Drifting wall of cookie tiles">
      <div class="drift-wall__plane">
        ${columnItems.map((col, c) => `
          <div class="drift-wall__col" data-col-index="${c}">
            <div class="drift-wall__track" data-track="${c}">
              ${/* 3 copies for seamless looping */ Array.from({ length: 3 }).map((_, copyIdx) =>
                col.map((item, itemIdx) => `
                  <div
                    class="drift-wall__tile"
                    data-tile-id="${c}-${copyIdx}-${itemIdx}"
                    data-col="${c}"
                    tabindex="0"
                    role="button"
                    aria-label="${item.title || 'Cookie tile'}"
                  >
                    <span class="drift-wall__inner">
                      <img src="${item.image}" alt="${item.title || ''}" loading="lazy" decoding="async" draggable="false" />
                      <span class="drift-wall__overlay" aria-hidden="true"></span>
                    </span>
                  </div>
                `).join('')
              ).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const wallEl = containerEl.querySelector('.drift-wall');
  const planeEl = containerEl.querySelector('.drift-wall__plane');
  const trackEls = Array.from(containerEl.querySelectorAll('.drift-wall__track'));
  const allTiles = Array.from(containerEl.querySelectorAll('.drift-wall__tile'));

  let containerHeight = containerEl.offsetHeight || 600;

  // Compute per-column metrics
  const getColumnMeta = () => {
    return columnItems.map(col => {
      const unit = props.tileHeight + props.gap;
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.max(3, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
      return { copyHeight, copies };
    });
  };

  let columnMeta = getColumnMeta();

  // ResizeObserver
  const ro = new ResizeObserver(entries => {
    containerHeight = entries[0].contentRect.height || 600;
    columnMeta = getColumnMeta();
  });
  ro.observe(containerEl);

  // Offsets & velocities
  const offsets = columnItems.map((_, c) => {
    const meta = columnMeta[c];
    return meta ? meta.copyHeight * ((c * 0.37) % 1) : 0;
  });
  const velocities = columnItems.map(() => 0);

  // Base velocities — alternate up/down per column
  const dirSign = props.direction === 'up' ? 1 : -1;
  const baseVelocities = columnItems.map((_, c) => {
    const altSign = c % 2 === 0 ? 1 : -1;
    return props.speed * columnFactor(c, props.variance) * dirSign * altSign;
  });

  // Parallax / pointer tracking
  const pointer = { x: 0, y: 0 };
  const pointerDamped = { x: 0, y: 0 };

  const applyPlaneTransform = (px, py) => {
    planeEl.style.transform =
      `translate(-50%, -50%) scale(1.18) ` +
      `rotateX(${props.tilt + py}deg) rotateY(${props.turn + px}deg) rotateZ(${props.roll}deg) ` +
      `translateZ(${-props.depth}px)`;
  };

  applyPlaneTransform(0, 0);

  // Active tile state
  let activeId = null;
  let hoveredCol = -1;
  let wallHovered = false;

  const setActive = (id, col) => {
    if (id === activeId) return;
    activeId = id;
    hoveredCol = col;
    allTiles.forEach(tile => {
      if (tile.dataset.tileId === id) {
        tile.classList.add('is-active');
      } else {
        tile.classList.remove('is-active');
      }
    });
  };

  const clearActive = () => {
    activeId = null;
    hoveredCol = -1;
    allTiles.forEach(tile => tile.classList.remove('is-active'));
  };

  // Pointer events
  wallEl.addEventListener('pointerenter', () => { wallHovered = true; });
  wallEl.addEventListener('pointerleave', () => {
    wallHovered = false;
    pointer.x = 0;
    pointer.y = 0;
    clearActive();
  });

  wallEl.addEventListener('pointermove', e => {
    const rect = containerEl.getBoundingClientRect();
    if (props.parallax > 0 && !reduced) {
      pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
    }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const tile = hit?.closest?.('[data-tile-id]');
    if (!tile) return;
    setActive(tile.dataset.tileId, Number(tile.dataset.col));
  });

  // Focus events for accessibility
  allTiles.forEach(tile => {
    tile.addEventListener('focus', () => setActive(tile.dataset.tileId, Number(tile.dataset.col)));
    tile.addEventListener('blur', clearActive);
  });

  // rAF animation loop
  let lastTs = null;
  let rafId = null;

  const animate = ts => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000);
    lastTs = ts;

    // Parallax tilt
    const maxTilt = props.parallax * 8;
    const targetX = pointer.x * maxTilt;
    const targetY = -pointer.y * maxTilt;
    const damp = 1 - Math.exp(-dt / 0.12);
    pointerDamped.x += (targetX - pointerDamped.x) * damp;
    pointerDamped.y += (targetY - pointerDamped.y) * damp;
    applyPlaneTransform(pointerDamped.x, pointerDamped.y);

    if (!reduced) {
      for (let c = 0; c < trackEls.length; c++) {
        const meta = columnMeta[c];
        if (!meta) continue;
        const paused = wallHovered && props.pauseOnHover;
        const factor = (paused || hoveredCol === c) ? 0 : 1;
        const target = baseVelocities[c] * factor;
        const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
        velocities[c] += (target - velocities[c]) * ease;
        let next = (offsets[c] ?? 0) + velocities[c] * dt;
        next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
        offsets[c] = next;
        const el = trackEls[c];
        if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
      }
    }

    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = null;
    ro.disconnect();
  };
}
