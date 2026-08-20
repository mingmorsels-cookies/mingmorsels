/**
 * TextType — Vanilla JS implementation of React Bits <TextType />
 * Uses GSAP for cursor blinking & IntersectionObserver for startOnVisible.
 */
import { gsap } from 'gsap';

export function createTextType(element, options = {}) {
  const {
    text = ["mingmorsels", "When Moments Matter", "Pure Indulgence in Every Bite"],
    typingSpeed = 60,
    initialDelay = 200,
    pauseDuration = 2200,
    deletingSpeed = 35,
    loop = true,
    className = '',
    showCursor = true,
    hideCursorWhileTyping = false,
    cursorCharacter = '|',
    cursorClassName = '',
    cursorBlinkDuration = 0.5,
    textColors = ['#C6960C', '#FAF6F0', '#E4BA84'],
    variableSpeed,
    onSentenceComplete,
    startOnVisible = true,
    reverseMode = false
  } = options;

  const textArray = Array.isArray(text) ? text : [text];
  
  // Set up container DOM
  element.classList.add('text-type');
  if (className) {
    className.split(' ').forEach(c => c && element.classList.add(c));
  }

  const contentSpan = document.createElement('span');
  contentSpan.className = 'text-type__content';
  element.appendChild(contentSpan);

  let cursorSpan = null;
  if (showCursor) {
    cursorSpan = document.createElement('span');
    cursorSpan.className = `text-type__cursor ${cursorClassName}`;
    cursorSpan.textContent = cursorCharacter;
    element.appendChild(cursorSpan);

    // GSAP Blink Animation
    gsap.set(cursorSpan, { opacity: 1 });
    gsap.to(cursorSpan, {
      opacity: 0,
      duration: cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
  }

  let displayedText = '';
  let currentCharIndex = 0;
  let currentTextIndex = 0;
  let isDeleting = false;
  let isVisible = !startOnVisible;
  let timeoutId = null;

  function getRandomSpeed() {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }

  function updateColor() {
    if (textColors.length > 0) {
      contentSpan.style.color = textColors[currentTextIndex % textColors.length];
    }
  }

  function updateCursorVisibility() {
    if (!cursorSpan || !hideCursorWhileTyping) return;
    const currentText = textArray[currentTextIndex];
    const isTypingOrDeleting = currentCharIndex < currentText.length || isDeleting;
    if (isTypingOrDeleting) {
      cursorSpan.classList.add('text-type__cursor--hidden');
    } else {
      cursorSpan.classList.remove('text-type__cursor--hidden');
    }
  }

  function tick() {
    if (!isVisible) return;

    const rawText = textArray[currentTextIndex];
    const charArray = Array.from(rawText);
    const processedChars = reverseMode ? charArray.slice().reverse() : charArray;

    updateColor();
    updateCursorVisibility();

    if (isDeleting) {
      const currentDisplayedChars = Array.from(displayedText);
      if (currentDisplayedChars.length === 0) {
        isDeleting = false;
        if (currentTextIndex === textArray.length - 1 && !loop) {
          return;
        }

        if (onSentenceComplete) {
          onSentenceComplete(textArray[currentTextIndex], currentTextIndex);
        }

        currentTextIndex = (currentTextIndex + 1) % textArray.length;
        currentCharIndex = 0;
        displayedText = '';
        timeoutId = setTimeout(tick, pauseDuration);
      } else {
        currentDisplayedChars.pop();
        displayedText = currentDisplayedChars.join('');
        contentSpan.textContent = displayedText;
        timeoutId = setTimeout(tick, deletingSpeed);
      }
    } else {
      if (currentCharIndex < processedChars.length) {
        displayedText += processedChars[currentCharIndex];
        contentSpan.textContent = displayedText;
        currentCharIndex++;
        const speed = variableSpeed ? getRandomSpeed() : typingSpeed;
        timeoutId = setTimeout(tick, speed);
      } else {
        if (!loop && currentTextIndex === textArray.length - 1) return;
        timeoutId = setTimeout(() => {
          isDeleting = true;
          tick();
        }, pauseDuration);
      }
    }
  }

  function start() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(tick, initialDelay);
  }

  if (startOnVisible) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            isVisible = true;
            start();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(element);
  } else {
    start();
  }

  return {
    destroy() {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };
}
