import { gsap } from 'gsap';
import './FlipText.css';

/**
 * FlipText.js
 * 3D character flip text animation matching Vengeance UI spec & preview
 * Source: https://www.vengenceui.com/components/flip-text
 */
export function initFlipText(container, options = {}) {
  if (!container) return () => {};

  const config = {
    text: 'Unit of Miora Delights Private Limited',
    duration: 2.2,
    delay: 0.3,
    loop: true,
    separator: ' ',
    together: false,
    className: '',
    ...options
  };

  const children = String(config.text ?? '');
  const separator = config.separator ?? ' ';
  const words = children.split(separator);
  const totalChars = children.length || 1;

  const wrapperClassName = ['flip-text-wrapper', 'inline-block', 'leading-none', config.className].filter(Boolean).join(' ');

  container.innerHTML = `
    <div
      class="${wrapperClassName}"
      style="perspective: 1200px; transform-style: preserve-3d;"
      role="heading"
      aria-level="3"
      aria-label="${children}"
    >
      ${words.map((word, wordIndex) => {
        const chars = Array.from(word);
        return `
          <span
            class="word inline-block whitespace-nowrap"
            style="transform-style: preserve-3d; display: inline-block;"
          >
            ${chars.map((char) => `
              <span
                class="flip-char inline-block relative"
                data-char="${char === '"' ? '&quot;' : char}"
                style="display: inline-block; transform-style: preserve-3d; will-change: transform, opacity;"
              >${char}</span>
            `).join('')}
            ${separator === ' ' && wordIndex < words.length - 1 ? '<span class="whitespace inline-block">&nbsp;</span>' : ''}
            ${separator !== ' ' && wordIndex < words.length - 1 ? `<span class="separator inline-block">${separator}</span>` : ''}
          </span>
        `;
      }).join('')}
    </div>
  `;

  const charEls = Array.from(container.querySelectorAll('.flip-char'));
  if (!charEls.length) return () => {};

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return () => {};

  // GSAP 3D character flip animation
  const tl = gsap.timeline({
    repeat: config.loop ? -1 : 0,
    repeatDelay: 1.0,
    delay: config.delay
  });

  tl.fromTo(
    charEls,
    {
      rotationX: 0,
      opacity: 1
    },
    {
      rotationX: 360,
      duration: 1.0,
      ease: 'power2.inOut',
      transformOrigin: '50% 50% -10px',
      stagger: (i) => {
        if (config.together) return 0;
        const normalizedIndex = i / totalChars;
        const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
        return sineValue * (config.duration * 0.28);
      }
    }
  );

  return () => {
    tl.kill();
    if (container) container.innerHTML = '';
  };
}

export default initFlipText;
