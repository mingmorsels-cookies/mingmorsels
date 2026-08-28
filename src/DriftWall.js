/**
 * DriftWall.js
 * React Bits DriftWall Component — vanilla JS implementation.
 * Displays Cookie Crew comment cards as drifting 3D tiles with
 * parallax pointer-follow, alternating column velocities, hover lift, and smooth inertia.
 */

import './DriftWall.css';

// ── Cookie Crew Member Comments ─────────────────────────────────────────────
const CREW_MEMBERS = [
  {
    initial: 'A',
    name: 'Arun Narayanan K',
    role: 'Founder & Creative Head',
    quote: 'Chief Cookie Dreamer.',
    desc: 'Believes every cookie should tell a story. Obsessed with getting every bite right.',
    accent: true,
  },
  {
    initial: 'D',
    name: 'Dharshini K',
    role: 'Operations Excellence Lead',
    quote: 'Runs the show so smoothly, even chaos listens to her.',
    desc: 'If something\'s on track, it\'s probably because she double-checked it… twice.',
    accent: false,
  },
  {
    initial: 'B',
    name: 'Bishu Mehra',
    role: 'Sales & Operations Supervisor',
    quote: 'Sells cookies like they\'re happiness in a box.',
    desc: 'Can talk to anyone, anywhere—might even convince a cookie to sell itself.',
    accent: false,
  },
  {
    initial: 'N',
    name: 'Nafees Khan',
    role: 'Business Development',
    quote: 'Turns handshakes into long-term partnerships.',
    desc: 'Calm, strategic, and the reason MingMorsels enters premium spaces.',
    accent: false,
  },
  {
    initial: 'D',
    name: 'Daniel',
    role: 'Chef · Production',
    quote: 'Kitchen wizard with a whisk and wild ideas.',
    desc: 'If your cookie tastes amazing… he\'s definitely the reason.',
    accent: true,
  },
  {
    initial: 'L',
    name: 'Lokesh',
    role: 'Research & Development',
    quote: 'The flavour scientist on a secret mission.',
    desc: 'Constantly experimenting—one day he\'ll crack the unbeatable flavour.',
    accent: false,
  },
  {
    initial: 'S',
    name: 'Sowmya',
    role: 'Packing Head',
    quote: 'Master of neatness, the queen of clean corners.',
    desc: 'Every pack looks perfect—you\'ll swear precision is her superpower.',
    accent: false,
  },
  {
    initial: 'S',
    name: 'Shree Raksha',
    role: 'Finance Head (CA)',
    quote: 'Keeps the numbers clean and the business steady.',
    desc: 'From compliance to clarity, she ensures MingMorsels grows the right way.',
    accent: false,
  },
];

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Creates a crisp inline-SVG data URL for each crew member comment card
function makeCrewCardDataURL(member) {
  const bg1 = member.accent ? '#24190C' : '#1A1626';
  const bg2 = member.accent ? '#160E05' : '#100D1A';
  const borderCol = member.accent ? '#F5C542' : 'rgba(229,184,75,0.45)';
  const avatarBg1 = '#FFD868';
  const avatarBg2 = '#DF9C12';
  const quoteBg1 = member.accent ? '#3A2810' : '#2A2035';
  const quoteBg2 = member.accent ? '#231708' : '#1B1424';
  const quoteBorder = member.accent ? '#F5C542' : 'rgba(245,197,66,0.4)';

  const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + '…' : str;
  const q = escapeXml(truncate(member.quote, 54));
  const descRaw = member.desc || '';

  // Wrap description into 1 or 2 lines cleanly
  const words = descRaw.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 46) {
      line1 = (line1 + ' ' + w).trim();
    } else if ((line2 + ' ' + w).trim().length <= 48) {
      line2 = (line2 + ' ' + w).trim();
    } else if (!line2.endsWith('…')) {
      line2 += '…';
    }
  }

  const descSvg = line2
    ? `<text x="28" y="198" font-family="system-ui,-apple-system,sans-serif" font-size="13.5" font-weight="500" fill="#F4EFE6">${escapeXml(line1)}</text><text x="28" y="218" font-family="system-ui,-apple-system,sans-serif" font-size="13.5" font-weight="500" fill="#F4EFE6">${escapeXml(line2)}</text>`
    : `<text x="28" y="204" font-family="system-ui,-apple-system,sans-serif" font-size="13.5" font-weight="500" fill="#F4EFE6">${escapeXml(line1)}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 292" width="440" height="292">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${avatarBg1}"/><stop offset="100%" stop-color="${avatarBg2}"/></linearGradient>
    <linearGradient id="qbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${quoteBg1}"/><stop offset="100%" stop-color="${quoteBg2}"/></linearGradient>
  </defs>
  <rect width="434" height="286" x="3" y="3" rx="22" fill="url(#bg)" stroke="${borderCol}" stroke-width="2"/>
  <circle cx="52" cy="54" r="28" fill="url(#av)"/>
  <text x="52" y="63" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="900" fill="#201103" text-anchor="middle">${escapeXml(member.initial)}</text>
  <text x="93" y="47" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${escapeXml(member.name)}</text>
  <text x="93" y="68" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="700" fill="#F5C542">${escapeXml(member.role)}</text>
  <line x1="24" y1="94" x2="416" y2="94" stroke="rgba(245,197,66,0.25)" stroke-width="1.2"/>
  <rect x="24" y="106" width="392" height="66" rx="12" fill="url(#qbg)" stroke="${quoteBorder}" stroke-width="1.2"/>
  <rect x="24" y="106" width="5" height="66" rx="2.5" fill="#F5C542"/>
  <text x="38" y="145" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="700" fill="#FFF4D4">"${q}"</text>
  ${descSvg}
  <line x1="24" y1="240" x2="416" y2="240" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="28" y="264" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="800" fill="#F5C542">🍪 MING MORSELS CREW</text>
</svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Generate all 8 cards, then repeat to get 20 tiles for density
const CREW_TILE_ITEMS = Array.from({ length: 20 }, (_, i) => {
  const member = CREW_MEMBERS[i % CREW_MEMBERS.length];
  return {
    image: makeCrewCardDataURL(member),
    title: `${member.name} — ${member.quote}`,
  };
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const columnFactor = (index, variance) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

export function initDriftWall(containerEl, userProps = {}) {
  if (!containerEl) return () => {};

  const props = {
    items: CREW_TILE_ITEMS,
    columns: 5,
    tileWidth: 240,
    tileHeight: 160,
    gap: 16,
    radius: 20,
    tilt: 14,
    turn: -12,
    roll: 0,
    perspective: 1200,
    depth: 100,
    speed: 36,
    direction: 'up',
    variance: 0.42,
    parallax: 0.6,
    pauseOnHover: false,
    lift: 72,
    fade: 0.55,
    dim: 0.82,
    grayscale: false,
    overlayColor: 'rgba(13,12,19,0.1)',
    ...userProps
  };

  const reduced = prefersReducedMotion();

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

  const columnItems = Array.from({ length: props.columns }, () => []);
  props.items.forEach((item, i) => columnItems[i % props.columns].push(item));
  columnItems.forEach((col, i) => {
    if (!col.length) columnItems[i] = props.items.slice(0, 1);
  });

  containerEl.innerHTML = `
    <div class="drift-wall ${reduced ? 'drift-wall--reduced' : ''}" style="${cssVars}" role="group" aria-label="Cookie Crew comment cards">
      <div class="drift-wall__plane">
        ${columnItems.map((col, c) => `
          <div class="drift-wall__col" data-col-index="${c}">
            <div class="drift-wall__track" data-track="${c}">
              ${Array.from({ length: 3 }).map((_, copyIdx) =>
                col.map((item, itemIdx) => `
                  <div
                    class="drift-wall__tile"
                    data-tile-id="${c}-${copyIdx}-${itemIdx}"
                    data-col="${c}"
                    tabindex="0"
                    role="img"
                    aria-label="${item.title || 'Cookie crew comment'}"
                  >
                    <span class="drift-wall__inner drift-wall__inner--card">
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

  const getColumnMeta = () =>
    columnItems.map(col => {
      const unit = props.tileHeight + props.gap;
      const copyHeight = Math.max(unit, col.length * unit);
      return { copyHeight };
    });

  let columnMeta = getColumnMeta();

  const ro = new ResizeObserver(entries => {
    containerHeight = entries[0].contentRect.height || 600;
    columnMeta = getColumnMeta();
  });
  ro.observe(containerEl);

  const offsets = columnItems.map((_, c) => {
    const meta = columnMeta[c];
    return meta ? meta.copyHeight * ((c * 0.37) % 1) : 0;
  });
  const velocities = columnItems.map(() => 0);

  const dirSign = props.direction === 'up' ? 1 : -1;
  const baseVelocities = columnItems.map((_, c) => {
    const altSign = c % 2 === 0 ? 1 : -1;
    return props.speed * columnFactor(c, props.variance) * dirSign * altSign;
  });

  const pointer = { x: 0, y: 0 };
  const pointerDamped = { x: 0, y: 0 };

  const applyPlaneTransform = (px, py) => {
    planeEl.style.transform =
      `translate(-50%, -50%) scale(1.18) ` +
      `rotateX(${props.tilt + py}deg) rotateY(${props.turn + px}deg) rotateZ(${props.roll}deg) ` +
      `translateZ(${-props.depth}px)`;
  };
  applyPlaneTransform(0, 0);

  let activeId = null;
  let hoveredCol = -1;
  let wallHovered = false;

  const setActive = (id, col) => {
    if (id === activeId) return;
    activeId = id;
    hoveredCol = col;
    allTiles.forEach(tile =>
      tile.classList.toggle('is-active', tile.dataset.tileId === id)
    );
  };

  const clearActive = () => {
    activeId = null;
    hoveredCol = -1;
    allTiles.forEach(tile => tile.classList.remove('is-active'));
  };

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

  allTiles.forEach(tile => {
    tile.addEventListener('focus', () => setActive(tile.dataset.tileId, Number(tile.dataset.col)));
    tile.addEventListener('blur', clearActive);
  });

  let lastTs = null;
  let rafId = null;

  const animate = ts => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000);
    lastTs = ts;

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
