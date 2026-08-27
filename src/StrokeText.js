/**
 * StrokeText.js
 * Implementation of the React Bits StrokeText Component.
 * Draws character outlines with GSAP stroke animation and floods
 * in the fill color with a smooth left-to-right wipe or fade.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './StrokeText.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

let instanceCounter = 0;

export function initStrokeText(container, userProps = {}) {
  if (!container) return () => {};

  const props = {
    text: 'Unit of Miora Delights Private Limited',
    strokeColor: '#C6960C',
    fillColor: '#3D2000',
    strokeWidth: 1.4,
    drawDuration: 1.6,
    fillDelay: 0.2,
    stagger: 0.04,
    ease: 'power2.out',
    trigger: 'mount',
    fillMode: 'wipe',
    fontSize: 54,
    fontWeight: 800,
    letterSpacing: -1,
    reverse: false,
    className: '',
    ...userProps
  };

  const id = `stroke-text-wipe-${++instanceCounter}`;
  const characters = Array.from(String(props.text ?? ''));
  const dash = Math.max(props.fontSize * 7, 200);

  container.innerHTML = `
    <span
      class="stroke-text ${props.trigger === 'hover' ? 'stroke-text--hover' : ''} ${props.className}".trim()
      style="--stroke-text-height: ${Math.round(props.fontSize * 1.35)}px;"
      role="img"
      aria-label="${String(props.text ?? '')}"
    >
      <svg class="stroke-text__svg" viewBox="0 ${-props.fontSize} 800 ${props.fontSize * 1.35}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${props.fillMode === 'wipe' ? `
          <defs>
            <clipPath id="${id}" clipPathUnits="userSpaceOnUse">
              <rect class="stroke-text-wipe-rect" x="0" y="${-props.fontSize}" width="0" height="${props.fontSize * 1.5}" />
            </clipPath>
          </defs>
        ` : ''}

        <text
          class="stroke-text__stroke"
          x="0"
          y="0"
          fill="none"
          stroke="${props.strokeColor}"
          stroke-width="${props.strokeWidth}"
          stroke-linejoin="round"
          stroke-linecap="round"
          style="font-size:${props.fontSize}px; font-weight:${props.fontWeight}; letter-spacing:${props.letterSpacing}px;"
        >
          ${characters.map(char => `<tspan data-stroke-char>${char === ' ' ? '&#160;' : char}</tspan>`).join('')}
        </text>

        <text
          class="stroke-text__fill"
          x="0"
          y="0"
          fill="${props.fillColor}"
          stroke="none"
          style="font-size:${props.fontSize}px; font-weight:${props.fontWeight}; letter-spacing:${props.letterSpacing}px;"
          ${props.fillMode === 'wipe' ? `clip-path="url(#${id})"` : ''}
        >
          ${characters.map(char => `<tspan data-fill-char>${char === ' ' ? '&#160;' : char}</tspan>`).join('')}
        </text>
      </svg>
    </span>
  `;

  const root = container.querySelector('.stroke-text');
  const svg = container.querySelector('.stroke-text__svg');
  const strokeTextEl = container.querySelector('.stroke-text__stroke');
  const wipeRect = container.querySelector('.stroke-text-wipe-rect');
  if (!root || !svg || !strokeTextEl) return () => {};

  let box = null;

  const measure = () => {
    try {
      const bbox = strokeTextEl.getBBox();
      if (!bbox || !bbox.width) return;

      const pad = Math.max(Number(props.strokeWidth) || 1, props.fontSize * 0.1);
      box = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2
      };

      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
      if (wipeRect) {
        wipeRect.setAttribute('x', box.x);
        wipeRect.setAttribute('y', box.y);
        wipeRect.setAttribute('height', box.height);
      }
    } catch {}
  };

  measure();
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(measure).catch(() => {});
  }

  const strokes = gsap.utils.toArray(root.querySelectorAll('[data-stroke-char]'));
  const fills = gsap.utils.toArray(root.querySelectorAll('[data-fill-char]'));
  const fillEnabled = props.fillMode !== 'none';
  const useWipe = fillEnabled && props.fillMode === 'wipe';
  const fillDuration = Math.max(0.4, props.drawDuration * 0.5);
  const staggerConfig = props.reverse ? { each: props.stagger, from: 'end' } : props.stagger;
  const targets = [...strokes, ...fills, wipeRect].filter(Boolean);

  const setStart = () => {
    gsap.killTweensOf(targets);
    gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
    gsap.set(fills, { opacity: useWipe ? 1 : 0 });
    if (wipeRect) gsap.set(wipeRect, { attr: { width: 0 } });
  };

  const setEnd = () => {
    gsap.killTweensOf(targets);
    gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
    gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
    if (wipeRect && box) gsap.set(wipeRect, { attr: { width: fillEnabled ? box.width : 0 } });
  };

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    setEnd();
    return () => gsap.killTweensOf(targets);
  }

  const build = () => {
    measure();
    setStart();
    const tl = gsap.timeline({
      paused: true,
      repeat: props.trigger === 'loop' ? -1 : 0,
      repeatDelay: props.trigger === 'loop' ? 0.9 : 0,
      defaults: { overwrite: 'auto' }
    });

    tl.to(strokes, { strokeDashoffset: 0, duration: props.drawDuration, ease: props.ease, stagger: staggerConfig }, 0);

    if (useWipe && wipeRect && box) {
      tl.to(
        wipeRect,
        { attr: { width: box.width }, duration: fillDuration, ease: 'power2.inOut' },
        props.drawDuration + props.fillDelay
      );
    } else if (fillEnabled) {
      tl.to(
        fills,
        { opacity: 1, duration: fillDuration, ease: 'power2.out', stagger: staggerConfig },
        props.drawDuration + props.fillDelay
      );
    }

    return tl;
  };

  let timeline = null;
  let scrollTrigger = null;
  let removeHover = null;

  if (props.trigger === 'hover') {
    setEnd();
    const play = () => {
      timeline?.kill();
      timeline = build();
      timeline.play(0);
    };
    root.addEventListener('pointerenter', play);
    removeHover = () => root.removeEventListener('pointerenter', play);
  } else {
    timeline = build();
    if (props.trigger === 'scroll') {
      scrollTrigger = ScrollTrigger.create({
        trigger: root,
        start: 'top 85%',
        once: true,
        onEnter: () => timeline?.play(0)
      });
    } else {
      timeline.play(0);
    }
  }

  return () => {
    removeHover?.();
    scrollTrigger?.kill();
    timeline?.kill();
    gsap.killTweensOf(targets);
  };
}
