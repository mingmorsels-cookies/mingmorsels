import { gsap } from 'gsap';
import './FlowingMenu.css';

const ANIMATION_DEFAULTS = { duration: 0.6, ease: 'expo' };

function distMetric(x, y, x2, y2) {
  const xDiff = x - x2;
  const yDiff = y - y2;
  return xDiff * xDiff + yDiff * yDiff;
}

function findClosestEdge(mouseX, mouseY, width, height) {
  const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
  const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
  return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
}

function createMenuItem({
  link,
  text,
  image,
  speed = 15,
  textColor = '#FAF6F0',
  marqueeBgColor = '#FAF6F0',
  marqueeTextColor = '#2C1810',
  borderColor = 'rgba(198, 150, 12, 0.4)'
}) {
  const item = document.createElement('div');
  item.className = 'menu__item';
  item.style.borderColor = borderColor;

  const anchor = document.createElement('a');
  anchor.className = 'menu__item-link';
  anchor.href = link;
  anchor.textContent = text;
  anchor.style.color = textColor;

  const marquee = document.createElement('div');
  marquee.className = 'marquee';
  marquee.style.backgroundColor = marqueeBgColor;

  const innerWrap = document.createElement('div');
  innerWrap.className = 'marquee__inner-wrap';

  const inner = document.createElement('div');
  inner.className = 'marquee__inner';
  inner.setAttribute('aria-hidden', 'true');

  function buildMarqueeContent(reps) {
    inner.innerHTML = '';
    for (let i = 0; i < reps; i++) {
      const part = document.createElement('div');
      part.className = 'marquee__part';
      part.style.color = marqueeTextColor;

      const span = document.createElement('span');
      span.textContent = text;

      const img = document.createElement('div');
      img.className = 'marquee__img';
      img.style.backgroundImage = `url(${image})`;

      part.appendChild(span);
      part.appendChild(img);
      inner.appendChild(part);
    }
  }

  buildMarqueeContent(4);
  innerWrap.appendChild(inner);
  marquee.appendChild(innerWrap);
  item.appendChild(anchor);
  item.appendChild(marquee);

  let marqueeTween = null;

  function setupMarquee() {
    if (marqueeTween) marqueeTween.kill();
    const part = inner.querySelector('.marquee__part');
    if (!part) return;
    const contentWidth = part.offsetWidth;
    if (contentWidth === 0) return;

    const needed = Math.max(4, Math.ceil(window.innerWidth / contentWidth) + 2);
    buildMarqueeContent(needed);

    const firstPart = inner.querySelector('.marquee__part');
    if (!firstPart) return;

    marqueeTween = gsap.to(inner, {
      x: -firstPart.offsetWidth,
      duration: speed,
      ease: 'none',
      repeat: -1
    });
  }

  setTimeout(setupMarquee, 50);
  window.addEventListener('resize', () => setTimeout(setupMarquee, 50));

  anchor.addEventListener('mouseenter', (ev) => {
    const rect = item.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap.timeline({ defaults: ANIMATION_DEFAULTS })
      .set(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marquee, inner], { y: '0%' }, 0);
  });

  anchor.addEventListener('mouseleave', (ev) => {
    const rect = item.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap.timeline({ defaults: ANIMATION_DEFAULTS })
      .to(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  });

  return item;
}

export function initFlowingMenu(container, items = [], options = {}) {
  const {
    speed = 15,
    textColor = '#FAF6F0',
    bgColor = '#1A0E08',
    marqueeBgColor = '#FAF6F0',
    marqueeTextColor = '#2C1810',
    borderColor = 'rgba(198, 150, 12, 0.4)'
  } = options;

  container.innerHTML = '';
  container.style.backgroundColor = bgColor;
  container.classList.add('menu-wrap');

  const nav = document.createElement('nav');
  nav.className = 'menu';

  items.forEach(item => {
    nav.appendChild(createMenuItem({ ...item, speed, textColor, marqueeBgColor, marqueeTextColor, borderColor }));
  });

  container.appendChild(nav);
}

export default initFlowingMenu;
