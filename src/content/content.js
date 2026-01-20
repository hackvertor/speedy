// Listen for messages from popup - registered immediately at top level
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startReading') {
    initSpeedyReader(message.wpm);
  }
});

function initSpeedyReader(wpm) {
  // Prevent multiple injections
  if (window.speedyReaderInitialized) return;
  window.speedyReaderInitialized = true;

  let overlay = null;
  let isReading = false;
  let currentWordIndex = 0;
  let words = [];
  let intervalId = null;
  let currentWpm = 300;

  function extractText() {
    const article = document.querySelector('article') || document.body;
    const clone = article.cloneNode(true);

    // Remove scripts, styles, and other non-content elements
    const removeSelectors = 'script, style, noscript, nav, header, footer, aside, [role="navigation"], [role="banner"], [aria-hidden="true"]';
    clone.querySelectorAll(removeSelectors).forEach(el => el.remove());

    const text = clone.innerText || clone.textContent;
    return text.split(/\s+/).filter(word => word.trim().length > 0);
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'speedy-overlay';

    // Create and append style element
    const style = document.createElement('style');
    style.textContent = `
      #speedy-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1f3c 100%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      }
      #speedy-word-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 600px;
        height: 120px;
      }
      #speedy-focus-line-top,
      #speedy-focus-line-bottom {
        position: absolute;
        width: 3px;
        background: linear-gradient(180deg, #ff6b35 0%, #e63946 100%);
        box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
        left: 50%;
        transform: translateX(-50%);
      }
      #speedy-focus-line-top {
        top: 0;
        height: 25px;
      }
      #speedy-focus-line-bottom {
        bottom: 0;
        height: 25px;
      }
      #speedy-word {
        position: relative;
        font-size: 64px;
        color: #fff;
        letter-spacing: 2px;
        white-space: nowrap;
        margin-top: -8px;
      }
      #speedy-word .before {
        color: #fff;
      }
      #speedy-word .focus {
        color: #ff6b35;
        text-shadow: 0 0 8px rgba(255, 107, 53, 0.6);
      }
      #speedy-word .after {
        color: #fff;
      }
      #speedy-controls {
        margin-top: 60px;
        display: flex;
        gap: 20px;
      }
      .speedy-btn {
        background: rgba(0, 180, 216, 0.1);
        color: #fff;
        border: 2px solid #00b4d8;
        padding: 12px 24px;
        font-size: 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .speedy-btn:hover {
        background: #00b4d8;
        box-shadow: 0 0 15px rgba(0, 180, 216, 0.4);
      }
      #speedy-progress {
        position: absolute;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        color: #4a6fa5;
        font-size: 14px;
      }
      #speedy-wpm-display {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        color: #4a6fa5;
        font-size: 14px;
      }
    `;
    overlay.appendChild(style);

    // Create word container
    const wordContainer = document.createElement('div');
    wordContainer.id = 'speedy-word-container';

    const focusLineTop = document.createElement('div');
    focusLineTop.id = 'speedy-focus-line-top';
    wordContainer.appendChild(focusLineTop);

    const focusLineBottom = document.createElement('div');
    focusLineBottom.id = 'speedy-focus-line-bottom';
    wordContainer.appendChild(focusLineBottom);

    const wordEl = document.createElement('div');
    wordEl.id = 'speedy-word';
    wordEl.textContent = 'Ready';
    wordContainer.appendChild(wordEl);

    overlay.appendChild(wordContainer);

    // Create controls
    const controls = document.createElement('div');
    controls.id = 'speedy-controls';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'speedy-btn';
    pauseBtn.id = 'speedy-pause';
    pauseBtn.textContent = 'Pause';
    controls.appendChild(pauseBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'speedy-btn';
    closeBtn.id = 'speedy-close';
    closeBtn.textContent = 'Close';
    controls.appendChild(closeBtn);

    overlay.appendChild(controls);

    // Create progress and WPM display
    const progress = document.createElement('div');
    progress.id = 'speedy-progress';
    progress.textContent = '0 / 0';
    overlay.appendChild(progress);

    const wpmDisplay = document.createElement('div');
    wpmDisplay.id = 'speedy-wpm-display';
    wpmDisplay.textContent = '300 WPM';
    overlay.appendChild(wpmDisplay);

    document.body.appendChild(overlay);

    document.getElementById('speedy-pause').addEventListener('click', togglePause);
    document.getElementById('speedy-close').addEventListener('click', closeReader);

    // Keyboard controls
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!overlay) return;
    if (e.key === 'Escape') closeReader();
    if (e.key === ' ') {
      e.preventDefault();
      togglePause();
    }
  }

  function findOptimalFocusPoint(word) {
    // RSVP optimal recognition point (ORP) is typically around 1/3 into the word
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 3) return 1;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
  }

  function displayWord(word) {
    const focusIndex = findOptimalFocusPoint(word);
    const before = word.slice(0, focusIndex);
    const focus = word[focusIndex] || '';
    const after = word.slice(focusIndex + 1);

    const wordEl = document.getElementById('speedy-word');
    wordEl.textContent = '';

    const beforeSpan = document.createElement('span');
    beforeSpan.className = 'before';
    beforeSpan.textContent = before;
    wordEl.appendChild(beforeSpan);

    const focusSpan = document.createElement('span');
    focusSpan.className = 'focus';
    focusSpan.textContent = focus;
    wordEl.appendChild(focusSpan);

    const afterSpan = document.createElement('span');
    afterSpan.className = 'after';
    afterSpan.textContent = after;
    wordEl.appendChild(afterSpan);

    // Move word so the focus letter is centered on the fixed line
    requestAnimationFrame(() => {
      const focusSpan = wordEl.querySelector('.focus');
      if (focusSpan) {
        const containerRect = document.getElementById('speedy-word-container').getBoundingClientRect();
        const containerCenter = containerRect.width / 2;

        // Reset transform to measure natural position
        wordEl.style.transform = 'none';

        const focusRect = focusSpan.getBoundingClientRect();
        const focusCenterInContainer = focusRect.left + focusRect.width / 2 - containerRect.left;

        // Shift word so focus letter aligns with container center
        const offset = containerCenter - focusCenterInContainer;
        wordEl.style.transform = `translateX(${offset}px)`;
      }
    });

    document.getElementById('speedy-progress').textContent = `${currentWordIndex + 1} / ${words.length}`;
  }

  function startReading(wpm) {
    if (!overlay) createOverlay();

    words = extractText();
    if (words.length === 0) {
      document.getElementById('speedy-word').textContent = 'No text found';
      return;
    }

    document.getElementById('speedy-wpm-display').textContent = `${wpm} WPM`;

    currentWpm = wpm;
    const interval = 60000 / wpm;
    currentWordIndex = 0;
    isReading = true;

    displayWord(words[0]);

    intervalId = setInterval(() => {
      if (!isReading) return;

      currentWordIndex++;
      if (currentWordIndex >= words.length) {
        clearInterval(intervalId);
        showDoneMessage();
        document.getElementById('speedy-pause').textContent = 'Restart';
        isReading = false;
        return;
      }

      displayWord(words[currentWordIndex]);
    }, interval);
  }

  function showDoneMessage() {
    const wordEl = document.getElementById('speedy-word');
    wordEl.textContent = '';
    const doneSpan = document.createElement('span');
    doneSpan.style.color = '#ff6b35';
    doneSpan.style.textShadow = '0 0 8px rgba(255,107,53,0.6)';
    doneSpan.textContent = 'Done!';
    wordEl.appendChild(doneSpan);
  }

  function togglePause() {
    const btn = document.getElementById('speedy-pause');

    if (currentWordIndex >= words.length && !isReading) {
      // Restart - need to restart the interval
      currentWordIndex = 0;
      isReading = true;
      btn.textContent = 'Pause';
      displayWord(words[0]);

      const interval = 60000 / currentWpm;
      intervalId = setInterval(() => {
        if (!isReading) return;

        currentWordIndex++;
        if (currentWordIndex >= words.length) {
          clearInterval(intervalId);
          showDoneMessage();
          btn.textContent = 'Restart';
          isReading = false;
          return;
        }

        displayWord(words[currentWordIndex]);
      }, interval);
      return;
    }

    isReading = !isReading;
    btn.textContent = isReading ? 'Pause' : 'Resume';
  }

  function closeReader() {
    if (intervalId) clearInterval(intervalId);
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.removeEventListener('keydown', handleKeydown);
    isReading = false;
    window.speedyReaderInitialized = false;
  }

  // Start reading with the provided WPM
  startReading(wpm);
}
