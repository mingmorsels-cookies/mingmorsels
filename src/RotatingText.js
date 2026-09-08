import { gsap } from 'gsap';
import './RotatingText.css';

/**
 * RotatingText.js
 * High-performance, staggered character/word flip animation matching React Bits RotatingText
 * Source reference: React Bits / Vengeance UI
 */
export function initRotatingText(container, options = {}) {
  if (!container) return () => {};

  const config = {
    texts: ['Bright & Shine', 'Pure Radiance', 'Shining Joy'],
    mainClassName: '',
    splitLevelClassName: 'overflow-hidden',
    staggerFrom: 'last', // 'first' | 'last' | 'center' | 'random'
    staggerDuration: 0.025,
    rotationInterval: 2200,
    splitBy: 'characters', // 'characters' | 'words'
    initial: { y: '100%', opacity: 0 },
    animate: { y: '0%', opacity: 1 },
    exit: { y: '-120%', opacity: 0 },
    transition: { duration: 0.45, ease: 'back.out(1.3)' },
    loop: true,
    ...options
  };

  const texts = Array.isArray(config.texts) && config.texts.length > 0 ? config.texts : ['mingmorsels'];
  let currentIndex = 0;
  let isTransitioning = false;
  let timerId = null;
  let isPaused = false;

  // Build root structure
  const rootWrapper = document.createElement('span');
  rootWrapper.className = `rotating-text-root ${config.mainClassName}`.trim();
  rootWrapper.setAttribute('aria-live', 'polite');

  const textWrapper = document.createElement('span');
  textWrapper.className = `rotating-text-wrapper ${config.splitLevelClassName}`.trim();
  rootWrapper.appendChild(textWrapper);

  container.innerHTML = '';
  container.appendChild(rootWrapper);

  // Helper to split text into HTML tokens
  function renderTextItem(text) {
    const item = document.createElement('span');
    item.className = 'rotating-text-item';
    item.setAttribute('aria-label', text);

    if (config.splitBy === 'words') {
      const words = text.split(' ');
      words.forEach((word, wIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'rotating-text-word';
        wordSpan.textContent = word;
        item.appendChild(wordSpan);
        if (wIdx < words.length - 1) {
          const space = document.createElement('span');
          space.className = 'rotating-text-space';
          space.textContent = ' ';
          item.appendChild(space);
        }
      });
    } else {
      // Split by characters
      const words = text.split(' ');
      words.forEach((word, wIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'rotating-text-word';
        const chars = Array.from(word);
        chars.forEach((char) => {
          const charSpan = document.createElement('span');
          charSpan.className = 'rotating-text-char';
          charSpan.textContent = char;
          wordSpan.appendChild(charSpan);
        });
        item.appendChild(wordSpan);
        if (wIdx < words.length - 1) {
          const space = document.createElement('span');
          space.className = 'rotating-text-space';
          space.textContent = ' ';
          item.appendChild(space);
        }
      });
    }
    return item;
  }

  // Calculate stagger delay based on staggerFrom
  function getStaggerDelay(index, total) {
    if (total <= 1) return 0;
    const dur = config.staggerDuration;
    switch (config.staggerFrom) {
      case 'first':
        return index * dur;
      case 'last':
        return (total - 1 - index) * dur;
      case 'center': {
        const center = (total - 1) / 2;
        return Math.abs(center - index) * dur;
      }
      case 'random':
        return Math.random() * dur * total;
      default:
        return (total - 1 - index) * dur;
    }
  }

  // Mount initial element
  let currentEl = renderTextItem(texts[currentIndex]);
  currentEl.classList.add('is-animating-in');
  textWrapper.appendChild(currentEl);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Transition to next text item
  function next() {
    if (isTransitioning || isPaused || texts.length <= 1) return;
    isTransitioning = true;

    const nextIndex = (currentIndex + 1) % texts.length;
    const nextEl = renderTextItem(texts[nextIndex]);
    nextEl.classList.add('is-animating-in');

    const outgoingEl = currentEl;
    outgoingEl.classList.remove('is-animating-in');
    outgoingEl.classList.add('is-animating-out');

    textWrapper.appendChild(nextEl);

    if (prefersReducedMotion) {
      if (outgoingEl.parentNode) textWrapper.removeChild(outgoingEl);
      currentEl = nextEl;
      currentIndex = nextIndex;
      isTransitioning = false;
      scheduleNext();
      return;
    }

    const outChars = outgoingEl.querySelectorAll(config.splitBy === 'words' ? '.rotating-text-word' : '.rotating-text-char');
    const inChars = nextEl.querySelectorAll(config.splitBy === 'words' ? '.rotating-text-word' : '.rotating-text-char');

    // Set initial state on new characters
    gsap.set(inChars, {
      y: config.initial.y,
      opacity: config.initial.opacity ?? 0
    });

    const masterTl = gsap.timeline({
      onComplete: () => {
        if (outgoingEl.parentNode) {
          textWrapper.removeChild(outgoingEl);
        }
        currentEl = nextEl;
        currentIndex = nextIndex;
        isTransitioning = false;
        scheduleNext();
      }
    });

    // Animate out current characters
    outChars.forEach((el, i) => {
      masterTl.to(
        el,
        {
          y: config.exit.y,
          opacity: config.exit.opacity ?? 0,
          duration: config.transition.duration || 0.4,
          ease: 'power2.in'
        },
        getStaggerDelay(i, outChars.length)
      );
    });

    // Animate in next characters slightly overlapping
    const inStartDelay = Math.min(0.15, outChars.length * config.staggerDuration * 0.5);
    inChars.forEach((el, i) => {
      masterTl.to(
        el,
        {
          y: config.animate.y,
          opacity: config.animate.opacity ?? 1,
          duration: config.transition.duration || 0.45,
          ease: config.transition.ease || 'back.out(1.3)'
        },
        inStartDelay + getStaggerDelay(i, inChars.length)
      );
    });
  }

  function scheduleNext() {
    if (!config.loop && currentIndex === texts.length - 1) return;
    clearTimeout(timerId);
    timerId = setTimeout(next, config.rotationInterval);
  }

  // Viewport Intersection Observer for power efficiency
  let observer = null;
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isPaused = false;
          scheduleNext();
        } else {
          isPaused = true;
          clearTimeout(timerId);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(container);
  } else {
    scheduleNext();
  }

  // Cleanup function
  return () => {
    clearTimeout(timerId);
    if (observer) observer.disconnect();
    if (container) container.innerHTML = '';
  };
}

/**
 * Auto-initialize all elements marked with data-rotating-text attribute
 */
export function initAllRotatingTexts() {
  const elements = document.querySelectorAll('[data-rotating-texts]');
  elements.forEach((el) => {
    try {
      const rawTexts = el.getAttribute('data-rotating-texts');
      const texts = rawTexts ? JSON.parse(rawTexts) : [];
      const staggerFrom = el.getAttribute('data-stagger-from') || 'last';
      const mainClassName = el.getAttribute('data-main-class') || '';
      const interval = parseInt(el.getAttribute('data-interval') || '2200', 10);
      initRotatingText(el, {
        texts,
        staggerFrom,
        mainClassName,
        rotationInterval: interval
      });
    } catch (err) {
      console.warn('[RotatingText] Failed to parse data attributes for element:', el, err);
    }
  });
}

export default initRotatingText;
