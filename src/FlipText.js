import './FlipText.css';

/**
 * FlipText.js
 * Vanilla JS implementation of Vengeance UI FlipText Component
 * Source spec: https://www.vengenceui.com/r/flip-text.json
 */
export function initFlipText(container, options = {}) {
  if (!container) return () => {};

  const config = {
    text: 'Unit of Miora Delights Private Limited',
    duration: 2.2,
    delay: 0,
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

  // Calculate character index for each position matching Vengeance UI logic
  const getCharIndex = (wordIndex, charIndex) => {
    let index = 0;
    for (let i = 0; i < wordIndex; i++) {
      index += words[i].length + (separator === ' ' ? 1 : separator.length);
    }
    return index + charIndex;
  };

  container.innerHTML = `
    <div
      class="flip-text-wrapper inline-block leading-none ${config.className}".trim()
      style="perspective: 1000px;"
      role="heading"
      aria-level="3"
      aria-label="${children}"
    >
      ${words.map((word, wordIndex) => {
        const chars = Array.from(word);
        return `
          <span class="word inline-block whitespace-nowrap" style="transform-style: preserve-3d;">
            ${chars.map((char, charIndex) => {
              const currentGlobalIndex = getCharIndex(wordIndex, charIndex);

              // Calculate delay - if together, use same delay for all
              let calculatedDelay = config.delay;
              if (!config.together) {
                const normalizedIndex = currentGlobalIndex / totalChars;
                const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
                calculatedDelay = sineValue * (config.duration * 0.25) + config.delay;
              }

              return `
                <span
                  class="flip-char inline-block relative"
                  data-char="${char === '"' ? '&quot;' : char}"
                  style="--flip-duration: ${config.duration}s; --flip-delay: ${calculatedDelay.toFixed(3)}s; --flip-iteration: ${config.loop ? 'infinite' : '1'}; transform-style: preserve-3d;"
                >${char === ' ' ? '&nbsp;' : char}</span>
              `;
            }).join('')}
            ${separator === ' ' && wordIndex < words.length - 1 ? '<span class="whitespace inline-block">&nbsp;</span>' : ''}
            ${separator !== ' ' && wordIndex < words.length - 1 ? `<span class="separator inline-block">${separator}</span>` : ''}
          </span>
        `;
      }).join('')}
    </div>
  `;

  return () => {
    if (container) container.innerHTML = '';
  };
}

export default initFlipText;
