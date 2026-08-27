/**
 * CookieCrew.js
 * Vanilla JS + GSAP port of the React Masonry component.
 * Absolute-positions crew cards, computes column layout, and
 * animates cards in from the bottom on first render using GSAP.
 */

import { gsap } from 'gsap';

// ─── Crew data ────────────────────────────────────────────────────────────────
const CREW = [
  {
    id: 'lokesh',
    initial: 'L',
    name: 'Lokesh',
    role: 'Research & Development',
    quote: '\u201cThe flavour scientist on a secret mission.\u201d',
    desc: 'Constantly experimenting\u2014one day he\u2019ll crack the unbeatable flavour.',
    tags: []
  },
  {
    id: 'sowmya',
    initial: 'S',
    name: 'Sowmya',
    role: 'Packing Head',
    quote: '\u201cMaster of neatness, the queen of clean corners.\u201d',
    desc: 'Every pack looks perfect\u2014you\u2019ll swear precision is her superpower.',
    tags: []
  },
  {
    id: 'shree',
    initial: 'S',
    name: 'Shree Raksha',
    role: 'Finance Head (CA)',
    quote: '\u201cKeeps the numbers clean and the business steady.\u201d',
    desc: 'From compliance to clarity, she ensures MingMorsels grows the right way.',
    tags: []
  },
  {
    id: 'arun',
    initial: 'A',
    name: 'Arun Narayanan K',
    role: 'Founder & Creative Head',
    quote: '\u201cChief Cookie Dreamer.\u201d',
    desc: 'Believes every cookie should tell a story. From the first batch to the thousandth box, he\u2019s still obsessed with getting every bite right.',
    tags: ['Visionary', 'Baker at Heart'],
    accent: true
  },
  {
    id: 'dharshini',
    initial: 'D',
    name: 'Dharshini K',
    role: 'Operations Excellence Lead',
    quote: '\u201cRuns the show so smoothly, even chaos listens to her.\u201d',
    desc: 'If something\u2019s on track, it\u2019s probably because she double-checked it\u2026 twice.',
    tags: []
  },
  {
    id: 'bishu',
    initial: 'B',
    name: 'Bishu Mehra',
    role: 'Sales & Operations Supervisor',
    quote: '\u201cSells cookies like they\u2019re happiness in a box.\u201d',
    desc: 'Can talk to anyone, anywhere\u2014might even convince a cookie to sell itself.',
    tags: []
  },
  {
    id: 'nafees',
    initial: 'N',
    name: 'Nafees Khan',
    role: 'Business Development & Institutional Sales Head',
    quote: '\u201cTurns handshakes into long-term partnerships.\u201d',
    desc: 'Calm, strategic, and the reason MingMorsels enters premium spaces.',
    tags: []
  },
  {
    id: 'daniel',
    initial: 'D',
    name: 'Daniel',
    role: 'Chef \u00b7 Production',
    quote: '\u201cKitchen wizard with a whisk and wild ideas.\u201d',
    desc: 'If your cookie tastes amazing\u2026 he\u2019s definitely the reason.',
    tags: ['Master Baker', 'Production'],
    accent: true
  }
];

// ─── Column count by viewport ─────────────────────────────────────────────────
function getColumns() {
  const w = window.innerWidth;
  if (w >= 1200) return 4;
  if (w >= 900)  return 3;
  if (w >= 560)  return 2;
  return 1;
}

// ─── Build card HTML ──────────────────────────────────────────────────────────
function buildCard(member) {
  const tagsHTML = member.tags.length
    ? '<div class="crew-tag-row">' + member.tags.map(t => '<span class="crew-tag">' + t + '</span>').join('') + '</div>'
    : '';

  return '<div class="crew-item-wrapper" data-crew="' + member.id + '" style="position:absolute;top:0;left:0;will-change:transform,opacity;">' +
    '<div class="crew-card' + (member.accent ? ' crew-card--accent' : '') + '">' +
      '<div class="crew-card-avatar-row">' +
        '<div class="crew-avatar">' + member.initial + '</div>' +
        '<div class="crew-card-meta">' +
          '<span class="crew-name">' + member.name + '</span>' +
          '<span class="crew-role">' + member.role + '</span>' +
        '</div>' +
      '</div>' +
      '<p class="crew-quote">' + member.quote + '</p>' +
      '<p class="crew-desc">' + member.desc + '</p>' +
      tagsHTML +
    '</div>' +
  '</div>';
}

// ─── Layout + GSAP animation ──────────────────────────────────────────────────
function layoutCrew(container, isFirst) {
  const totalWidth = container.offsetWidth;
  const cols       = getColumns();
  const gap        = 20;
  const colW       = (totalWidth - gap * (cols - 1)) / cols;
  const items      = Array.from(container.querySelectorAll('.crew-item-wrapper'));

  // ── Pass 1: set all card widths so the browser can reflow ──────────────────
  items.forEach(wrapper => {
    const card = wrapper.querySelector('.crew-card');
    gsap.set(card, { width: colW });
  });

  // Force a synchronous reflow so offsetHeight values are correct below
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight;

  // ── Pass 2: read heights, compute positions, animate ───────────────────────
  const colHeights = new Array(cols).fill(0);
  let maxH = 0;

  items.forEach((wrapper, i) => {
    const card  = wrapper.querySelector('.crew-card');
    const cardH = card.offsetHeight;
    const col   = colHeights.indexOf(Math.min(...colHeights));
    const x     = col * (colW + gap);
    const y     = colHeights[col];

    colHeights[col] += cardH + gap;
    maxH = Math.max(maxH, colHeights[col]);

    if (isFirst) {
      gsap.fromTo(
        wrapper,
        { x, y: y + 80, opacity: 0, filter: 'blur(8px)' },
        { x, y, opacity: 1, filter: 'blur(0px)', duration: 0.75, ease: 'power3.out', delay: i * 0.07 }
      );
    } else {
      gsap.to(wrapper, { x, y, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    }
  });

  container.style.height = maxH + 'px';
}

// ─── Hover interactions ───────────────────────────────────────────────────────
function bindHover(container) {
  container.querySelectorAll('.crew-item-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', () => {
      gsap.to(wrapper, { scale: 0.97, duration: 0.3, ease: 'power2.out' });
    });
    wrapper.addEventListener('mouseleave', () => {
      gsap.to(wrapper, { scale: 1, duration: 0.3, ease: 'power2.out' });
    });
  });
}

// ─── IntersectionObserver – trigger on scroll into view ──────────────────────
function observeSection(root, container) {
  let triggered = false;
  const io = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && !triggered) {
        triggered = true;
        layoutCrew(container, true);
        io.disconnect();
      }
    },
    { threshold: 0.12 }
  );
  io.observe(root);
}

// ─── Public init ─────────────────────────────────────────────────────────────
export function initCookieCrew() {
  const root      = document.getElementById('cookie-crew');
  const container = document.getElementById('crew-masonry-root');
  if (!root || !container) return;

  // Inject cards
  container.innerHTML = CREW.map(buildCard).join('');
  container.style.position = 'relative';

  // Set initial hidden state
  gsap.set(container.querySelectorAll('.crew-item-wrapper'), { opacity: 0 });

  // Bind hover
  bindHover(container);

  // Observe & animate when in viewport
  observeSection(root, container);

  // Reflow on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layoutCrew(container, false), 120);
  });
}
